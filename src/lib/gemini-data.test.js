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