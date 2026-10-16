import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useStore, type Character, type CharStatus, type Role, type RelationType } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewCharacterDialog({ character, open: openProp, onOpenChange }: { character?: Character | undefined; open?: boolean | undefined; onOpenChange?: ((v: boolean) => void) | undefined } = {}) {
  const { t, activeStory, addCharacter, updateCharacter, addRelation, characters } = useStore();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setOpenState(v));
  const isEdit = !!character;
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("supporting");
  const [status, setStatus] = useState<CharStatus>("active");
  const [identity, setIdentity] = useState("");
  const [diction, setDiction] = useState("");
  const [bio, setBio] = useState("");
  const [relatedTo, setRelatedTo] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("family");
  const [relationNote, setRelationNote] = useState("");

  useEffect(() => {
    if (open && character) {
      setName(character.name); setRole(character.role); setStatus(character.status);
      setIdentity(character.identity); setDiction(character.diction); setBio(character.bio);
    }
    if (open) { setRelatedTo(""); setRelationType("family"); setRelationNote(""); }
  }, [open, character]);

  const submit = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), role, status, identity: identity.trim(), diction: diction.trim(), bio: bio.trim() };
    if (character) {
      updateCharacter(character.id, data);
      if (relatedTo) addRelation(character.id, relatedTo, relationType, relationNote);
      toast.success(t.characterUpdated);
    } else {
      addCharacter(data, relatedTo ? { to: relatedTo, type: relationType, label: relationNote } : undefined);
      toast.success(t.characterAdded);
      setName(""); setIdentity(""); setDiction(""); setBio("");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && openProp === undefined && (
        <DialogTrigger asChild>
          <Button className="shadow-glow"><Plus /> {t.addCharacter.replace(/^\+\s*/, "")}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isEdit ? t.editCharacter : t.addCharacter.replace(/^\+\s*/, "")}</DialogTitle>
          <DialogDescription>{t.charactersSub}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t.role}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="protagonist">{t.protagonist}</SelectItem>
                  <SelectItem value="antagonist">{t.antagonist}</SelectItem>
                  <SelectItem value="supporting">{t.supporting}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t.status}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CharStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="deceased">{t.deceased}</SelectItem>
                  <SelectItem value="missing">{t.missing}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t.characterIdentity}</Label>
            <Input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder={t.characterIdentityPlaceholder} />
          </div>
          <div className="grid gap-2">
            <Label>{t.diction}</Label>
            <Textarea rows={3} value={diction} onChange={(e) => setDiction(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t.bioBackground}</Label>
            <Textarea rows={5} className="min-h-32 resize-y" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          {characters.some((candidate) => candidate.id !== character?.id) && <div className="grid gap-3 border-t pt-4">
            <Label>{t.characterRelation}</Label>
            <Select value={relatedTo || "none"} onValueChange={(value) => setRelatedTo(value === "none" ? "" : value)}>
              <SelectTrigger aria-label={t.relatedCharacter}><SelectValue placeholder={t.relatedCharacter} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noRelation}</SelectItem>
                {characters.filter((candidate) => candidate.id !== character?.id).map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {relatedTo && <>
              <Select value={relationType} onValueChange={(value) => setRelationType(value as RelationType)}>
                <SelectTrigger aria-label={t.relationKind}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["family", "alliance", "romance", "conflict", "secret"] as const).map((kind) => <SelectItem key={kind} value={kind}>{t[kind]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input aria-label={t.relationNote} value={relationNote} onChange={(e) => setRelationNote(e.target.value)} placeholder={t.relationNoteExample} />
            </>}
          </div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!name.trim()}>{isEdit ? t.saveChanges : t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
