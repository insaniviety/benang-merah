import { createServerFn } from "@tanstack/react-start";
import { geminiInputSchema, type GeminiOutput } from "./gemini-data";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import type { ConcreteProvider } from "./ai-routing";

export type GeminiResult = { ok: true; output: GeminiOutput; provider?: ConcreteProvider; model?: string; attemptedProviders?: ConcreteProvider[]; runId?: string | undefined } | { ok: false; error: string; status?: number | undefined };
export const analyzeWithGemini = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => {
    if (JSON.stringify(value).length > 1500000) throw new Error("Manuscript is too large for one request.");
    return geminiInputSchema.parse(value);
  })
  .handler(async ({ data, context }): Promise<GeminiResult> => {
    setResponseHeader("Cache-Control", "no-store");
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { ok: false, error: "Lovable AI belum dikonfigurasi / Lovable AI is not configured.", status: 401 };
    const { runAnalysis } = await import("./ai/analysis.server");
    // Privileged writes store only terminal access errors, never manuscripts or prompts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await runAnalysis(data, key, getRequest(), {
      read: async (provider) => {
        const { data: row, error } = await context.supabase.from("ai_access_blocks").select("reason,status").eq("user_id", context.userId).eq("provider", provider).maybeSingle();
        if (error) throw new Error("AI access status could not be checked.");
        return row;
      },
      write: async (provider, block) => {
        const { error } = await supabaseAdmin.from("ai_access_blocks").upsert({ user_id: context.userId, provider, reason: block.reason, status: block.status });
        if (error) throw new Error("AI access is blocked; failed to record access status.");
      },
    });
    if (result.ok && result.runId) setResponseHeader("X-Lovable-AIG-Run-ID", result.runId);
    if (!result.ok && result.status === 403) setResponseStatus(403);
    return result;
  });