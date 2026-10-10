import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, UserX, RefreshCw, Check, X, Bot, Clock3, BookUser, FileText, Link2, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeWithGemini } from "@/lib/gemini.functions";
import { selectedStoryInput } from "@/lib/gemini-data";
import { parseBackup } from "@/lib/local-data";
import { GeminiConsentDialog } from "@/components/GeminiConsentDialog";
import { AiPreviewDialog } from "@/components/AiPreviewDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor Naskah — Benang Merah" },
      { name: "description", content: "Tulis naskah fiksimu dengan Gemini AI Inspector yang memantau plot hole dan konsistensi karakter secara real-time." },
      { property: "og:title", content: "Editor Naskah — Benang Merah" },
      { property: "og:description", content: "Co-writing AI untuk penulis fiksi: editor bersih dengan pemantauan konsistensi cerita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Alert = { id: string; kind: "chronology" | "text" | "world" | "relationship"; body: string; source: string; chapterId?: string | undefined; paragraphIndex?: number | undefined; suggestion?: string | undefined };
type TimelineEvent = { id: string; time: string; era: string; event: string; location: string; characters: string[] };

function Dashboard() {
  const { t, activeStory, updateContent, characters, savedCanvas, timelines, storageStatus, editorDirty, saveEditor, exportBackup } = useStore();
  const callGemini = useServerFn(analyzeWithGemini);
  const [consentOpen, setConsentOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ signature: string; findings: Alert[] } | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);
  const timeline: TimelineEvent[] = activeStory ? timelines[activeStory.id]?.saved ?? [] : [];
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewing, setPreviewing] = useState<Alert | null>(null);

  const alerts = useMemo<Alert[]>(() => {
    if (!activeStory) return [];
    const findings: Alert[] = [];
    const chapterName = (number: number) => `${t.chapter} ${number}`;
    // Only report contradictions backed by two actual references, never hypothetical sample warnings.
    timeline.forEach((event, i) => {
      if (!event.time.trim() || !event.location.trim()) return;
      timeline.slice(i + 1).forEach((other) => {
        if (event.time.trim().toLocaleLowerCase() !== other.time.trim().toLocaleLowerCase() || event.era !== other.era || !other.location.trim() || event.location.trim().toLocaleLowerCase() === other.location.trim().toLocaleLowerCase()) return;
        event.characters.filter((name) => other.characters.includes(name)).forEach((name) => findings.push({
          id: `time-${event.id}-${other.id}-${name}`, kind: "chronology",
          body: `${name}: ${event.location} / ${other.location} (${event.time}).`,
          source: `${t.referenceTimeline}: ${event.event} ↔ ${other.event}`,
        }));
      });
    });
    const eyePattern = /(mata(?:nya)?\s+(?:berwarna\s+)?|(?:eyes?\s+(?:were|was|are|is)\s+))\b(hitam|cokelat|coklat|biru|hijau|abu-abu|black|brown|blue|green|gray|grey)\b/gi;
    const eyeMentions = activeStory.chapters.flatMap((chapter) => {
      const paragraphs = chapter.content.split(/\n\s*\n/);
      return paragraphs.flatMap((paragraph, paragraphIndex) => characters.flatMap((character) => {
        if (!paragraph.toLocaleLowerCase().includes(character.name.toLocaleLowerCase())) return [];
        return [...paragraph.matchAll(eyePattern)].map((match) => ({ chapter, paragraphIndex, character: character.name, color: match[2]?.toLocaleLowerCase() ?? "" }));
      }));
    });
    eyeMentions.forEach((mention, i) => eyeMentions.slice(i + 1).forEach((other) => {
      if (mention.character !== other.character || mention.color === other.color || mention.chapter.id === other.chapter.id) return;
      findings.push({ id: `eyes-${mention.chapter.id}-${other.chapter.id}-${mention.character}`, kind: "text",
        body: `${mention.character}: ${mention.color} / ${other.color}.`,
        source: `${t.referenceText}: ${chapterName(mention.chapter.number)} ↔ ${chapterName(other.chapter.number)}`,
        chapterId: other.chapter.id, paragraphIndex: other.paragraphIndex });
    }));
    // Explicit character restrictions are checked only when the same paragraph names the character.
    characters.filter((character) => /tidak pernah memakai kata ['“"]?aku/i.test(character.diction)).forEach((character) => {
      activeStory.chapters.forEach((chapter) => chapter.content.split(/\n\s*\n/).forEach((paragraph, paragraphIndex) => {
        if (!paragraph.toLocaleLowerCase().includes(character.name.toLocaleLowerCase()) || !/\b(marah|angry)\b/i.test(paragraph) || !/[“"]?\baku\b/i.test(paragraph)) return;
        findings.push({ id: `rule-${chapter.id}-${paragraphIndex}-${character.id}`, kind: "world",
          body: `${character.name}: “aku” muncul dalam adegan marah, bertentangan dengan diksi karakternya.`,
          source: `${t.referenceBible} ↔ ${chapterName(chapter.number)}`,
          chapterId: chapter.id, paragraphIndex });
      }));
    });
    // Only explicit negations of a saved relationship trigger a finding.
    if (savedCanvas) {
      const savedById = Object.fromEntries(savedCanvas.characters.map((character) => [character.id, character]));
      const relationshipWords: Record<string, string> = {
        family: "keluarga|saudara|ayah|ibu|adik|kakak|family|brother|sister|parent",
        alliance: "sekutu|aliansi|alliance|ally|allies",
        romance: "kekasih|pasangan|pacar|romance|lover|partner",
        conflict: "musuh|lawan|enemy|rival",
        secret: "rahasia|secret",
      };
      const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      savedCanvas.relations.forEach((relation) => {
        const first = savedById[relation.from]?.name, second = savedById[relation.to]?.name;
        if (!first || !second) return;
        const words = relationshipWords[relation.type];
        if (!words) return;
        const negated = new RegExp(`\\b(?:bukan|tidak|not|never|isn't|aren't)\\s+(?:(?:seorang|a|an|the)\\s+)?(?:${words})\\b`, "i");
        activeStory.chapters.forEach((chapter) => chapter.content.split(/\n\s*\n/).forEach((paragraph, paragraphIndex) => {
          if (![first, second].every((name) => new RegExp(escape(name), "i").test(paragraph)) || !negated.test(paragraph)) return;
          findings.push({ id: `relation-${relation.id}-${chapter.id}-${paragraphIndex}`, kind: "relationship",
            body: `${first} × ${second}: “${paragraph.trim().slice(0, 120)}${paragraph.trim().length > 120 ? "…" : ""}”`,
            source: `${t.referenceCanvas}: ${relation.label} ↔ ${chapterName(chapter.number)}`,
            chapterId: chapter.id, paragraphIndex });
        }));
      });
    }
    return findings;
  }, [activeStory, characters, savedCanvas, t, timeline]);

  if (!activeStory) return <div className="p-10 text-muted-foreground">{t.noStory}</div>;

  const words = activeStory.content.trim().split(/\s+/).filter(Boolean).length;
  const signature = JSON.stringify([activeStory, characters, savedCanvas, timeline]);
  const currentAlerts = aiResult?.signature === signature ? aiResult.findings : alerts;
  const visible = currentAlerts.filter((a) => !dismissed.includes(a.id));

  const paragraphs = activeStory.content.split(/\n\s*\n/);
  const previewOriginal = previewing && previewing.chapterId === activeStory.activeChapterId ? (paragraphs[previewing.paragraphIndex ?? 0] ?? "").trim() : "";
  const previewSuggestion = previewing?.suggestion ?? previewOriginal;
  const checkPlotHoles = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const snapshot = parseBackup(JSON.parse(await exportBackup()));
      const result = await callGemini({ data: selectedStoryInput(snapshot, activeStory.id, "inspector", true) });
      if (!result.ok) { toast.error(result.error); return; }
      setAiResult({ signature, findings: result.output.findings.map((finding) => ({ ...finding, id: crypto.randomUUID(), chapterId: finding.chapterId ?? undefined, paragraphIndex: finding.paragraphIndex ?? undefined, suggestion: finding.suggestion ?? undefined })) });
      setDismissed([]); setConsentOpen(false);
    } catch { toast.error(t.timelineGenerateError); }
    finally { setAnalyzing(false); }
  };
  const insert = (text: string) => {
    if (!previewing) return;
    const next = [...paragraphs];
    if (previewing.chapterId !== activeStory.activeChapterId || previewing.paragraphIndex === undefined) return;
    next[previewing.paragraphIndex] = text.trim();
    updateContent(activeStory.id, next.join("\n\n"));
    setDismissed((d) => [...d, previewing.id]);
    setPreviewing(null);
    toast.success(t.insertedToast);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col xl:flex-row">
      {/* Editor */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3 text-sm">
          <div className="flex flex-wrap gap-1">{activeStory.genres.map((genre) => <Badge key={genre} variant="outline" className="border-thread/40 text-thread">{genre}</Badge>)}</div>
          <span className="font-display text-base">{activeStory.title}</span>
          {(() => { const ch = activeStory.chapters.find((c) => c.id === activeStory.activeChapterId); return <span className="text-muted-foreground">· {t.chapter} {ch?.number ?? 1}{ch ? ` — ${ch.title}` : ""}</span>; })()}
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", storageStatus === "saved" ? "bg-success" : storageStatus === "error" ? "bg-destructive" : "bg-warning")} /> {storageStatus === "saved" ? t.storageSaved : storageStatus === "error" ? t.saveFailed : t.storageSaving} · {words} {t.words}
          </span>
          <Button size="sm" disabled={savingEditor || (!editorDirty && storageStatus === "saved")} onClick={async () => {
            setSavingEditor(true);
            try { await saveEditor(); toast.success(t.storyUpdated); }
            catch { toast.error(t.saveFailed); }
            finally { setSavingEditor(false); }
          }}><Save className="size-4" />{t.saveChanges}</Button>
        </div>
        <div className="paper-grain flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
            <h1 className="font-display text-3xl font-semibold md:text-4xl">{t.navDashboard}</h1>
            <h2 className="mb-8 mt-6 font-display text-2xl font-medium leading-tight md:text-3xl">{activeStory.title}</h2>
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
        <div className="flex flex-wrap items-start gap-3 border-b px-5 py-4">
          <span className="relative mt-0.5 flex size-9 items-center justify-center rounded-xl bg-thread/15 ring-1 ring-thread/40">
            <Bot className="size-4 text-thread" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-success [animation:pulse-dot_1.6s_ease-in-out_infinite]" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold leading-tight">{t.inspector}</h2>
            <p className="text-xs text-muted-foreground">{t.inspectorSub}</p>
          </div>
          <Button
             size="sm" variant="outline" aria-label={t.analyze} disabled={analyzing}
             onClick={() => setConsentOpen(true)}
          >
            <RefreshCw className={cn("size-4", analyzing && "animate-spin")} />{t.analyze}
          </Button>
        </div>
        <div className="grid gap-2 border-b px-5 py-4 text-xs" aria-label="Sumber acuan pemeriksaan">
          {([
            [t.referenceTimeline, timeline.length > 0, Clock3],
            [t.referenceBible, characters.length > 0, BookUser],
            [t.referenceCanvas, !!savedCanvas, Link2],
            [t.referenceText, activeStory.chapters.some((chapter) => chapter.content.trim()), FileText],
          ] as const).map(([label, active, Icon]) => <div key={label} className="flex min-w-0 items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", active ? "bg-success" : "bg-muted-foreground")} />
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className={cn("min-w-0 flex-1", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {!active && <span className="shrink-0 text-muted-foreground">{t.referenceMissing}</span>}
          </div>)}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
          {visible.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.alertNoFindings}</p>
          )}
          {(["chronology", "text", "world", "relationship"] as const).map((kind) => {
            const group = visible.filter((alert) => alert.kind === kind);
            if (!group.length) return null;
            const heading = kind === "chronology" ? t.alertChronology : kind === "text" ? t.alertText : kind === "world" ? t.alertWorld : t.alertRelationship;
            return <section key={kind} className="space-y-3" aria-label={heading}>
              <h3 className="pt-2 text-xs font-semibold uppercase text-muted-foreground">{heading} <span className="ml-1">{group.length}</span></h3>
              {group.map((a) => <AlertCard key={a.id} a={a} canApply={a.chapterId === activeStory.activeChapterId && a.paragraphIndex !== undefined} onApply={() => setPreviewing(a)} onDismiss={() => setDismissed((d) => [...d, a.id])} />)}
            </section>;
          })}
        </div>
      </aside>
      <GeminiConsentDialog open={consentOpen} busy={analyzing} onClose={() => setConsentOpen(false)} onConfirm={() => void checkPlotHoles()} />
      <AiPreviewDialog
        open={!!previewing}
        onOpenChange={(v) => !v && setPreviewing(null)}
         title={previewing ? `${t.alertSource}: ${previewing.source}` : ""}
        original={previewOriginal}
        suggestion={previewSuggestion}
        onInsert={insert}
      />
    </div>
  );
}

function AlertCard({ a, canApply, onApply, onDismiss }: { a: Alert; canApply: boolean; onApply: () => void; onDismiss: () => void }) {
  const { t } = useStore();
  const styles = {
    chronology: { icon: Clock3, ring: "border-destructive/40", chip: "bg-destructive/15 text-destructive" },
    text: { icon: AlertTriangle, ring: "border-warning/50", chip: "bg-warning/20 text-warning" },
    world: { icon: UserX, ring: "border-info/50", chip: "bg-info/20 text-info" },
    relationship: { icon: Link2, ring: "border-thread/50", chip: "bg-thread/20 text-thread" },
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
             <Badge variant="outline" className="whitespace-normal text-xs leading-snug">{a.kind === "chronology" ? t.alertChronology : a.kind === "text" ? t.alertText : a.kind === "world" ? t.alertWorld : t.alertRelationship}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
           <p className="mt-2 border-l-2 border-thread/50 pl-2 text-xs leading-relaxed text-muted-foreground">{t.alertSource}: {a.source}</p>
          <div className="mt-3 flex gap-2">
             {canApply && <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onApply}><Check className="size-3" /> {t.apply}</Button>}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}><X className="size-3" /> {t.ignore}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
