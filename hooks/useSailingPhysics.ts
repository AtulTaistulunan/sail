import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialPhysics, type PhysicsState, type SailingControls } from '../utils/sailingMath';

/**
 * 資料橋樑：本身不跑動畫迴圈。
 * - controlsRef：最新的控制輸入，Scene3D 每幀讀取（不觸發 3D 元件重新渲染）
 * - physicsRef：即時物理狀態，由 Scene3D 每幀寫入
 * - dashboardData：節流到每秒 10 次的 React state，給 Dashboard 顯示
 */
export const useSailingPhysics = (controls: SailingControls) => {
  const controlsRef = useRef<SailingControls>(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const physicsRef = useRef<PhysicsState>(createInitialPhysics());
  const [dashboardData, setDashboardData] = useState<PhysicsState>(physicsRef.current);
  const lastUiTimeRef = useRef(0);

  const throttleDashboardUpdate = useCallback((now: number) => {
    if (now - lastUiTimeRef.current >= 100) {
      setDashboardData({ ...physicsRef.current });
      lastUiTimeRef.current = now;
    }
  }, []);

  return { controlsRef, physicsRef, dashboardData, throttleDashboardUpdate };
};
