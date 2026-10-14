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