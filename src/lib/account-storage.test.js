import { expect, test } from "bun:test";
import "fake-indexeddb/auto";
import { accountWorkspaceKey } from "./account-storage";
import { readLocalData, writeLocalData, claimLegacyWorkspace } from "./local-data";
import { emptyWorkspace } from "./workspace-lifecycle";

test("account IDs isolate all local writing and restore the last saved input", async () => {
  const a = { ...emptyWorkspace(), notes: [{ id: "a-note", text: "Account A last input", tag: "Idea", createdAt: "2026-10-14" }] };
  await writeLocalData(a, "account-a");
  expect(await readLocalData("account-b")).toBeNull();
  await writeLocalData(emptyWorkspace(), "account-b");
  expect((await readLocalData("account-a"))?.notes[0]?.text).toBe("Account A last input");
  expect((await readLocalData("account-b"))?.notes).toEqual([]);
  expect(accountWorkspaceKey("account-a")).not.toBe(accountWorkspaceKey("account-b"));
});
test("no anonymous or empty identity may write an account collection", () => {
  expect(() => accountWorkspaceKey("")).toThrow();
  expect(() => accountWorkspaceKey("   ")).toThrow();
});
const orphan = { id: "orphan", storyId: "", name: "No manuscript", role: "supporting", status: "active", identity: "", diction: "", bio: "", hue: 0, x: 0, y: 0 };

test("characters without a manuscript cannot overwrite a valid account workspace", async () => {
  const data = { ...emptyWorkspace(), notes: [{ id: "safe", text: "Keep my notes", tag: "Idea", createdAt: "2026-10-15" }] };
  await writeLocalData(data, "guarded-account");
  expect(() => writeLocalData({ ...data, characters: [orphan] }, "guarded-account")).toThrow("Invalid relationships");
  expect((await readLocalData("guarded-account"))?.notes).toEqual(data.notes);
});

test("legacy empty-story characters are repaired persistently without losing notes or manuscripts", async () => {
  const story = { id: "valid-story", title: "My manuscript", genres: [], language: "English", synopsis: "", updatedAt: "2026-10-15", chapters: [], content: "Keep my draft" };
  const valid = { ...orphan, id: "valid-character", storyId: story.id, name: "Keep this character" };
  const note = { id: "keep", text: "Keep my note", tag: "Idea", createdAt: "2026-10-15" };
  const db = await new Promise((resolve) => { const request = indexedDB.open("benang-merah", 1); request.onsuccess = () => resolve(request.result); });
  const damaged = { ...emptyWorkspace(), stories: [story], activeStoryId: story.id, characters: [orphan, valid], notes: [note],
    relations: [{ id: "orphan-thread", storyId: "", from: orphan.id, to: valid.id, type: "family", label: "", history: [] }],
    savedCanvases: { "": { characters: [orphan], relations: [] }, [story.id]: { characters: [valid], relations: [] } },
    timelines: { "": { draft: [], saved: null }, [story.id]: { draft: [], saved: [] } } };
  await new Promise((resolve) => { const tx = db.transaction("workspace", "readwrite"); tx.objectStore("workspace").put(damaged, accountWorkspaceKey("repair-account")); tx.oncomplete = resolve; });
  const repaired = await readLocalData("repair-account");
  expect(repaired?.characters).toEqual([valid]);
  expect(repaired?.relations).toEqual([]);
  expect(repaired?.notes).toEqual([note]);
  expect(repaired?.stories).toEqual([story]);
  expect(repaired?.savedCanvases).toEqual({ [story.id]: damaged.savedCanvases[story.id] });
  expect(repaired?.timelines).toEqual({ [story.id]: damaged.timelines[story.id] });
  const stored = await new Promise((resolve) => { const tx = db.transaction("workspace", "readonly"); const request = tx.objectStore("workspace").get(accountWorkspaceKey("repair-account")); request.onsuccess = () => resolve(request.result); });
  expect(stored).toEqual(repaired);
  expect(await readLocalData("repair-account")).toEqual(repaired);
  db.close();
});

test("a fresh workspace with only an orphan character reopens with its notes intact", async () => {
  const db = await new Promise((resolve) => { const request = indexedDB.open("benang-merah", 1); request.onsuccess = () => resolve(request.result); });
  const note = { id: "fresh-note", text: "First idea", tag: "Idea", createdAt: "2026-10-15" };
  await new Promise((resolve) => { const tx = db.transaction("workspace", "readwrite"); tx.objectStore("workspace").put({ ...emptyWorkspace(), characters: [orphan], notes: [note] }, accountWorkspaceKey("fresh-repair")); tx.oncomplete = resolve; });
  expect((await readLocalData("fresh-repair"))?.characters).toEqual([]);
  expect((await readLocalData("fresh-repair"))?.notes).toEqual([note]);
  db.close();
});
test("legacy adoption transfers once without exposing it to the next account", async () => {
  const db = await new Promise((resolve) => { const request = indexedDB.open("benang-merah", 1); request.onsuccess = () => resolve(request.result); });
  await new Promise((resolve) => {
    const tx = db.transaction("workspace", "readwrite");
    tx.objectStore("workspace").put({ ...emptyWorkspace(), notes: [{ id: "legacy", text: "Legacy draft", tag: "Idea", createdAt: "2026-10-14" }] }, "data");
    tx.oncomplete = resolve;
  });
  const claimed = await claimLegacyWorkspace("owner");
  expect(claimed?.notes[0]?.text).toBe("Legacy draft");
  expect(await claimLegacyWorkspace("other-owner")).toBeNull();
  expect(await readLocalData("other-owner")).toBeNull();
  expect((await readLocalData("owner"))?.notes[0]?.text).toBe("Legacy draft");
  db.close();
});