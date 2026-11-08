import { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { compileManuscript, deliverManuscript, exportCopy, manuscriptFilename, manuscriptSections } from "@/lib/manuscript-export";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ManuscriptExport() {
  const { activeStory, writerName, lang } = useStore();
  const [open, setOpen] = useState(false);
  const [frontMatter, setFrontMatter] = useState(true);
  const [synopsis, setSynopsis] = useState(true);
  if (!activeStory) return null;
  const copy = exportCopy[lang];
  const sections = manuscriptSections(activeStory, lang);
  const hasText = sections.some((section) => section.content.trim());
  const pages = <div className="manuscript-pages" lang={lang}>
    {frontMatter && <section className="manuscript-cover"><h1>{activeStory.title}</h1>{writerName && <p>{writerName}</p>}</section>}
    {synopsis && activeStory.synopsis.trim() && <section className="manuscript-section"><h2>{copy.synopsis}</h2><p>{activeStory.synopsis}</p></section>}
    {sections.map((section) => <section key={section.id} className="manuscript-section">{section.heading && <h2>{section.heading}</h2>}{section.content.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => <p key={i}>{p}</p>)}</section>)}
  </div>;
  const download = (format: "txt" | "md") => {
    const text = compileManuscript(activeStory, writerName, lang, { frontMatter, synopsis }, format);
    void deliverManuscript(new Blob([text], { type: format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" }), manuscriptFilename(activeStory.title, format)).catch(() => toast.error(copy.error));
  };
  const print = () => {
    const previous = document.title;
    document.title = activeStory.title;
    try { window.print(); } finally { document.title = previous; }
  };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Download />{copy.title}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{copy.title}</DialogTitle><DialogDescription className="break-words">{activeStory.title}</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={frontMatter} onCheckedChange={(v) => setFrontMatter(v === true)} />{copy.front}</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={synopsis} onCheckedChange={(v) => setSynopsis(v === true)} disabled={!activeStory.synopsis.trim()} />{copy.includeSynopsis}</label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!hasText} onClick={() => download("md")}><Download />{copy.download} .md</Button>
          <Button variant="outline" disabled={!hasText} onClick={() => download("txt")}><Download />{copy.download} .txt</Button>
          <Button disabled={!hasText} onClick={print}><Printer />{copy.print}</Button>
        </div>
        <p className="text-sm text-muted-foreground">{hasText ? copy.pdfHint : copy.empty}</p>
        <h3 className="text-sm font-medium">{copy.preview}</h3>
        <div className="manuscript-preview max-h-[45dvh] overflow-auto rounded-md border p-5 md:p-8">{pages}</div>
      </DialogContent>
    </Dialog>
    {open && createPortal(<div className="manuscript-print-root">{pages}</div>, document.body)}
  </>;
}