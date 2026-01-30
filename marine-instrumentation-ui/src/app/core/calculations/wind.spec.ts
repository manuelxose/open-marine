import { calculateTrueWind } from './wind';

describe('Wind Calculations', () => {
  const PI = Math.PI;
  // Helper to standard vector setup
  // AWS, AWA, SOG, COG -> Expect TWS, TWD, TWA
  
  it('should calculate true wind correctly when stationary (SOG=0)', () => {
    // If stationary, Apparent == True
    const aws = 10;
    const awa = 0; // From Bow
    const sog = 0;
    const cog = 0; // Heading North
    const heading = 0;
    
    const result = calculateTrueWind(aws, awa, sog, cog, heading);
    
    // True Wind Speed should equal Apparent
    expect(result.tws).toBeCloseTo(10);
    
    // True Wind Direction
    // Heading North (0). AWA 0 (From Bow). Wind From North.
    // TWD should be 0.
    expect(result.twd).toBeCloseTo(0);
    
    // TWA should equal AWA
    expect(result.twa).toBeCloseTo(0);
  });

  it('should calculate tailwind overtaking boat', () => {
    // Boat Heading North (0) at 10 knots.
    // True Wind From South (PI) at 20 knots.
    // Apparent Wind should be From South at 10 knots (20 - 10).
    // AWA should be PI (From Stern).
    
    const sog = 10;
    const cog = 0;
    const heading = 0;
    
    // Inputs (what sensors see)
    const aws = 10;
    const awa = PI; // From Stern
    
    const result = calculateTrueWind(aws, awa, sog, cog, heading);
    
    expect(result.tws).toBeCloseTo(20);
    expect(result.twd).toBeCloseTo(PI); // From South
    expect(result.twa).toBeCloseTo(PI); // From Stern
  });
  
  it('should calculate headwind into stationary wind', () => {
    // Boat Heading North (0) at 10 knots.
    // True Wind is Zero (Calm).
    // Apparent Wind should be 10 knots From Bow (North).
    
    const sog = 10;
    const cog = 0;
    const heading = 0;
    
    // Inputs
    const aws = 10;
    const awa = 0; // From Bow
    
    const result = calculateTrueWind(aws, awa, sog, cog, heading);
    
    expect(result.tws).toBeCloseTo(0);
    // TWD is undefined if speed is 0, practically. 
    // Our math might return something based on atan2(0,0) or floating noise?
    // Let's see what happens.
  });

  it('should calculate beam reach math', () => {
    // Boat Heading North (0) at 10 m/s.
    // True Wind From East (PI/2) at 10 m/s.
    
    // Boat Vector: (0, 10) [N, E] ? No. North=10. East=0. Vector = (10, 0)
    // Wind Vector (Going To): From East -> Going West (-10).
    // True Wind Vector: (0, -10). (North=0, East=-10).
    
    // Vector Math: V_app = V_true - V_boat
    // V_app_N = 0 - 10 = -10 (Going South / From North)
    // V_app_E = -10 - 0 = -10 (Going West / From East)
    
    // Apparent Vector is (-10, -10).
    // AWS = sqrt(100 + 100) = 14.14
    // Direction (Going To): South-West.
    // Direction (From): North-East.
    // Heading is North.
    // AWA (From - Heading) = 45 deg or -45 deg?
    // North-East is 45 deg (PI/4).
    // AWA = PI/4.
    
    const sog = 10;
    const cog = 0;
    const heading = 0;
    
    const aws = Math.sqrt(200); // 14.14
    const awa = PI / 4; // 45 deg (Starboard Bow)
    
    const result = calculateTrueWind(aws, awa, sog, cog, heading);
    
    expect(result.tws).toBeCloseTo(10);
    expect(result.twd).toBeCloseTo(PI / 2); // East
    expect(result.twa).toBeCloseTo(PI / 2); // Beam
  });
});
