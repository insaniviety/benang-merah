import { expect, test } from "bun:test";
import { routeAi, canFallback, AI_MODELS } from "./ai-routing";
test("timeline automatically uses Gemini then OpenAI", () => expect(routeAi("auto", "timeline", [])).toEqual(["gemini", "openai"]));
test("core consistency uses OpenAI", () => expect(routeAi("auto", "inspector", [])).toEqual(["openai", "gemini"]));
test("optional craft checks use Claude", () => expect(routeAi("auto", "inspector", ["diction", "conflict"])).toEqual(["claude", "openai"]));
test("manual selection never switches providers", () => expect(routeAi("claude", "timeline", [])).toEqual(["claude"]));
test("denials credits refusals and timeouts never trigger fallback", () => { for (const s of [400,401,402,403,404,undefined]) expect(canFallback(s)).toBe(false); expect(canFallback(503,true)).toBe(false); });
test("only transient HTTP failures allow delayed fallback", () => { expect(canFallback(429)).toBe(true); expect(canFallback(503)).toBe(true); });
test("routing preserves Gemini and uses current discovered models", () => expect(AI_MODELS).toEqual({ gemini: "google/gemini-3.8-flash", claude: "anthropic/claude-sonnet-5", openai: "openai/gpt-6-astra" }));