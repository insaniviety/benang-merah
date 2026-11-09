import { test, expect } from "bun:test";
import { applyBundle, bundleFor, enableDefaultCloud } from "./cloud-sync";
import { emptyWorkspace } from "./workspace-lifecycle";
const story = (id, updatedAt) => ({ id, title: id, genres: [], language: "id", synopsis: "", updatedAt, chapters: [], content: "" });
test("existing local manuscripts enroll once while explicit local-only work stays excluded", () => {
  const data = { ...emptyWorkspace(), cloudDefaultsApplied: false, stories: [story("a", "2026-01-01"), story("b", "2026-01-01")], activeStoryId: "a", localOnlyStoryIds: ["b"] };
  const next = enableDefaultCloud(data);
  expect(next.cloudStoryIds).toEqual(["a"]);
  expect(next.cloudDefaultsApplied).toBe(true);
  expect(enableDefaultCloud({ ...next, cloudStoryIds: [] }).cloudStoryIds).toEqual([]);
});
test("old backups enroll all existing manuscripts and retain notes locally", () => {
  const data = { ...emptyWorkspace(), cloudDefaultsApplied: false, stories: [story("a", "2026-01-01"), story("b", "2026-01-01")], activeStoryId: "a", notes: [{ id: "n", text: "private note", createdAt: "", tag: "" }] };
  const next = enableDefaultCloud(data);
  expect(next.cloudStoryIds).toEqual(["a", "b"]);
  expect(bundleFor(next, "a")).not.toHaveProperty("notes");
  expect(next.notes[0].text).toBe("private note");
});
test("explicit local-only choice prevents cloud copies overwriting and re-enabling work", () => {
  const local = { ...emptyWorkspace(), stories: [story("a", "2026-01-01")], activeStoryId: "a", localOnlyStoryIds: ["a"] };
  const remote = { ...local, localOnlyStoryIds: [], stories: [{ ...story("a", "2026-02-01"), content: "remote" }] };
  const next = reconcileCloud(local, [{ story_id: "a", bundle: bundleFor(remote, "a") }]);
  expect(next.stories[0].content).toBe("");
  expect(next.cloudStoryIds).toEqual([]);
});
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
import { bundleHash, reconcileCloud } from "./cloud-sync";
const ch = (id, name) => ({ id, storyId: "a", name, role: "supporting", identity: "", diction: "", status: "active", hue: 0, bio: "", x: 0, y: 0 });
test("character edits from another device load when this device has no unsynced edits", () => {
  const base = { ...emptyWorkspace(), stories: [story("a", "2026-01-01")], activeStoryId: "a", cloudStoryIds: ["a"] };
  const local = { ...base, cloudSynced: { a: bundleHash(bundleFor(base, "a")) } };
  const remote = { ...base, characters: [ch("c1", "Lin")] };
  const merged = reconcileCloud(local, [{ story_id: "a", bundle: bundleFor(remote, "a") }]);
  expect(merged.characters.map((c) => c.name)).toEqual(["Lin"]);
  expect(merged.cloudSynced.a).toBe(bundleHash(bundleFor(merged, "a")));
});
test("unsynced local character edits are kept and not marked synced", () => {
  const base = { ...emptyWorkspace(), stories: [story("a", "2026-01-01")], activeStoryId: "a", cloudStoryIds: ["a"] };
  const local = { ...base, characters: [ch("c2", "Mei")], cloudSynced: { a: bundleHash(bundleFor(base, "a")) } };
  const merged = reconcileCloud(local, [{ story_id: "a", bundle: bundleFor(base, "a") }]);
  expect(merged.characters.map((c) => c.name)).toEqual(["Mei"]);
  expect(merged.cloudSynced.a).not.toBe(bundleHash(bundleFor(merged, "a")));
});
test("manuscript deleted in the cloud elsewhere stops syncing here instead of being re-uploaded", () => {
  const base = { ...emptyWorkspace(), stories: [story("a", "2026-01-01")], activeStoryId: "a", cloudStoryIds: ["a"] };
  const merged = reconcileCloud({ ...base, cloudSynced: { a: "x" } }, []);
  expect(merged.cloudStoryIds).toEqual([]);
  expect(merged.stories.length).toBe(1);
});
test("newly switched-on manuscript not yet uploaded keeps syncing", () => {
  const base = { ...emptyWorkspace(), stories: [story("a", "2026-01-01")], activeStoryId: "a", cloudStoryIds: ["a"] };
  expect(reconcileCloud(base, []).cloudStoryIds).toEqual(["a"]);
});
test("reloading reorders object keys but a clean device still takes the newer cloud characters", () => {
  const s = { content: "", chapters: [], updatedAt: "2026-01-01", synopsis: "", language: "id", genres: [], title: "a", id: "a" };
  const base = { ...emptyWorkspace(), stories: [s], activeStoryId: "a", cloudStoryIds: ["a"] };
  const syncedHash = bundleHash(bundleFor(base, "a"));
  const reloaded = { ...base, stories: [story("a", "2026-01-01")], cloudSynced: { a: syncedHash } };
  expect(bundleHash(bundleFor(reloaded, "a"))).toBe(syncedHash);
  const remote = { ...reloaded, characters: [ch("c9", "Yun")] };
  const merged = reconcileCloud(reloaded, [{ story_id: "a", bundle: bundleFor(remote, "a") }]);
  expect(merged.characters.map((c) => c.name)).toEqual(["Yun"]);
  expect(merged.cloudSynced.a).toBe(bundleHash(bundleFor(merged, "a")));
});
