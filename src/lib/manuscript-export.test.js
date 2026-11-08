import { describe, expect, test } from "bun:test";
import { compileManuscript, manuscriptSections, manuscriptFilename } from "./manuscript-export";

const story = { id: "selected", title: "夜雨 — Malam", synopsis: "Sinopsis terpilih", content: "duplicate active chapter", chapters: [
  { id: "two", number: 2, title: "Kedua", content: "Dialog bab dua." },
  { id: "one", number: 1, title: "Pertama", content: "Naskah terbaru: 雨来了。" },
] };
describe("selected manuscript export", () => {
  test("compiles every chapter in numeric order without repeating active editor text", () => {
    expect(manuscriptSections(story, "id").map((s) => s.id)).toEqual(["one", "two"]);
    const result = compileManuscript(story, "Ivana", "id", { frontMatter: true, synopsis: true }, "txt");
    expect(result.indexOf("Naskah terbaru")).toBeLessThan(result.indexOf("Dialog bab dua"));
    expect(result).not.toContain("duplicate active chapter");
    expect(result).toContain("雨来了。");
  });
  test("exports editor-only manuscripts when no chapters exist", () => {
    expect(compileManuscript({ ...story, chapters: [], content: "Draft belum dikonfirmasi" }, null, "id", { frontMatter: false, synopsis: false }, "txt")).toBe("Draft belum dikonfirmasi\n");
  });
  test("omits front matter and synopsis when deselected", () => {
    const text = compileManuscript(story, "Ivana", "id", { frontMatter: false, synopsis: false }, "md");
    expect(text).not.toContain("Ivana"); expect(text).not.toContain(story.title); expect(text).not.toContain(story.synopsis);
    expect(text).toContain("## Bab 1 · Pertama");
  });
  test("keeps prose markdown symbols literal instead of turning them into formatting", () => {
    const text = compileManuscript({ ...story, chapters: [], content: "# Catatan\n*bisik*\n- dialog" }, null, "en", { frontMatter: false, synopsis: false }, "md");
    expect(text).toBe("\\# Catatan\n\\*bisik\\*\n\\- dialog\n");
  });
  test("sanitizes filenames without removing Chinese titles", () => {
    expect(manuscriptFilename("夜雨/試稿", "md")).toBe("夜雨_試稿.md");
    expect(manuscriptFilename("...", "txt")).toBe("manuscript.txt");
  });
});