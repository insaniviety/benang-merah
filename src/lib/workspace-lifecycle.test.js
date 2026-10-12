import { describe, expect, test } from "bun:test";
import { emptyWorkspace, removeManuscripts, cleanLegacyPresets } from "./workspace-lifecycle";
import { localDataSchema, makeBackup, parseBackup } from "./local-data";

const story = (id) => ({ id, title: id, genres: ["Fantasy"], language: "English", synopsis: "", updatedAt: "2026-10-12", chapters: [], content: "Writer text" });
const character = (id, storyId) => ({ id, storyId, name: id, role: "supporting", identity: "", diction: "", status: "active", hue: 1, bio: "", x: 1, y: 1 });
function workspace() {
  const characters = [character("a", "s1"), character("b", "s1"), character("c", "mine")];
  const relation = { id: "relation", storyId: "s1", from: "a", to: "b", type: "family", label: "", history: [] };
  return { ...emptyWorkspace(), stories: [story("s1"), story("mine")], activeStoryId: "s1", characters, relations: [relation],
    savedCanvases: { s1: { characters: characters.slice(0, 2), relations: [relation] } },
    timelines: { s1: { draft: [], saved: [] } }, unconfirmedStoryIds: ["s1", "mine"], writerName: "Ivana" };
}
describe("local workspace lifecycle", () => {
  test("first use has no preset writing data or profile", () => {
    const data = emptyWorkspace();
    expect([data.stories.length, data.characters.length, data.relations.length, data.notes.length]).toEqual([0, 0, 0, 0]);
    expect(data.savedCanvases).toEqual({}); expect(data.timelines).toEqual({});
    expect(data.writerName).toBeNull(); expect(data.activeStoryId).toBe("");
    expect(localDataSchema.parse(data)).toEqual(data);
  });
  test("confirmed deletion removes manuscript-owned references and preserves other work", () => {
    const data = workspace();
    const next = removeManuscripts(data, new Set(["s1"]));
    expect(next.stories.map((story) => story.id)).toEqual(["mine"]);
    expect(next.activeStoryId).toBe("mine"); expect(next.characters.map((character) => character.id)).toEqual(["c"]);
    expect(next.relations).toEqual([]); expect(next.savedCanvases).toEqual({}); expect(next.timelines).toEqual({});
    expect(next.unconfirmedStoryIds).toEqual(["mine"]); expect(next.writerName).toBe("Ivana");
    expect(data.stories).toHaveLength(2);
    expect(parseBackup(JSON.parse(makeBackup(next)))).toEqual(next);
  });
  test("deleting the final manuscript produces a valid empty workspace", () => {
    const next = removeManuscripts(workspace(), new Set(["s1", "mine"]));
    expect(next.activeStoryId).toBe(""); expect(next.stories).toEqual([]);
    expect(parseBackup(JSON.parse(makeBackup(next))).stories).toEqual([]);
  });
  test("one-time preset cleanup preserves user manuscripts and notes", () => {
    const data = { ...workspace(), presetsCleaned: false, notes: [
      { id: "n1", text: "sample", tag: "Idea", createdAt: "2026-10-12" },
      { id: "own-note", text: "Keep me", tag: "Idea", createdAt: "2026-10-12" },
    ] };
    const next = cleanLegacyPresets(data);
    expect(next.stories.map((story) => story.id)).toEqual(["mine"]);
    expect(next.notes.map((note) => note.id)).toEqual(["own-note"]);
    expect(cleanLegacyPresets(next)).toBe(next);
  });
  test("writer name persists in backups and old backups remain readable", () => {
    expect(parseBackup(JSON.parse(makeBackup(workspace()))).writerName).toBe("Ivana");
    const old = { ...emptyWorkspace() }; delete old.writerName; delete old.presetsCleaned;
    expect(localDataSchema.parse(old).writerName).toBeNull();
  });
});