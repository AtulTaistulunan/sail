import type { SailingControls } from '../utils/sailingMath';

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

// 定義在元件外部，避免父元件重新渲染時被重建而中斷滑桿拖曳
const Slider = ({ id, label, value, min, max, unit, onChange }: SliderProps) => (
  <div style={{ marginBottom: 16 }}>
    <label htmlFor={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>
        {value}
        {unit}
      </span>
    </label>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', cursor: 'pointer' }}
    />
  </div>
);

export const ControlPanel = ({
  controls,
  onChange,
}: {
  controls: SailingControls;
  onChange: (patch: Partial<SailingControls>) => void;
}) => (
  <div
    style={{
      position: 'absolute',
      top: 20,
      left: 20,
      width: 280,
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid #334155',
      padding: 24,
      borderRadius: 8,
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      backdropFilter: 'blur(4px)',
    }}
  >
    <h2 style={{ margin: '0 0 20px 0', fontSize: 18, borderBottom: '1px solid #334155', paddingBottom: 10 }}>
      Controls
    </h2>
    <Slider id="twd" label="True Wind Dir (TWD)" value={controls.twd} min={0} max={359} unit="°" onChange={(twd) => onChange({ twd })} />
    <Slider id="tws" label="Wind Speed (TWS)" value={controls.tws} min={0} max={40} unit=" kt" onChange={(tws) => onChange({ tws })} />
    <Slider id="hdg" label="Heading (HDG)" value={controls.hdg} min={0} max={359} unit="°" onChange={(hdg) => onChange({ hdg })} />
    <Slider id="sail" label="Main Sail Angle" value={controls.mainSailAngle} min={-90} max={90} unit="°" onChange={(mainSailAngle) => onChange({ mainSailAngle })} />
    <div style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
      * Drag scene to rotate camera
      <br />* Scroll to zoom
    </div>
  </div>
);
