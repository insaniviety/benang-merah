import { expect, test } from "bun:test";
import "fake-indexeddb/auto";
import { localDataSchema, makeBackup, parseBackup, readLocalData, writeLocalData } from "./local-data";
import { emptyWorkspace } from "./workspace-lifecycle";
import { bundleFor, cloudBundleSchema } from "./cloud-sync";
import { geminiOutputSchema, selectedStoryInput } from "./gemini-data";

const story = { id: "zod-manuscript", title: "Zod manuscript", genres: ["Wuxia", "Mystery"], language: "Bahasa Indonesia", synopsis: "A mystery", updatedAt: "2026-11-08", chapters: [], content: "Raka berkata, ‘Aku menunggu.’" };
const event = { id: "event", time: "Night", era: "present", track: 1, event: "Raka waits", location: "Home", characters: ["Raka"], connection: "Writer note" };
const workspace = { ...emptyWorkspace(), stories: [story], activeStoryId: story.id, savedCanvases: { [story.id]: { characters: [], relations: [] } }, timelines: { [story.id]: { draft: [event], saved: [event] } }, cloudSynced: { [story.id]: "fingerprint" } };

test("Zod 4 retains manuscript genres and nonempty workspace records through save and restore", async () => {
  await writeLocalData(workspace, "zod-upgrade-account");
  const restored = await readLocalData("zod-upgrade-account");
  expect(restored).toEqual(workspace);
  expect(parseBackup(JSON.parse(makeBackup(workspace)))).toEqual(workspace);
});

test("Zod 4 validates saved canvas and timeline in cloud bundles and AI input", () => {
  expect(cloudBundleSchema.parse(bundleFor(workspace, story.id)).timeline.saved).toEqual([event]);
  const input = selectedStoryInput(workspace, story.id, "inspector", true, ["diction"]);
  expect(input.canvas).toEqual(workspace.savedCanvases[story.id]);
  expect(input.timeline).toEqual([event]);
  expect(input.modes).toEqual(["diction"]);
});

test("Zod 4 rejects malformed stored records and AI output", () => {
  expect(localDataSchema.safeParse({ ...workspace, cloudSynced: { [story.id]: 123 } }).success).toBe(false);
  expect(localDataSchema.safeParse({ ...workspace, savedCanvases: { [story.id]: { characters: "bad", relations: [] } } }).success).toBe(false);
  expect(geminiOutputSchema.safeParse({ events: [], findings: [{ kind: "diction", body: "Issue", source: "Chapter 1", chapterId: null, paragraphIndex: -1, suggestion: null }] }).success).toBe(false);
});