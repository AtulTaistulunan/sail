import type { PhysicsState } from '../utils/sailingMath';
import { AERO_STATE_LABEL, CJK_FONT } from '../utils/uiText';

const stateColor = (state: PhysicsState['aeroState']) =>
  state === 'OPTIMAL' ? '#4ade80' : state === 'NOGO' ? '#f87171' : '#fbbf24';

const Item = ({
  label,
  value,
  color,
  mono = true,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) => (
  <div>
    <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: CJK_FONT, whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 'bold', color, fontFamily: mono ? 'monospace' : CJK_FONT, whiteSpace: 'nowrap' }}>{value}</div>
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
    <Item label="真風角 TWA" value={`${data.twa.toFixed(1)}°`} />
    <Item label="視風角 AWA" value={`${data.awa.toFixed(1)}°`} color="#38bdf8" />
    <Item label="視風速 AWS" value={`${data.aws.toFixed(1)} kt`} />
    <Item label="船速 BS" value={`${data.bs.toFixed(1)} kt`} color="#4ade80" />
    <Item label="傾角 Heel" value={`${data.heel.toFixed(1)}°`} />
    <Item label="帆況 State" value={AERO_STATE_LABEL[data.aeroState]} color={stateColor(data.aeroState)} mono={false} />
  </div>
);
