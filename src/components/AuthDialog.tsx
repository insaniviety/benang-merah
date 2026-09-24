import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PenLine } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.3l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.3 2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 14.1a6 6 0 0 1 0-3.8L3.1 7.7a10 10 0 0 0 0 8.6l3.3-2.2z" />
      <path fill="#4285F4" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.7l3.3 2.6C7.2 7.9 9.4 5.9 12 5.9z" />
    </svg>
  );
}

export function AuthDialog() {
  const { t, authOpen, setAuthOpen, signIn } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nameFromEmail = (e: string) =>
    (e.split("@")[0] ?? "").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Penulis";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn({
      name: mode === "register" && name.trim() ? name.trim() : nameFromEmail(email || "penulis@benangmerah.id"),
      email: email || "penulis@benangmerah.id",
      plan: t.proWriter,
    });
    toast.success(t.loggedIn);
    setPassword("");
  };

  const google = () => {
    signIn({ name: "Aruna Wijaya", email: "aruna.wijaya@gmail.com", plan: t.proWriter });
    toast.success(t.loggedIn);
  };

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="relative mb-1 flex size-11 items-center justify-center rounded-full bg-thread/15 ring-1 ring-thread/40">
            <PenLine className="size-5 text-thread" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-thread" />
          </span>
          <DialogTitle className="font-display text-xl">{mode === "login" ? t.loginTitle : t.registerTitle}</DialogTitle>
          <DialogDescription>{mode === "login" ? t.loginSub : t.registerSub}</DialogDescription>
        </DialogHeader>

        <Button type="button" variant="outline" className="w-full gap-2" onClick={google}>
          <GoogleIcon /> {t.googleSignIn}
        </Button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t.orWith}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">{t.fullName}</Label>
              <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aruna Wijaya" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">{t.email}</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="penulis@email.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">{t.password}</Label>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full shadow-glow">
            {mode === "login" ? t.signIn : t.registerCta}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? t.noAccount : t.haveAccount}{" "}
          <button type="button" className="font-medium text-thread hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? t.registerCta : t.loginCta}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
