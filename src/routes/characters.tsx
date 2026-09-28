import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Quote, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStore, type Character, type CharStatus, type Role } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { NewCharacterDialog } from "@/components/NewCharacterDialog";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Character Bible — Benang Merah" },
      { name: "description", content: "Profil karakter lengkap: peran, diksi khas, dan status setiap tokoh dalam naskahmu." },
      { property: "og:title", content: "Character Bible — Benang Merah" },
      { property: "og:description", content: "Jaga konsistensi karakter dengan Character Bible." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Characters,
});

function Characters() {
  const { t, characters, deleteCharacter } = useStore();
  const [editing, setEditing] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState<Character | null>(null);
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
              <div className="-mr-2 -mt-2 flex shrink-0">
                <Button size="icon" variant="ghost" className="size-8" aria-label={`${t.edit} ${c.name}`} title={t.edit} onClick={() => setEditing(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label={`${t.deleteLabel} ${c.name}`} title={t.deleteLabel} onClick={() => setDeleting(c)}>
                  <Trash2 className="size-4" />
                </Button>
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

      <NewCharacterDialog character={editing ?? undefined} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{t.deleteCharTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{deleting?.name}</span> — {t.deleteCharDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleting) { deleteCharacter(deleting.id); toast.success(t.characterDeleted); } setDeleting(null); }}
            >
              <Trash2 className="size-4" /> {t.deleteLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
