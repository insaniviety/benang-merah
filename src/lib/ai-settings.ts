import { AI_PROVIDERS, type AiProvider } from "./ai-routing";
// AI preferences are account-isolated on this device; cloud findings require opt-in.
export type AiSettings = { enabled: boolean; persist: "account" | "session" | "cloud"; provider: AiProvider };
export const defaultAiSettings: AiSettings = { enabled: true, persist: "session", provider: "auto" };
const key = (id: string) => `bm-ai-settings:${id}`;
const resultKey = (id: string, storyId: string) => `bm-ai-result:${id}:${storyId}`;

export function readAiSettings(accountId: string): AiSettings {
  try { const v = JSON.parse(localStorage.getItem(key(accountId)) ?? "null"); if (v && typeof v.enabled === "boolean" && ["account","session","cloud"].includes(v.persist)) return { enabled: v.enabled, persist: v.persist, provider: AI_PROVIDERS.includes(v.provider) ? v.provider : "auto" }; } catch { /* ignore */ }
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

// Personal Gemini key stays on this device for this account; sent only with a consented request.
const ownKeyName = (id: string) => `bm-own-gemini-key:${id}`;
export function readOwnKey(accountId: string) { try { return localStorage.getItem(ownKeyName(accountId)) ?? ""; } catch { return ""; } }
export function writeOwnKey(accountId: string, value: string) { const v = value.trim(); if (v) localStorage.setItem(ownKeyName(accountId), v); else localStorage.removeItem(ownKeyName(accountId)); }

export const quotaCopy = {
  id: { defaultOn: "Kunci default Lovable AI aktif — 3 cek gratis/hari, tanpa kunci pribadi", useDefault: "Pakai kunci default", left: (n: number, l: number) => `Kuota gratis: ${n}/${l} tersisa hari ini`, unlimited: "Memakai kunci pribadi — tanpa batas", own: "Kunci API Gemini pribadi (opsional)", placeholder: "Tempel kunci dari Google AI Studio", hint: "Gratis: buka aistudio.google.com → Get API key → tempel di sini. Disimpan hanya di perangkat ini.", exhausted: (l: number) => `Kuota harian (${l}/${l}) sudah terpakai. Reset pukul 07:00 WIB (00:00 UTC), atau tempel kunci API Gemini pribadi di Pengaturan AI untuk analisis tanpa batas.` },
  en: { defaultOn: "Default Lovable AI key active — 3 free checks/day, no personal key needed", useDefault: "Use default key", left: (n: number, l: number) => `Free quota: ${n}/${l} left today`, unlimited: "Using your own key — unlimited", own: "Personal Gemini API key (optional)", placeholder: "Paste a key from Google AI Studio", hint: "Free: open aistudio.google.com → Get API key → paste here. Stored only on this device.", exhausted: (l: number) => `Today's free quota (${l}/${l}) is used up. It resets at 00:00 UTC, or paste your own Gemini API key in AI settings for unlimited checks.` },
  "zh-CN": { defaultOn: "默认 Lovable AI 密钥已启用 — 每天免费 3 次，无需个人密钥", useDefault: "使用默认密钥", left: (n: number, l: number) => `免费额度：今天剩余 ${n}/${l} 次`, unlimited: "正在使用个人密钥 — 不限次数", own: "个人 Gemini API 密钥（可选）", placeholder: "粘贴 Google AI Studio 的密钥", hint: "免费：打开 aistudio.google.com → Get API key → 粘贴到这里。仅保存在本设备。", exhausted: (l: number) => `今日免费额度（${l}/${l}）已用完。将于 UTC 00:00 重置，或在 AI 设置中粘贴个人 Gemini API 密钥以无限使用。` },
  "zh-TW": { defaultOn: "預設 Lovable AI 金鑰已啟用 — 每天免費 3 次，無需個人金鑰", useDefault: "使用預設金鑰", left: (n: number, l: number) => `免費額度：今天剩餘 ${n}/${l} 次`, unlimited: "正在使用個人金鑰 — 不限次數", own: "個人 Gemini API 金鑰（選填）", placeholder: "貼上 Google AI Studio 的金鑰", hint: "免費：開啟 aistudio.google.com → Get API key → 貼到這裡。僅保存在本裝置。", exhausted: (l: number) => `今日免費額度（${l}/${l}）已用完。將於 UTC 00:00 重置，或在 AI 設定中貼上個人 Gemini API 金鑰以無限使用。` },
} as const;
