export const AI_PROVIDERS = ["auto", "gemini", "claude", "openai"] as const;
export type AiProvider = typeof AI_PROVIDERS[number];
export type ConcreteProvider = Exclude<AiProvider, "auto">;
export const AI_MODELS = { gemini: "google/gemini-3.8-flash", claude: "anthropic/claude-sonnet-5", openai: "openai/gpt-6-astra" } as const;
export function routeAi(provider: AiProvider, task: "timeline" | "inspector", modes: readonly string[]): ConcreteProvider[] {
  if (provider !== "auto") return [provider];
  if (task === "timeline") return ["gemini", "openai"];
  return modes.some((m) => ["diction", "atmosphere", "pacing", "conflict", "repetition", "genre"].includes(m)) ? ["claude", "openai"] : ["openai", "gemini"];
}
export function canFallback(status: number | undefined, terminal = false) { return !terminal && status !== undefined && (status === 429 || status >= 500 && status <= 599); }
export const aiProviderCopy = {
  id: { title: "Pilihan AI", auto: "Otomatis", gemini: "Gemini 3.8 Flash", claude: "Claude Sonnet 5", openai: "GPT-6 Astra", consent: "Kirim naskah ke AI?", privacy: "Hanya bab dan acuan naskah terpilih dikirim melalui Lovable AI. Penyedia AI memiliki kebijakan pemrosesan dan retensi sendiri; Claude dapat menyimpan data. Aplikasi tidak menyimpan isi permintaan AI di server. Penggunaan memakai kredit Lovable AI. Tinjau hasil sebelum menerapkan.", fallback: "Mode otomatis boleh memakai AI cadangan setelah gangguan sementara, dengan jeda; tidak setelah penolakan akses, penolakan konten, atau masalah kredit.", used: "AI yang digunakan", working: "AI sedang menganalisis…" },
  en: { title: "AI selection", auto: "Automatic", gemini: "Gemini 3.8 Flash", claude: "Claude Sonnet 5", openai: "GPT-6 Astra", consent: "Send manuscript to AI?", privacy: "Only chapters and references from the selected manuscript are sent through Lovable AI. Providers have their own processing and retention policies; Claude may retain data. The app does not store AI request content on its server. Usage consumes Lovable AI credits. Review results before applying.", fallback: "Automatic mode may use a backup AI after a temporary error and a delay; never after access denial, content refusal, or a credit issue.", used: "AI used", working: "AI is analyzing…" },
  "zh-CN": { title: "选择 AI", auto: "自动", gemini: "Gemini 3.8 Flash", claude: "Claude Sonnet 5", openai: "GPT-6 Astra", consent: "将书稿发送给 AI？", privacy: "仅通过 Lovable AI 发送所选书稿的章节和参考资料。各提供商有自己的处理和保留政策；Claude 可能保留数据。应用不会在服务器保存 AI 请求内容。使用将消耗 Lovable AI 点数。请先审阅再应用。", fallback: "自动模式仅在暂时错误后等待再使用备用 AI；访问拒绝、内容拒绝或点数问题不会触发切换。", used: "使用的 AI", working: "AI 正在分析…" },
  "zh-TW": { title: "選擇 AI", auto: "自動", gemini: "Gemini 3.8 Flash", claude: "Claude Sonnet 5", openai: "GPT-6 Astra", consent: "將書稿傳送給 AI？", privacy: "僅透過 Lovable AI 傳送所選書稿的章節和參考資料。各提供商有自己的處理和保留政策；Claude 可能保留資料。應用不會在伺服器儲存 AI 請求內容。使用將消耗 Lovable AI 點數。請先審閱再套用。", fallback: "自動模式僅在暫時錯誤後等待再使用備用 AI；存取拒絕、內容拒絕或點數問題不會觸發切換。", used: "使用的 AI", working: "AI 正在分析…" },
} as const;