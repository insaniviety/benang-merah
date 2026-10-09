import { describe, expect, test } from "bun:test";
import { needsEditorConfirmation } from "./editor-save";

describe("manuscript switching", () => {
  test("autosave completion does not dismiss unconfirmed edits", () => {
    expect(needsEditorConfirmation(["s1"], "s1", "saved")).toBe(true);
  });
  test("explicitly saved manuscript needs no confirmation", () => {
    expect(needsEditorConfirmation([], "s1", "saved")).toBe(false);
  });
  test("other manuscript edits do not warn for a saved active manuscript", () => {
    expect(needsEditorConfirmation(["s2"], "s1", "saved")).toBe(false);
  });
  test("failed persistence still warns", () => {
    expect(needsEditorConfirmation([], "s1", "error")).toBe(true);
  });
});