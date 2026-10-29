import type { AeroState } from './sailingMath';

/** Windows 與 macOS 都有的中文字型堆疊，避免中文落到難看的回退字型 */
export const CJK_FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';

/** 帆況狀態的中文顯示名稱；AeroState 本身是物理與測試用的代碼，不可改 */
export const AERO_STATE_LABEL: Record<AeroState, string> = {
  NOGO: '死角',
  LUFFING: '帆面抖振',
  OPTIMAL: '最佳',
  STALL: '失速',
};
