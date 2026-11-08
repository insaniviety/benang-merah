import { createFileRoute } from "@tanstack/react-router";
import { getGenreLabel } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { AlertTriangle, UserX, RefreshCw, Check, X, Bot, Clock3, BookUser, FileText, Link2, Save, PenLine } from "lucide-react";
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
import { EmptyManuscripts } from "@/components/EmptyManuscripts";
import { aiModesCopy, type AiMode } from "@/lib/ai-modes-copy";
import { useEffect, useRef } from "react";
import { Settings2, Swords, Repeat, Tags } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { AI_PROVIDERS, aiProviderCopy } from "@/lib/ai-routing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiSettingsCopy, clearAiResults, defaultAiSettings, readAiResult, readAiSettings, writeAiResult, writeAiSettings, readCloudAiResult, writeCloudAiResult, clearCloudAiResults, hasLocalAiSettings, hasCloudAiResults, writeSessionAiResult, type AiSettings } from "@/lib/ai-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor Naskah — Benang Merah" },
      { name: "description", content: "Tulis naskah fiksimu dan periksa konsistensi cerita atas permintaan dengan AI Inspector Benang Merah." },
      { property: "og:title", content: "Editor Naskah — Benang Merah" },
      { property: "og:description", content: "Co-writing AI untuk penulis fiksi: editor bersih dengan pemantauan konsistensi cerita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Alert = { id: string; kind: "chronology" | "text" | "world" | "relationship" | AiMode; body: string; source: string; chapterId?: string | undefined; paragraphIndex?: number | undefined; suggestion?: string | undefined };
type TimelineEvent = { id: string; time: string; era: string; event: string; location: string; characters: string[] };

function Dashboard() {
  const { t, lang, activeStory, updateContent, characters, savedCanvas, timelines, storageStatus, editorDirty, saveEditor, exportBackup, accountId, openChapter } = useStore();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [revising, setRevising] = useState<Alert | null>(null);
  const callGemini = useServerFn(analyzeWithGemini);
  const [consentOpen, setConsentOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ signature: string; findings: Alert[] } | null>(null);
  const [savingEditor, setSavingEditor] = useState(false);
  const timeline: TimelineEvent[] = activeStory ? timelines[activeStory.id]?.saved ?? [] : [];
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewing, setPreviewing] = useState<Alert | null>(null);
  useEffect(() => {
    const el = editorRef.current;
    if (!revising || !el || !activeStory || revising.chapterId !== activeStory.activeChapterId || revising.paragraphIndex === undefined) return;
    const parts = activeStory.content.split(/(\n\s*\n)/);
    let start = 0;
    for (let i = 0; i < revising.paragraphIndex * 2 && i < parts.length; i++) start += parts[i]?.length ?? 0;
    const para = parts[revising.paragraphIndex * 2] ?? "";
    const lead = para.length - para.trimStart().length;
    const from = start + lead, to = start + para.trimEnd().length;
    setRevising(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, to);
      el.blur(); el.focus();
    });
  }, [revising, activeStory]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [modes, setModes] = useState<AiMode[]>(["genre"]);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(defaultAiSettings);
  const sc = aiSettingsCopy[lang];
  const pc = aiProviderCopy[lang];
  const [usedModel, setUsedModel] = useState<string | null>(null);
  useEffect(() => {
    setAiSettingsState(readAiSettings(accountId));
    // New device: no local preference yet. Cloud rows only exist while "cloud" is chosen, so adopt it.
    if (hasLocalAiSettings(accountId)) return undefined;
    let live = true;
    hasCloudAiResults().then((yes) => {
      if (!live || !yes || hasLocalAiSettings(accountId)) return;
      const next = { ...readAiSettings(accountId), persist: "cloud" as const };
      writeAiSettings(accountId, next); setAiSettingsState(next);
    }, () => undefined);
    return () => { live = false; };
  }, [accountId]);
  const storyId = activeStory?.id;
  const persist = aiSettings.persist;
  const lastStoryRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!storyId) return undefined;
    const storyChanged = lastStoryRef.current !== storyId;
    lastStoryRef.current = storyId;
    if (persist !== "cloud") { setAiResult(persist === "account" ? readAiResult(accountId, storyId) : storyChanged ? null : (prev) => prev); return undefined; }
    if (storyChanged) setAiResult(null);
    let live = true;
    readCloudAiResult<{ signature: string; findings: Alert[] }>(storyId).then((r) => { if (live && r) setAiResult(r); }, () => undefined);
    return () => { live = false; };
  }, [accountId, storyId, persist]);
  const updateAiSettings = (next: AiSettings) => {
    setAiSettingsState(next); writeAiSettings(accountId, next);
    if (next.persist !== "account") clearAiResults(accountId);
    if (next.persist !== "cloud" && aiSettings.persist === "cloud") void clearCloudAiResults(accountId).catch(() => undefined);
    if (aiResult && storyId) { if (next.persist === "account") writeAiResult(accountId, storyId, aiResult); if (next.persist === "cloud") void writeCloudAiResult(accountId, storyId, aiResult).catch(() => undefined); }
  };

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

  if (!activeStory) return <div className="mx-auto max-w-6xl p-6 md:p-10"><h1 className="font-display text-3xl font-semibold">{t.libraryTitle}</h1><EmptyManuscripts /></div>;

  const words = activeStory.content.trim().split(/\s+/).filter(Boolean).length;
  const signature = hashText(JSON.stringify([activeStory.chapters.map((c) => [c.id, c.content]), characters, savedCanvas, timeline, activeStory.genres, activeStory.synopsis]));
  const currentAlerts = aiResult?.signature === signature ? aiResult.findings : alerts;
  const visible = currentAlerts.filter((a) => !dismissed.includes(a.id));

  const paragraphs = activeStory.content.split(/\n\s*\n/);
  const previewOriginal = previewing && previewing.chapterId === activeStory.activeChapterId ? (paragraphs[previewing.paragraphIndex ?? 0] ?? "").trim() : "";
  const previewSuggestion = previewing?.suggestion ?? previewOriginal;
  const checkPlotHoles = async () => {
    if (analyzing || !aiSettings.enabled) return;
    setAnalyzing(true); setAiError(null);
    try {
      const snapshot = parseBackup(JSON.parse(await exportBackup()));
      const result = await callGemini({ data: selectedStoryInput(snapshot, activeStory.id, "inspector", true, modes, aiSettings.provider) });
      if (!result.ok) { setAiError(result.error); setConsentOpen(false); return; }
      setUsedModel(result.model ?? null);
      const next = { signature, findings: result.output.findings.map((finding) => ({ ...finding, id: crypto.randomUUID(), chapterId: finding.chapterId ?? undefined, paragraphIndex: finding.paragraphIndex ?? undefined, suggestion: finding.suggestion ?? undefined })) };
      setAiResult(next); writeSessionAiResult(accountId, activeStory.id, next);
      if (aiSettings.persist === "account") writeAiResult(accountId, activeStory.id, next);
      if (aiSettings.persist === "cloud") void writeCloudAiResult(accountId, activeStory.id, next).catch(() => undefined);
      setDismissed([]); setConsentOpen(false);
    } catch (error) { setAiError(`${t.timelineGenerateError}${error instanceof Error && error.message ? ` (${error.message})` : ""}`); setConsentOpen(false); }
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
          <div className="flex flex-wrap gap-1">{activeStory.genres.map((genre) => <Badge key={genre} variant="outline" className="border-thread/40 text-thread">{getGenreLabel(genre, lang)}</Badge>)}</div>
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
              ref={editorRef}
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
             size="sm" variant="outline" aria-label={t.analyze} disabled={analyzing || !aiSettings.enabled}
             onClick={() => setConsentOpen(true)}
          >
            <RefreshCw className={cn("size-4", analyzing && "animate-spin")} />{t.analyze}
          </Button>
          <Popover><PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={sc.title}><Settings2 className="size-4" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4 text-sm">
              <p className="font-display font-semibold">{sc.title}</p>
              <label className="flex items-center justify-between gap-3"><span>{sc.enable}</span><Switch checked={aiSettings.enabled} onCheckedChange={(enabled) => updateAiSettings({ ...aiSettings, enabled })} /></label>
              <div className="space-y-2"><label htmlFor="inspector-provider" className="text-xs font-medium text-muted-foreground">{pc.title}</label><Select disabled={analyzing} value={aiSettings.provider} onValueChange={(value) => { const provider = AI_PROVIDERS.find((p) => p === value); if (provider) updateAiSettings({ ...aiSettings, provider }); }}><SelectTrigger id="inspector-provider"><SelectValue /></SelectTrigger><SelectContent>{AI_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{pc[p]}</SelectItem>)}</SelectContent></Select></div>
              <fieldset className="space-y-2"><legend className="mb-1 text-xs font-medium text-muted-foreground">{sc.store}</legend>
                {(["session", "account", "cloud"] as const).map((p) => <label key={p} className="flex items-center gap-2"><input type="radio" name="ai-persist" className="accent-primary" checked={aiSettings.persist === p} onChange={() => updateAiSettings({ ...aiSettings, persist: p })} />{sc[p]}</label>)}
              </fieldset>
            </PopoverContent>
          </Popover>
          {!aiSettings.enabled && <p className="w-full text-xs text-muted-foreground">{sc.disabled}</p>}
          {usedModel && <p role="status" className="w-full break-words text-xs text-muted-foreground">{pc.used}: {usedModel}</p>}
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
          {aiError && <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
            <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p className="flex-1 break-words">{aiError}</p><button aria-label={t.ignore} onClick={() => setAiError(null)}><X className="size-3.5" /></button></div>
          </div>}
          {visible.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.alertNoFindings}</p>
          )}
          {(["chronology", "text", "world", "relationship", "diction", "atmosphere", "pacing", "conflict", "repetition", "genre"] as const).map((kind) => {
            const group = visible.filter((alert) => alert.kind === kind);
            if (!group.length) return null;
            const heading = kind === "chronology" ? t.alertChronology : kind === "text" ? t.alertText : kind === "world" ? t.alertWorld : kind === "relationship" ? t.alertRelationship : aiModesCopy[lang][kind];
            return <section key={kind} className="space-y-3" aria-label={heading}>
              <h3 className="pt-2 text-xs font-semibold uppercase text-muted-foreground">{heading} <span className="ml-1">{group.length}</span></h3>
              {group.map((a) => <AlertCard key={a.id} a={a} canApply={a.chapterId === activeStory.activeChapterId && a.paragraphIndex !== undefined} onApply={() => setPreviewing(a)} canRevise={!!a.chapterId && a.paragraphIndex !== undefined && activeStory.chapters.some((c) => c.id === a.chapterId)} onRevise={() => { if (!a.chapterId) return; if (a.chapterId !== activeStory.activeChapterId) openChapter(activeStory.id, a.chapterId); setRevising(a); }} onDismiss={() => setDismissed((d) => [...d, a.id])} />)}
            </section>;
          })}
        </div>
      </aside>
      <GeminiConsentDialog open={consentOpen && aiSettings.enabled} busy={analyzing} onClose={() => setConsentOpen(false)} onConfirm={() => void checkPlotHoles()} modes={modes} onModesChange={setModes} provider={aiSettings.provider} onProviderChange={(provider) => updateAiSettings({ ...aiSettings, provider })} />
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

function AlertCard({ a, canApply, onApply, canRevise, onRevise, onDismiss }: { a: Alert; canApply: boolean; onApply: () => void; canRevise: boolean; onRevise: () => void; onDismiss: () => void }) {
  const { t, lang } = useStore();
  const styles = {
    chronology: { icon: Clock3, ring: "border-destructive/40", chip: "bg-destructive/15 text-destructive" },
    text: { icon: AlertTriangle, ring: "border-warning/50", chip: "bg-warning/20 text-warning" },
    world: { icon: UserX, ring: "border-info/50", chip: "bg-info/20 text-info" },
    relationship: { icon: Link2, ring: "border-thread/50", chip: "bg-thread/20 text-thread" },
    diction: { icon: BookUser, ring: "border-info/50", chip: "bg-info/20 text-info" },
    atmosphere: { icon: FileText, ring: "border-warning/50", chip: "bg-warning/20 text-warning" },
    pacing: { icon: Clock3, ring: "border-thread/50", chip: "bg-thread/20 text-thread" },
    conflict: { icon: Swords, ring: "border-destructive/50", chip: "bg-destructive/20 text-destructive" },
    repetition: { icon: Repeat, ring: "border-primary/50", chip: "bg-primary/20 text-primary" },
    genre: { icon: Tags, ring: "border-success/50", chip: "bg-success/20 text-success" },
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
             <Badge variant="outline" className="whitespace-normal text-xs leading-snug">{a.kind === "chronology" ? t.alertChronology : a.kind === "text" ? t.alertText : a.kind === "world" ? t.alertWorld : a.kind === "relationship" ? t.alertRelationship : aiModesCopy[lang][a.kind]}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
          {a.kind === "genre" && a.suggestion && <p className="mt-2 rounded-md bg-muted p-2 text-sm leading-relaxed"><span className="font-medium">{({ id: "Rekomendasi", en: "Recommendation", "zh-CN": "建议", "zh-TW": "建議" } as const)[lang]}:</span> {a.suggestion}</p>}
           <p className="mt-2 border-l-2 border-thread/50 pl-2 text-xs leading-relaxed text-muted-foreground">{t.alertSource}: {a.source}</p>
          <div className="mt-3 flex gap-2">
             {canApply && <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onApply}><Check className="size-3" /> {t.apply}</Button>}
             {canRevise && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRevise}><PenLine className="size-3" /> {({ id: "Revisi", en: "Revise", "zh-CN": "修订", "zh-TW": "修訂" } as const)[lang]}</Button>}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}><X className="size-3" /> {t.ignore}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact fingerprint so saved results never carry the manuscript text itself.
function hashText(text: string) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + text.length.toString(36); }
