import type { Story } from "./store";
import type { Lang } from "./i18n";

export const exportCopy = {
  id: { title: "Ekspor Naskah", synopsis: "Sinopsis", chapter: "Bab", front: "Sertakan halaman judul & nama penulis", includeSynopsis: "Sertakan sinopsis", preview: "Pratinjau", print: "Cetak / Simpan PDF", pdfHint: "Pilih ‘Simpan sebagai PDF’ pada dialog cetak untuk menyimpan PDF.", empty: "Belum ada teks naskah untuk diekspor.", download: "Unduh", error: "Naskah gagal diekspor. Silakan coba lagi." },
  en: { title: "Export Manuscript", synopsis: "Synopsis", chapter: "Chapter", front: "Include title page & writer name", includeSynopsis: "Include synopsis", preview: "Preview", print: "Print / Save PDF", pdfHint: "Choose ‘Save as PDF’ in the print dialog to save a PDF.", empty: "There is no manuscript text to export yet.", download: "Download", error: "Could not export the manuscript. Please try again." },
  "zh-CN": { title: "导出书稿", synopsis: "故事梗概", chapter: "第", front: "包含标题页及作者姓名", includeSynopsis: "包含故事梗概", preview: "预览", print: "打印 / 保存 PDF", pdfHint: "在打印对话框中选择“另存为 PDF”以保存 PDF。", empty: "暂无可导出的书稿正文。", download: "下载", error: "无法导出书稿，请重试。" },
  "zh-TW": { title: "匯出書稿", synopsis: "故事梗概", chapter: "第", front: "包含標題頁及作者姓名", includeSynopsis: "包含故事梗概", preview: "預覽", print: "列印 / 儲存 PDF", pdfHint: "在列印對話框中選擇「另存為 PDF」以儲存 PDF。", empty: "暫無可匯出的書稿正文。", download: "下載", error: "無法匯出書稿，請重試。" },
} satisfies Record<Lang, Record<string, string>>;

export type ExportOptions = { frontMatter: boolean; synopsis: boolean };
export type ManuscriptSection = { id: string; heading: string; content: string };

export function manuscriptSections(story: Story, lang: Lang): ManuscriptSection[] {
  if (!story.chapters.length) return [{ id: story.id, heading: "", content: story.content }];
  return [...story.chapters].sort((a, b) => a.number - b.number).map((chapter) => ({
    id: chapter.id,
    heading: lang.startsWith("zh") ? `第 ${chapter.number} 章 · ${chapter.title}` : `${exportCopy[lang].chapter} ${chapter.number} · ${chapter.title}`,
    content: chapter.content,
  }));
}

function markdownLiteral(value: string) {
  return value.replace(/([\\`*_{}\[\]<>#|~])/g, "\\$1").replace(/^([ \t]*)([+\-]|\d+[.)])(?=\s)/gm, "$1\\$2");
}

export function compileManuscript(story: Story, writer: string | null, lang: Lang, options: ExportOptions, format: "txt" | "md") {
  const md = format === "md";
  const literal = (text: string) => md ? markdownLiteral(text) : text;
  const blocks: string[] = [];
  if (options.frontMatter) {
    blocks.push(`${md ? "# " : ""}${literal(story.title)}`);
    if (writer) blocks.push(literal(writer));
  }
  if (options.synopsis && story.synopsis.trim()) blocks.push(`${md ? "## " : ""}${exportCopy[lang].synopsis}\n\n${literal(story.synopsis)}`);
  for (const section of manuscriptSections(story, lang)) {
    blocks.push(`${section.heading ? `${md ? "## " : ""}${literal(section.heading)}\n\n` : ""}${literal(section.content)}`);
  }
  return `${blocks.join("\n\n")}\n`;
}

export function manuscriptFilename(title: string, format: "txt" | "md") {
  const safe = title.normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_").replace(/[.\s]+$/g, "").slice(0, 100).trim();
  return `${safe || "manuscript"}.${format}`;
}

export async function deliverManuscript(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}