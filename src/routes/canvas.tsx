import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { X, Swords, Handshake, EyeOff, Heart, Users, Link2, Save, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, type RelationType } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "Thread Canvas — Benang Merah" },
      { name: "description", content: "Kanvas relasi visual: lihat benang merah konflik, aliansi, rahasia, asmara, dan keluarga antar karakter." },
      { property: "og:title", content: "Thread Canvas — Benang Merah" },
      { property: "og:description", content: "Peta hubungan karakter interaktif untuk penulis fiksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Canvas,
});

const NODE_W = 150, NODE_H = 56;
const TYPE_META: Record<RelationType, { icon: typeof Swords; dash?: string }> = {
  conflict: { icon: Swords },
  alliance: { icon: Handshake },
  secret: { icon: EyeOff, dash: "4 6" },
  romance: { icon: Heart, dash: "1 5" },
  family: { icon: Users, dash: "8 3" },
};

function Canvas() {
  const { t, activeStory, characters, relations, moveCharacter, addRelation, updateRelation, deleteRelation, savedCanvas, canvasDirty, saveCanvas } = useStore();
  const [filter, setFilter] = useState<RelationType | "all">("all");
  const [selected, setSelected] = useState<{ kind: "rel" | "node"; id: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; from: string; to: string; type: RelationType; label: string } | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const wasMoved = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const typeLabel: Record<RelationType, string> = { conflict: t.conflict, alliance: t.alliance, secret: t.secret, romance: t.romance, family: t.family };
  const shown = relations.filter((r) => filter === "all" || r.type === filter);
  const byId = Object.fromEntries(characters.map((c) => [c.id, c]));

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return new DOMPoint(e.clientX, e.clientY);
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return pt;
  };

  const selRel = selected?.kind === "rel" ? relations.find((r) => r.id === selected.id) : undefined;
  const selNode = selected?.kind === "node" ? byId[selected.id] : undefined;
  const nodeRels = selNode ? relations.filter((r) => r.from === selNode.id || r.to === selNode.id) : [];
  const chooseNode = (id: string) => {
    if (wasMoved.current) { wasMoved.current = false; return; }
    if (!connecting) { setSelected({ kind: "node", id }); return; }
    if (!connectFrom) { setConnectFrom(id); return; }
    if (connectFrom === id) { setConnectFrom(null); return; }
    setEditing({ from: connectFrom, to: id, type: "family", label: "" });
    setConnecting(false);
    setConnectFrom(null);
  };
  const saveThread = () => {
    if (!editing) return;
    if (editing.id) updateRelation(editing.id, { type: editing.type, label: editing.label });
    else addRelation(editing.from, editing.to, editing.type, editing.label);
    setEditing(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="space-y-4 border-b px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={t.canvasTitle} subtitle={t.canvasSub} />
          <div className="flex flex-wrap items-center gap-3">
            <span role="status" className={cn("max-w-xs text-sm", savedCanvas && !canvasDirty ? "text-success" : "text-warning")}>
              {savedCanvas && !canvasDirty ? <><span className="inline-block size-2 rounded-full bg-success" /> {t.canvasReady}</> : t.canvasUnsaved}
            </span>
            <Button onClick={() => { saveCanvas(); toast.success(t.canvasSavedToast); }} disabled={!!savedCanvas && !canvasDirty || !activeStory}><Save className="size-4" /> {t.saveCanvas}</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "alliance", "romance", "conflict", "secret", "family"] as const).map((f) => {
            const Icon = f === "all" ? null : TYPE_META[f].icon;
            return (
              <Button
                key={f}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full",
                  filter === f && "border-thread bg-thread/15 text-thread hover:bg-thread/20 hover:text-thread",
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {f === "all" ? t.all : typeLabel[f]}
              </Button>
            );
          })}
          <Button type="button" size="sm" variant={connecting ? "default" : "outline"} aria-pressed={connecting} onClick={() => { setConnecting((value) => !value); setConnectFrom(null); setSelected(null); }}>
            <Link2 className="size-4" /> {t.connectNodes}
          </Button>
        </div>
        {connecting && <p className="text-sm text-thread" role="status">{connectFrom ? `${byId[connectFrom]?.name} → ${t.relatedCharacter}` : t.connectHint}</p>}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 800 560" preserveAspectRatio="xMidYMin meet"
          className="paper-grain h-full w-full touch-none select-none"
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toSvg(e);
            if (Math.abs(p.x - drag.current.dx - (byId[drag.current.id]?.x ?? 0)) > 2 || Math.abs(p.y - drag.current.dy - (byId[drag.current.id]?.y ?? 0)) > 2) wasMoved.current = true;
            moveCharacter(drag.current.id, p.x - drag.current.dx, p.y - drag.current.dy);
          }}
          onPointerUp={() => { drag.current = null; }}
          onClick={(e) => { if (e.target === svgRef.current) { setSelected(null); if (connecting) setConnectFrom(null); } }}
        >
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {shown.map((r) => {
            const a = byId[r.from], b = byId[r.to];
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H / 2, x2 = b.x + NODE_W / 2, y2 = b.y + NODE_H / 2;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 40;
            const isSel = selRel?.id === r.id || nodeRels.some((n) => n.id === r.id);
            const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
            return (
              <g key={r.id} role="button" aria-label={`${typeLabel[r.type]}: ${a.name} — ${b.name}`} tabIndex={0} className="cursor-pointer" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected({ kind: "rel", id: r.id }); } }} onClick={(e) => { e.stopPropagation(); setSelected({ kind: "rel", id: r.id }); setConnecting(false); setConnectFrom(null); }}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
                <path
                  d={d} fill="none"
                  className={cn("stroke-thread transition-all", isSel ? "opacity-100" : "opacity-60", isSel && r.type === "conflict" && "thread-dash")}
                  strokeWidth={isSel ? 3 : 1.75}
                  strokeDasharray={TYPE_META[r.type].dash}
                  strokeLinecap="round"
                  filter={isSel ? "url(#glow)" : undefined}
                />
                <g pointerEvents="all" transform={`translate(${(x1 + 2 * mx + x2) / 4} ${(y1 + 2 * my + y2) / 4})`}>
                  <rect x={-46} y={-11} width={92} height={22} rx={11} className="fill-card stroke-border" />
                  <text textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[10px] font-semibold uppercase tracking-wider">{typeLabel[r.type]}</text>
                </g>
              </g>
            );
          })}
          {characters.map((c) => {
            const isSel = selNode?.id === c.id;
            return (
              <foreignObject
                key={c.id} x={c.x} y={c.y} width={NODE_W} height={NODE_H}
                className={connecting ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}
                onPointerDown={(e) => { if (connecting) return; const p = toSvg(e); wasMoved.current = false; drag.current = { id: c.id, dx: p.x - c.x, dy: p.y - c.y }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
                onClick={(e) => { e.stopPropagation(); chooseNode(c.id); }}
              >
                <div className={cn(
                  "flex h-full items-center gap-2.5 rounded-xl border bg-card px-3 shadow-soft transition-shadow",
                  (isSel || connectFrom === c.id) && "ring-2 ring-thread",
                  c.status === "deceased" && "opacity-60",
                )}>
                  <Avatar name={c.name} hue={c.hue} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{c.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{{ protagonist: t.protagonist, antagonist: t.antagonist, supporting: t.supporting }[c.role]}</p>
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>

        {/* Side panel */}
        <aside className={cn(
          "absolute inset-y-0 right-0 w-full max-w-sm translate-x-full border-l bg-card/95 backdrop-blur transition-transform duration-300 sm:w-96",
          selected && "translate-x-0",
        )}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-thread">{t.relationHistory}</p>
                {selRel && (
                  <h2 className="mt-1 font-display text-xl font-semibold">
                    {byId[selRel.from]?.name} <span className="text-muted-foreground">×</span> {byId[selRel.to]?.name}
                  </h2>
                )}
                {selNode && <h2 className="mt-1 font-display text-xl font-semibold">{selNode.name}</h2>}
              </div>
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={t.close} onClick={() => setSelected(null)}><X className="size-4" /></Button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
              {selRel && <>
                <RelationHistory rel={selRel} label={typeLabel[selRel.type]} characters={byId} />
                <Button variant="outline" className="w-full" onClick={() => setEditing({ id: selRel.id, from: selRel.from, to: selRel.to, type: selRel.type, label: selRel.label })}><Pencil className="size-4" /> {t.relationDetails}</Button>
              </>}
              {selNode && (
                <>
                  <div className="border-l-2 border-thread pl-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-thread">{t.characterIdentity}</p>
                    <p className="mt-1 text-sm font-medium">{selNode.identity || "—"}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{selNode.bio}</p>
                  <p className="text-xs text-muted-foreground">{nodeRels.length} {t.connections}</p>
                  {nodeRels.map((r) => (
                    <Button key={r.id} variant="outline" onClick={() => setSelected({ kind: "rel", id: r.id })} className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal p-3 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-thread">{typeLabel[r.type]}</p>
                      <p className="text-sm font-medium">{byId[r.from === selNode.id ? r.to : r.from]?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                    </Button>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>
        {!selected && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-card/90 px-4 py-1.5 text-xs text-muted-foreground">
            {t.selectHint}
          </p>
        )}
      </div>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl">{t.relationDetails}</DialogTitle><DialogDescription>{editing ? `${byId[editing.from]?.name} × ${byId[editing.to]?.name}` : ""}</DialogDescription></DialogHeader>
          {editing && <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>{t.relationKind}</Label><Select value={editing.type} onValueChange={(type) => setEditing((prev) => prev ? { ...prev, type: type as RelationType } : null)}><SelectTrigger aria-label={t.relationKind}><SelectValue /></SelectTrigger><SelectContent>{(["alliance", "romance", "conflict", "secret", "family"] as const).map((kind) => <SelectItem key={kind} value={kind}>{typeLabel[kind]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="thread-note">{t.relationNote}</Label><Input id="thread-note" value={editing.label} onChange={(e) => setEditing((prev) => prev ? { ...prev, label: e.target.value } : null)} placeholder={t.relationNoteExample} /></div>
          </div>}
          <DialogFooter>
            {editing?.id && <Button variant="destructive" className="sm:mr-auto" onClick={() => { if (!editing.id) return; deleteRelation(editing.id); setEditing(null); setSelected(null); }}><Trash2 className="size-4" /> {t.deleteThread}</Button>}
            <Button variant="outline" onClick={() => setEditing(null)}>{t.cancel}</Button>
            <Button onClick={saveThread} disabled={!editing?.label.trim()}>{t.saveChanges}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RelationHistory({ rel, label, characters }: { rel: ReturnType<typeof useStore>["relations"][number]; label: string; characters: Record<string, ReturnType<typeof useStore>["characters"][number]> }) {
  const { t } = useStore();
  const Icon = TYPE_META[rel.type].icon;
  const fromCharacter = characters[rel.from];
  const toCharacter = characters[rel.to];
  return (
    <>
      <div className="flex items-center gap-2 rounded-xl bg-thread/10 p-3">
        <Icon className="size-4 text-thread" />
        <span className="text-sm font-semibold text-thread">{label}</span>
        <span className="ml-auto text-sm text-muted-foreground">{rel.label}</span>
      </div>
      {rel.type === "family" && (
        <div className="space-y-3 border-l-2 border-thread pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-thread">{t.familyContext}</p>
          {[fromCharacter, toCharacter].map((character) => character && (
            <div key={character.id}>
              <p className="text-sm font-semibold">{character.name}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{character.identity || "—"}</p>
            </div>
          ))}
          <p className="text-sm font-medium">{rel.label}</p>
        </div>
      )}
      <ol className="relative ml-2 space-y-5 border-l border-thread/40 pl-5">
        {rel.history.map((h, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[26px] top-1 size-3 rounded-full bg-thread ring-4 ring-card" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.chapter} {h.chapter}</p>
            <p className="mt-0.5 font-prose text-sm leading-relaxed">{h.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
