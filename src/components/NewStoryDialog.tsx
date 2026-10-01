import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GENRES, STORY_LANGS, useStore, type Story } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t.genre}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-label={t.selectGenres} className="w-full justify-between font-normal">
                    <span className="truncate">{genres.length ? `${genres.length} ${t.genre}` : t.selectGenres}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-h-64 w-(--radix-popover-trigger-width) overflow-y-auto p-2">
                  {GENRES.map((g) => <div key={g} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
                    <Checkbox id={`genre-${story?.id ?? "new"}-${g}`} checked={genres.includes(g)} onCheckedChange={() => toggleGenre(g)} />
                    <Label htmlFor={`genre-${story?.id ?? "new"}-${g}`} className="min-w-0 flex-1 cursor-pointer font-normal">{g}</Label>
                  </div>)}
                </PopoverContent>
              </Popover>
              {genres.length > 0 && <div className="flex flex-wrap gap-1.5" aria-label={t.genre}>
                {genres.map((g) => <Badge key={g} variant="secondary" className="gap-1 border border-thread/30 bg-thread/10 text-thread">
                  {g}<Button type="button" variant="ghost" size="icon" className="size-4 hover:bg-thread/20" aria-label={`${t.deleteLabel} ${g}`} onClick={() => toggleGenre(g)}><X className="size-3" /></Button>
                </Badge>)}
              </div>}
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
          <Button variant="ghost" onClick={() => changeOpen(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!title.trim() || genres.length === 0}>{story ? t.saveChanges : t.create}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
