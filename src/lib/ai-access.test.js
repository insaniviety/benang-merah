import { expect, test } from "bun:test";
import { runAnalysis } from "./ai/analysis.server";
test("persisted access denial stops automatic routing before any model call", async () => {
  const read = [];
  const result = await runAnalysis({ provider: "auto", task: "inspector", modes: [] }, "unused", new Request("http://localhost"), { read: async (provider) => { read.push(provider); return { reason: "Access denied", status: 403 }; }, write: async () => { throw new Error("must not write"); } });
  expect(result).toEqual({ ok: false, error: "Access denied", status: 403 });
  expect(read).toEqual(["openai"]);
});
test("persisted credit pause stops the entire automatic chain", async () => {
  const result = await runAnalysis({ provider: "auto", task: "timeline", modes: [] }, "unused", new Request("http://localhost"), { read: async () => ({ reason: "Top up AI credits", status: 402 }), write: async () => { throw new Error("must not write"); } });
  expect(result).toEqual({ ok: false, error: "Top up AI credits", status: 402 });
});