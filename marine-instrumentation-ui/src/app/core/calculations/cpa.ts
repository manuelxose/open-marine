export interface CpaResult {
  tCpa: number; // Seconds to CPA (negative if passed)
  dCpa: number; // Distance at CPA in meters
}

interface Vector2D {
  x: number;
  y: number;
}

/**
 * Calculates Time to Closest Point of Approach (TCPA) and Distance at CPA (DCPA)
 * between two moving vessels using 2D vector geometry.
 * 
 * Assumes flat earth approximation for local calculations (valid for ranges < 20-30nm).
 * Uses Own Ship as the reference frame (0,0).
 * 
 * @param ownLat Latitude of Own Ship (deg)
 * @param ownLon Longitude of Own Ship (deg)
 * @param ownSog Speed Over Ground of Own Ship (m/s)
 * @param ownCog Course Over Ground of Own Ship (radians)
 * @param targetLat Latitude of Target (deg)
 * @param targetLon Longitude of Target (deg)
 * @param targetSog Speed Over Ground of Target (m/s)
 * @param targetCog Course Over Ground of Target (radians)
 */
export function calculateCpa(
  ownLat: number,
  ownLon: number,
  ownSog: number,
  ownCog: number,
  targetLat: number,
  targetLon: number,
  targetSog: number,
  targetCog: number
): CpaResult {
  // 1. Convert positions to Cartesian meters (Target relative to Own Ship)
  // We effectively treat Own Ship as (0,0) and project Target
  const dLat = targetLat - ownLat;
  const dLon = targetLon - ownLon;
  
  // Meters per degree approximation around own latitude
  const metersPerLat = 111132.92 - 559.82 * Math.cos(2 * ownLat * Math.PI / 180);
  const metersPerLon = 111412.84 * Math.cos(ownLat * Math.PI / 180);

  const pRel: Vector2D = {
    x: dLon * metersPerLon, // East
    y: dLat * metersPerLat  // North
  };

  // 2. Calculate Velocity Vectors (m/s)
  // Cog is radians clockwise from North (0 = North, PI/2 = East)
  // Standard math angle is counter-clockwise from East.
  // We can stick to North=Y, East=X.
  // Vx = Sog * sin(Cog)
  // Vy = Sog * cos(Cog)
  
  const vOwn: Vector2D = {
    x: ownSog * Math.sin(ownCog),
    y: ownSog * Math.cos(ownCog)
  };

  const vTarget: Vector2D = {
    x: targetSog * Math.sin(targetCog),
    y: targetSog * Math.cos(targetCog)
  };

  // 3. Relative Velocity (Target relative to Own Ship)
  // If we consider Own Ship static, Target is moving at (vTarget - vOwn)
  const vRel: Vector2D = {
    x: vTarget.x - vOwn.x,
    y: vTarget.y - vOwn.y
  };

  const vRelSq = vRel.x * vRel.x + vRel.y * vRel.y;

  // 4. Calculate Time to CPA (tCpa)
  // tCpa = - (pRel . vRel) / |vRel|^2
  // Vector dot product
  const dotProduct = pRel.x * vRel.x + pRel.y * vRel.y;

  // If relative velocity is essentially zero, vessels are maintaining distance
  if (vRelSq < 0.0001) {
    return {
      tCpa: 0,
      dCpa: Math.sqrt(pRel.x * pRel.x + pRel.y * pRel.y)
    };
  }

  const tCpa = -dotProduct / vRelSq;

  // 5. Calculate Position at CPA
  // P_cpa = P_rel + V_rel * tCpa
  const pCpa: Vector2D = {
    x: pRel.x + vRel.x * tCpa,
    y: pRel.y + vRel.y * tCpa
  };

  const dCpa = Math.sqrt(pCpa.x * pCpa.x + pCpa.y * pCpa.y);

  return { tCpa, dCpa };
}
