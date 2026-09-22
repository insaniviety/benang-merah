import { createFileRoute } from "@tanstack/react-router";
import { Quote } from "lucide-react";
import { useStore, type CharStatus, type Role } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { NewCharacterDialog } from "@/components/NewCharacterDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Character Bible — Benang Merah" },
      { name: "description", content: "Profil karakter lengkap: peran, diksi khas, dan status setiap tokoh dalam naskahmu." },
      { property: "og:title", content: "Character Bible — Benang Merah" },
      { property: "og:description", content: "Jaga konsistensi karakter dengan Character Bible." },
    ],
  }),
  component: Characters,
});

export function Avatar({ name, hue, size = "md" }: { name: string; hue: number; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold ring-2 ring-background",
        size === "sm" && "size-8 text-xs", size === "md" && "size-14 text-lg", size === "lg" && "size-20 text-2xl",
      )}
      style={{ background: `oklch(0.6 0.12 ${hue})`, color: `oklch(0.98 0.01 ${hue})` }}
    >
      {initials}
    </span>
  );
}

function Characters() {
  const { t, characters } = useStore();
  const roleLabel: Record<Role, string> = { protagonist: t.protagonist, antagonist: t.antagonist, supporting: t.supporting };
  const statusLabel: Record<CharStatus, string> = { active: t.active, deceased: t.deceased, missing: t.missing };
  const statusCls: Record<CharStatus, string> = {
    active: "bg-success/20 text-success-foreground",
    deceased: "bg-muted text-muted-foreground line-through",
    missing: "bg-warning/25 text-warning-foreground",
  };
  const roleCls: Record<Role, string> = {
    protagonist: "border-thread/50 text-thread",
    antagonist: "border-foreground/30 text-foreground",
    supporting: "border-border text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <PageHeader title={t.charactersTitle} subtitle={t.charactersSub} action={<NewCharacterDialog />} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <article key={c.id} className="flex flex-col rounded-2xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
            <div className="flex items-start gap-4">
              <Avatar name={c.name} hue={c.hue} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl font-semibold">{c.name}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={roleCls[c.role]}>{roleLabel[c.role]}</Badge>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusCls[c.status])}>{statusLabel[c.status]}</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{c.bio}</p>
            <div className="mt-4 rounded-xl bg-muted/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Quote className="size-3" /> {t.diction}
              </p>
              <p className="font-prose text-sm italic leading-relaxed">{c.diction || "—"}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
