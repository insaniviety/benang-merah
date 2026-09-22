import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Quick Capture — Benang Merah" },
      { name: "description", content: "Catatan cepat untuk ide, dialog, dan potongan adegan sebelum menguap." },
      { property: "og:title", content: "Quick Capture — Benang Merah" },
      { property: "og:description", content: "Tangkap ide ceritamu dalam hitungan detik." },
    ],
  }),
  component: Capture,
});

const TAGS = ["Ide", "Dialog", "Worldbuilding", "Plot"];

function Capture() {
  const { t, lang, notes, addNote } = useStore();
  const [text, setText] = useState("");
  const [tag, setTag] = useState(TAGS[0]);
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const submit = () => {
    if (!text.trim()) return;
    addNote(text.trim(), tag);
    toast.success(t.noteAdded);
    setText("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <PageHeader title={t.captureTitle} subtitle={t.captureSub} />
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.capturePlaceholder}
          className="prose-editor resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          {TAGS.map((tg) => (
            <button
              key={tg} onClick={() => setTag(tg)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", tag === tg ? "border-thread bg-thread/15 text-thread" : "hover:bg-accent")}
            >
              {tg}
            </button>
          ))}
          <Button className="ml-auto" onClick={submit} disabled={!text.trim()}><Zap /> {t.captureAdd}</Button>
        </div>
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border bg-card/60 p-4">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-thread/15 px-2 py-0.5 font-semibold text-thread">{n.tag}</span>
              {fmt.format(new Date(n.createdAt))}
            </div>
            <p className="font-prose leading-relaxed">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
