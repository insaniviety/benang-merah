import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { aiFindingsTabCopy, readAiResult, readAiSettings, readCloudAiResult, readSessionAiResult } from "@/lib/ai-settings";
import { aiModesCopy } from "@/lib/ai-modes-copy";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, PenLine, Circle, RotateCcw, BookOpen, Pencil, Plus, ChevronDown, CalendarDays, Type } from "lucide-react";
import { useStore, type Chapter, type ChapterStatus } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chapters")({
  head: () => ({
    meta: [
      { title: "Bab Naskah — Benang Merah" },
      { name: "description", content: "Kelola urutan bab, status revisi, dan baca ulang setiap bab naskahmu." },
      { property: "og:title", content: "Bab Naskah — Benang Merah" },
      { property: "og:description", content: "Rencanakan, tinjau, dan revisi setiap bab naskah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chapters,
});

type Finding = { id: string; kind: "chronology" | "text" | "world" | "relationship" | "diction" | "atmosphere" | "pacing" | "conflict" | "repetition" | "genre"; body: string; source: string; chapterId?: string; suggestion?: string };

function FindingsList({ findings, chapters, onOpen }: { findings: Finding[] | null; chapters: Chapter[]; onOpen: (chapterId: string) => void }) {
  const { t, lang } = useStore();
  const c = aiFindingsTabCopy[lang];
  if (!findings?.length) return <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{c.empty}</p>;
  const kindLabel = (k: Finding["kind"]) => k === "chronology" ? t.alertChronology : k === "text" ? t.alertText : k === "world" ? t.alertWorld : k === "relationship" ? t.alertRelationship : aiModesCopy[lang][k];
  const groups = [...chapters.map((ch) => ({ ch, items: findings.filter((f) => f.chapterId === ch.id) })), { ch: null, items: findings.filter((f) => !f.chapterId || !chapters.some((ch) => ch.id === f.chapterId)) }].filter((g) => g.items.length);
  return (
    <div className="space-y-6">
      {groups.map(({ ch, items }) => (
        <section key={ch?.id ?? "general"} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">{ch ? `${t.chapter} ${ch.number} · ${ch.title}` : c.general}</h2>
            {ch && <Button size="sm" variant="outline" onClick={() => onOpen(ch.id)}><Pencil /> {c.open}</Button>}
          </div>
          {items.map((f) => (
            <article key={f.id} className="rounded-xl border bg-card p-4 shadow-soft">
              <Badge variant="outline" className="whitespace-normal text-xs">{kindLabel(f.kind)}</Badge>
              <p className="mt-2 text-sm leading-relaxed">{f.body}</p>
              {f.suggestion && <p className="mt-2 rounded-md bg-muted p-2 text-sm"><span className="font-medium">{c.suggestion}:</span> {f.suggestion}</p>}
              <p className="mt-2 border-l-2 border-thread/50 pl-2 text-xs text-muted-foreground">{t.alertSource}: {f.source}</p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

type Filter = "all" | "draft" | "done" | "revision";

function Chapters() {
  const { t, lang, activeStory, updateChapter, openChapter, accountId } = useStore();
  const navigate = useNavigate();
  const [view, setView] = useState<"chapters" | "findings">("chapters");
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const storyId = activeStory?.id;
  useEffect(() => {
    if (!storyId) return undefined;
    let live = true;
    const persist = readAiSettings(accountId).persist;
    const local = readSessionAiResult<{ findings: Finding[] }>(accountId, storyId) ?? (persist === "account" ? readAiResult<{ findings: Finding[] }>(accountId, storyId) : null);
    setFindings(local?.findings ?? null);
    if (persist === "cloud") readCloudAiResult<{ findings: Finding[] }>(storyId).then((r) => { if (live && r) setFindings(r.findings); }, () => undefined);
    return () => { live = false; };
  }, [accountId, storyId]);
  const [filter, setFilter] = useState<Filter>("all");
  const [reading, setReading] = useState<Chapter | null>(null);
  const [adding, setAdding] = useState(false);
  if (!activeStory) return <div className="p-10 text-muted-foreground">{t.noStory}</div>;

  const meta: Record<ChapterStatus, { label: string; icon: typeof Circle; dot: string; chip: string }> = {
    done: { label: t.done, icon: CheckCircle2, dot: "bg-success text-success-foreground", chip: "bg-success/15 text-success border-success/40" },
    draft: { label: t.draft, icon: PenLine, dot: "bg-thread text-primary-foreground", chip: "bg-thread/15 text-thread border-thread/40" },
    revision: { label: t.revision, icon: RotateCcw, dot: "bg-warning text-warning-foreground", chip: "bg-warning/15 text-warning border-warning/50" },
    planned: { label: t.planned, icon: Circle, dot: "bg-muted text-muted-foreground", chip: "bg-muted text-muted-foreground border-border" },
  };
  const chapters = [...activeStory.chapters].sort((a, b) => a.number - b.number);
  const total = chapters.reduce((a, c) => a + c.words, 0);
  const shown = chapters.filter((c) => filter === "all" || c.status === filter || (filter === "draft" && c.status === "planned"));
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
  const filters: { v: Filter; label: string }[] = [
    { v: "all", label: t.all }, { v: "draft", label: t.draft }, { v: "done", label: t.done }, { v: "revision", label: t.revision },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <PageHeader
        title={t.navChapters}
        subtitle={`${activeStory.title} · ${chapters.length} ${t.chapters} · ${total.toLocaleString()} ${t.words}`}
        action={<Button className="shadow-glow" onClick={() => setAdding(true)}><Plus /> {t.addChapter.replace(/^\+\s*/, "")}</Button>}
      />

      <div role="tablist" className="flex gap-1 rounded-xl border bg-card p-1">
        {(["chapters", "findings"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors", view === v ? "bg-thread text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground")}>
            {aiFindingsTabCopy[lang][v]}{v === "findings" && findings ? <span className="ml-1 opacity-70">{findings.length}</span> : null}
          </button>
        ))}
      </div>

      {view === "findings" ? <FindingsList findings={findings} chapters={chapters} onOpen={(id) => { openChapter(activeStory.id, id); navigate({ to: "/" }); }} /> : <>
      <div role="tablist" className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = f.v === "all" ? chapters.length : chapters.filter((c) => c.status === f.v || (f.v === "draft" && c.status === "planned")).length;
          return (
            <button
              key={f.v} role="tab" aria-selected={filter === f.v} onClick={() => setFilter(f.v)}
              className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors",
                filter === f.v ? "border-thread bg-thread text-primary-foreground shadow-glow" : "bg-card text-muted-foreground hover:border-thread/50 hover:text-foreground")}
            >
              {f.label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t.noChapterMatch}</p>
      ) : (
        <ol className="relative ml-4 border-l-2 border-thread/40">
          {shown.map((c) => {
            const m = meta[c.status];
            const Icon = m.icon;
            const pct = c.target ? Math.min(100, Math.round((c.words / c.target) * 100)) : 0;
            const isActive = activeStory.activeChapterId === c.id;
            return (
              <li key={c.id} className="relative mb-6 pl-8">
                <span className={cn("absolute -left-[15px] top-5 flex size-7 items-center justify-center rounded-full ring-4 ring-background", m.dot)}>
                  <Icon className="size-3.5" />
                </span>
                <article className={cn("rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-glow", isActive && "border-thread/50")}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-thread">{t.chapter} {c.number}</span>
                      <h2 className="font-display text-xl font-semibold leading-snug">{c.title}</h2>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button aria-label={t.changeStatus} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", m.chip)}>
                          <Icon className="size-3" /> {m.label} <ChevronDown className="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">{t.changeStatus}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(["draft", "revision", "done"] as ChapterStatus[]).map((s) => {
                          const SI = meta[s].icon;
                          return (
                            <DropdownMenuItem key={s} disabled={s === c.status}
                              onClick={() => { updateChapter(activeStory.id, c.id, { status: s }); toast.success(`${t.statusChanged}: ${meta[s].label}`); }}>
                              <SI className="size-4" /> {meta[s].label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.summary || "—"}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Type className="size-3.5" /> {c.words.toLocaleString()} / {c.target.toLocaleString()} {t.words}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {t.updated} {fmt(c.updatedAt)}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-thread transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setReading(c)}><BookOpen /> {t.readChapter}</Button>
                    <Button size="sm" variant="outline" className="border-thread/40 text-thread hover:bg-thread/10 hover:text-thread"
                      onClick={() => { openChapter(activeStory.id, c.id); navigate({ to: "/" }); }}>
                      <Pencil /> {t.editChapter}
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
      </>}

      <Dialog open={!!reading} onOpenChange={(v) => !v && setReading(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-thread">{t.chapterPreview} · {t.chapter} {reading?.number}</p>
            <DialogTitle className="font-display text-3xl md:text-4xl">{reading?.title}</DialogTitle>
            <DialogDescription>{reading?.words.toLocaleString()} {t.words} · {reading && fmt(reading.updatedAt)}</DialogDescription>
          </DialogHeader>
          <div className="paper-grain rounded-xl border bg-background/60 px-6 py-8 md:px-12">
            {reading?.content.trim() ? (
              <div className="mx-auto max-w-prose space-y-5 font-prose text-lg leading-[1.9]">
                {reading.content.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">{t.emptyChapter}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReading(null)}>{t.close}</Button>
            {reading && (
              <Button onClick={() => { openChapter(activeStory.id, reading.id); setReading(null); navigate({ to: "/" }); }}>
                <Pencil /> {t.editChapter}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddChapterDialog open={adding} onOpenChange={setAdding} storyId={activeStory.id} />
    </div>
  );
}

function AddChapterDialog({ open, onOpenChange, storyId }: { open: boolean; onOpenChange: (v: boolean) => void; storyId: string }) {
  const { t, addChapter } = useStore();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [target, setTarget] = useState("3000");
  const submit = () => {
    if (!title.trim()) return;
    addChapter(storyId, { title: title.trim(), summary: summary.trim(), target: Math.max(0, parseInt(target) || 0) });
    toast.success(t.chapterAdded);
    setTitle(""); setSummary(""); setTarget("3000");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t.addChapter.replace(/^\+\s*/, "")}</DialogTitle>
          <DialogDescription>{t.chapterList}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label htmlFor="ch-title">{t.chapterTitle}</Label><Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="grid gap-2"><Label htmlFor="ch-sum">{t.chapterSummary}</Label><Textarea id="ch-sum" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="ch-target">{t.targetWords}</Label><Input id="ch-target" type="number" min={0} step={100} value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!title.trim()}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
