import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Plus, Layers, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { NewStoryDialog } from "@/components/NewStoryDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getGenreLabel } from "@/lib/i18n";
import { BackupControls } from "@/components/BackupControls";
import { ManuscriptExport } from "@/components/ManuscriptExport";
import { EmptyManuscripts } from "@/components/EmptyManuscripts";
import { workspaceCopy } from "@/lib/workspace-copy";
import { cloudCopy } from "@/lib/cloud-copy";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  const { t, lang, stories, activeStory, setActiveStoryId, setNewStoryOpen, deleteStory, cloudStoryIds, cloudSavedStoryIds, cloudStatus, setCloudSync } = useStore();
  const cc = cloudCopy[lang];
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const copy = workspaceCopy[lang];
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <PageHeader
        title={t.libraryTitle}
        subtitle={t.librarySubtitle}
        action={<Button className="shadow-glow" onClick={() => setNewStoryOpen(true)}><Plus /> {t.newStory.replace(/^\+\s*/, "")}</Button>}
      />
      <div className="flex flex-wrap gap-2"><BackupControls /><ManuscriptExport /></div>
      {stories.length === 0 && <EmptyManuscripts />}
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
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">{s.genres.map((genre) => <Badge key={genre} variant="outline" className="border-thread/40 text-thread">{getGenreLabel(genre, lang)}</Badge>)}</div>
                <span className="text-xs text-muted-foreground">{s.language}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold leading-snug">{s.title}</h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{s.synopsis}</p>
              <dl className="mt-5 flex gap-5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Layers className="size-3.5" /> {s.chapters.length} {t.chapters}</div>
                <div className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {t.updated} {fmt.format(new Date(s.updatedAt))}</div>
              </dl>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs" title={cc.hint}>
                <span className={cn(cloudStoryIds.includes(s.id) ? "text-thread" : "text-muted-foreground")}>
                  {cloudStoryIds.includes(s.id) ? `${cc.on} · ${cloudSavedStoryIds.includes(s.id) ? cc.synced : cloudStatus === "error" ? cc.error : cc.syncing}` : cc.off}
                </span>
                <Switch aria-label={cc.label} checked={cloudStoryIds.includes(s.id)} onCheckedChange={(v) => { void setCloudSync(s.id, v).catch(() => undefined); }} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(s.id)}><Pencil className="size-4" /> {t.edit}</Button>
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={copy.deleteLabel} onClick={() => { setDeleteError(false); setDeletingId(s.id); }}><Trash2 className="size-4" /></Button>
                </TooltipTrigger><TooltipContent>{copy.deleteLabel}</TooltipContent></Tooltip></TooltipProvider>
              </div>
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
      {(() => { const editingStory = stories.find((story) => story.id === editingId); return editingStory ? <NewStoryDialog key={editingStory.id} story={editingStory} open onOpenChange={(value) => { if (!value) setEditingId(null); }} /> : null; })()}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open && !deleting) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <p className="break-words font-medium">{stories.find((story) => story.id === deletingId)?.title}</p>
          {deleteError && <p role="alert" className="text-sm text-destructive">{t.storageError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{copy.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              if (!deletingId || deleting) return;
              setDeleting(true);
              try { await deleteStory(deletingId); setDeletingId(null); }
              catch { setDeleteError(true); } finally { setDeleting(false); }
            }}><Trash2 />{copy.confirm}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
