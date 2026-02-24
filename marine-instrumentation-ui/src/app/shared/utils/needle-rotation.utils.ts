/**
 * Cumulative rotation engine for marine instrument needles.
 * Ensures the needle always takes the shortest path (max 180deg per update).
 */

export interface NeedleRotationState {
  logicalAngle: number;
  visualAngle: number;
}

export function initNeedleState(initialAngle: number): NeedleRotationState {
  const normalized = normalizeAngle(initialAngle);
  return {
    logicalAngle: normalized,
    visualAngle: normalized,
  };
}

export function updateNeedleAngle(
  state: NeedleRotationState,
  newAngle: number
): NeedleRotationState {
  const normalized = normalizeAngle(newAngle);

  // Shortest-path delta in range [-180, +180]
  const delta = ((normalized - state.logicalAngle + 540) % 360) - 180;

  return {
    logicalAngle: normalized,
    visualAngle: state.visualAngle + delta,
  };
}

export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function getRotateTransform(
  state: NeedleRotationState,
  cx: number,
  cy: number
): string {
  return `rotate(${state.visualAngle}, ${cx}, ${cy})`;
}
