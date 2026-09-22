import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, PenLine, Circle } from "lucide-react";
import { useStore, type ChapterStatus } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline & Bab — Benang Merah" },
      { name: "description", content: "Alur bab dan peristiwa penting naskahmu dalam satu garis waktu." },
      { property: "og:title", content: "Timeline & Bab — Benang Merah" },
      { property: "og:description", content: "Rencanakan dan pantau progres setiap bab." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const { t, activeStory } = useStore();
  if (!activeStory) return <div className="p-10 text-muted-foreground">{t.noStory}</div>;
  const meta: Record<ChapterStatus, { label: string; icon: typeof Circle; cls: string }> = {
    done: { label: t.done, icon: CheckCircle2, cls: "bg-success text-success-foreground" },
    draft: { label: t.draft, icon: PenLine, cls: "bg-thread text-primary-foreground" },
    planned: { label: t.planned, icon: Circle, cls: "bg-muted text-muted-foreground" },
  };
  const total = activeStory.chapters.reduce((a, c) => a + c.words, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <PageHeader title={t.timelineTitle} subtitle={`${activeStory.title} · ${activeStory.chapters.length} ${t.chapters} · ${total.toLocaleString()} ${t.words}`} />
      {activeStory.chapters.length === 0 ? (
        <p className="text-muted-foreground">{t.noStory}</p>
      ) : (
        <ol className="relative ml-4 border-l-2 border-thread/40">
          {activeStory.chapters.map((c) => {
            const m = meta[c.status];
            const Icon = m.icon;
            return (
              <li key={c.id} className="relative mb-8 pl-8">
                <span className={cn("absolute -left-[15px] top-1 flex size-7 items-center justify-center rounded-full ring-4 ring-background", m.cls)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="rounded-2xl border bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-thread">{t.chapter} {c.number}</span>
                    <h2 className="font-display text-xl font-semibold">{c.title}</h2>
                    <span className="ml-auto text-xs text-muted-foreground">{m.label} · {c.words.toLocaleString()} {t.words}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
