// AI Inspector preferences, kept per account on this device. Saved findings never leave the device.
export type AiSettings = { enabled: boolean; persist: "account" | "session" | "cloud" };
export const defaultAiSettings: AiSettings = { enabled: true, persist: "session" };
const key = (id: string) => `bm-ai-settings:${id}`;
const resultKey = (id: string, storyId: string) => `bm-ai-result:${id}:${storyId}`;

export function readAiSettings(accountId: string): AiSettings {
  try { const v = JSON.parse(localStorage.getItem(key(accountId)) ?? "null"); if (v && typeof v.enabled === "boolean" && ["account","session","cloud"].includes(v.persist)) return v; } catch { /* ignore */ }
  return defaultAiSettings;
}
export function writeAiSettings(accountId: string, s: AiSettings) { localStorage.setItem(key(accountId), JSON.stringify(s)); }
export function hasLocalAiSettings(accountId: string) { return localStorage.getItem(key(accountId)) !== null; }
export function readAiResult<T>(accountId: string, storyId: string): T | null {
  try { return JSON.parse(localStorage.getItem(resultKey(accountId, storyId)) ?? "null"); } catch { return null; }
}
export function writeAiResult(accountId: string, storyId: string, value: unknown) { localStorage.setItem(resultKey(accountId, storyId), JSON.stringify(value)); }
export function clearAiResults(accountId: string) {
  Object.keys(localStorage).filter((k) => k.startsWith(`bm-ai-result:${accountId}:`)).forEach((k) => localStorage.removeItem(k));
}

export const aiSettingsCopy = {
  id: { title: "Pengaturan AI", enable: "Aktifkan Cek Plot Hole", store: "Simpan hasil", account: "Di akun (perangkat ini)", session: "Hanya sesi ini", cloud: "Sync ke akun (semua perangkat)", disabled: "Cek Plot Hole dinonaktifkan di Pengaturan AI." },
  en: { title: "AI settings", enable: "Enable Plot Hole Check", store: "Keep results", account: "In account (this device)", session: "This session only", cloud: "Sync to account (all devices)", disabled: "Plot Hole Check is turned off in AI settings." },
  "zh-CN": { title: "AI 设置", enable: "启用情节漏洞检查", store: "保存结果", account: "保存在账户（本设备）", session: "仅本次会话", cloud: "同步到账户（所有设备）", disabled: "情节漏洞检查已在 AI 设置中关闭。" },
  "zh-TW": { title: "AI 設定", enable: "啟用情節漏洞檢查", store: "保存結果", account: "保存在帳戶（本裝置）", session: "僅本次工作階段", cloud: "同步到帳戶（所有裝置）", disabled: "情節漏洞檢查已在 AI 設定中關閉。" },
} as const;

import { supabase } from "@/integrations/supabase/client";
export async function hasCloudAiResults(): Promise<boolean> {
  const { data } = await supabase.from("ai_results").select("story_id").limit(1);
  return (data?.length ?? 0) > 0;
}
export async function readCloudAiResult<T>(storyId: string): Promise<T | null> {
  const { data } = await supabase.from("ai_results").select("result").eq("story_id", storyId).maybeSingle();
  return (data?.result as T) ?? null;
}
export async function writeCloudAiResult(accountId: string, storyId: string, value: unknown) {
  await supabase.from("ai_results").upsert({ user_id: accountId, story_id: storyId, result: value as never, updated_at: new Date().toISOString() });
}
export async function clearCloudAiResults(accountId: string) {
  await supabase.from("ai_results").delete().eq("user_id", accountId);
}

// In-memory copy for "session only" results so other pages can show them this session.
const sessionResults = new Map<string, unknown>();
export function writeSessionAiResult(accountId: string, storyId: string, value: unknown) { sessionResults.set(`${accountId}:${storyId}`, value); }
export function readSessionAiResult<T>(accountId: string, storyId: string): T | null { return (sessionResults.get(`${accountId}:${storyId}`) as T) ?? null; }

export const aiFindingsTabCopy = {
  id: { chapters: "Daftar Bab", findings: "Hasil Cek Plot Hole", empty: "Belum ada hasil Cek Plot Hole untuk naskah ini. Jalankan dari Inspector di Editor Utama.", general: "Umum", suggestion: "Saran", open: "Buka di Editor" },
  en: { chapters: "Chapter list", findings: "Plot Hole results", empty: "No Plot Hole Check results for this manuscript yet. Run it from the Inspector in the Main Dashboard.", general: "General", suggestion: "Suggestion", open: "Open in editor" },
  "zh-CN": { chapters: "章节列表", findings: "情节漏洞检查结果", empty: "这部书稿还没有情节漏洞检查结果。请在工作台的检查面板中运行。", general: "整体", suggestion: "建议", open: "在编辑器中打开" },
  "zh-TW": { chapters: "章節列表", findings: "情節漏洞檢查結果", empty: "這部書稿還沒有情節漏洞檢查結果。請在工作台的檢查面板中執行。", general: "整體", suggestion: "建議", open: "在編輯器中開啟" },
} as const;
