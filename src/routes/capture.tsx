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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Capture,
});

const TAGS = [
  { value: "idea", labels: { id: "Ide", en: "Idea", "zh-CN": "灵感", "zh-TW": "靈感" } },
  { value: "dialogue", labels: { id: "Dialog", en: "Dialogue", "zh-CN": "对话", "zh-TW": "對話" } },
  { value: "worldbuilding", labels: { id: "Worldbuilding", en: "Worldbuilding", "zh-CN": "世界观设定", "zh-TW": "世界觀設定" } },
  { value: "plot", labels: { id: "Plot", en: "Plot", "zh-CN": "情节", "zh-TW": "情節" } },
] as const;

type CaptureTag = (typeof TAGS)[number]["value"];

const LEGACY_TAGS: Record<string, CaptureTag> = {
  Idea: "idea",
  Ide: "idea",
  Dialog: "dialogue",
  Dialogue: "dialogue",
  Worldbuilding: "worldbuilding",
  Plot: "plot",
};

function getTagLabel(tag: string, lang: keyof (typeof TAGS)[number]["labels"]) {
  const value = LEGACY_TAGS[tag] ?? tag;
  return TAGS.find((item) => item.value === value)?.labels[lang] ?? tag;
}

function Capture() {
  const { t, lang, notes, addNote } = useStore();
  const [text, setText] = useState("");
  const [tag, setTag] = useState<(typeof TAGS)[number]["value"]>("idea");
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
          {TAGS.map((item) => (
            <button
              key={item.value} onClick={() => setTag(item.value)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", tag === item.value ? "border-thread bg-thread/15 text-thread" : "hover:bg-accent")}
            >
              {item.labels[lang]}
            </button>
          ))}
          <Button className="ml-auto" onClick={submit} disabled={!text.trim()}><Zap /> {t.captureAdd}</Button>
        </div>
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border bg-card/60 p-4">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-thread/15 px-2 py-0.5 font-semibold text-thread">{getTagLabel(n.tag, lang)}</span>
              {fmt.format(new Date(n.createdAt))}
            </div>
            <p className="font-prose leading-relaxed">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
