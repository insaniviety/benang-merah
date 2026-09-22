import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, UserX, Sparkles, RefreshCw, Check, X, Bot } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor Naskah — Benang Merah" },
      { name: "description", content: "Tulis naskah fiksimu dengan Gemini AI Inspector yang memantau plot hole dan konsistensi karakter secara real-time." },
      { property: "og:title", content: "Editor Naskah — Benang Merah" },
      { property: "og:description", content: "Co-writing AI untuk penulis fiksi: editor bersih dengan pemantauan konsistensi cerita." },
    ],
  }),
  component: Dashboard,
});

type Alert = { id: string; kind: "plot" | "consistency" | "suggestion"; title: string; body: string; chapter: number };

function Dashboard() {
  const { t, activeStory, updateContent, characters } = useStore();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const alerts = useMemo<Alert[]>(() => {
    if (!activeStory) return [];
    const c = characters;
    const hero = c.find((k) => k.role === "protagonist")?.name ?? "—";
    const villain = c.find((k) => k.role === "antagonist")?.name ?? "—";
    const dead = c.find((k) => k.status === "deceased")?.name;
    return [
      { id: "a1", kind: "plot", title: t.plotHole, chapter: 4, body: `${villain} disebut memegang pedang pusaka, tetapi di Bab 2 pedang itu sudah dipatahkan. Bagaimana ia mendapatkannya kembali?` },
      ...(dead ? [{ id: "a2", kind: "consistency" as const, title: t.consistency, chapter: 3, body: `${dead} berstatus meninggal, namun muncul berbicara langsung tanpa penanda kilas balik.` }] : []),
      { id: "a3", kind: "consistency", title: t.consistency, chapter: 2, body: `${hero} memakai kata "aku" saat marah—bertentangan dengan diksi di Character Bible.` },
      { id: "a4", kind: "suggestion", title: t.suggestion, chapter: 4, body: `Perlambat ritme sebelum duel: satu paragraf sensorik (bau hujan, dingin batu jembatan) akan memperkuat ketegangan.` },
    ];
  }, [activeStory, characters, t]);

  if (!activeStory) return <div className="p-10 text-muted-foreground">{t.noStory}</div>;

  const words = activeStory.content.trim().split(/\s+/).filter(Boolean).length;
  const visible = alerts.filter((a) => !dismissed.includes(a.id));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col xl:flex-row">
      {/* Editor */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3 text-sm">
          <Badge variant="outline" className="border-thread/40 text-thread">{activeStory.genre}</Badge>
          <span className="font-display text-base">{activeStory.title}</span>
          <span className="text-muted-foreground">· {t.chapter} {activeStory.chapters.filter((c) => c.status !== "planned").length || 1}</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" /> {t.saved} · {words} {t.words}
          </span>
        </div>
        <div className="paper-grain flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
            <h1 className="mb-8 font-display text-4xl font-medium leading-tight md:text-5xl">{activeStory.title}</h1>
            <textarea
              value={activeStory.content}
              onChange={(e) => updateContent(activeStory.id, e.target.value)}
              placeholder="…"
              spellCheck={false}
              className="prose-editor min-h-[60vh] w-full resize-none bg-transparent placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </section>

      {/* Inspector */}
      <aside className="flex w-full shrink-0 flex-col border-t bg-card/40 xl:w-96 xl:border-l xl:border-t-0">
        <div className="flex items-start gap-3 border-b px-5 py-4">
          <span className="relative mt-0.5 flex size-9 items-center justify-center rounded-xl bg-thread/15 ring-1 ring-thread/40">
            <Bot className="size-4 text-thread" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-success [animation:pulse-dot_1.6s_ease-in-out_infinite]" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold leading-tight">{t.inspector}</h2>
            <p className="text-xs text-muted-foreground">{t.inspectorSub}</p>
          </div>
          <Button
            size="icon" variant="ghost" aria-label={t.analyze}
            onClick={() => { setAnalyzing(true); setDismissed([]); setTimeout(() => setAnalyzing(false), 1100); }}
          >
            <RefreshCw className={cn("size-4", analyzing && "animate-spin")} />
          </Button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          {visible.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">✓ {t.done}</p>
          )}
          {visible.map((a) => <AlertCard key={a.id} a={a} onDismiss={() => setDismissed((d) => [...d, a.id])} />)}
        </div>
      </aside>
    </div>
  );
}

function AlertCard({ a, onDismiss }: { a: Alert; onDismiss: () => void }) {
  const { t } = useStore();
  const styles = {
    plot: { icon: AlertTriangle, ring: "border-destructive/40", chip: "bg-destructive/15 text-destructive" },
    consistency: { icon: UserX, ring: "border-warning/50", chip: "bg-warning/20 text-warning-foreground" },
    suggestion: { icon: Sparkles, ring: "border-info/50", chip: "bg-info/20 text-info-foreground" },
  }[a.kind];
  const Icon = styles.icon;
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5", styles.ring)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", styles.chip)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{a.title}</p>
            <span className="shrink-0 text-[11px] text-muted-foreground">{t.chapter} {a.chapter}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onDismiss}><Check className="size-3" /> {t.apply}</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}><X className="size-3" /> {t.ignore}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
