import { useStore } from "@/lib/store";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AI_MODES, aiModesCopy, type AiMode } from "@/lib/ai-modes-copy";
import { AI_PROVIDERS, aiProviderCopy, routeAi, type AiProvider } from "@/lib/ai-routing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function GeminiConsentDialog({ open, busy, onClose, onConfirm, modes, onModesChange, provider, onProviderChange, task = "inspector" }: { open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void; modes?: AiMode[]; onModesChange?: (modes: AiMode[]) => void; provider: AiProvider; onProviderChange: (provider: AiProvider) => void; task?: "timeline" | "inspector" }) {
  const { t, lang } = useStore();
  const copy = aiModesCopy[lang];
  const pc = aiProviderCopy[lang];
  return <AlertDialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{pc.consent}</AlertDialogTitle><AlertDialogDescription>{pc.privacy}</AlertDialogDescription></AlertDialogHeader>
    <div className="space-y-2"><label className="text-sm font-medium" htmlFor="consent-provider">{pc.title}</label><Select disabled={busy} value={provider} onValueChange={(value) => { const p = AI_PROVIDERS.find((p) => p === value); if (p) onProviderChange(p); }}><SelectTrigger id="consent-provider"><SelectValue /></SelectTrigger><SelectContent>{AI_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{pc[p]}</SelectItem>)}</SelectContent></Select>
      <p className="text-xs text-muted-foreground">{routeAi(provider, task, modes ?? []).map((p) => pc[p]).join(" → ")}</p>
      {provider === "auto" && <p className="text-xs text-muted-foreground">{pc.fallback}</p>}
    </div>
    {modes && onModesChange && <fieldset className="space-y-2 rounded-lg border p-3 text-sm">
      <legend className="px-1 font-medium">{copy.title}</legend>
      <p className="text-xs text-muted-foreground">{copy.hint}</p>
      {AI_MODES.map((mode) => <label key={mode} className="flex items-center gap-2">
        <input type="checkbox" className="accent-primary" disabled={busy} checked={modes.includes(mode)} onChange={(e) => onModesChange(e.target.checked ? [...modes, mode] : modes.filter((m) => m !== mode))} />
        {copy[mode]}
      </label>)}
    </fieldset>}
    <AlertDialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>{t.cancel}</Button><Button disabled={busy} onClick={onConfirm}>{busy ? pc.working : t.aiConsentSend}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}
