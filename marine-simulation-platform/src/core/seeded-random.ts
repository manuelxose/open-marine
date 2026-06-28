export type RngAlgorithm = "mulberry32" | "lcg";

export interface SeededRandom {
  next(): number;
  nextRange(min: number, max: number): number;
  nextNoise(amplitude: number): number;
}

export function createSeededRandom(seed: number, algorithm: RngAlgorithm = "mulberry32"): SeededRandom {
  return algorithm === "lcg" ? new LcgRandom(seed) : new Mulberry32Random(seed);
}

class Mulberry32Random implements SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed === 0 ? 12345 : seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextNoise(amplitude: number): number {
    return (this.next() - 0.5) * 2 * amplitude;
  }
}

class LcgRandom implements SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed === 0 ? 12345 : Math.abs(seed);
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextNoise(amplitude: number): number {
    return (this.next() - 0.5) * 2 * amplitude;
  }
}

