import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Lang } from "./i18n";
import { readLocalData as readAccountData, writeLocalData as writeAccountData, readLegacyData, claimLegacyWorkspace, makeBackup, type LocalData, type TimelineEvent } from "./local-data";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { needsEditorConfirmation } from "./editor-save";
import { emptyWorkspace, cleanLegacyPresets, removeManuscripts } from "./workspace-lifecycle";
import type { WriterAccount } from "@/components/AccountGate";
import { accountCopy } from "./account-copy";
import { supabase } from "@/integrations/supabase/client";
import { bundleFor, bundleHash, reconcileCloud } from "./cloud-sync";

export type Theme = "dark" | "light";
export type ChapterStatus = "done" | "draft" | "revision" | "planned";
export type Role = "protagonist" | "antagonist" | "supporting";
export type CharStatus = "active" | "deceased" | "missing";
export type RelationType = "conflict" | "alliance" | "secret" | "romance" | "family";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  status: ChapterStatus;
  summary: string;
  words: number;
  content: string;
  target: number;
  updatedAt: string;
}
export interface Story {
  id: string;
  title: string;
  genres: string[];
  language: string;
  synopsis: string;
  updatedAt: string;
  chapters: Chapter[];
  content: string;
  activeChapterId?: string | undefined;
}
export interface Character {
  id: string;
  storyId: string;
  name: string;
  role: Role;
  identity: string;
  diction: string;
  status: CharStatus;
  hue: number;
  bio: string;
  x: number;
  y: number;
}
export interface Relation {
  id: string;
  storyId: string;
  from: string;
  to: string;
  type: RelationType;
  label: string;
  history: { chapter: number; text: string }[];
}
export type RelationDraft = Pick<Relation, "type" | "label"> & { to: string };
export type CanvasSnapshot = { characters: Character[]; relations: Relation[] };
export interface Note {
  id: string;
  text: string;
  createdAt: string;
  tag: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export interface AuthUser {
  name: string;
  email: string;
  plan: string;
}

interface StoreValue {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  stories: Story[];
  activeStory: Story | undefined;
  setActiveStoryId: (id: string) => void;
  addStory: (s: Omit<Story, "id" | "updatedAt" | "chapters" | "content">) => void;
  deleteStory: (id: string) => Promise<void>;
  writerName: string | null;
  accountId: string;
  updateStory: (id: string, patch: Pick<Story, "title" | "genres" | "language" | "synopsis">) => void;
  updateContent: (id: string, content: string) => void;
  editorDirty: boolean;
  saveEditor: () => Promise<void>;
  addChapter: (storyId: string, c: { title: string; summary: string; target: number }) => void;
  updateChapter: (storyId: string, chapterId: string, patch: Partial<Chapter>) => void;
  openChapter: (storyId: string, chapterId: string) => void;
  characters: Character[];
  addCharacter: (c: Omit<Character, "id" | "storyId" | "hue" | "x" | "y">, relationship?: RelationDraft) => void;
  moveCharacter: (id: string, x: number, y: number) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  relations: Relation[];
  addRelation: (from: string, to: string, type: RelationType, label: string) => void;
  updateRelation: (id: string, patch: Pick<Relation, "type" | "label">) => void;
  deleteRelation: (id: string) => void;
  savedCanvas: CanvasSnapshot | null;
  canvasDirty: boolean;
  saveCanvas: () => void;
  timelines: LocalData["timelines"];
  updateTimeline: (id: string, events: TimelineEvent[] | ((current: TimelineEvent[]) => TimelineEvent[])) => void;
  saveTimeline: (id: string) => void;
  storageStatus: "loading" | "saving" | "saved" | "error";
  exportBackup: () => Promise<string>;
  importBackup: (data: LocalData) => Promise<void>;
  notes: Note[];
  addNote: (text: string, tag: string) => void;
  newStoryOpen: boolean;
  setNewStoryOpen: (v: boolean) => void;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  cloudStoryIds: string[];
  cloudStatus: "idle" | "syncing" | "synced" | "error";
  setCloudSync: (storyId: string, enabled: boolean) => Promise<void>;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __bmStoreCtx?: React.Context<StoreValue | null> };
const Ctx = (g.__bmStoreCtx ??= createContext<StoreValue | null>(null));

export function StoreProvider({ children, account, onSignOut }: { children: ReactNode; account: WriterAccount; onSignOut: () => Promise<void> }) {
  const readLocalData = useCallback(() => readAccountData(account.id), [account.id]);
  const writeLocalData = useCallback((data: LocalData) => writeAccountData(data, account.id), [account.id]);
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Lang>("id");
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryIdRaw] = useState("");
  const [pendingSwitch, setPendingSwitch] = useState<{ run: () => void } | null>(null);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState(false);
  const [unconfirmedStoryIds, setUnconfirmedStoryIds] = useState<string[]>([]);
  const [cloudStoryIds, setCloudStoryIds] = useState<string[]>([]);
  const [cloudStatus, setCloudStatus] = useState<StoreValue["cloudStatus"]>("idle");
  const [cloudSynced, setCloudSynced] = useState<Record<string, string>>({});
  const [allCharacters, setCharacters] = useState<Character[]>([]);
  const [allRelations, setRelations] = useState<Relation[]>([]);
  const [savedCanvases, setSavedCanvases] = useState<Record<string, CanvasSnapshot>>({});
  const [canvasReady, setCanvasReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newStoryOpen, setNewStoryOpen] = useState(false);
  const writerName = account.name;
  const user = useMemo<AuthUser>(() => ({ name: account.name, email: account.email, plan: "" }), [account.name, account.email]);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const [timelines, setTimelines] = useState<LocalData["timelines"]>({});
  const [storageStatus, setStorageStatus] = useState<StoreValue["storageStatus"]>("loading");
  const [hydrated, setHydrated] = useState(false);
  const revision = useRef(0);
  const applyData = useCallback((data: LocalData) => {
    setUnconfirmedStoryIds(data.unconfirmedStoryIds); setCloudStoryIds(data.cloudStoryIds); setCloudSynced(data.cloudSynced);
    setStories(data.stories); setActiveStoryIdRaw(data.activeStoryId);
    setCharacters(data.characters); setRelations(data.relations); setSavedCanvases(data.savedCanvases);
    setTimelines(data.timelines); setNotes(data.notes); setTheme(data.theme); setLangState(data.lang);
  }, []);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        let data = await readLocalData();
        if (!data) {
          const legacy = await readLegacyData();
          if (mounted && legacy && (legacy.stories.length || legacy.notes.length)) setLegacyAvailable(true);
        }
        if (!data) {
          const oldLang = localStorage.getItem("bm-lang");
          data = { ...emptyWorkspace(),
            theme: localStorage.getItem("bm-theme") === "light" ? "light" : "dark",
            lang: oldLang && oldLang in dictionaries ? oldLang as Lang : "id" };
          await writeLocalData(data);
        } else if (!data.presetsCleaned) {
          data = cleanLegacyPresets(data);
          await writeLocalData(data);
        }
        try {
          const { data: rows, error } = await supabase.from("cloud_manuscripts").select("story_id, bundle");
          if (!error && rows) {
            const merged = reconcileCloud(data, rows);
            if (JSON.stringify(merged) !== JSON.stringify(data)) { data = merged; await writeLocalData(data); }
          }
        } catch { /* offline: keep the local copy */ }
        try {
          const { data: profile } = await supabase.from("profiles").select("ui_lang").eq("id", account.id).maybeSingle();
          const saved = profile?.ui_lang;
          if (saved && saved in dictionaries && saved !== data.lang) { data = { ...data, lang: saved as Lang }; await writeLocalData(data); }
        } catch { /* offline: keep the device language */ }
        if (mounted) { applyData(data); setCanvasReady(true); setHydrated(true); setStorageStatus("saved"); }
        navigator.storage?.persist?.().catch(() => undefined);
      } catch { if (mounted) setStorageStatus("error"); }
    };
    void restore();
    return () => { mounted = false; };
  }, [applyData, readLocalData, writeLocalData]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
    if (hydrated) {
      localStorage.setItem("bm-theme", theme);
      localStorage.setItem("bm-lang", lang);
    }
  }, [theme, lang, hydrated]);

  const data = useMemo<LocalData>(() => ({
    stories, activeStoryId, characters: allCharacters, relations: allRelations,
    savedCanvases, timelines, notes, user: null, theme, lang, unconfirmedStoryIds, cloudStoryIds, cloudSynced, writerName, presetsCleaned: true,
  }), [cloudSynced, stories, activeStoryId, allCharacters, allRelations, savedCanvases, timelines, notes, user, theme, lang, unconfirmedStoryIds, cloudStoryIds, writerName]);
  useEffect(() => {
    if (!hydrated) return;
    const version = ++revision.current;
    setStorageStatus("saving");
    void writeLocalData(data).then(() => {
      if (revision.current === version) setStorageStatus("saved");
    }).catch(() => { if (revision.current === version) setStorageStatus("error"); });
  }, [data, hydrated, writeLocalData]);
  const pushCloud = useCallback(async (source: LocalData, ids: string[]) => {
    const rows = ids.flatMap((id) => {
      const bundle = bundleFor(source, id);
      if (!bundle) return [];
      const json = bundleHash(bundle);
      return source.cloudSynced[id] === json ? [] : [{ id, json, bundle }];
    });
    if (!rows.length) return;
    setCloudStatus("syncing");
    const { error } = await supabase.from("cloud_manuscripts").upsert(
      rows.map((row) => ({ user_id: account.id, story_id: row.id, bundle: row.bundle as never, updated_at: new Date().toISOString() })),
    );
    if (error) { setCloudStatus("error"); return; }
    setCloudSynced((prev) => ({ ...prev, ...Object.fromEntries(rows.map((row) => [row.id, row.json])) }));
    setCloudStatus("synced");
  }, [account.id]);
  useEffect(() => {
    if (!hydrated || !cloudStoryIds.length) return;
    const timer = setTimeout(() => { void pushCloud(data, cloudStoryIds).catch(() => setCloudStatus("error")); }, 2000);
    return () => clearTimeout(timer);
  }, [data, cloudStoryIds, hydrated, pushCloud]);
  useEffect(() => {
    const retry = () => { void pushCloud(data, cloudStoryIds).catch(() => setCloudStatus("error")); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [data, cloudStoryIds, pushCloud]);
  const setCloudSync = useCallback(async (storyId: string, enabled: boolean) => {
    if (enabled) {
      setCloudStoryIds((prev) => prev.includes(storyId) ? prev : [...prev, storyId]);
      await pushCloud(data, [storyId]);
    } else {
      setCloudStatus("syncing");
      const { error } = await supabase.from("cloud_manuscripts").delete().eq("story_id", storyId);
      if (error) { setCloudStatus("error"); throw error; }
      setCloudSynced((prev) => { const n = { ...prev }; delete n[storyId]; return n; });
      setCloudStoryIds((prev) => prev.filter((id) => id !== storyId));
      setCloudStatus("synced");
    }
  }, [data, pushCloud]);
  const exportBackup = useCallback(async () => {
    await writeLocalData(data);
    return makeBackup(data);
  }, [data, writeLocalData]);
  const importBackup = useCallback(async (next: LocalData) => {
    ++revision.current;
    const restored = { ...next, writerName, user: null, presetsCleaned: true };
    await writeLocalData(restored);
    applyData(restored);
    setCanvasReady(true); setHydrated(true); setStorageStatus("saved");
  }, [applyData, writerName, writeLocalData]);
  const deleteStory = useCallback(async (id: string) => {
    if (!data.stories.some((story) => story.id === id)) return;
    if (data.cloudStoryIds.includes(id)) {
      const { error } = await supabase.from("cloud_manuscripts").delete().eq("story_id", id);
      if (error) throw error;
    }
    const cloudSyncedNext = { ...data.cloudSynced }; delete cloudSyncedNext[id];
    const next = { ...removeManuscripts(data, new Set([id])), cloudStoryIds: data.cloudStoryIds.filter((x) => x !== id), cloudSynced: cloudSyncedNext };
    ++revision.current;
    setStorageStatus("saving");
    try {
      await writeLocalData(next);
      applyData(next);
      setPendingSwitch(null);
      setStorageStatus("saved");
    } catch (error) { setStorageStatus("error"); throw error; }
  }, [data, applyData, writeLocalData]);
  const updateTimeline = useCallback((id: string, next: TimelineEvent[] | ((current: TimelineEvent[]) => TimelineEvent[])) => {
    setTimelines((prev) => ({ ...prev, [id]: { draft: typeof next === "function" ? next(prev[id]?.draft ?? []) : next, saved: prev[id]?.saved ?? null } }));
  }, []);
  const saveTimeline = useCallback((id: string) => {
    setTimelines((prev) => {
      const current = prev[id];
      return current ? { ...prev, [id]: { ...current, saved: structuredClone(current.draft) } } : prev;
    });
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // Remember the UI language on the account so it follows the writer after signing in again.
    void supabase.from("profiles").update({ ui_lang: l }).eq("id", account.id).then(() => undefined, () => undefined);
  }, [account.id]);

  const requestSwitch = useCallback((run: () => void) => {
    if (needsEditorConfirmation(unconfirmedStoryIds, activeStoryId, storageStatus)) {
      setSwitchError(false);
      setPendingSwitch({ run });
    } else run();
  }, [storageStatus, unconfirmedStoryIds, activeStoryId]);
  const setActiveStoryId = useCallback((id: string) => {
    if (id !== activeStoryId) requestSwitch(() => setActiveStoryIdRaw(id));
  }, [activeStoryId, requestSwitch]);
  const saveEditor = useCallback(async () => {
    const version = ++revision.current;
    setStorageStatus("saving");
    const next = unconfirmedStoryIds.filter((id) => id !== activeStoryId);
    try {
      await writeLocalData({ ...data, unconfirmedStoryIds: next });
      if (revision.current === version) {
        setUnconfirmedStoryIds(next);
        setStorageStatus("saved");
      }
    } catch (error) {
      setStorageStatus("error");
      throw error;
    }
  }, [data, unconfirmedStoryIds, activeStoryId, writeLocalData]);
  const confirmSwitch = async () => {
    if (!pendingSwitch || savingSwitch) return;
    setSavingSwitch(true);
    setSwitchError(false);
    try {
      await saveEditor();
      pendingSwitch.run();
      setPendingSwitch(null);
    } catch {
      setStorageStatus("error");
      setSwitchError(true);
    } finally { setSavingSwitch(false); }
  };

  const addStory: StoreValue["addStory"] = useCallback((s) => {
    const story: Story = { ...s, id: uid(), updatedAt: new Date().toISOString(), chapters: [], content: "" };
    requestSwitch(() => {
      setStories((prev) => [story, ...prev]);
      setActiveStoryIdRaw(story.id);
    });
  }, [requestSwitch]);

  const updateStory: StoreValue["updateStory"] = useCallback((id, patch) => {
    setStories((prev) => prev.map((s) => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
  }, []);

  const updateContent = useCallback((id: string, content: string) => {
    setStorageStatus("saving");
    setUnconfirmedStoryIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    const now = new Date().toISOString();
    setStories((prev) => prev.map((s) => (s.id === id ? {
      ...s, content, updatedAt: now,
      chapters: s.chapters.map((c) => (c.id === s.activeChapterId ? { ...c, content, words: countWords(content), updatedAt: now, status: c.status === "planned" ? "draft" : c.status } : c)),
    } : s)));
  }, []);

  const addChapter: StoreValue["addChapter"] = useCallback((storyId, c) => {
    const now = new Date().toISOString();
    setStories((prev) => prev.map((s) => s.id !== storyId ? s : {
      ...s, updatedAt: now,
      chapters: [...s.chapters, { id: uid(), number: s.chapters.length + 1, title: c.title, summary: c.summary, target: c.target, status: "draft", words: 0, content: "", updatedAt: now }],
    }));
  }, []);

  const updateChapter: StoreValue["updateChapter"] = useCallback((storyId, chapterId, patch) => {
    const now = new Date().toISOString();
    setStories((prev) => prev.map((s) => s.id !== storyId ? s : {
      ...s, chapters: s.chapters.map((c) => (c.id === chapterId ? { ...c, ...patch, updatedAt: now } : c)),
    }));
  }, []);

  const openChapter: StoreValue["openChapter"] = useCallback((storyId, chapterId) => {
    requestSwitch(() => {
    setStories((prev) => prev.map((s) => {
      if (s.id !== storyId) return s;
      const ch = s.chapters.find((c) => c.id === chapterId);
      return ch ? { ...s, activeChapterId: chapterId, content: ch.content } : s;
    }));
    setActiveStoryIdRaw(storyId);
    });
  }, [requestSwitch]);

  const addCharacter: StoreValue["addCharacter"] = useCallback(
    (c, relationship) => {
      let storyId = activeStoryId;
      if (!stories.some((story) => story.id === storyId)) {
        const story: Story = { id: uid(), title: dictionaries[lang].autoStoryTitle, genres: [], language: lang, synopsis: "", updatedAt: new Date().toISOString(), chapters: [], content: "" };
        setStories((prev) => [story, ...prev]);
        setActiveStoryIdRaw(story.id);
        storyId = story.id;
      }
      const id = uid();
      setCharacters((prev) => [
        ...prev,
        { ...c, id, storyId, hue: Math.floor(Math.random() * 360), x: 80 + ((allCharacters.filter((existing) => existing.storyId === storyId).length % 4) * 175), y: 400 + (Math.floor(allCharacters.filter((existing) => existing.storyId === storyId).length / 4) - 1) * 90 },
      ]);
      if (relationship && allCharacters.some((existing) => existing.id === relationship.to && existing.storyId === storyId)) {
        setRelations((prev) => [...prev, { id: uid(), storyId, from: id, to: relationship.to, type: relationship.type, label: relationship.label.trim(), history: [] }]);
      }
    },
    [activeStoryId, allCharacters, stories, lang],
  );

  const moveCharacter = useCallback((id: string, x: number, y: number) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, x, y } : c)));
  }, []);

  const updateCharacter = useCallback((id: string, patch: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const deleteCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setRelations((prev) => prev.filter((r) => r.from !== id && r.to !== id));
  }, []);

  const addRelation: StoreValue["addRelation"] = useCallback((from, to, type, label) => {
    if (from === to || !allCharacters.some((c) => c.id === from && c.storyId === activeStoryId) || !allCharacters.some((c) => c.id === to && c.storyId === activeStoryId)) return;
    setRelations((prev) => [...prev, { id: uid(), storyId: activeStoryId, from, to, type, label: label.trim(), history: [] }]);
  }, [allCharacters, activeStoryId]);
  const updateRelation: StoreValue["updateRelation"] = useCallback((id, patch) => {
    setRelations((prev) => prev.map((r) => r.id === id ? { ...r, type: patch.type, label: patch.label.trim() } : r));
  }, []);
  const deleteRelation = useCallback((id: string) => setRelations((prev) => prev.filter((r) => r.id !== id)), []);
  const savedCanvas = savedCanvases[activeStoryId] ?? null;
  const currentCanvas = useMemo(() => ({ characters: allCharacters.filter((c) => c.storyId === activeStoryId), relations: allRelations.filter((r) => r.storyId === activeStoryId) }), [allCharacters, allRelations, activeStoryId]);
  const canvasDirty = canvasReady && JSON.stringify(currentCanvas) !== JSON.stringify(savedCanvas);
  const saveCanvas = useCallback(() => {
    if (!stories.some((story) => story.id === activeStoryId)) return;
    setSavedCanvases((prev) => ({ ...prev, [activeStoryId]: currentCanvas }));
  }, [activeStoryId, currentCanvas, stories]);

  const addNote = useCallback((text: string, tag: string) => {
    setNotes((prev) => [{ id: uid(), text, tag, createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const signOut = useCallback(async () => {
    await writeLocalData(data);
    await onSignOut();
  }, [data, writeLocalData, onSignOut]);

  const value = useMemo<StoreValue>(
    () => ({
      theme,
      toggleTheme,
      lang,
      setLang,
      cloudStoryIds, cloudStatus, setCloudSync,
      t: dictionaries[lang],
      stories,
      activeStory: stories.find((s) => s.id === activeStoryId),
      setActiveStoryId,
      addStory,
      updateStory, deleteStory, writerName, accountId: account.id,
      updateContent,
      editorDirty: unconfirmedStoryIds.includes(activeStoryId),
      saveEditor,
      addChapter,
      updateChapter,
      openChapter,
      characters: allCharacters.filter((c) => c.storyId === activeStoryId),
      addCharacter,
      moveCharacter,
      updateCharacter,
      deleteCharacter,
      relations: allRelations.filter((r) => r.storyId === activeStoryId),
      addRelation,
      updateRelation,
      deleteRelation,
      savedCanvas,
      canvasDirty,
      saveCanvas,
      timelines, updateTimeline, saveTimeline, storageStatus, exportBackup, importBackup,
      notes,
      addNote,
      newStoryOpen,
      setNewStoryOpen,
      user,
      signOut,
    }),
    [account.id, deleteStory, writerName, unconfirmedStoryIds, saveEditor, theme, toggleTheme, lang, setLang, stories, activeStoryId, setActiveStoryId, addStory, updateStory, updateContent, addChapter, updateChapter, openChapter, allCharacters, addCharacter, moveCharacter, updateCharacter, deleteCharacter, allRelations, addRelation, updateRelation, deleteRelation, savedCanvas, canvasDirty, saveCanvas, timelines, updateTimeline, saveTimeline, storageStatus, exportBackup, importBackup, notes, addNote, newStoryOpen, user, signOut, cloudStoryIds, cloudStatus, setCloudSync],
  );

  return <Ctx.Provider value={value}>
    <AlertDialog open={!!pendingSwitch} onOpenChange={(open) => { if (!open && !savingSwitch) setPendingSwitch(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dictionaries[lang].unsavedSwitch}</AlertDialogTitle>
          <AlertDialogDescription>{switchError ? dictionaries[lang].saveFailed : dictionaries[lang].storageSaving}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={savingSwitch} onClick={() => { pendingSwitch?.run(); setPendingSwitch(null); }}>{dictionaries[lang].no}</Button>
          <Button disabled={savingSwitch} onClick={() => void confirmSwitch()}>{dictionaries[lang].yes}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={hydrated && legacyAvailable}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{accountCopy[lang].legacy}</AlertDialogTitle><AlertDialogDescription>{accountCopy[lang].legacyBody}</AlertDialogDescription></AlertDialogHeader>
        {claimError && <p role="alert" className="text-destructive">{dictionaries[lang].storageError}</p>}
        <AlertDialogFooter>
          <Button variant="outline" disabled={claiming} onClick={() => setLegacyAvailable(false)}>{accountCopy[lang].skip}</Button>
          <Button disabled={claiming} onClick={async () => {
            setClaiming(true); setClaimError(false);
            try {
              const legacy = await claimLegacyWorkspace(account.id);
              if (legacy) { const next = { ...cleanLegacyPresets(legacy), writerName: account.name, user: null }; await writeLocalData(next); applyData(next); }
              setLegacyAvailable(false);
            } catch { setClaimError(true); } finally { setClaiming(false); }
          }}>{accountCopy[lang].claim}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {hydrated ? children : <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground" role="status">{storageStatus === "error" ? dictionaries[lang].storageError : dictionaries[lang].storageLoading}</div>}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export const GENRES = ["Wuxia", "Xianxia", "Fantasy", "Action", "Hero", "Romance", "Sci-Fi", "Crime", "Mystery", "Thriller", "Horror", "Drama", "Historical", "Comedy", "Adventure", "Slice of Life", "Teen Fiction / Youth", "Urban", "Supernatural"];
export const STORY_LANGS = ["Bahasa Indonesia", "English", "简体中文", "繁體中文"];
