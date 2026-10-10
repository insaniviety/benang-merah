import { test, expect } from "bun:test";
import { selectedStoryInput } from "./gemini-data";

const story = (id) => ({ id, title: id, genres: [], language: "id", synopsis: "", updatedAt: "", chapters: [], content: "" });
const data = { stories: [story("one"), story("two")], lang: "id", characters: [], savedCanvases: {}, timelines: {} };
test("Gemini requires explicit consent for every request", () => {
  expect(() => selectedStoryInput(data, "one", "inspector", false)).toThrow("Consent required");
});
test("Gemini payload contains only the selected manuscript", () => {
  const input = selectedStoryInput(data, "one", "inspector", true);
  expect(input.story.id).toBe("one");
  expect(JSON.stringify(input)).not.toContain('"two"');
});
test("Inspector uses only explicitly saved timeline and canvas", () => {
  const input = selectedStoryInput({ ...data, timelines: { one: { draft: [{ event: "unsaved" }], saved: null } } }, "one", "inspector", true);
  expect(input.timeline).toEqual([]);
  expect(input.canvas).toBeNull();
});
test("Timeline update sends latest chapters and existing draft, not the saved reference", () => {
  const event = { id: "manual", time: "Today", era: "present", track: 1, event: "Manual event", location: "Home", characters: [], connection: "Writer note" };
  const chapter = { id: "new-chapter", number: 1, title: "New", status: "draft", summary: "New event", words: 1, content: "Latest text", target: 100, updatedAt: "" };
  const input = selectedStoryInput({ ...data, stories: [{ ...story("one"), chapters: [chapter] }], timelines: { one: { draft: [event], saved: [] } } }, "one", "timeline", true);
  expect(input.timeline).toEqual([event]);
  expect(input.story.chapters[0].content).toBe("Latest text");
});