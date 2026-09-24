import { useEffect, useState } from "react";
import { Sparkles, FileText, PenLine } from "lucide-react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiPreviewDialog({
  open, onOpenChange, title, original, suggestion, onInsert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  original: string;
  suggestion: string;
  onInsert: (text: string) => void;
}) {
  const { t } = useStore();
  const [draft, setDraft] = useState(suggestion);
  useEffect(() => { if (open) setDraft(suggestion); }, [open, suggestion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="size-5 text-thread" /> {t.aiPreviewTitle}
          </DialogTitle>
          <DialogDescription>{title} · {t.aiPreviewSub}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3.5" /> {t.originalParagraph}
            </p>
            <div className="min-h-[260px] flex-1 whitespace-pre-wrap rounded-xl border bg-muted/50 p-4 font-prose text-sm leading-relaxed text-muted-foreground">
              {original || "—"}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-thread">
              <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> {t.aiRecommendation}</span>
              <span className="flex items-center gap-1 normal-case tracking-normal text-muted-foreground"><PenLine className="size-3" /> {t.editableHint}</span>
            </p>
            <Textarea
              aria-label={t.aiRecommendation}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[260px] flex-1 resize-y border-thread/40 bg-card font-prose text-sm leading-relaxed focus-visible:ring-thread/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button className="shadow-glow" disabled={!draft.trim()} onClick={() => onInsert(draft)}>{t.insertToManuscript}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
