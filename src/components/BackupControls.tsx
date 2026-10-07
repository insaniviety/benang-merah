import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { parseBackup, type LocalData } from "@/lib/local-data";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BackupControls() {
  const { t, exportBackup, importBackup } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<LocalData | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const json = await exportBackup();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `benang-merah-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t.exportDone);
    } catch {
      toast.error(t.storageError);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPending(parseBackup(JSON.parse(await file.text())));
    } catch {
      toast.error(t.importInvalid);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending);
      toast.success(t.importDone);
      setPending(null);
    } catch {
      toast.error(t.storageError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={download} disabled={busy}>{t.exportBackup}</Button>
      <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>{t.importBackup}</Button>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" aria-label={t.importBackup} onChange={choose} />
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.importBackup}</AlertDialogTitle>
            <AlertDialogDescription>{t.importConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>{t.continueLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
