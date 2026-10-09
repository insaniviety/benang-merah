import { useStore } from "@/lib/store";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function GeminiConsentDialog({ open, busy, onClose, onConfirm }: { open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useStore();
  return <AlertDialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{t.aiConsentTitle}</AlertDialogTitle><AlertDialogDescription>{t.aiConsentBody}</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>{t.cancel}</Button><Button disabled={busy} onClick={onConfirm}>{busy ? t.aiWorking : t.aiConsentSend}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}