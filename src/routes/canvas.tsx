import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { X, Swords, Handshake, EyeOff, Heart } from "lucide-react";
import { useStore, type RelationType } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [
      { title: "Thread Canvas — Benang Merah" },
      { name: "description", content: "Kanvas relasi visual: lihat benang merah konflik, aliansi, rahasia, dan asmara antar karakter." },
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
};

function Canvas() {
  const { t, characters, relations, moveCharacter } = useStore();
  const [filter, setFilter] = useState<RelationType | "all">("all");
  const [selected, setSelected] = useState<{ kind: "rel" | "node"; id: string } | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const typeLabel: Record<RelationType, string> = { conflict: t.conflict, alliance: t.alliance, secret: t.secret, romance: t.romance };
  const shown = relations.filter((r) => filter === "all" || r.type === filter);
  const byId = Object.fromEntries(characters.map((c) => [c.id, c]));

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    return pt;
  };

  const selRel = selected?.kind === "rel" ? relations.find((r) => r.id === selected.id) : undefined;
  const selNode = selected?.kind === "node" ? byId[selected.id] : undefined;
  const nodeRels = selNode ? relations.filter((r) => r.from === selNode.id || r.to === selNode.id) : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="space-y-4 border-b px-6 py-5">
        <PageHeader title={t.canvasTitle} subtitle={t.canvasSub} />
        <div className="flex flex-wrap gap-2">
          {(["all", "conflict", "alliance", "secret", "romance"] as const).map((f) => {
            const Icon = f === "all" ? null : TYPE_META[f].icon;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  filter === f ? "border-thread bg-thread/15 text-thread" : "hover:bg-accent",
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {f === "all" ? t.all : typeLabel[f]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 800 560" preserveAspectRatio="xMidYMin meet"
          className="paper-grain h-full w-full touch-none select-none"
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toSvg(e);
            moveCharacter(drag.current.id, p.x - drag.current.dx, p.y - drag.current.dy);
          }}
          onPointerUp={() => (drag.current = null)}
          onClick={(e) => { if (e.target === svgRef.current) setSelected(null); }}
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
              <g key={r.id} className="cursor-pointer" onClick={() => setSelected({ kind: "rel", id: r.id })}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
                <path
                  d={d} fill="none"
                  className={cn("stroke-thread transition-all", isSel ? "opacity-100" : "opacity-60", isSel && r.type === "conflict" && "thread-dash")}
                  strokeWidth={isSel ? 3 : 1.75}
                  strokeDasharray={TYPE_META[r.type].dash}
                  strokeLinecap="round"
                  filter={isSel ? "url(#glow)" : undefined}
                />
                <g transform={`translate(${(x1 + 2 * mx + x2) / 4} ${(y1 + 2 * my + y2) / 4})`}>
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
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => { const p = toSvg(e); drag.current = { id: c.id, dx: p.x - c.x, dy: p.y - c.y }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
                onClick={() => setSelected({ kind: "node", id: c.id })}
              >
                <div className={cn(
                  "flex h-full items-center gap-2.5 rounded-xl border bg-card px-3 shadow-soft transition-shadow",
                  isSel && "ring-2 ring-thread",
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
              <button onClick={() => setSelected(null)} className="rounded-md p-1.5 hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
              {selRel && <RelationHistory rel={selRel} label={typeLabel[selRel.type]} />}
              {selNode && (
                <>
                  <p className="text-sm text-muted-foreground">{selNode.bio}</p>
                  <p className="text-xs text-muted-foreground">{nodeRels.length} {t.connections}</p>
                  {nodeRels.map((r) => (
                    <button key={r.id} onClick={() => setSelected({ kind: "rel", id: r.id })} className="w-full rounded-xl border bg-background p-3 text-left hover:border-thread/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-thread">{typeLabel[r.type]}</p>
                      <p className="text-sm font-medium">{byId[r.from === selNode.id ? r.to : r.from]?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                    </button>
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
    </div>
  );
}

function RelationHistory({ rel, label }: { rel: ReturnType<typeof useStore>["relations"][number]; label: string }) {
  const { t } = useStore();
  const Icon = TYPE_META[rel.type].icon;
  return (
    <>
      <div className="flex items-center gap-2 rounded-xl bg-thread/10 p-3">
        <Icon className="size-4 text-thread" />
        <span className="text-sm font-semibold text-thread">{label}</span>
        <span className="ml-auto text-sm text-muted-foreground">{rel.label}</span>
      </div>
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
