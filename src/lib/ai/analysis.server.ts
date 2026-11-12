import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Output, streamText } from "ai";
import { z } from "zod";
import { createResponsesCall } from "./responses.server.ts";
import { createLovableAiGatewayProvider } from "./gateway-helpers.server.ts";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server.ts";
import { aiInstructions, aiContract } from "./prompts.server";
import { geminiOutputSchema, inspectorFindings, type GeminiInput } from "../gemini-data";
import { AI_MODELS, canFallback, routeAi, type ConcreteProvider } from "../ai-routing";
import type { GeminiResult } from "../gemini.functions";

// Wire schemas stay strict and unconstrained; existing local schemas validate the result.
const event = z.object({ id: z.string().nullable(), time: z.string(), era: z.enum(["past", "present"]), track: z.number().int(), event: z.string(), location: z.string(), characters: z.array(z.string()), connection: z.string() }).strict();
const finding = z.object({ kind: z.enum(["chronology","text","world","relationship","diction","atmosphere","pacing","conflict","repetition","genre"]), body: z.string(), source: z.string(), chapterId: z.string().nullable(), paragraphIndex: z.number().int().nullable(), suggestion: z.string().nullable() }).strict();
const wireSchema = z.object({ events: z.array(event), findings: z.array(finding) }).strict();
export type AccessBlock = { reason: string; status: number };
export type BlockStore = { read: (provider: ConcreteProvider) => Promise<AccessBlock | null>; write: (provider: ConcreteProvider, block: AccessBlock) => Promise<void> };

function safeFailure(error: unknown) {
  const e = error as { statusCode?: number; responseBody?: string; message?: string; cause?: unknown };
  if (e?.cause && !e.statusCode) return safeFailureLeaf(e.cause);
  return safeFailureLeaf(error);
}
function safeFailureLeaf(error: unknown): { status: number | undefined; message: string; retryAfter: number; terminal: boolean; persist: boolean } {
  const e = error as { statusCode?: number; responseBody?: string; message?: string; responseHeaders?: Record<string,string> };
  let body: { message?: string; error?: { message?: string; type?: string }; props?: { retryable?: boolean; requires?: string } } = {};
  try { body = JSON.parse(e?.responseBody ?? "{}"); } catch { /* no payload logging */ }
  const status = e?.statusCode;
  const message = body.error?.message ?? body.message ?? (status ? `AI HTTP ${status}` : "AI did not return a complete valid result / AI tidak menghasilkan jawaban lengkap yang valid.");
  const accountProblem = !!body.props?.requires || body.props?.retryable === false || /account|configuration|billing|permission|refusal|denied/i.test(message);
  return { status, message, retryAfter: Math.max(2000, (Number(e?.responseHeaders?.["retry-after"]) || 0) * 1000), terminal: accountProblem, persist: status === 402 || status === 403 };
}

export const OWN_GEMINI_MODEL = "gemini-2.5-flash";
// ownGeminiKey: writer's personal Google AI Studio key, used for this request only, never stored or logged.
export async function runAnalysis(input: GeminiInput, key: string, request: Request, blocks: BlockStore, ownGeminiKey?: string): Promise<GeminiResult> {
  const plan: ConcreteProvider[] = ownGeminiKey ? ["gemini"] : routeAi(input.provider, input.task, input.modes);
  const used: ConcreteProvider[] = [];
  if (!ownGeminiKey) for (const provider of plan) {
    const block = await blocks.read(provider);
    if (block) return { ok: false, error: block.reason, status: block.status };
  }
  let runId: string | undefined;
  for (const provider of plan) {
    used.push(provider);
    try {
      const instructions = aiInstructions(input) + " Event track must be an integer from 1 to 4; era must be past or present. Unknown time, location and connection must be empty strings, never null. Characters must be an array. paragraphIndex must be zero-based nonnegative or null." + (provider === "gemini" ? ` Return ONLY a JSON object matching this schema, including every nullable field explicitly: ${JSON.stringify(z.toJSONSchema(wireSchema))}` : "");
      const messages = [{ role: "user" as const, content: `${provider === "gemini" ? instructions + "\n" : ""}${JSON.stringify(input)}\n${aiContract(input)}` }];
      let output: unknown;
      let finish: string;
      if (provider === "openai") {
        const call = createResponsesCall(request, { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, model: AI_MODELS.openai, runId }, messages, instructions, wireSchema);
        output = await call.result.output;
        finish = await call.result.finishReason;
        runId = call.getRunId();
      } else {
        const own = ownGeminiKey ? createOpenAICompatible({ name: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: ownGeminiKey }) : null;
        const gateway = provider === "gemini" && !own ? createLovableAiGatewayProvider(key, runId, { baseURL: "https://ai.gateway.lovable.dev/v1" }) : null;
        const correlation = createLovableAiGatewayRunIdFetch(runId);
        const anthropic = createAnthropic({ apiKey: key, baseURL: "https://ai.gateway.lovable.dev/v1", headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: correlation.fetch });
        const result = streamText({
          model: own ? own(OWN_GEMINI_MODEL) : gateway ? gateway(AI_MODELS.gemini) : anthropic(AI_MODELS.claude),
          instructions, messages, ...(provider === "claude" ? { output: Output.object({ schema: wireSchema }) } : {}), maxRetries: 0,
          ...(provider === "claude" ? { maxOutputTokens: 16000 } : {}),
          abortSignal: request.signal,
        });
        if (provider === "gemini") {
          const text = await result.text;
          output = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
        } else output = await result.output;
        finish = await result.finishReason;
        runId = own ? undefined : gateway ? gateway.getRunId() : correlation.getRunId();
      }
      if (finish !== "stop") return { ok: false, error: `AI returned no complete answer (${finish}).`, status: 422 };
      const parsed = geminiOutputSchema.safeParse(output);
      if (!parsed.success) return { ok: false, error: `Format hasil AI tidak valid / AI returned an invalid result (${parsed.error.issues.map((i) => i.path.join(".") + ": " + i.code).join("; ")}).`, status: 422 };
      const findings = inspectorFindings(input, parsed.data.findings);
      return { ok: true, output: input.task === "timeline" ? { events: parsed.data.events, findings: [] } : { events: [], findings }, provider, model: ownGeminiKey ? `${OWN_GEMINI_MODEL} (own key)` : AI_MODELS[provider], attemptedProviders: used, runId };
    } catch (error) {
      // Diagnostics contain error type only, never payloads, output or credentials.
      console.warn("AI analysis failure", provider, error instanceof Error ? error.name : "unknown");
      if (request.signal.aborted) return { ok: false, error: "AI request stopped.", status: 499 };
      const failure = safeFailure(error);
      if (failure.persist && !ownGeminiKey) await blocks.write(provider, { reason: failure.message, status: failure.status ?? 403 });
      if (used.length === plan.length || !canFallback(failure.status, failure.terminal)) return { ok: false, error: failure.message, status: failure.status };
      // One recovery layer only, never instant or timeout-based switching.
      if (failure.retryAfter > 30000) return { ok: false, error: failure.message, status: failure.status };
      await new Promise((resolve) => setTimeout(resolve, failure.retryAfter + Math.random() * 500));
    }
  }
  return { ok: false, error: "AI unavailable." };
}