// SAILING LAB — 純數學與狀態機（不依賴 React / Three.js，可直接單元測試）
//
// 物理慣例：
//   - 方位角 0° = 北、90° = 東，順時針為正
//   - TWD = 真風「來向」；真風速度向量指向 TWD + 180°
//   - AW = TW - BV
//   - TWA = wrap(TWD - HDG)，標準化到 [-180, 180]；正值 = 風從右舷來

export const NO_GO_ZONE_THRESHOLD = 35; // 死角門檻（度），物理與視覺共用的唯一來源

export type AeroState = 'NOGO' | 'LUFFING' | 'OPTIMAL' | 'STALL';

/** 把任意角度標準化到 [-180, 180) */
export const wrap180 = (angle: number): number => {
  const norm = ((angle % 360) + 360) % 360;
  return norm >= 180 ? norm - 360 : norm;
};

/** target - current 的最短角度差，結果在 [-180, 180) */
export const getAngleDiff = (target: number, current: number): number => {
  return ((target - current + 540) % 360) - 180;
};

/**
 * 視風計算（船體座標：x = 右舷、y = 船首；角度一律表示「來向」）
 * @param tws 真風速
 * @param twa 真風角（度）
 * @param bs  船速
 */
export const computeApparentWind = (tws: number, twa: number, bs: number) => {
  const twaRad = (twa * Math.PI) / 180;

  // 真風速度向量（指向 TWA + 180°）
  const twX = -tws * Math.sin(twaRad);
  const twY = -tws * Math.cos(twaRad);

  // AW = TW - BV，BV = (0, bs)
  const awX = twX;
  const awY = twY - bs;

  const aws = Math.sqrt(awX * awX + awY * awY);
  const awa = getAngleDiff((Math.atan2(-awX, -awY) * 180) / Math.PI, 0);

  return { awa, aws };
};

/**
 * 狀態判定。
 * visualAoA 是「教學用帆角差指標」= |AWA - 帆角|，不是真實氣動攻角。
 */
export const evaluateSailingState = (twa: number, awa: number, sailAngle: number) => {
  if (!Number.isFinite(twa) || !Number.isFinite(awa) || !Number.isFinite(sailAngle)) {
    return { isNoGo: true, visualAoA: 0, aeroState: 'NOGO' as AeroState, efficiency: 0.0 };
  }

  const isNoGo = Math.abs(twa) < NO_GO_ZONE_THRESHOLD;
  const visualAoA = Math.abs(getAngleDiff(awa, sailAngle));

  let aeroState: AeroState = 'OPTIMAL';
  let efficiency = 1.0;

  if (isNoGo) {
    aeroState = 'NOGO';
    efficiency = 0.0;
  } else if (visualAoA < 10) {
    aeroState = 'LUFFING';
    efficiency = Math.max(0, visualAoA / 10);
  } else if (visualAoA <= 25) {
    aeroState = 'OPTIMAL';
    efficiency = 1.0;
  } else {
    aeroState = 'STALL';
    efficiency = Math.max(0.2, 1.0 - ((visualAoA - 25) / 65) * 0.6);
  }

  return { isNoGo, visualAoA, aeroState, efficiency };
};

/** 遲滯包裝：帆角差 < 8° 進入 LUFFING、> 10° 才離開 */
export const evaluateSailingStateWithHysteresis = (
  twa: number,
  awa: number,
  sailAngle: number,
  prevState: AeroState,
) => {
  const state = evaluateSailingState(twa, awa, sailAngle);

  if (!state.isNoGo && state.visualAoA >= 8 && state.visualAoA <= 10) {
    if (prevState !== 'LUFFING') {
      state.aeroState = 'OPTIMAL';
      state.efficiency = 1.0;
    } else {
      state.aeroState = 'LUFFING';
      state.efficiency = Math.max(0, state.visualAoA / 10);
    }
  }

  return state;
};

// ------------------------------------------------------------
// 物理步進（純函式，Scene3D 的動畫迴圈每幀呼叫一次）
// ------------------------------------------------------------

export interface SailingControls {
  twd: number;
  tws: number;
  hdg: number;
  mainSailAngle: number;
}

export interface PhysicsState {
  twa: number;
  awa: number;
  aws: number;
  bs: number;
  heel: number;
  aeroState: AeroState;
}

export const TAU_BOAT_SPEED = 1.0; // 秒
export const TAU_HEEL = 0.3; // 秒
export const MAX_HEEL = 28; // 度（tanh 飽和上限）

export const createInitialPhysics = (): PhysicsState => ({
  twa: 0,
  awa: 0,
  aws: 0,
  bs: 0,
  heel: 0,
  aeroState: 'NOGO',
});

/** 把時間步長限制在 [0, 0.1] 秒，避免分頁休眠後大跳躍或負值 */
export const clampDt = (dt: number): number => Math.min(Math.max(dt, 0), 0.1);

/**
 * 推進一個時間步長，回傳新狀態（不修改輸入）。
 * 計算視風時使用「上一幀的實際船速」，避免 AWA ↔ 船速的循環依賴。
 */
export const stepPhysics = (prev: PhysicsState, controls: SailingControls, dtSeconds: number) => {
  const dt = clampDt(dtSeconds);
  const twa = wrap180(controls.twd - controls.hdg);
  const { awa, aws } = computeApparentWind(controls.tws, twa, prev.bs);
  const { isNoGo, aeroState, efficiency, visualAoA } = evaluateSailingStateWithHysteresis(
    twa,
    awa,
    controls.mainSailAngle,
    prev.aeroState,
  );

  const targetBS = isNoGo ? 0 : controls.tws * 0.6 * efficiency;
  const targetHeel =
    MAX_HEEL * Math.tanh(((aws * aws) / 50) * Math.sin((awa * Math.PI) / 180) * efficiency * 12 / MAX_HEEL);

  const alphaBS = 1 - Math.exp(-dt / TAU_BOAT_SPEED);
  const alphaHeel = 1 - Math.exp(-dt / TAU_HEEL);

  const next: PhysicsState = {
    twa,
    awa,
    aws,
    bs: prev.bs + (targetBS - prev.bs) * alphaBS,
    heel: prev.heel + (targetHeel - prev.heel) * alphaHeel,
    aeroState,
  };

  return { next, efficiency, visualAoA, isNoGo };
};
