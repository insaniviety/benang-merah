import { test, expect } from "bun:test";
import { applyBundle, bundleFor } from "./cloud-sync";
import { emptyWorkspace } from "./workspace-lifecycle";
const story = (id, updatedAt) => ({ id, title: id, genres: [], language: "id", synopsis: "", updatedAt, chapters: [], content: "" });
test("cloud manuscript opens on a new device without touching local work", () => {
  const remote = { ...emptyWorkspace(), stories: [story("a", "2026-02-01")], activeStoryId: "a" };
  const local = { ...emptyWorkspace(), stories: [story("b", "2026-01-01")], activeStoryId: "b", notes: [{ id: "n", text: "x", createdAt: "", tag: "" }] };
  const merged = applyBundle(local, bundleFor(remote, "a"));
  expect(merged.stories.map((s) => s.id).sort()).toEqual(["a", "b"]);
  expect(merged.notes.length).toBe(1);
  expect(merged.cloudStoryIds).toEqual(["a"]);
});
test("older cloud copy never overwrites newer local edits", () => {
  const local = { ...emptyWorkspace(), stories: [{ ...story("a", "2026-03-01"), content: "new" }], activeStoryId: "a" };
  const old = { ...emptyWorkspace(), stories: [{ ...story("a", "2026-01-01"), content: "old" }], activeStoryId: "a" };
  expect(applyBundle(local, bundleFor(old, "a")).stories[0].content).toBe("new");
});
