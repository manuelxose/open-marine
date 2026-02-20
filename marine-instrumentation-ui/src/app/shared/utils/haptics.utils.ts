/**
 * Haptic feedback utility for critical marine actions.
 * Uses the Vibration API on supported devices (mobile/tablet).
 */
export function triggerHaptic(pattern: 'tap' | 'warning' | 'error' | 'success'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  const patterns: Record<string, number[]> = {
    tap: [10],
    warning: [50, 30, 50],
    error: [100, 50, 100, 50, 100],
    success: [30, 20, 30],
  };

  navigator.vibrate(patterns[pattern] ?? [10]);
}
