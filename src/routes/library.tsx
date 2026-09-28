import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, Plus, Layers, CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Koleksi Naskah — Benang Merah" },
      { name: "description", content: "Kelola semua naskah fiksimu: genre, jumlah bab, dan pembaruan terakhir dalam satu koleksi." },
      { property: "og:title", content: "Koleksi Naskah — Benang Merah" },
      { property: "og:description", content: "Perpustakaan naskah multi-proyek untuk penulis fiksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Library,
});

function Library() {
  const { t, lang, stories, activeStory, setActiveStoryId, setNewStoryOpen } = useStore();
  const navigate = useNavigate();
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <PageHeader
        title={t.libraryTitle}
        subtitle={t.librarySubtitle}
        action={<Button className="shadow-glow" onClick={() => setNewStoryOpen(true)}><Plus /> {t.newStory.replace(/^\+\s*/, "")}</Button>}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => {
          const isActive = s.id === activeStory?.id;
          return (
            <article
              key={s.id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1",
                isActive && "ring-1 ring-thread/60",
              )}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-thread via-thread-soft to-transparent" />
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="outline" className="border-thread/40 text-thread">{s.genre}</Badge>
                <span className="text-xs text-muted-foreground">{s.language}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold leading-snug">{s.title}</h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.synopsis}</p>
              <dl className="mt-5 flex gap-5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Layers className="size-3.5" /> {s.chapters.length} {t.chapters}</div>
                <div className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {t.updated} {fmt.format(new Date(s.updatedAt))}</div>
              </dl>
              <Button
                variant={isActive ? "default" : "secondary"}
                className="mt-5 w-full"
                onClick={() => { setActiveStoryId(s.id); navigate({ to: "/" }); }}
              >
                <BookOpen /> {t.openStory}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
