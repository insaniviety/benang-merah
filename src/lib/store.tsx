import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Lang } from "./i18n";
import { readLocalData, writeLocalData, makeBackup, localDataSchema, type LocalData, type TimelineEvent } from "./local-data";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { needsEditorConfirmation } from "./editor-save";
import { emptyWorkspace, cleanLegacyPresets, removeManuscripts } from "./workspace-lifecycle";
import { WriterWelcome } from "@/components/WriterWelcome";

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
  signIn: (u: AuthUser) => void;
  signOut: () => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __bmStoreCtx?: React.Context<StoreValue | null> };
const Ctx = (g.__bmStoreCtx ??= createContext<StoreValue | null>(null));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Lang>("id");
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryIdRaw] = useState("");
  const [pendingSwitch, setPendingSwitch] = useState<{ run: () => void } | null>(null);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState(false);
  const [unconfirmedStoryIds, setUnconfirmedStoryIds] = useState<string[]>([]);
  const [allCharacters, setCharacters] = useState<Character[]>([]);
  const [allRelations, setRelations] = useState<Relation[]>([]);
  const [savedCanvases, setSavedCanvases] = useState<Record<string, CanvasSnapshot>>({});
  const [canvasReady, setCanvasReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newStoryOpen, setNewStoryOpen] = useState(false);
  const [writerName, setWriterName] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [timelines, setTimelines] = useState<LocalData["timelines"]>({});
  const [storageStatus, setStorageStatus] = useState<StoreValue["storageStatus"]>("loading");
  const [hydrated, setHydrated] = useState(false);
  const revision = useRef(0);
  const applyData = useCallback((data: LocalData) => {
    setWriterName(data.writerName);
    setUnconfirmedStoryIds(data.unconfirmedStoryIds);
    setStories(data.stories); setActiveStoryIdRaw(data.activeStoryId);
    setCharacters(data.characters); setRelations(data.relations); setSavedCanvases(data.savedCanvases);
    setTimelines(data.timelines); setNotes(data.notes); setUser(data.user); setTheme(data.theme); setLangState(data.lang);
  }, []);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        let data = await readLocalData();
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
        if (mounted) { applyData(data); setCanvasReady(true); setHydrated(true); setStorageStatus("saved"); }
        navigator.storage?.persist?.().catch(() => undefined);
      } catch { if (mounted) setStorageStatus("error"); }
    };
    void restore();
    return () => { mounted = false; };
  }, [applyData]);

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
    savedCanvases, timelines, notes, user, theme, lang, unconfirmedStoryIds, writerName, presetsCleaned: true,
  }), [stories, activeStoryId, allCharacters, allRelations, savedCanvases, timelines, notes, user, theme, lang, unconfirmedStoryIds, writerName]);
  useEffect(() => {
    if (!hydrated) return;
    const version = ++revision.current;
    setStorageStatus("saving");
    void writeLocalData(data).then(() => {
      if (revision.current === version) setStorageStatus("saved");
    }).catch(() => { if (revision.current === version) setStorageStatus("error"); });
  }, [data, hydrated]);
  const exportBackup = useCallback(async () => {
    await writeLocalData(data);
    return makeBackup(data);
  }, [data]);
  const importBackup = useCallback(async (next: LocalData) => {
    ++revision.current;
    await writeLocalData(next);
    applyData(next);
    setCanvasReady(true); setHydrated(true); setStorageStatus("saved");
  }, [applyData]);
  const completeOnboarding = useCallback(async (name: string) => {
    const next = { ...data, writerName: name };
    await writeLocalData(next);
    setWriterName(name);
  }, [data]);
  const deleteStory = useCallback(async (id: string) => {
    if (!data.stories.some((story) => story.id === id)) return;
    const next = removeManuscripts(data, new Set([id]));
    ++revision.current;
    setStorageStatus("saving");
    try {
      await writeLocalData(next);
      applyData(next);
      setPendingSwitch(null);
      setStorageStatus("saved");
    } catch (error) { setStorageStatus("error"); throw error; }
  }, [data, applyData]);
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
  const setLang = useCallback((l: Lang) => setLangState(l), []);

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
  }, [data, unconfirmedStoryIds, activeStoryId]);
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
      const id = uid();
      setCharacters((prev) => [
        ...prev,
        { ...c, id, storyId: activeStoryId, hue: Math.floor(Math.random() * 360), x: 80 + ((allCharacters.filter((existing) => existing.storyId === activeStoryId).length % 4) * 175), y: 400 + (Math.floor(allCharacters.filter((existing) => existing.storyId === activeStoryId).length / 4) - 1) * 90 },
      ]);
      if (relationship && allCharacters.some((existing) => existing.id === relationship.to && existing.storyId === activeStoryId)) {
        setRelations((prev) => [...prev, { id: uid(), storyId: activeStoryId, from: id, to: relationship.to, type: relationship.type, label: relationship.label.trim(), history: [] }]);
      }
    },
    [activeStoryId, allCharacters],
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
    setSavedCanvases((prev) => ({ ...prev, [activeStoryId]: currentCanvas }));
  }, [activeStoryId, currentCanvas]);

  const addNote = useCallback((text: string, tag: string) => {
    setNotes((prev) => [{ id: uid(), text, tag, createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const signIn = useCallback((u: AuthUser) => {
    setUser(u);
    setAuthOpen(false);
  }, []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<StoreValue>(
    () => ({
      theme,
      toggleTheme,
      lang,
      setLang,
      t: dictionaries[lang],
      stories,
      activeStory: stories.find((s) => s.id === activeStoryId),
      setActiveStoryId,
      addStory,
      updateStory, deleteStory, writerName,
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
      signIn,
      signOut,
      authOpen,
      setAuthOpen,
    }),
    [deleteStory, writerName, unconfirmedStoryIds, saveEditor, theme, toggleTheme, lang, setLang, stories, activeStoryId, setActiveStoryId, addStory, updateStory, updateContent, addChapter, updateChapter, openChapter, allCharacters, addCharacter, moveCharacter, updateCharacter, deleteCharacter, allRelations, addRelation, updateRelation, deleteRelation, savedCanvas, canvasDirty, saveCanvas, timelines, updateTimeline, saveTimeline, storageStatus, exportBackup, importBackup, notes, addNote, newStoryOpen, user, signIn, signOut, authOpen],
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
    {hydrated ? writerName ? children : <WriterWelcome lang={lang} setLang={setLang} onComplete={completeOnboarding} errorMessage={dictionaries[lang].storageError} /> : <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground" role="status">{storageStatus === "error" ? dictionaries[lang].storageError : dictionaries[lang].storageLoading}</div>}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export const GENRES = ["Wuxia", "Xianxia", "Fantasy", "Action", "Hero", "Romance", "Sci-Fi", "Crime", "Mystery", "Thriller", "Horror", "Drama", "Historical", "Comedy", "Adventure", "Slice of Life", "Teen Fiction / Youth", "Urban", "Supernatural"];
export const STORY_LANGS = ["Bahasa Indonesia", "English", "简体中文", "繁體中文"];
