import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Clock3, GitBranch, MapPin, Pencil, Plus, Save, Sparkles, Trash2, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { analyzeWithGemini } from "@/lib/gemini.functions";
import { selectedStoryInput } from "@/lib/gemini-data";
import { parseBackup } from "@/lib/local-data";
import { GeminiConsentDialog } from "@/components/GeminiConsentDialog";
import { cn } from "@/lib/utils";

type Event = { id: string; time: string; era: "past" | "present"; track: number; event: string; location: string; characters: string[]; connection: string };
const blank = (): Event => ({ id: crypto.randomUUID(), time: "", era: "present", track: 1, event: "", location: "", characters: [], connection: "" });

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [
    { title: "Timeline Cerita — Benang Merah" },
    { name: "description", content: "Susun kejadian paralel, kilas balik, dan hubungan sebab-akibat dalam timeline cerita." },
    { property: "og:title", content: "Timeline Cerita — Benang Merah" },
    { property: "og:description", content: "Susun kejadian paralel, kilas balik, dan hubungan sebab-akibat dalam timeline cerita." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Timeline,
});

function Timeline() {
  const { t, activeStory, characters, timelines, updateTimeline, saveTimeline, exportBackup } = useStore();
  const callGemini = useServerFn(analyzeWithGemini);
  const [consentOpen, setConsentOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const record = activeStory ? timelines[activeStory.id] : undefined;
  const events = record?.draft ?? [];
  const dirty = JSON.stringify(events) !== JSON.stringify(record?.saved ?? []);
  const saved = !!record?.saved?.length && !dirty;
  const ready = true;
  if (!activeStory) return <div className="p-10 text-muted-foreground">{t.noStory}</div>;
  const change = (next: Event[]) => updateTimeline(activeStory.id, next);
  const move = (fromId: string, toId: string) => {
    const from = events.findIndex((e) => e.id === fromId), to = events.findIndex((e) => e.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...events];
    const item = next[from];
    if (!item) return;
    next.splice(from, 1); next.splice(to, 0, item); change(next);
  };
  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    const storyId = activeStory.id;
    try {
      const snapshot = parseBackup(JSON.parse(await exportBackup()));
      const result = await callGemini({ data: selectedStoryInput(snapshot, storyId, "timeline", true) });
      if (!result.ok) { toast.error(result.error); return; }
      updateTimeline(storyId, result.output.events.map((event) => ({ ...event, id: crypto.randomUUID() })));
      setConsentOpen(false);
      toast.success(t.timelineGenerated);
    } catch { toast.error(t.timelineGenerateError); }
    finally { setLoading(false); }
  };
  const save = () => { saveTimeline(activeStory.id); toast.success(t.timelineSavedToast); };
  // Consecutive events with the same time are positioned in parallel tracks.
  const groups: Event[][] = [];
  events.forEach((event) => {
    const last = groups[groups.length - 1];
    const first = last?.[0];
    if (last && first && first.time === event.time && first.era === event.era) last.push(event);
    else groups.push([event]);
  });
  const edit = (event: Event) => { change(events.some((e) => e.id === event.id) ? events.map((e) => e.id === event.id ? event : e) : [...events, event]); setEditing(null); };
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b pb-7">
        <div><p className="mb-2 text-xs font-semibold uppercase text-thread">{activeStory.title}</p><h1 className="font-display text-3xl font-semibold md:text-4xl">{t.timelineTitle}</h1><p className="mt-2 text-sm text-muted-foreground">{t.timelineSub}</p></div>
        {ready && (events.length > 0 || dirty) && <div className="flex flex-wrap items-center gap-3">
          <span role="status" className={cn("max-w-xs text-sm", saved ? "text-success" : "text-warning")}>{saved ? <><span className="inline-block size-2 rounded-full bg-success" /> {t.timelineReady}</> : t.timelineUnsaved}</span>
          <Button onClick={save} disabled={!dirty}><Save className="size-4" /> {t.saveTimeline}</Button>
        </div>}
      </div>
      {ready && events.length === 0 ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border border-thread/30 bg-thread/10"><Clock3 className="size-9 text-thread" /></div>
          <h2 className="font-display text-2xl font-semibold">{t.timelineEmpty}</h2>
          <Button size="lg" className="shadow-glow" onClick={() => setConsentOpen(true)} disabled={loading}><Sparkles className="size-5" /> {loading ? t.timelineGenerating : t.generateTimeline}</Button>
          <Button variant="ghost" onClick={() => setEditing(blank())}><Plus className="size-4" /> {t.addEvent}</Button>
        </div>
      ) : ready && <>
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><GitBranch className="size-4 text-thread" /> {events.length} {t.eventsCount}</div><Button variant="outline" onClick={() => setEditing(blank())}><Plus className="size-4" /> {t.addEvent}</Button></div>
        <ol className="relative ml-3 border-l-2 border-thread/50 pb-8 md:ml-8">
          {groups.map((group, groupIndex) => { const first = group[0]; if (!first) return null; return <li key={first.id} className="relative mb-10 pl-7 md:pl-12">
            <span className="absolute -left-[9px] top-1 size-4 rounded-full border-4 border-background bg-thread ring-1 ring-thread" />
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-thread"><Clock3 className="size-4" /> {first.time || t.present} <span className="font-normal text-muted-foreground">· {first.era === "past" ? t.pastEvent : t.present}</span></div>
            <div className={cn("grid gap-4", group.length > 1 && "lg:grid-cols-2")}>
              {group.map((e) => <article key={e.id} draggable onDragStart={(ev) => { ev.dataTransfer.effectAllowed = "move"; setDragging(e.id); }} onDragEnd={() => setDragging(null)} onDragOver={(ev) => ev.preventDefault()} onDrop={(ev) => { ev.preventDefault(); if (dragging) move(dragging, e.id); setDragging(null); }} className={cn("min-w-0 rounded-md border bg-card p-5 shadow-soft transition-colors", e.era === "past" ? "border-thread/45" : "border-border", dragging === e.id && "opacity-50")}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase text-thread">{group.length > 1 ? `${t.track} ${e.track}` : `${t.eventLabel} ${events.indexOf(e) + 1}`}</span><div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="size-8" title={t.moveUp} aria-label={`${t.moveUp}: ${e.event}`} disabled={events.indexOf(e) === 0} onClick={() => { const target = events[events.indexOf(e) - 1]; if (target) move(e.id, target.id); }}><ArrowUp className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-8" title={t.moveDown} aria-label={`${t.moveDown}: ${e.event}`} disabled={events.indexOf(e) === events.length - 1} onClick={() => { const target = events[events.indexOf(e) + 1]; if (target) move(e.id, target.id); }}><ArrowDown className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-8" title={t.edit} aria-label={`${t.edit}: ${e.event}`} onClick={() => setEditing(e)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" title={t.deleteLabel} aria-label={`${t.deleteLabel}: ${e.event}`} onClick={() => setDeleting(e.id)}><Trash2 className="size-4" /></Button>
                </div></div>
                <h2 className="mt-2 font-display text-xl font-semibold">{e.event}</h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" /> {e.location || "—"}</p>
                {e.characters.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><Users className="size-4 text-muted-foreground" /> {e.characters.map((name) => <span key={name} className="rounded-full border border-thread/30 bg-thread/10 px-2.5 py-1 text-xs text-thread">{name}</span>)}</div>}
                {e.era === "past" && <div className="mt-5 border-t border-thread/20 pt-4 text-sm"><span className="font-semibold text-thread">{t.connectionToPresent}</span><p className="mt-1 leading-relaxed text-muted-foreground">{e.connection || "—"}</p></div>}
              </article>)}
            </div>
            {groupIndex < groups.length - 1 && <span className="sr-only">→</span>}
          </li>})}
        </ol>
      </>}
      <GeminiConsentDialog open={consentOpen} busy={loading} onClose={() => setConsentOpen(false)} onConfirm={() => void handleGenerate()} />
      <EventDialog key={editing?.id ?? "closed"} value={editing} names={characters.map((c) => c.name)} onClose={() => setEditing(null)} onSave={edit} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.deleteEventConfirm}</AlertDialogTitle><AlertDialogDescription>{t.deleteEventDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { change(events.filter((e) => e.id !== deleting)); setDeleting(null); }}>{t.deleteLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
function EventDialog({ value, names, onClose, onSave }: { value: Event | null; names: string[]; onClose: () => void; onSave: (event: Event) => void }) {
  const { t } = useStore();
  const [form, setForm] = useState<Event>(value ?? blank());
  if (!value) return null;
  const patch = (part: Partial<Event>) => setForm((prev) => ({ ...prev, ...part }));
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-2xl">{t.eventDetails}</DialogTitle><DialogDescription>{t.eventDetailsSub}</DialogDescription></DialogHeader>
    <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="event-time">{t.timeLabel}</Label><Input id="event-time" value={form.time} onChange={(ev) => patch({ time: ev.target.value })} placeholder={t.timeExample} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label>{t.period}</Label><Select value={form.era} onValueChange={(era) => patch({ era: era as Event["era"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="past">{t.pastEvent}</SelectItem><SelectItem value="present">{t.present}</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label>{t.track}</Label><Select value={String(form.track)} onValueChange={(track) => patch({ track: Number(track) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map((n) => <SelectItem value={String(n)} key={n}>{t.track} {n}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="grid gap-2"><Label htmlFor="event-name">{t.eventLabel}</Label><Input id="event-name" value={form.event} onChange={(ev) => patch({ event: ev.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="event-place">{t.locationLabel}</Label><Input id="event-place" value={form.location} onChange={(ev) => patch({ location: ev.target.value })} /></div>
      <div className="grid gap-2"><Label>{t.involvedCharacters}</Label><div className="flex flex-wrap gap-2">{names.length ? names.map((name) => <Button key={name} type="button" size="sm" variant={form.characters.includes(name) ? "default" : "outline"} onClick={() => patch({ characters: form.characters.includes(name) ? form.characters.filter((c) => c !== name) : [...form.characters, name] })}>{form.characters.includes(name) && <Check className="size-3" />} {name}</Button>) : <p className="text-sm text-muted-foreground">—</p>}</div></div>
      {form.era === "past" && <div className="grid gap-2"><Label htmlFor="event-link">{t.connectionToPresent}</Label><Textarea id="event-link" value={form.connection} onChange={(ev) => patch({ connection: ev.target.value })} /></div>}
    </div><DialogFooter><Button variant="outline" onClick={onClose}>{t.cancel}</Button><Button disabled={!form.time.trim() || !form.event.trim()} onClick={() => onSave({ ...form, time: form.time.trim(), event: form.event.trim(), location: form.location.trim(), connection: form.connection.trim() })}>{t.saveChanges}</Button></DialogFooter></DialogContent></Dialog>;
}
