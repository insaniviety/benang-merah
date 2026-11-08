export const AI_MODES = ["diction", "atmosphere", "pacing", "conflict", "repetition"] as const;
export type AiMode = (typeof AI_MODES)[number];
type Copy = { title: string; hint: string } & Record<AiMode, string>;

export const aiModesCopy: Record<"id" | "en" | "zh-CN" | "zh-TW", Copy> = {
  id: { title: "Mode pemeriksaan tambahan (opsional)", hint: "AI akan memberi saran revisi yang bisa diedit.", diction: "Diksi Karakter", atmosphere: "Atmosfer & Gaya Narasi", pacing: "Pacing Bab", conflict: "Konflik Karakter", repetition: "Alur Terlalu Serupa" },
  en: { title: "Extra review modes (optional)", hint: "AI will suggest editable revisions.", diction: "Character Diction", atmosphere: "Atmosphere & Narrative Style", pacing: "Chapter Pacing", conflict: "Character Conflict", repetition: "Repetitive Plot" },
  "zh-CN": { title: "附加检查模式（可选）", hint: "AI 会给出可编辑的修改建议。", diction: "角色措辞", atmosphere: "氛围与叙事风格", pacing: "章节节奏", conflict: "角色冲突", repetition: "情节过于雷同" },
  "zh-TW": { title: "附加檢查模式（可選）", hint: "AI 會給出可編輯的修改建議。", diction: "角色措辭", atmosphere: "氛圍與敘事風格", pacing: "章節節奏", conflict: "角色衝突", repetition: "情節過於雷同" },
};
