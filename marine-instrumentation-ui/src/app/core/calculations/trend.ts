/**
 * Pure calculation functions for marine data trends
 */
import { HistoryPoint } from '../../state/datapoints/datapoint.models';

/**
 * Calculate the maximum value in a window (for gust calculation)
 */
export function calculateMax(points: HistoryPoint[]): number | null {
  if (!points || points.length === 0) return null;
  return Math.max(...points.map(p => p.value));
}

/**
 * Calculate the average value in a window
 */
export function calculateMean(points: HistoryPoint[]): number | null {
  if (!points || points.length === 0) return null;
  const sum = points.reduce((acc, p) => acc + p.value, 0);
  return sum / points.length;
}

/**
 * Filter points to a time window (last N seconds)
 */
export function filterToWindow(points: HistoryPoint[], windowMs: number): HistoryPoint[] {
  const now = Date.now();
  const cutoff = now - windowMs;
  return points.filter(p => p.timestamp >= cutoff);
}

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'unknown';

/**
 * Calculate trend direction based on linear regression slope
 * @param points History points (should be at least 3 for meaningful trend)
 * @param thresholdPerSecond Minimum slope to consider non-stable (in units per second)
 */
export function calculateTrend(points: HistoryPoint[], thresholdPerSecond = 0.05): TrendDirection {
  if (!points || points.length < 3) return 'unknown';

  // Simple linear regression
  const n = points.length;
  
  // Normalize timestamps to seconds from first point for numerical stability
  const t0 = points[0].timestamp;
  const xs = points.map(p => (p.timestamp - t0) / 1000);
  const ys = points.map(p => p.value);
  
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 0.0001) return 'stable';
  
  const slope = (n * sumXY - sumX * sumY) / denom;
  
  if (slope > thresholdPerSecond) return 'rising';
  if (slope < -thresholdPerSecond) return 'falling';
  return 'stable';
}

/**
 * Calculate depth trend with appropriate threshold for depth changes
 * (depth changes of 0.1m/s are significant)
 */
export function calculateDepthTrend(points: HistoryPoint[]): TrendDirection {
  return calculateTrend(points, 0.03); // 3cm per second is noticeable
}

/**
 * Calculate update rate (updates per second)
 */
export function calculateUpdateRate(points: HistoryPoint[], windowSeconds = 5): number {
  if (!points || points.length < 2) return 0;
  
  const windowMs = windowSeconds * 1000;
  const filtered = filterToWindow(points, windowMs);
  
  if (filtered.length < 2) return 0;
  
  // Count updates per second in the window
  return filtered.length / windowSeconds;
}
