/**
 * Angle helpers. The control layer works internally in degrees (intuitive PID
 * gains); conversion to/from Signal K radians happens only at the Signal K
 * boundary via the contract's degToRad/radToDeg helpers.
 */

/** Normalise an angle to the [0, 360) range. */
export const wrapTo360 = (deg: number): number => {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

/** Normalise an angle to the (-180, 180] range. */
export const wrapTo180 = (deg: number): number => {
  let wrapped = wrapTo360(deg);
  if (wrapped > 180) {
    wrapped -= 360;
  }
  return wrapped;
};

/**
 * Shortest signed difference `target - current`, in (-180, 180].
 * Positive means the target is to starboard (clockwise) of current.
 */
export const shortestAngleDiff = (targetDeg: number, currentDeg: number): number =>
  wrapTo180(targetDeg - currentDeg);

/** Clamp a value to [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
