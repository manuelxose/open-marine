// ── Polar Diagram Parser ──────────────────────────────────────────────
// Supports CSV format (OpenCPN/Expedition style) and JSON.

export interface PolarDiagram {
  vesselName: string;
  twaValues: number[];   // e.g. [0, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
  twsValues: number[];   // e.g. [6, 8, 10, 12, 14, 16, 20]
  data: number[][];      // [tws_index][twa_index] = target SOW in kts
  twaBeats: number[];    // Optimal upwind TWA per TWS index
  twaGybes: number[];    // Optimal downwind TWA per TWS index
}

/**
 * Parse a CSV polar file.
 *
 * Expected format:
 * ```
 * twa,6,8,10,12,14,16,20
 * 30,2.1,3.2,4.1,4.8,5.2,5.5,5.8
 * 45,3.0,4.0,5.0,5.8,6.2,6.5,6.8
 * ...
 * ```
 */
export function parsePolarCSV(content: string, vesselName = 'Unknown'): PolarDiagram {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    throw new Error('Polar CSV must have at least a header and one data row');
  }

  const headerLine = lines[0]!;
  const headerParts = headerLine.split(/[,;\t]+/).map((s) => s.trim());
  // First column is "twa" or similar label
  const twsValues = headerParts.slice(1).map(Number).filter(Number.isFinite);

  if (twsValues.length === 0) {
    throw new Error('No valid TWS values found in polar header');
  }

  const twaValues: number[] = [];
  const data: number[][] = [];

  // Initialize data array (twsValues.length rows)
  for (let i = 0; i < twsValues.length; i++) {
    data.push([]);
  }

  for (let row = 1; row < lines.length; row++) {
    const parts = lines[row]!.split(/[,;\t]+/).map((s) => s.trim());
    const twa = Number(parts[0]);
    if (!Number.isFinite(twa)) continue;
    twaValues.push(twa);

    for (let col = 0; col < twsValues.length; col++) {
      const sow = Number(parts[col + 1]) || 0;
      data[col]!.push(sow);
    }
  }

  // Calculate optimal beat/gybe TWAs
  const twaBeats = computeOptimalVMG(twaValues, data, 'upwind');
  const twaGybes = computeOptimalVMG(twaValues, data, 'downwind');

  return { vesselName, twaValues, twsValues, data, twaBeats, twaGybes };
}

/**
 * Bilinear interpolation on the polar table.
 * Returns target SOW for any TWS/TWA combination.
 */
export function interpolatePolar(
  polar: PolarDiagram,
  tws: number,
  twa: number,
): number {
  const absTwa = Math.abs(twa); // Polars are symmetric

  // Find bounding TWS indices
  const twsIdx = findBounds(polar.twsValues, tws);
  const twaIdx = findBounds(polar.twaValues, absTwa);

  if (twsIdx === null || twaIdx === null) return 0;

  const [i0, i1, tfTws] = twsIdx;
  const [j0, j1, tfTwa] = twaIdx;

  // Bilinear interpolation
  const v00 = polar.data[i0]?.[j0] ?? 0;
  const v01 = polar.data[i0]?.[j1] ?? 0;
  const v10 = polar.data[i1]?.[j0] ?? 0;
  const v11 = polar.data[i1]?.[j1] ?? 0;

  const v0 = v00 + (v01 - v00) * tfTwa;
  const v1 = v10 + (v11 - v10) * tfTwa;

  return v0 + (v1 - v0) * tfTws;
}

/**
 * Get the optimal VMG angle for a given TWS.
 */
export function getOptimalTwa(
  polar: PolarDiagram,
  tws: number,
  mode: 'upwind' | 'downwind',
): number {
  const targets = mode === 'upwind' ? polar.twaBeats : polar.twaGybes;
  const twsIdx = findBounds(polar.twsValues, tws);
  if (twsIdx === null || targets.length === 0) return mode === 'upwind' ? 45 : 135;

  const [i0, i1, t] = twsIdx;
  const v0 = targets[i0] ?? (mode === 'upwind' ? 45 : 135);
  const v1 = targets[i1] ?? v0;
  return v0 + (v1 - v0) * t;
}

// ── Helpers ───────────────────────────────────────────────────────────

function findBounds(
  arr: number[],
  val: number,
): [number, number, number] | null {
  if (arr.length === 0) return null;
  if (val <= arr[0]!) return [0, 0, 0];
  if (val >= arr[arr.length - 1]!) return [arr.length - 1, arr.length - 1, 0];

  for (let i = 0; i < arr.length - 1; i++) {
    if (val >= arr[i]! && val <= arr[i + 1]!) {
      const range = arr[i + 1]! - arr[i]!;
      const t = range > 0 ? (val - arr[i]!) / range : 0;
      return [i, i + 1, t];
    }
  }

  return null;
}

function computeOptimalVMG(
  twaValues: number[],
  data: number[][],
  mode: 'upwind' | 'downwind',
): number[] {
  const results: number[] = [];

  for (let twsIdx = 0; twsIdx < data.length; twsIdx++) {
    let bestVmg = 0;
    let bestTwa = mode === 'upwind' ? 45 : 135;

    for (let twaIdx = 0; twaIdx < twaValues.length; twaIdx++) {
      const twa = twaValues[twaIdx]!;
      const sow = data[twsIdx]?.[twaIdx] ?? 0;

      if (mode === 'upwind' && twa > 90) continue;
      if (mode === 'downwind' && twa < 90) continue;

      const vmg = Math.abs(sow * Math.cos((twa * Math.PI) / 180));
      if (vmg > bestVmg) {
        bestVmg = vmg;
        bestTwa = twa;
      }
    }

    results.push(bestTwa);
  }

  return results;
}
