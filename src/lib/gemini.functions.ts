import { createServerFn } from "@tanstack/react-start";
import { geminiInputSchema, type GeminiOutput } from "./gemini-data";

export type GeminiResult = { ok: true; output: GeminiOutput } | { ok: false; error: string };
export const analyzeWithGemini = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => {
    if (JSON.stringify(value).length > 1500000) throw new Error("Manuscript is too large for one request.");
    return geminiInputSchema.parse(value);
  })
  .handler(async ({ data }): Promise<GeminiResult> => {
    const key = process.env['GOOGLE_API_KEY'];
    if (!key) return { ok: false, error: "Gemini belum dikonfigurasi / Gemini is not configured." };
    // Load server-only code inside the handler; no payload logging or database writes.
    const { runGemini } = await import("./gemini.server");
    return runGemini(data, key);
  });