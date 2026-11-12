import { createServerFn } from "@tanstack/react-start";
import { geminiInputSchema, type GeminiOutput } from "./gemini-data";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import type { ConcreteProvider } from "./ai-routing";

export const FREE_DAILY_CHECKS = 3;
export type GeminiResult = { ok: true; output: GeminiOutput; provider?: ConcreteProvider; model?: string; attemptedProviders?: ConcreteProvider[]; runId?: string | undefined } | { ok: false; error: string; status?: number | undefined; quota?: boolean };
export const analyzeWithGemini = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => {
    if (JSON.stringify(value).length > 1500000) throw new Error("Manuscript is too large for one request.");
    const ownKey = (value as { ownKey?: unknown })?.ownKey;
    return { ...geminiInputSchema.parse(value), ownKey: typeof ownKey === "string" && ownKey.trim().length >= 20 && ownKey.length < 200 ? ownKey.trim() : undefined };
  })
  .handler(async ({ data, context }): Promise<GeminiResult> => {
    setResponseHeader("Cache-Control", "no-store");
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { ok: false, error: "Lovable AI belum dikonfigurasi / Lovable AI is not configured.", status: 401 };
    const { ownKey, ...input } = data;
    if (!ownKey) {
      const { data: claimed, error } = await context.supabase.rpc("claim_ai_quota", { _limit: FREE_DAILY_CHECKS });
      if (error) return { ok: false, error: "AI quota could not be checked.", status: 500 };
      if (claimed === -1) return { ok: false, error: "quota", status: 429, quota: true };
    }
    const { runAnalysis } = await import("./ai/analysis.server");
    // Privileged writes store only terminal access errors, never manuscripts or prompts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await runAnalysis(input, key, getRequest(), {
      read: async (provider) => {
        const { data: row, error } = await context.supabase.from("ai_access_blocks").select("reason,status").eq("user_id", context.userId).eq("provider", provider).maybeSingle();
        if (error) throw new Error("AI access status could not be checked.");
        return row;
      },
      write: async (provider, block) => {
        const { error } = await supabaseAdmin.from("ai_access_blocks").upsert({ user_id: context.userId, provider, reason: block.reason, status: block.status });
        if (error) throw new Error("AI access is blocked; failed to record access status.");
      },
    }, ownKey);
    if (!result.ok && !ownKey) await supabaseAdmin.rpc("refund_ai_quota", { _user: context.userId });
    if (result.ok && result.runId) setResponseHeader("X-Lovable-AIG-Run-ID", result.runId);
    if (!result.ok && result.status === 403) setResponseStatus(403);
    return result;
  });
export const getAiQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await context.supabase.from("ai_daily_usage").select("used").eq("user_id", context.userId).eq("usage_date", today).maybeSingle();
    return { used: data?.used ?? 0, limit: FREE_DAILY_CHECKS };
  });
