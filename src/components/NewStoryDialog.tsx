import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GENRES, STORY_LANGS, useStore, type Story } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";

export function NewStoryDialog({ story, open, onOpenChange }: { story?: Story; open?: boolean; onOpenChange?: (value: boolean) => void } = {}) {
  const { t, newStoryOpen, setNewStoryOpen, addStory, updateStory } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState(story?.title ?? "");
  const [genres, setGenres] = useState<string[]>(story?.genres ?? []);
  const [language, setLanguage] = useState<string>(story?.language ?? "Bahasa Indonesia");
  const [synopsis, setSynopsis] = useState(story?.synopsis ?? "");
  const changeOpen = onOpenChange ?? setNewStoryOpen;
  const toggleGenre = (genre: string) => setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]);

  const submit = () => {
    if (!title.trim() || genres.length === 0) return;
    const details = { title: title.trim(), genres, language, synopsis: synopsis.trim() };
    if (story) {
      updateStory(story.id, details);
      toast.success(t.storyUpdated);
    } else {
      addStory(details);
      toast.success(t.storyCreated);
    }
    setTitle("");
    setGenres([]);
    setSynopsis("");
    changeOpen(false);
    if (!story) navigate({ to: "/" });
  };

  return (
    <Dialog open={open ?? newStoryOpen} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{story ? t.editStory : t.newStory.replace(/^\+\s*/, "")}</DialogTitle>
          <DialogDescription>{t.librarySubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t.title}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="…" autoFocus />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t.genre}</legend>
            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" aria-label={t.selectGenres}>
              {GENRES.map((genre) => {
                const selected = genres.includes(genre);
                return (
                  <Button
                    key={genre}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    className="h-auto min-h-9 justify-start whitespace-normal px-3 py-2 text-left text-xs"
                    onClick={() => toggleGenre(genre)}
                  >
                    {selected && <Check className="size-3.5 shrink-0" />}
                    <span>{genre}</span>
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <Button variant="ghost" onClick={() => changeOpen(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!title.trim() || genres.length === 0}>{story ? t.saveChanges : t.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
