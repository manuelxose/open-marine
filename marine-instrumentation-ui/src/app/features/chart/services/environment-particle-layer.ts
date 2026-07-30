import maplibregl, {
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as MapLibreMap,
} from 'maplibre-gl';
import { fetchMarineResource } from './marine-field-cache';

type ParticleKind = 'wind' | 'currents';
type Position = [longitude: number, latitude: number];

interface MarineFieldResponse {
  field?: {
    dataGrid?: {
      kind?: 'points' | 'regular';
      nodeCount?: number;
      longitude?: number[];
      latitude?: number[];
      width?: number;
      height?: number;
      origin?: Position;
      spacing?: Position;
      components?: Record<string, Array<number | null>>;
    };
    metadata?: { boundingBox?: [number, number, number, number] };
  };
}

interface FeatureCollection {
  features?: Array<{
    geometry?: {
      type?: 'Polygon' | 'MultiPolygon';
      coordinates?: number[][][] | number[][][][];
    };
  }>;
}

interface VectorSample {
  longitude: number;
  latitude: number;
  u: number;
  v: number;
}

interface Particle {
  longitude: number;
  latitude: number;
  age: number;
  trail: Position[];
}

interface ParticleField {
  samples: VectorSample[];
  bounds: [number, number, number, number];
  regularGrid?: {
    width: number;
    height: number;
    origin: Position;
    spacing: Position;
    u: Array<number | null>;
    v: Array<number | null>;
  };
}

interface MarineMaskGrid {
  bounds: [number, number, number, number];
  width: number;
  height: number;
  cells: Uint8Array;
}

const VERTEX_SHADER = `
  precision highp float;
  uniform mat4 u_matrix;
  attribute vec2 a_position;
  attribute float a_alpha;
  varying float v_alpha;
  void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    v_alpha = a_alpha;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec4 u_color;
  varying float v_alpha;
  void main() {
    float alpha = u_color.a * v_alpha;
    gl_FragColor = vec4(u_color.rgb * alpha, alpha);
  }
`;

export const particleTargetFor = (
  kind: ParticleKind,
  area: number,
  memoryGb: number,
): number => kind === 'currents'
  ? Math.max(
      360,
      Math.min(
        2400,
        Math.round(area / 780 * (memoryGb <= 2 ? 0.42 : memoryGb <= 4 ? 0.72 : 1) * 1.12),
      ),
    )
  : Math.max(
      180,
      Math.min(
        1300,
        Math.round(area / 1600 * (memoryGb <= 2 ? 0.35 : memoryGb <= 4 ? 0.65 : 1)),
      ),
    );

/**
 * CPU-advection/WebGL-render custom layer.
 *
 * The physical field remains the provider grid. IDW is only the mathematical
 * interpolation used to move a dense visual particle representation.
 */
export class EnvironmentParticleLayer implements CustomLayerInterface {
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;
  private map: MapLibreMap | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private alphaBuffer: WebGLBuffer | null = null;
  private matrixLocation: WebGLUniformLocation | null = null;
  private colorLocation: WebGLUniformLocation | null = null;
  private positionLocation = -1;
  private alphaLocation = -1;
  private field: ParticleField | null = null;
  private marinePolygons: number[][][][] = [];
  private marineMaskGrid: MarineMaskGrid | null = null;
  private particles: Particle[] = [];
  private loadAbort: AbortController | null = null;
  private previousFrame = 0;
  private lastParticleTarget = 0;
  private metricsStartedAt = 0;
  private renderedFrames = 0;
  private renderCostTotalMs = 0;

  constructor(
    readonly id: string,
    private readonly kind: ParticleKind,
    private fieldUrl: string,
    private maskUrl: string,
    private opacity = 0.82,
    private zonePolygon: number[][][] | null = null,
  ) {}

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.positionBuffer = gl.createBuffer();
    this.alphaBuffer = gl.createBuffer();
    this.matrixLocation = gl.getUniformLocation(this.program, 'u_matrix');
    this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.alphaLocation = gl.getAttribLocation(this.program, 'a_alpha');
    void this.load();
  }

  onRemove(_map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.loadAbort?.abort();
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.alphaBuffer) gl.deleteBuffer(this.alphaBuffer);
    if (this.program) gl.deleteProgram(this.program);
    this.map = null;
    this.program = null;
    this.positionBuffer = null;
    this.alphaBuffer = null;
    this.particles = [];
  }

  setUrls(fieldUrl: string, maskUrl: string, zonePolygon: number[][][] | null): void {
    if (fieldUrl === this.fieldUrl
      && maskUrl === this.maskUrl
      && JSON.stringify(zonePolygon) === JSON.stringify(this.zonePolygon)) return;
    this.fieldUrl = fieldUrl;
    this.maskUrl = maskUrl;
    this.zonePolygon = zonePolygon;
    void this.load();
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  getMetrics(): {
    fps: number;
    averageFrameMs: number;
    cpuFrameMs: number;
    particles: number;
    sourceNodes: number;
  } {
    const elapsed = this.metricsStartedAt === 0 ? 0 : performance.now() - this.metricsStartedAt;
    const fps = elapsed > 0 ? this.renderedFrames * 1000 / elapsed : 0;
    return {
      fps: Number(fps.toFixed(1)),
      averageFrameMs: Number((fps > 0 ? 1000 / fps : 0).toFixed(2)),
      cpuFrameMs: Number((this.renderedFrames > 0 ? this.renderCostTotalMs / this.renderedFrames : 0).toFixed(2)),
      particles: this.particles.length,
      sourceNodes: this.field?.samples.length ?? 0,
    };
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.map || !this.program || !this.positionBuffer || !this.alphaBuffer || !this.field) return;
    const renderStartedAt = performance.now();
    const now = performance.now();
    if (this.metricsStartedAt === 0) this.metricsStartedAt = now;
    this.renderedFrames++;
    const elapsedSeconds = this.previousFrame === 0 ? 1 / 60 : Math.min(0.05, (now - this.previousFrame) / 1000);
    this.previousFrame = now;
    this.ensureParticleCount();
    this.advect(elapsedSeconds);
    const { positions, alpha } = this.vertices();
    if (positions.length === 0) return;

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.matrixLocation, false, options.modelViewProjectionMatrix);
    // WebGL literals mirror the Glass Bridge palette; wind and current also
    // differ by trail cadence/width so colour is not the only distinction.
    const color = this.kind === 'wind'
      ? new Float32Array([0.22, 0.74, 0.97, this.opacity])
      : new Float32Array([0.18, 0.92, 0.72, this.opacity]);
    gl.uniform4fv(this.colorLocation, color);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.alphaLocation);
    gl.vertexAttribPointer(this.alphaLocation, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, positions.length / 2);
    this.renderCostTotalMs += performance.now() - renderStartedAt;
    this.map.triggerRepaint();
  }

  private async load(): Promise<void> {
    this.loadAbort?.abort();
    const abort = new AbortController();
    this.loadAbort = abort;
    try {
      const [fieldResponse, maskResponse] = await Promise.all([
        fetchMarineResource(this.fieldUrl, abort.signal),
        fetchMarineResource(this.maskUrl, abort.signal),
      ]);
      if (!fieldResponse.ok) throw new Error(`Marine field returned ${fieldResponse.status}`);
      if (!maskResponse.ok) throw new Error(`Marine mask returned ${maskResponse.status}`);
      const [fieldBody, maskBody] = await Promise.all([
        fieldResponse.json() as Promise<MarineFieldResponse>,
        maskResponse.json() as Promise<FeatureCollection>,
      ]);
      if (abort.signal.aborted) return;
      this.field = normalizeField(fieldBody);
      this.marinePolygons = normalizePolygons(maskBody);
      this.marineMaskGrid = rasterizeMarineMask(this.marinePolygons, this.field.bounds);
      this.particles = [];
      this.previousFrame = 0;
      this.metricsStartedAt = 0;
      this.renderedFrames = 0;
      this.renderCostTotalMs = 0;
      this.map?.triggerRepaint();
    } catch (error) {
      if (!abort.signal.aborted) {
        console.warn(`[marine-particles:${this.kind}]`, error);
        this.field = null;
        this.particles = [];
      }
    }
  }

  private ensureParticleCount(): void {
    if (!this.map || !this.field) return;
    const canvas = this.map.getCanvas();
    const area = canvas.clientWidth * canvas.clientHeight;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    // Currents need a denser visual sampling than wind to reveal narrow coastal
    // channels. This does not alter or overstate the physical provider grid:
    // particles are still advected from the four nearest source nodes.
    const target = particleTargetFor(this.kind, area, memory);
    if (target === this.lastParticleTarget && this.particles.length === target) return;
    this.lastParticleTarget = target;
    while (this.particles.length < target) this.particles.push(this.spawn());
    if (this.particles.length > target) this.particles.length = target;
  }

  private advect(elapsedSeconds: number): void {
    if (!this.field) return;
    const visualSpeedScale = this.kind === 'wind' ? 28 : 70;
    const maxAge = this.kind === 'wind' ? 95 : 125;
    for (let index = 0; index < this.particles.length; index++) {
      const particle = this.particles[index]!;
      const vector = interpolateField(this.field, particle.longitude, particle.latitude);
      if (!vector || particle.age >= maxAge || !this.isMarine(particle.longitude, particle.latitude)) {
        this.particles[index] = this.spawn();
        continue;
      }
      const latitudeRadians = particle.latitude * Math.PI / 180;
      const nextLongitude = particle.longitude
        + vector.u * elapsedSeconds * visualSpeedScale / (111_320 * Math.max(0.2, Math.cos(latitudeRadians)));
      const nextLatitude = particle.latitude + vector.v * elapsedSeconds * visualSpeedScale / 111_320;
      if (!insideBounds(nextLongitude, nextLatitude, this.field.bounds) || !this.isMarine(nextLongitude, nextLatitude)) {
        this.particles[index] = this.spawn();
        continue;
      }
      particle.longitude = nextLongitude;
      particle.latitude = nextLatitude;
      particle.age += 1;
      particle.trail.push([nextLongitude, nextLatitude]);
      const trailLimit = this.kind === 'wind' ? 7 : 5;
      if (particle.trail.length > trailLimit) particle.trail.shift();
    }
  }

  private vertices(): { positions: Float32Array; alpha: Float32Array } {
    const positions: number[] = [];
    const alpha: number[] = [];
    for (const particle of this.particles) {
      for (let index = 1; index < particle.trail.length; index++) {
        const previous = maplibregl.MercatorCoordinate.fromLngLat(particle.trail[index - 1]!);
        const current = maplibregl.MercatorCoordinate.fromLngLat(particle.trail[index]!);
        const opacity = index / particle.trail.length;
        positions.push(previous.x, previous.y, current.x, current.y);
        alpha.push(opacity * 0.35, opacity);
      }
    }
    return { positions: new Float32Array(positions), alpha: new Float32Array(alpha) };
  }

  private spawn(): Particle {
    const bounds = this.field?.bounds ?? [-9.05, 42.05, -8.4, 42.4];
    for (let attempt = 0; attempt < 30; attempt++) {
      const longitude = bounds[0] + Math.random() * (bounds[2] - bounds[0]);
      const latitude = bounds[1] + Math.random() * (bounds[3] - bounds[1]);
      if (this.isMarine(longitude, latitude)
        && this.field
        && interpolateField(this.field, longitude, latitude)) {
        return { longitude, latitude, age: Math.floor(Math.random() * 80), trail: [[longitude, latitude]] };
      }
    }
    const eligibleSamples = this.field?.samples.filter((candidate) =>
      this.isMarine(candidate.longitude, candidate.latitude)) ?? [];
    const sample = eligibleSamples[Math.floor(Math.random() * (eligibleSamples.length || 1))];
    const longitude = sample?.longitude ?? bounds[0];
    const latitude = sample?.latitude ?? bounds[1];
    return { longitude, latitude, age: 0, trail: [[longitude, latitude]] };
  }

  private isMarine(longitude: number, latitude: number): boolean {
    if (this.zonePolygon && !pointInPolygon(longitude, latitude, this.zonePolygon)) return false;
    if (this.marineMaskGrid) {
      const { bounds, width, height, cells } = this.marineMaskGrid;
      if (!insideBounds(longitude, latitude, bounds)) return false;
      const x = Math.max(0, Math.min(width - 1, Math.floor(
        (longitude - bounds[0]) / (bounds[2] - bounds[0]) * width,
      )));
      const y = Math.max(0, Math.min(height - 1, Math.floor(
        (bounds[3] - latitude) / (bounds[3] - bounds[1]) * height,
      )));
      return cells[y * width + x] === 1;
    }
    return this.marinePolygons.length === 0
      || this.marinePolygons.some((polygon) => pointInPolygon(longitude, latitude, polygon));
  }
}

const rasterizeMarineMask = (
  polygons: number[][][][],
  bounds: [number, number, number, number],
): MarineMaskGrid | null => {
  if (polygons.length === 0 || typeof document === 'undefined') return null;
  const width = 384;
  const longitudeSpan = bounds[2] - bounds[0];
  const latitudeSpan = bounds[3] - bounds[1];
  const height = Math.max(128, Math.min(384, Math.round(width * latitudeSpan / longitudeSpan)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = '#fff';
  context.beginPath();
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach((position, index) => {
        const longitude = position[0];
        const latitude = position[1];
        if (longitude === undefined || latitude === undefined) return;
        const x = (longitude - bounds[0]) / longitudeSpan * width;
        const y = (bounds[3] - latitude) / latitudeSpan * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
    }
  }
  context.fill('evenodd');
  const rgba = context.getImageData(0, 0, width, height).data;
  const cells = new Uint8Array(width * height);
  for (let index = 0; index < cells.length; index++) {
    cells[index] = rgba[index * 4 + 3]! > 0 ? 1 : 0;
  }
  return { bounds, width, height, cells };
};

const normalizeField = (response: MarineFieldResponse): ParticleField => {
  const grid = response.field?.dataGrid;
  const components = grid?.components ?? {};
  const u = components['u'] ?? [];
  const v = components['v'] ?? [];
  const samples: VectorSample[] = [];
  const nodeCount = grid?.nodeCount ?? 0;
  for (let index = 0; index < nodeCount; index++) {
    const eastward = u[index];
    const northward = v[index];
    if (!Number.isFinite(eastward) || !Number.isFinite(northward)) continue;
    const longitude = grid?.kind === 'regular'
      ? grid.origin![0] + (index % grid.width!) * grid.spacing![0]
      : grid?.longitude?.[index];
    const latitude = grid?.kind === 'regular'
      ? grid.origin![1] + Math.floor(index / grid.width!) * grid.spacing![1]
      : grid?.latitude?.[index];
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
    samples.push({ longitude: longitude!, latitude: latitude!, u: eastward!, v: northward! });
  }
  if (samples.length === 0) throw new Error('Marine field contains no valid U/V source nodes');
  const metadataBounds = response.field?.metadata?.boundingBox;
  const bounds: [number, number, number, number] = metadataBounds ?? [
    Math.min(...samples.map((sample) => sample.longitude)),
    Math.min(...samples.map((sample) => sample.latitude)),
    Math.max(...samples.map((sample) => sample.longitude)),
    Math.max(...samples.map((sample) => sample.latitude)),
  ];
  const regularGrid = grid?.kind === 'regular'
    ? {
        width: grid.width!,
        height: grid.height!,
        origin: grid.origin!,
        spacing: grid.spacing!,
        u,
        v,
      }
    : undefined;
  return { samples, bounds, ...(regularGrid ? { regularGrid } : {}) };
};

const normalizePolygons = (collection: FeatureCollection): number[][][][] => {
  const polygons: number[][][][] = [];
  for (const feature of collection.features ?? []) {
    if (feature.geometry?.type === 'Polygon') {
      polygons.push(feature.geometry.coordinates as number[][][]);
    } else if (feature.geometry?.type === 'MultiPolygon') {
      polygons.push(...feature.geometry.coordinates as number[][][][]);
    }
  }
  return polygons;
};

const interpolateField = (
  field: ParticleField,
  longitude: number,
  latitude: number,
): { u: number; v: number } | null => {
  const grid = field.regularGrid;
  if (!grid) return interpolateIdw(field.samples, longitude, latitude);

  const fractionalX = (longitude - grid.origin[0]) / grid.spacing[0];
  const fractionalY = (latitude - grid.origin[1]) / grid.spacing[1];
  if (fractionalX < 0 || fractionalY < 0
    || fractionalX > grid.width - 1 || fractionalY > grid.height - 1) return null;
  const left = Math.floor(fractionalX);
  const bottom = Math.floor(fractionalY);
  const right = Math.min(grid.width - 1, left + 1);
  const top = Math.min(grid.height - 1, bottom + 1);
  const x = fractionalX - left;
  const y = fractionalY - bottom;
  const nodes = [
    { index: bottom * grid.width + left, weight: (1 - x) * (1 - y) },
    { index: bottom * grid.width + right, weight: x * (1 - y) },
    { index: top * grid.width + left, weight: (1 - x) * y },
    { index: top * grid.width + right, weight: x * y },
  ];
  let weight = 0;
  let u = 0;
  let v = 0;
  for (const node of nodes) {
    const eastward = grid.u[node.index];
    const northward = grid.v[node.index];
    if (!Number.isFinite(eastward) || !Number.isFinite(northward) || node.weight === 0) continue;
    weight += node.weight;
    u += eastward! * node.weight;
    v += northward! * node.weight;
  }
  return weight > 0 ? { u: u / weight, v: v / weight } : null;
};

const interpolateIdw = (
  samples: VectorSample[],
  longitude: number,
  latitude: number,
): { u: number; v: number } | null => {
  // Keep the four nearest nodes without allocating/sorting an array for every
  // particle on every animation frame.
  const nearestSamples: Array<VectorSample | null> = [null, null, null, null];
  const nearestDistances = [Infinity, Infinity, Infinity, Infinity];
  const longitudeScale = Math.cos(latitude * Math.PI / 180);
  for (const sample of samples) {
    const dx = (sample.longitude - longitude) * longitudeScale;
    const dy = sample.latitude - latitude;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= nearestDistances[3]!) continue;
    let slot = 3;
    while (slot > 0 && distanceSquared < nearestDistances[slot - 1]!) {
      nearestDistances[slot] = nearestDistances[slot - 1]!;
      nearestSamples[slot] = nearestSamples[slot - 1]!;
      slot--;
    }
    nearestDistances[slot] = distanceSquared;
    nearestSamples[slot] = sample;
  }
  const exact = nearestSamples[0];
  if (!exact) return null;
  if (nearestDistances[0]! < 1e-12) return exact;
  let totalWeight = 0;
  let u = 0;
  let v = 0;
  for (let index = 0; index < nearestSamples.length; index++) {
    const sample = nearestSamples[index];
    if (!sample) break;
    const weight = 1 / Math.max(1e-12, nearestDistances[index]!);
    totalWeight += weight;
    u += sample.u * weight;
    v += sample.v * weight;
  }
  return { u: u / totalWeight, v: v / totalWeight };
};

const pointInPolygon = (longitude: number, latitude: number, rings: number[][][]): boolean => {
  if (rings.length === 0 || !pointInRing(longitude, latitude, rings[0]!)) return false;
  return !rings.slice(1).some((ring) => pointInRing(longitude, latitude, ring));
};

const pointInRing = (longitude: number, latitude: number, ring: number[][]): boolean => {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const x1 = ring[current]?.[0];
    const y1 = ring[current]?.[1];
    const x2 = ring[previous]?.[0];
    const y2 = ring[previous]?.[1];
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) continue;
    if ((y1 > latitude) !== (y2 > latitude)
      && longitude < (x2 - x1) * (latitude - y1) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
};

const insideBounds = (
  longitude: number,
  latitude: number,
  [west, south, east, north]: [number, number, number, number],
): boolean => longitude >= west && longitude <= east && latitude >= south && latitude <= north;

const createProgram = (
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate WebGL shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader error';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to allocate WebGL program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown WebGL link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};
