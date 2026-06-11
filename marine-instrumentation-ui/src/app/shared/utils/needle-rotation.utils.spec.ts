import { describe, expect, it } from 'vitest';
import { initNeedleState, updateNeedleAngle } from './needle-rotation.utils';

describe('NeedleRotationUtils', () => {
  it('should rotate forward when new angle is ahead', () => {
    let state = initNeedleState(350);
    state = updateNeedleAngle(state, 10);
    expect(state.visualAngle).toBe(370);
  });

  it('should rotate backward when new angle is behind', () => {
    let state = initNeedleState(10);
    state = updateNeedleAngle(state, 350);
    expect(state.visualAngle).toBe(-10);
  });

  it('should accumulate multiple rotations correctly', () => {
    let state = initNeedleState(0);
    state = updateNeedleAngle(state, 90);
    state = updateNeedleAngle(state, 180);
    state = updateNeedleAngle(state, 270);
    state = updateNeedleAngle(state, 0);
    expect(state.visualAngle).toBe(360);
  });

  it('should handle rapid oscillation without spinning', () => {
    let state = initNeedleState(5);
    for (let i = 0; i < 10; i++) {
      state = updateNeedleAngle(state, i % 2 === 0 ? 355 : 5);
    }
    expect(Math.abs(state.visualAngle)).toBeLessThan(180);
  });
});
