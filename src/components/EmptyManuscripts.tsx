import { Feather, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { workspaceCopy } from "@/lib/workspace-copy";

export function EmptyManuscripts() {
  const { lang, setNewStoryOpen } = useStore();
  const copy = workspaceCopy[lang];
  return <section className="flex min-h-80 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
    <Feather className="size-12 text-thread" strokeWidth={1.25} />
    <h2 className="max-w-lg font-display text-2xl leading-relaxed">{copy.empty}</h2>
    <Button onClick={() => setNewStoryOpen(true)}><Plus />{copy.create}</Button>
  </section>;
}