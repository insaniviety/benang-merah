// AI Inspector preferences, kept per account on this device. Saved findings never leave the device.
export type AiSettings = { enabled: boolean; persist: "account" | "session" };
export const defaultAiSettings: AiSettings = { enabled: true, persist: "session" };
const key = (id: string) => `bm-ai-settings:${id}`;
const resultKey = (id: string, storyId: string) => `bm-ai-result:${id}:${storyId}`;

export function readAiSettings(accountId: string): AiSettings {
  try { const v = JSON.parse(localStorage.getItem(key(accountId)) ?? "null"); if (v && typeof v.enabled === "boolean" && (v.persist === "account" || v.persist === "session")) return v; } catch { /* ignore */ }
  return defaultAiSettings;
}
export function writeAiSettings(accountId: string, s: AiSettings) { localStorage.setItem(key(accountId), JSON.stringify(s)); }
export function readAiResult<T>(accountId: string, storyId: string): T | null {
  try { return JSON.parse(localStorage.getItem(resultKey(accountId, storyId)) ?? "null"); } catch { return null; }
}
export function writeAiResult(accountId: string, storyId: string, value: unknown) { localStorage.setItem(resultKey(accountId, storyId), JSON.stringify(value)); }
export function clearAiResults(accountId: string) {
  Object.keys(localStorage).filter((k) => k.startsWith(`bm-ai-result:${accountId}:`)).forEach((k) => localStorage.removeItem(k));
}

export const aiSettingsCopy = {
  id: { title: "Pengaturan AI", enable: "Aktifkan Cek Plot Hole", store: "Simpan hasil", account: "Di akun (perangkat ini)", session: "Hanya sesi ini", disabled: "Cek Plot Hole dinonaktifkan di Pengaturan AI." },
  en: { title: "AI settings", enable: "Enable Plot Hole Check", store: "Keep results", account: "In account (this device)", session: "This session only", disabled: "Plot Hole Check is turned off in AI settings." },
  "zh-CN": { title: "AI 设置", enable: "启用情节漏洞检查", store: "保存结果", account: "保存在账户（本设备）", session: "仅本次会话", disabled: "情节漏洞检查已在 AI 设置中关闭。" },
  "zh-TW": { title: "AI 設定", enable: "啟用情節漏洞檢查", store: "保存結果", account: "保存在帳戶（本裝置）", session: "僅本次工作階段", disabled: "情節漏洞檢查已在 AI 設定中關閉。" },
} as const;
