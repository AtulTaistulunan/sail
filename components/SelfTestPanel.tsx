import { useMemo, useState } from 'react';
import { computeApparentWind, evaluateSailingState } from '../utils/sailingMath';
import { CJK_FONT } from '../utils/uiText';

// 瀏覽器內的快速自我檢測（完整測試請跑 npm test）
const runSelfTests = () => {
  const isClose = (val: number, target: number) => Math.abs(val - target) < 0.01;
  const r1 = computeApparentWind(10, 90, 5);
  const r2 = computeApparentWind(10, 45, 5);
  const r3 = computeApparentWind(10, 45, 0);
  return [
    { name: 'AW(10, 90, 5) -> AWA 63.43, AWS 11.18', passed: isClose(r1.awa, 63.43) && isClose(r1.aws, 11.18) },
    { name: 'AW(10, 45, 5) -> AWA 30.36, AWS 13.99', passed: isClose(r2.awa, 30.36) && isClose(r2.aws, 13.99) },
    { name: 'AW(10, 45, 0) -> AWA 45', passed: isClose(r3.awa, 45) },
    { name: 'State(34.9, 34.9, 20) -> NOGO', passed: evaluateSailingState(34.9, 34.9, 20).aeroState === 'NOGO' },
    { name: 'State(-35, -35, -20) -> OPTIMAL', passed: evaluateSailingState(-35, -35, -20).aeroState === 'OPTIMAL' },
    { name: 'State(NaN, 45, 20) -> NOGO', passed: evaluateSailingState(NaN, 45, 20).aeroState === 'NOGO' },
  ];
};

export const SelfTestPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const results = useMemo(runSelfTests, []);
  const allPassed = results.every((r) => r.passed);

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        borderRadius: 8,
        color: '#f8fafc',
        fontFamily: 'monospace',
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          all: 'unset',
          display: 'block',
          padding: '8px 16px',
          cursor: 'pointer',
          fontWeight: 'bold',
          borderBottom: isOpen ? '1px solid #334155' : 'none',
        }}
      >
        {isOpen ? '▼' : '▶'} <span style={{ fontFamily: CJK_FONT }}>自我檢測</span>{' '}
        <span style={{ color: allPassed ? '#4ade80' : '#f87171' }}>{allPassed ? '✔' : '✘'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: 16, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((r) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: r.passed ? '#4ade80' : '#f87171', fontSize: 16 }}>{r.passed ? '✔' : '✘'}</span>
              <span>{r.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
