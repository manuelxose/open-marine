export interface TrueWindResult {
  tws: number; // m/s
  twd: number; // radians (North=0, CW)
  twa: number; // radians (-PI to PI, relative to bow)
}

/**
 * Calculates True Wind from Apparent Wind and Boat Velocity.
 * All units in SI (m/s, radians).
 *
 * @param aws Apparent Wind Speed (m/s)
 * @param awa Apparent Wind Angle (radians, 0 = Bow, + = Starboard)
 * @param sog Speed Over Ground (m/s)
 * @param cog Course Over Ground (radians, North=0, CW)
 * @param heading Heading (radians, North=0, CW). Falls back to COG if undefined.
 */
export function calculateTrueWind(
  aws: number,
  awa: number,
  sog: number,
  cog: number,
  heading?: number,
): TrueWindResult {
  // Use heading if available, otherwise COG (assuming no leeway)
  const boatHead = heading ?? cog;

  // 1. Calculate Apparent Wind Vector (Flow direction) in Boat Frame
  // AWA is "From Angle". Flow is Opposite.
  // Boat Frame: Forward (+Y), Starboard (+X) logic for rotation?
  // Let's use: Forward = axis 0, Starboard = axis 1 (temporarily)
  // Or match the Earth Frame logic: North (+Y), East (+X)
  
  // Apparent Wind Flow relative to Boat
  // AWA=0 (From Bow) -> Flow is Aft (Negative Forward)
  const flowAngleRelBoat = awa + Math.PI;
  const appFlowFwd = aws * Math.cos(flowAngleRelBoat); // If AWA=0, cos(PI)=-1. Negative Fwd.
  const appFlowStbd = aws * Math.sin(flowAngleRelBoat); // If AWA=PI/2 (Stbd), Flow is Port (Left). sin(3PI/2)=-1. Correct.

  // 2. Rotate to Earth Frame (North/East)
  // Forward axis aligns with Heading.
  // North = Fwd * cos(H) - Stbd * sin(H)
  // East  = Fwd * sin(H) + Stbd * cos(H)
  const appFlowNorth = appFlowFwd * Math.cos(boatHead) - appFlowStbd * Math.sin(boatHead);
  const appFlowEast = appFlowFwd * Math.sin(boatHead) + appFlowStbd * Math.cos(boatHead);

  // 3. Boat Velocity Vector in Earth Frame
  const boatNorth = sog * Math.cos(cog);
  const boatEast = sog * Math.sin(cog);

  // 4. True Wind Flow Vector (Vector addition)
  // V_true = V_app + V_boat
  const trueFlowNorth = appFlowNorth + boatNorth;
  const trueFlowEast = appFlowEast + boatEast;

  // 5. Convert back to Speed/Direction (From)
  const tws = Math.sqrt(trueFlowNorth * trueFlowNorth + trueFlowEast * trueFlowEast);
  
  // atan2(x, y) -> atan2(East, North) gives angle from North (CW positive?)
  // Standard atan2(y, x) gives angle from X axis (East).
  // We want Nautical: 0 at North (Y), 90 CW at East (X).
  // atan2(x, y) matches this phase if x=East, y=North?
  // atan2(0, 1) [North] = 0.
  // atan2(1, 0) [East] = PI/2.
  // Yes, atan2(East, North) is compatible with Nautical Heading.
  let flowAngleTrue = Math.atan2(trueFlowEast, trueFlowNorth);
  
  // Convert Flow Direction to Source Direction (From)
  const twd = wrapRadians(flowAngleTrue + Math.PI);

  // TWA = TWD - Heading (Relative to Bow)
  const twa = wrapRadians(twd - boatHead);

  return { tws, twd, twa };
}

function wrapRadians(rad: number): number {
  const twoPi = Math.PI * 2;
  const wrapped = rad % twoPi;
  if (wrapped > Math.PI) return wrapped - twoPi;
  if (wrapped <= -Math.PI) return wrapped + twoPi;
  return wrapped;
}
