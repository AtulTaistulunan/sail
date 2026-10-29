import type { PhysicsState } from '../utils/sailingMath';

const stateColor = (state: PhysicsState['aeroState']) =>
  state === 'OPTIMAL' ? '#4ade80' : state === 'NOGO' ? '#f87171' : '#fbbf24';

const Item = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div>
    <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 'bold', color }}>{value}</div>
  </div>
);

export const Dashboard = ({ data }: { data: PhysicsState }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid #334155',
      padding: '12px 24px',
      borderRadius: 8,
      display: 'flex',
      gap: 24,
      color: '#f8fafc',
      fontFamily: 'monospace',
      fontVariantNumeric: 'tabular-nums',
      backdropFilter: 'blur(4px)',
    }}
  >
    <Item label="TWA" value={`${data.twa.toFixed(1)}°`} />
    <Item label="AWA" value={`${data.awa.toFixed(1)}°`} color="#38bdf8" />
    <Item label="AWS" value={`${data.aws.toFixed(1)} kt`} />
    <Item label="Speed" value={`${data.bs.toFixed(1)} kt`} color="#4ade80" />
    <Item label="Heel" value={`${data.heel.toFixed(1)}°`} />
    <Item label="State" value={data.aeroState} color={stateColor(data.aeroState)} />
  </div>
);
