import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Feather, ArrowRight, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const STAY_KEY = "bm-stay-signed-in";
const IDLE_MS = 5 * 60 * 1000;
import { LANGS, type Lang } from "@/lib/i18n";
import { accountCopy } from "@/lib/account-copy";

export type WriterAccount = { id: string; name: string; email: string };
export function AccountGate({ children }: { children: (account: WriterAccount, logout: () => Promise<void>) => ReactNode }) {
  const [account, setAccount] = useState<WriterAccount | null>(null);
  const [lang, setLang] = useState<Lang>("id");
  const [register, setRegister] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [stay, setStay] = useState(false); const [locked, setLocked] = useState(false); const [checking, setChecking] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter(); const queryClient = useQueryClient(); const copy = accountCopy[lang];
  useEffect(() => {
    const saved = localStorage.getItem("bm-lang");
    if (LANGS.some((item) => item.code === saved)) setLang(saved as Lang);
    // A remembered session unlocks a fresh opening only when the writer chose "stay signed in".
    const remember = localStorage.getItem(STAY_KEY) === "1"; setStay(remember);
    void (async () => {
      try {
        if (!remember) return;
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const profile = await supabase.from("profiles").select("display_name").eq("id", u.user.id).single();
        setAccount({ id: u.user.id, email: u.user.email ?? "", name: profile.data?.display_name || u.user.email?.split("@")[0] || "Writer" });
      } catch { /* fall back to the sign-in form */ } finally { setChecking(false); }
    })();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setAccount(null); queryClient.clear(); }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);
  useEffect(() => {
    if (!account) return;
    const reset = () => { if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setLocked(true), IDLE_MS); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { events.forEach((e) => window.removeEventListener(e, reset)); if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [account]);
  const logout = async () => {
    localStorage.removeItem(STAY_KEY); setLocked(false);
    await queryClient.cancelQueries(); queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAccount(null); setPassword(""); setMessage(""); setRegister(false);
    await router.navigate({ to: "/", replace: true });
  };
  if (account) return <>
    {children(account, logout)}
    {locked && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-6 backdrop-blur-xl">
      <form className="w-full max-w-sm space-y-4 text-center" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setMessage("");
        try {
          const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
          if (error) { setMessage(copy.wrong); return; }
          setPassword(""); setLocked(false);
        } catch { setMessage(copy.error); } finally { setBusy(false); }
      }}>
        <Lock className="mx-auto size-10 text-thread" strokeWidth={1.25} />
        <h1 className="font-display text-2xl">{copy.locked}</h1>
        <p className="text-sm text-muted-foreground">{copy.lockedBody}</p>
        <p className="text-sm font-medium">{account.name} · {account.email}</p>
        <Input type="password" autoFocus autoComplete="current-password" aria-label={copy.password} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        {message && <p role="status" className="text-sm text-destructive">{message}</p>}
        <Button className="w-full" type="submit" disabled={busy}>{busy ? copy.saving : copy.unlock}</Button>
        <Button type="button" variant="link" disabled={busy} onClick={() => { void logout().catch(() => setMessage(copy.error)); }}>{copy.other}</Button>
      </form>
    </div>}
  </>;
  if (checking) return <main className="min-h-screen bg-background" />;
  return <main className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
      <span className="font-display text-xl font-semibold">Benang Merah</span>
      <Select value={lang} onValueChange={(value) => { setLang(value as Lang); localStorage.setItem("bm-lang", value); setMessage(""); }}>
        <SelectTrigger className="w-40" aria-label="Language"><SelectValue /></SelectTrigger>
        <SelectContent>{LANGS.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent>
      </Select>
    </header>
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
      <Feather className="mb-7 size-12 text-thread" strokeWidth={1.25} />
      <h1 className="font-display text-3xl leading-snug">{copy.welcome}</h1>
      <p className="mt-3 text-muted-foreground">{copy.sub}</p>
      <form className="mt-8 space-y-4" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setMessage("");
        try {
          if (register) {
            const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } });
            if (error) { setMessage(copy.error); return; }
            setPassword(""); setRegister(false); setMessage(copy.confirm); return;
          }
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) { setMessage(copy.failed); return; }
          const verified = await supabase.auth.getUser();
          if (verified.error || !verified.data.user) { setMessage(copy.failed); return; }
          const user = verified.data.user;
          const profile = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
          if (profile.error) { setMessage(copy.error); return; }
          setPassword(""); if (stay) localStorage.setItem(STAY_KEY, "1"); else localStorage.removeItem(STAY_KEY);
          await router.navigate({ to: "/", replace: true });
          setAccount({ id: user.id, email: user.email ?? email.trim(), name: profile.data.display_name || user.email?.split("@")[0] || "Writer" });
        } catch { setMessage(copy.error); } finally { setBusy(false); }
      }}>
        {register && <div className="space-y-2"><Label htmlFor="account-name">{copy.name}</Label><Input id="account-name" autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></div>}
        <div className="space-y-2"><Label htmlFor="account-email">{copy.email}</Label><Input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="account-password">{copy.password}</Label><Input id="account-password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></div>
        {!register && <label className="flex items-center gap-2 text-sm"><Checkbox checked={stay} onCheckedChange={(v) => setStay(v === true)} disabled={busy} />{copy.stay}</label>}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <Button className="w-full" type="submit" disabled={busy || (register && !name.trim())}>{busy ? copy.saving : register ? copy.register : copy.login}<ArrowRight /></Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1 text-sm"><span className="text-muted-foreground">{register ? copy.existing : copy.newAccount}</span><Button variant="link" disabled={busy} onClick={() => { setRegister(!register); setPassword(""); setMessage(""); }}>{register ? copy.login : copy.register}</Button></div>
      <p className="mt-7 text-sm leading-relaxed text-muted-foreground">{copy.local}</p>
    </div>
  </main>;
}