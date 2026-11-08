import { test, expect } from "bun:test";
import { selectedStoryInput, inspectorFindings } from "./gemini-data";

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
test("extra review modes are sent only for the plot hole checker", () => {
  expect(selectedStoryInput(data, "one", "inspector", true, ["diction", "pacing"]).modes).toEqual(["diction", "pacing"]);
  expect(selectedStoryInput(data, "one", "timeline", true, ["diction"]).modes).toEqual([]);
  expect(selectedStoryInput(data, "one", "inspector", true).modes).toEqual([]);
});
test("genre review receives selected genres unchanged and only for Inspector", () => {
  const selected = { ...data, stories: [{ ...story("one"), genres: ["Romance", "Fantasy"] }] };
  const input = selectedStoryInput(selected, "one", "inspector", true, ["genre"]);
  expect(input.story.genres).toEqual(["Romance", "Fantasy"]);
  expect(input.modes).toEqual(["genre"]);
  expect(selectedStoryInput(selected, "one", "timeline", true, ["genre"]).modes).toEqual([]);
  expect(selected.stories[0].genres).toEqual(["Romance", "Fantasy"]);
});
const genreFinding = { kind: "genre", body: "Plot diverges", source: "Romance vs chapters 1 and 2", chapterId: "chapter-1", paragraphIndex: 0, suggestion: "Replace Romance with Mystery" };
test("genre recommendations cannot become paragraph replacements or automatic genre edits", () => {
  const input = selectedStoryInput({ ...data, stories: [{ ...story("one"), genres: ["Romance"] }] }, "one", "inspector", true, ["genre"]);
  expect(inspectorFindings(input, [genreFinding])).toEqual([{ ...genreFinding, chapterId: null, paragraphIndex: null }]);
  expect(input.story.genres).toEqual(["Romance"]);
});
test("unchecked genre mode and timeline requests exclude genre recommendations", () => {
  expect(inspectorFindings(selectedStoryInput(data, "one", "inspector", true), [genreFinding])).toEqual([]);
  expect(inspectorFindings(selectedStoryInput(data, "one", "timeline", true, ["genre"]), [genreFinding])).toEqual([]);
});
