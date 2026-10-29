import { useCallback, useState } from 'react';
import { Scene3D } from './components/Scene3D';
import { Dashboard } from './components/Dashboard';
import { ControlPanel } from './components/ControlPanel';
import { SelfTestPanel } from './components/SelfTestPanel';
import { useSailingPhysics } from './hooks/useSailingPhysics';
import type { SailingControls } from './utils/sailingMath';

export default function App() {
  const [controls, setControls] = useState<SailingControls>({
    twd: 90,
    tws: 15,
    hdg: 0,
    mainSailAngle: 45,
  });

  const updateControls = useCallback(
    (patch: Partial<SailingControls>) => setControls((prev) => ({ ...prev, ...patch })),
    [],
  );

  const { controlsRef, physicsRef, dashboardData, throttleDashboardUpdate } = useSailingPhysics(controls);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#0f172a' }}>
      <Scene3D controlsRef={controlsRef} physicsRef={physicsRef} throttleDashboardUpdate={throttleDashboardUpdate} />
      <ControlPanel controls={controls} onChange={updateControls} />
      <SelfTestPanel />
      <Dashboard data={dashboardData} />
    </div>
  );
}
