import { useState } from "react";
import { Feather, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGS, type Lang } from "@/lib/i18n";
import { workspaceCopy } from "@/lib/workspace-copy";

export function WriterWelcome({ lang, setLang, onComplete, errorMessage }: {
  lang: Lang; setLang: (lang: Lang) => void; onComplete: (name: string) => Promise<void>; errorMessage: string;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const copy = workspaceCopy[lang];
  return <main className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="flex items-center justify-between gap-4 border-b px-6 py-5">
      <span className="font-display text-xl font-semibold">Benang Merah</span>
      <Select value={lang} onValueChange={(value) => setLang(value as Lang)}>
        <SelectTrigger className="w-40" aria-label="Language"><SelectValue /></SelectTrigger>
        <SelectContent>{LANGS.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent>
      </Select>
    </header>
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <Feather className="mb-8 size-14 text-thread" strokeWidth={1.25} />
      <h1 className="font-display text-3xl leading-snug">{copy.welcome}</h1>
      <p className="mt-3 text-muted-foreground">{copy.intro}</p>
      <form className="mt-10 space-y-5" onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim() || saving) return;
        setSaving(true); setError(false);
        try { await onComplete(name.trim()); } catch { setError(true); } finally { setSaving(false); }
      }}>
        <div className="space-y-2"><Label htmlFor="writer-name">{copy.name}</Label>
          <Input id="writer-name" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required disabled={saving} />
        </div>
        <p className="text-sm text-muted-foreground">{copy.local}</p>
        {error && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        <Button type="submit" className="w-full" disabled={!name.trim() || saving}>{copy.continue}<ArrowRight /></Button>
      </form>
    </div>
  </main>;
}