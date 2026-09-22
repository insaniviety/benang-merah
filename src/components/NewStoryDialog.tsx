import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GENRES, STORY_LANGS, useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewStoryDialog() {
  const { t, newStoryOpen, setNewStoryOpen, addStory } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Fantasy");
  const [language, setLanguage] = useState<string>(STORY_LANGS[0]!);
  const [synopsis, setSynopsis] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    addStory({ title: title.trim(), genre, language, synopsis: synopsis.trim() });
    toast.success(t.storyCreated);
    setTitle("");
    setSynopsis("");
    setNewStoryOpen(false);
    navigate({ to: "/" });
  };

  return (
    <Dialog open={newStoryOpen} onOpenChange={setNewStoryOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t.newStory.replace(/^\+\s*/, "")}</DialogTitle>
          <DialogDescription>{t.librarySubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t.title}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="…" autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t.genre}</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t.mainLanguage}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STORY_LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t.synopsis}</Label>
            <Textarea rows={4} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setNewStoryOpen(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!title.trim()}>{t.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
