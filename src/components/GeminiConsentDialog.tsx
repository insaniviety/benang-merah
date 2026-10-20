import { useStore } from "@/lib/store";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AI_MODES, aiModesCopy, type AiMode } from "@/lib/ai-modes-copy";

export function GeminiConsentDialog({ open, busy, onClose, onConfirm, modes, onModesChange }: { open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void; modes?: AiMode[]; onModesChange?: (modes: AiMode[]) => void }) {
  const { t, lang } = useStore();
  const copy = aiModesCopy[lang];
  return <AlertDialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{t.aiConsentTitle}</AlertDialogTitle><AlertDialogDescription>{t.aiConsentBody}</AlertDialogDescription></AlertDialogHeader>
    {modes && onModesChange && <fieldset className="space-y-2 rounded-lg border p-3 text-sm">
      <legend className="px-1 font-medium">{copy.title}</legend>
      <p className="text-xs text-muted-foreground">{copy.hint}</p>
      {AI_MODES.map((mode) => <label key={mode} className="flex items-center gap-2">
        <input type="checkbox" className="accent-primary" disabled={busy} checked={modes.includes(mode)} onChange={(e) => onModesChange(e.target.checked ? [...modes, mode] : modes.filter((m) => m !== mode))} />
        {copy[mode]}
      </label>)}
    </fieldset>}
    <AlertDialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>{t.cancel}</Button><Button disabled={busy} onClick={onConfirm}>{busy ? t.aiWorking : t.aiConsentSend}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}
