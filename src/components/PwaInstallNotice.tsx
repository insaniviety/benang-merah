import { useEffect, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { pwaCopy } from "@/lib/pwa-copy";
import { registerAppWorker } from "@/lib/pwa";
import { shouldRegisterAppWorker } from "@/lib/pwa-policy";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallNotice() {
  const { lang } = useStore();
  const copy = pwaCopy[lang];
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [available, setAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const iosStandalone = "standalone" in navigator && navigator.standalone === true;
    setInstalled(standalone.matches || iosStandalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setAvailable(shouldRegisterAppWorker({ production: import.meta.env.PROD, framed: window.self !== window.top, hostname: location.hostname, search: location.search }));
    const syncNetwork = () => setOffline(!navigator.onLine);
    const capturePrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    const syncStandalone = () => setInstalled(standalone.matches || iosStandalone);
    syncNetwork();
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);
    standalone.addEventListener("change", syncStandalone);
    void registerAppWorker().catch(() => { /* Installation can be retried on the next visit. */ });
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
      standalone.removeEventListener("change", syncStandalone);
    };
  }, []);

  const install = async () => {
    if (!prompt || !available) { setOpen(true); return; }
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { setOpen(true); }
    finally { setPrompt(null); setInstalling(false); }
  };

  return (
    <>
      {offline && <p role="status" className="flex items-center gap-2 text-warning"><WifiOff className="size-4 shrink-0" />{copy.offline}</p>}
      {!installed && <Button variant="outline" size="sm" className="h-auto w-full justify-start whitespace-normal py-2 text-left" disabled={installing} onClick={() => void install()}><Download className="size-4 shrink-0" />{copy.install}</Button>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>{copy.title}</DialogTitle><DialogDescription>{copy.description}</DialogDescription></DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{!available ? copy.preview : ios ? copy.ios : copy.browser}</p>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{copy.close}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}