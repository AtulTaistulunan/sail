# SAILING LAB — Interactive Sailing Simulator

React + Vanilla Three.js 的帆船教學模擬器。

## 執行

```bash
npm install
npm run dev        # 開發伺服器
npm test           # Jest 單元測試
npm run typecheck  # TypeScript 型別檢查
npm run build      # 正式建置到 dist/
```

## 檔案結構

| 檔案 | 內容 |
|---|---|
| `utils/sailingMath.ts` | 純數學：角度、視風、狀態機、遲滯、物理步進 `stepPhysics` |
| `utils/sailingMath.test.ts` | Jest 測試 |
| `hooks/useSailingPhysics.ts` | 控制輸入與物理狀態的 ref 橋樑、儀表板節流 |
| `components/Scene3D.tsx` | 唯一的動畫迴圈：物理 → 帆面變形 → 渲染 |
| `components/Dashboard.tsx` | 底部數值面板 |
| `components/ControlPanel.tsx` | 左側滑桿 |
| `components/SelfTestPanel.tsx` | 瀏覽器內快速自我檢測 |

## 物理慣例

- 方位角 0° = 北、90° = 東，順時針為正
- TWD = 真風來向；真風速度向量指向 TWD + 180°
- `AW = TW - BV`
- `TWA = wrap(TWD - HDG)`，標準化到 [-180°, 180°)；正值 = 風從右舷來
- 死角門檻 `NO_GO_ZONE_THRESHOLD` 是物理與視覺共用的唯一來源
- `visualAoA = |AWA - 帆角|` 是教學用帆角差指標，不是真實氣動攻角

## 3D 座標慣例

- 世界座標：北 = -Z、東 = +X、上 = +Y
- 船體局部：船首朝 -Z、+X = 右舷；`rotation.y = -HDG`
- 傾角：`rotation.z = +heel`（heel > 0 時往左舷倒），旋轉順序 `YXZ`
- 帆角正值：帆桁甩向左舷

## 開發進度

- [x] 階段一：數學與物理模型
- [x] 階段二：船體、帆面樞軸與 3D 場景
- [x] 階段三：帆面弧度、風標線與狀態整合（單元測試 22/22、瀏覽器畫面驗收 10/10 通過，2026-10-29）
- [ ] 階段四：教學模式與互動引導
