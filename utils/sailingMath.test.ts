import {
  NO_GO_ZONE_THRESHOLD,
  computeApparentWind,
  createInitialPhysics,
  evaluateSailingState,
  evaluateSailingStateWithHysteresis,
  getAngleDiff,
  stepPhysics,
  wrap180,
  type PhysicsState,
  type SailingControls,
} from './sailingMath';

describe('角度工具', () => {
  test('wrap180 標準化到 [-180, 180)', () => {
    expect(wrap180(0)).toBeCloseTo(0);
    expect(wrap180(190)).toBeCloseTo(-170);
    expect(wrap180(-190)).toBeCloseTo(170);
    expect(wrap180(540)).toBeCloseTo(-180);
    expect(wrap180(-720)).toBeCloseTo(0);
  });

  test('getAngleDiff 跨越 ±180', () => {
    expect(getAngleDiff(180, -180)).toBeCloseTo(0);
    expect(getAngleDiff(175, -175)).toBeCloseTo(-10);
    expect(getAngleDiff(-175, 175)).toBeCloseTo(10);
  });
});

describe('視風 computeApparentWind（AW = TW - BV）', () => {
  test.each([
    [90, 63.43, 11.18],
    [45, 30.36, 13.99],
    [-90, -63.43, 11.18],
  ])('TWS 10、BS 5、TWA %d → AWA %d、AWS %d', (twa, awa, aws) => {
    const r = computeApparentWind(10, twa, 5);
    expect(r.awa).toBeCloseTo(awa, 2);
    expect(r.aws).toBeCloseTo(aws, 2);
  });

  test('順風 TWA 180：AWS = TWS - BS', () => {
    const r = computeApparentWind(10, 180, 5);
    expect(Math.abs(r.awa)).toBeCloseTo(180, 2);
    expect(r.aws).toBeCloseTo(5, 2);
  });

  test('BS = 0 時視風等於真風', () => {
    const r = computeApparentWind(10, 45, 0);
    expect(r.awa).toBeCloseTo(45, 2);
    expect(r.aws).toBeCloseTo(10, 2);
  });
});

describe('狀態機 evaluateSailingState', () => {
  test('右舷死角邊界', () => {
    expect(evaluateSailingState(NO_GO_ZONE_THRESHOLD - 0.1, 34.9, 20).aeroState).toBe('NOGO');
    expect(evaluateSailingState(NO_GO_ZONE_THRESHOLD, 40, 20).aeroState).toBe('OPTIMAL');
  });

  test('左舷死角邊界', () => {
    expect(evaluateSailingState(-(NO_GO_ZONE_THRESHOLD - 0.1), -34.9, -20).aeroState).toBe('NOGO');
    const out = evaluateSailingState(-NO_GO_ZONE_THRESHOLD, -35, -20);
    expect(out.aeroState).toBe('OPTIMAL');
    expect(out.efficiency).toBeCloseTo(1);
  });

  test('LUFFING / STALL 與效率', () => {
    const luff = evaluateSailingState(90, 45, 40);
    expect(luff.aeroState).toBe('LUFFING');
    expect(luff.efficiency).toBeCloseTo(0.5);
    const stall = evaluateSailingState(90, 90, 0);
    expect(stall.aeroState).toBe('STALL');
    expect(stall.efficiency).toBeCloseTo(0.4);
    expect(evaluateSailingState(90, 180, 0).efficiency).toBeCloseTo(0.2);
  });

  test('左右舷對稱', () => {
    const p = evaluateSailingState(-90, -45, -20);
    const s = evaluateSailingState(90, 45, 20);
    expect(p.aeroState).toBe(s.aeroState);
    expect(p.efficiency).toBeCloseTo(s.efficiency);
  });

  test('NaN / Infinity 回傳 NOGO', () => {
    expect(evaluateSailingState(NaN, 45, 20).aeroState).toBe('NOGO');
    expect(evaluateSailingState(90, Infinity, 20).aeroState).toBe('NOGO');
  });
});

describe('遲滯 evaluateSailingStateWithHysteresis', () => {
  const at = (aoa: number, prev: PhysicsState['aeroState']) =>
    evaluateSailingStateWithHysteresis(90, 50 + aoa, 50, prev).aeroState;

  test('窗格內維持上一個狀態', () => {
    expect(at(9, 'OPTIMAL')).toBe('OPTIMAL');
    expect(at(9, 'LUFFING')).toBe('LUFFING');
  });

  test('< 8 進入、> 10 離開', () => {
    expect(at(7.9, 'OPTIMAL')).toBe('LUFFING');
    expect(at(10.1, 'LUFFING')).toBe('OPTIMAL');
  });

  test('死角優先於遲滯', () => {
    expect(evaluateSailingStateWithHysteresis(20, 29, 20, 'LUFFING').aeroState).toBe('NOGO');
  });
});

describe('物理步進 stepPhysics', () => {
  const simulate = (controls: SailingControls, seconds: number, dt = 1 / 60) => {
    let state = createInitialPhysics();
    let flipsInLast5s = 0;
    const steps = Math.round(seconds / dt);
    for (let i = 0; i < steps; i++) {
      const { next } = stepPhysics(state, controls, dt);
      if (i * dt > seconds - 5 && next.aeroState !== state.aeroState) flipsInLast5s++;
      state = next;
    }
    return { state, flipsInLast5s };
  };

  test('不修改輸入狀態', () => {
    const prev = createInitialPhysics();
    const snapshot = { ...prev };
    stepPhysics(prev, { twd: 90, tws: 15, hdg: 0, mainSailAngle: 45 }, 1 / 60);
    expect(prev).toEqual(snapshot);
  });

  test('預設情境收斂：BS ≈ 9、AWA ≈ 59°、Heel ≈ 27°、OPTIMAL', () => {
    const { state, flipsInLast5s } = simulate({ twd: 90, tws: 15, hdg: 0, mainSailAngle: 45 }, 30);
    expect(state.bs).toBeCloseTo(9, 1);
    expect(state.awa).toBeCloseTo(59.04, 0);
    expect(state.heel).toBeGreaterThan(26);
    expect(state.heel).toBeLessThan(28);
    expect(state.aeroState).toBe('OPTIMAL');
    expect(flipsInLast5s).toBe(0);
  });

  test('風從右舷來 → heel 為正；左舷來 → heel 為負', () => {
    const stbd = simulate({ twd: 90, tws: 15, hdg: 0, mainSailAngle: 45 }, 20).state;
    const port = simulate({ twd: 270, tws: 15, hdg: 0, mainSailAngle: -45 }, 20).state;
    expect(stbd.heel).toBeGreaterThan(0);
    expect(port.heel).toBeCloseTo(-stbd.heel, 3);
    expect(port.bs).toBeCloseTo(stbd.bs, 3);
  });

  test('船頭對風（死角）船速歸零', () => {
    const { state } = simulate({ twd: 0, tws: 15, hdg: 0, mainSailAngle: 0 }, 20);
    expect(state.aeroState).toBe('NOGO');
    expect(state.bs).toBeCloseTo(0, 3);
  });

  test('傾角不超過 MAX_HEEL', () => {
    const { state } = simulate({ twd: 90, tws: 40, hdg: 0, mainSailAngle: 45 }, 20);
    expect(Math.abs(state.heel)).toBeLessThanOrEqual(28);
  });

  test('結果與幀率無關（30 fps vs 120 fps）', () => {
    const c = { twd: 90, tws: 15, hdg: 0, mainSailAngle: 45 };
    const slow = simulate(c, 3, 1 / 30).state;
    const fast = simulate(c, 3, 1 / 120).state;
    expect(Math.abs(slow.bs - fast.bs)).toBeLessThan(0.15);
  });

  test('dt 異常值被限制（負數不倒退、大跳躍不爆衝）', () => {
    const prev = { ...createInitialPhysics(), bs: 5 };
    const c = { twd: 90, tws: 15, hdg: 0, mainSailAngle: 45 };
    expect(stepPhysics(prev, c, -1).next.bs).toBeCloseTo(5);
    expect(stepPhysics(prev, c, 10).next.bs).toBeLessThan(6);
  });
});
