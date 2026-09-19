import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useStore, type CharStatus, type Role } from "@/lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewCharacterDialog() {
  const { t, addCharacter } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("supporting");
  const [status, setStatus] = useState<CharStatus>("active");
  const [diction, setDiction] = useState("");
  const [bio, setBio] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    addCharacter({ name: name.trim(), role, status, diction: diction.trim(), bio: bio.trim() });
    toast.success(t.characterAdded);
    setName(""); setDiction(""); setBio("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-glow"><Plus /> {t.addCharacter.replace(/^\+\s*/, "")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t.addCharacter.replace(/^\+\s*/, "")}</DialogTitle>
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
            <Label>{t.diction}</Label>
            <Textarea rows={3} value={diction} onChange={(e) => setDiction(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Bio</Label>
            <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!name.trim()}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
