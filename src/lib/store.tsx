import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Lang } from "./i18n";
import { readLocalData, writeLocalData, makeBackup, localDataSchema, timelineEventSchema, type LocalData, type TimelineEvent } from "./local-data";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { needsEditorConfirmation } from "./editor-save";

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
const canvasKey = (storyId: string) => `bm-canvas-${storyId}`;
export interface Note {
  id: string;
  text: string;
  createdAt: string;
  tag: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
function mk(c: Omit<Chapter, "content" | "target" | "updatedAt">): Chapter {
  const content = c.words
    ? `${c.summary}\n\n${c.title}. Kalimat pembuka bab ini masih menggema dari bab sebelumnya—sunyi, penuh firasat, dan menunggu untuk dibaca ulang.\n\nDi sinilah penulis menata ulang ritme, memeriksa dialog, dan memastikan setiap benang cerita tetap terikat pada benang merahnya.`
    : "";
  const day = 10 + (c.number % 9);
  return { ...c, content, target: Math.max(3000, c.words), updatedAt: `2026-09-${day}T10:00:00Z` };
}

const seedStories: Story[] = [
  {
    id: "s1",
    title: "Pedang di Bawah Bulan Merah",
    genres: ["Wuxia"],
    language: "Bahasa Indonesia",
    synopsis:
      "Seorang pendekar buangan kembali ke Lembah Sembilan Naga untuk membalas kematian gurunya, hanya untuk menemukan bahwa musuh sejatinya adalah saudara seperguruannya sendiri.",
    updatedAt: "2026-09-18T21:40:00Z",
    content:
      "Angin dari utara membawa bau besi dan hujan.\n\nLing Yue berdiri di ambang gerbang Lembah Sembilan Naga, jubahnya yang lusuh berkibar seperti bendera yang lupa kepada siapa ia berkibar. Sepuluh tahun. Sepuluh tahun sejak ia dibuang, dan gerbang itu masih setinggi dulu, masih diukir dengan naga yang sama—hanya saja kini matanya tampak lebih lelah.\n\n\"Kau tidak seharusnya kembali,\" suara itu datang dari balik kabut. Tenang. Terlalu tenang.\n\nLing Yue tidak menoleh. Ia tahu suara itu. Ia telah mendengarnya di setiap mimpi buruknya. \"Dan kau tidak seharusnya membunuh Guru, Kakak Seperguruan.\"\n\nHening. Lalu tawa kecil, hampir seperti helaan napas. \"Kau masih memanggilku begitu.\"\n\n",
    chapters: [
      mk({ id: "c1", number: 1, title: "Gerbang yang Lupa", status: "done", summary: "Ling Yue kembali ke lembah setelah sepuluh tahun pembuangan.", words: 3120 }),
      mk({ id: "c2", number: 2, title: "Bayangan di Paviliun Timur", status: "done", summary: "Pertemuan pertama dengan Shen Hao; luka lama terbuka.", words: 2870 }),
      mk({ id: "c3", number: 3, title: "Surat yang Tak Pernah Dikirim", status: "revision", summary: "Mei Lin menemukan surat wasiat sang Guru.", words: 2410 }),
      mk({ id: "c4", number: 4, title: "Bulan Merah Pertama", status: "draft", summary: "Duel di jembatan batu; rahasia Shen Hao setengah terungkap.", words: 1560 }),
      mk({ id: "c5", number: 5, title: "Sembilan Naga Terbangun", status: "planned", summary: "Klimaks di altar kuno.", words: 0 }),
    ],
  },
  {
    id: "s2",
    title: "The Cartographer of Lost Hours",
    genres: ["Fantasy"],
    language: "English",
    synopsis:
      "In a city where time can be mapped like terrain, a young cartographer discovers a district that exists only between midnight and one.",
    updatedAt: "2026-09-15T09:12:00Z",
    content:
      "The map was wrong, which was impossible, because Ilse had drawn it herself.\n\nShe traced the ink with one finger—Weaver's Lane, the clocktower, the crooked square where the pigeons refused to land—and stopped at a street that should not have been there. A thin line, barely a hair, running between two buildings that in daylight stood shoulder to shoulder.\n\n",
    chapters: [
      mk({ id: "c6", number: 1, title: "The Thirteenth Hour", status: "done", summary: "Ilse discovers the impossible street.", words: 4020 }),
      mk({ id: "c7", number: 2, title: "Ink That Remembers", status: "done", summary: "The guild's archives hint at earlier cartographers who vanished.", words: 3350 }),
      mk({ id: "c8", number: 3, title: "Between Midnight and One", status: "draft", summary: "Ilse enters the district.", words: 980 }),
    ],
  },
  {
    id: "s3",
    title: "Hujan di Kedai Kopi Terakhir",
    genres: ["Romance"],
    language: "Bahasa Indonesia",
    synopsis:
      "Dua orang asing yang selalu berteduh di kedai kopi yang sama setiap kali hujan turun, tanpa pernah berbicara—sampai kedai itu diumumkan akan tutup.",
    updatedAt: "2026-09-10T14:03:00Z",
    content:
      "Hujan selalu datang pukul empat. Begitu juga dia.\n\n",
    chapters: [
      mk({ id: "c9", number: 1, title: "Pukul Empat", status: "done", summary: "Ritual diam dua orang asing.", words: 2200 }),
      mk({ id: "c10", number: 2, title: "Pengumuman", status: "draft", summary: "Kedai akan tutup akhir bulan.", words: 640 }),
    ],
  },
];

for (const st of seedStories) {
  const cur = [...st.chapters].reverse().find((c) => c.status !== "planned");
  if (cur) { cur.content = st.content; cur.words = countWords(st.content) || cur.words; st.activeChapterId = cur.id; }
}

const seedCharacters: Character[] = [
  { id: "k1", storyId: "s1", name: "Ling Yue", role: "protagonist", identity: "Murid ketiga Guru Bai; adik seperguruan Shen Hao", diction: "Hemat kata, kalimat pendek, sering diam sebelum menjawab. Tidak pernah memakai kata 'aku' saat marah.", status: "active", hue: 15, bio: "Pendekar buangan yang kembali ke lembah setelah sepuluh tahun.", x: 120, y: 200 },
  { id: "k2", storyId: "s1", name: "Shen Hao", role: "antagonist", identity: "Pemimpin Lembah Sembilan Naga; kakak seperguruan Ling Yue", diction: "Formal dan puitis, senang metafora tentang air dan bayangan. Selalu tenang, bahkan saat mengancam.", status: "active", hue: 260, bio: "Pewaris sah lembah yang memikul rahasia kematian sang Guru.", x: 560, y: 120 },
  { id: "k3", storyId: "s1", name: "Mei Lin", role: "supporting", identity: "Tabib lembah dan penjaga surat wasiat Guru Bai", diction: "Ceplas-ceplos, humor kering, sering menyela. Memanggil semua orang dengan julukan.", status: "active", hue: 80, bio: "Sahabat lama Ling Yue yang mengetahui banyak rahasia lembah.", x: 340, y: 380 },
  { id: "k4", storyId: "s1", name: "Guru Bai", role: "supporting", identity: "Pendiri lembah; guru sekaligus ayah angkat Ling Yue dan Shen Hao", diction: "Berbicara dalam peribahasa; kalimatnya sering diulang murid-muridnya.", status: "deceased", hue: 200, bio: "Pendiri Lembah Sembilan Naga. Tewas di bab prolog.", x: 620, y: 400 },
  { id: "k5", storyId: "s1", name: "Xiao Feng", role: "supporting", identity: "Murid termuda Lembah Sembilan Naga", diction: "Lugu, banyak bertanya, gugup di depan Shen Hao.", status: "missing", hue: 320, bio: "Menghilang pada malam pembunuhan Guru Bai.", x: 160, y: 470 },
  { id: "k6", storyId: "s2", name: "Ilse Varen", role: "protagonist", identity: "Junior cartographer of the Guild", diction: "Precise, slightly pedantic, thinks in measurements.", status: "active", hue: 200, bio: "A gifted mapmaker investigating the impossible district.", x: 200, y: 220 },
  { id: "k7", storyId: "s2", name: "The Keeper", role: "antagonist", identity: "Guardian of the thirteenth hour", diction: "Speaks only in questions.", status: "active", hue: 30, bio: "An ageless guardian bound to the hidden district.", x: 560, y: 260 },
  { id: "k8", storyId: "s3", name: "Raka", role: "protagonist", identity: "Arsitek yang baru pindah kota", diction: "Pendiam, banyak monolog batin.", status: "active", hue: 40, bio: "Menemukan rutinitas baru di kedai kopi terakhir.", x: 200, y: 220 },
  { id: "k9", storyId: "s3", name: "Nayla", role: "protagonist", identity: "Ilustrator lepas dan pelanggan tetap kedai", diction: "Hangat, senang bercanda dengan barista.", status: "active", hue: 340, bio: "Selalu datang bersamaan dengan hujan pukul empat.", x: 540, y: 240 },
];

const seedRelations: Relation[] = [
  { id: "r1", storyId: "s1", from: "k1", to: "k2", type: "conflict", label: "Dendam seperguruan", history: [
    { chapter: 1, text: "Ling Yue kembali dan menuduh Shen Hao membunuh Guru Bai." },
    { chapter: 2, text: "Shen Hao menyangkal tanpa membela diri—Ling Yue mulai ragu." },
    { chapter: 4, text: "Duel di jembatan batu. Shen Hao sengaja kalah." },
  ] },
  { id: "r2", storyId: "s1", from: "k1", to: "k3", type: "alliance", label: "Sekutu lama", history: [
    { chapter: 1, text: "Mei Lin menyembunyikan Ling Yue di gudang obat." },
    { chapter: 3, text: "Mei Lin menyerahkan surat wasiat Guru." },
  ] },
  { id: "r3", storyId: "s1", from: "k2", to: "k4", type: "secret", label: "Wasiat tersembunyi", history: [
    { chapter: 3, text: "Surat Guru menyebut Shen Hao 'pelindung', bukan 'pembunuh'." },
  ] },
  { id: "r4", storyId: "s1", from: "k1", to: "k3", type: "romance", label: "Perasaan yang tak terucap", history: [
    { chapter: 2, text: "Mei Lin membalut luka Ling Yue dalam diam yang terlalu panjang." },
  ] },
  { id: "r5", storyId: "s1", from: "k5", to: "k2", type: "secret", label: "Saksi malam pembunuhan", history: [
    { chapter: 2, text: "Xiao Feng terlihat terakhir kali di paviliun Shen Hao." },
  ] },
  { id: "r6", storyId: "s1", from: "k4", to: "k1", type: "alliance", label: "Guru dan murid", history: [
    { chapter: 1, text: "Kilas balik: Guru Bai memilih Ling Yue sebagai pewaris rahasia." },
  ] },
  { id: "r7", storyId: "s2", from: "k6", to: "k7", type: "conflict", label: "Trespasser and guardian", history: [
    { chapter: 3, text: "The Keeper asks Ilse why she drew the street." },
  ] },
  { id: "r8", storyId: "s3", from: "k8", to: "k9", type: "romance", label: "Dua orang asing", history: [
    { chapter: 1, text: "Berteduh di meja yang sama, tanpa kata." },
  ] },
  { id: "r9", storyId: "s1", from: "k4", to: "k2", type: "family", label: "Ayah angkat dan putra", history: [
    { chapter: 1, text: "Guru Bai membesarkan Shen Hao sebagai putra sekaligus pewaris lembah." },
    { chapter: 3, text: "Wasiat Guru mengungkap bahwa ia tetap mempercayai Shen Hao hingga akhir." },
  ] },
];

const seedNotes: Note[] = [
  { id: "n1", text: "Ide: bulan merah muncul hanya saat seseorang berbohong di altar.", createdAt: "2026-09-18T20:11:00Z", tag: "Worldbuilding" },
  { id: "n2", text: "Dialog Mei Lin: \"Kau pulang membawa pedang, bukan permintaan maaf. Khas.\"", createdAt: "2026-09-17T08:30:00Z", tag: "Dialog" },
];

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
  updateTimeline: (id: string, events: TimelineEvent[]) => void;
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
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [activeStoryId, setActiveStoryIdRaw] = useState("s1");
  const [pendingSwitch, setPendingSwitch] = useState<{ run: () => void } | null>(null);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [switchError, setSwitchError] = useState(false);
  const [unconfirmedStoryIds, setUnconfirmedStoryIds] = useState<string[]>([]);
  const [allCharacters, setCharacters] = useState<Character[]>(seedCharacters);
  const [allRelations, setRelations] = useState<Relation[]>(seedRelations);
  const [savedCanvases, setSavedCanvases] = useState<Record<string, CanvasSnapshot>>({});
  const [canvasReady, setCanvasReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [newStoryOpen, setNewStoryOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [timelines, setTimelines] = useState<LocalData["timelines"]>({});
  const [storageStatus, setStorageStatus] = useState<StoreValue["storageStatus"]>("loading");
  const [hydrated, setHydrated] = useState(false);
  const revision = useRef(0);
  const applyData = useCallback((data: LocalData) => {
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
          const legacyCanvases: LocalData["savedCanvases"] = {};
          const legacyTimelines: LocalData["timelines"] = {};
          for (const story of seedStories) {
            try {
              const raw = localStorage.getItem(canvasKey(story.id));
              if (raw) {
                const parsed = localDataSchema.shape.savedCanvases.safeParse({ [story.id]: JSON.parse(raw) });
                if (parsed.success) Object.assign(legacyCanvases, parsed.data);
              }
            } catch { /* Leave invalid legacy records untouched. */ }
            try {
              const raw = localStorage.getItem(`bm-timeline-${story.id}`);
              if (raw) {
                const parsed = timelineEventSchema.array().safeParse(JSON.parse(raw));
                if (parsed.success) legacyTimelines[story.id] = { draft: parsed.data, saved: parsed.data };
              }
            } catch { /* Leave invalid legacy records untouched. */ }
          }
          const oldLang = localStorage.getItem("bm-lang");
          const oldUser = localStorage.getItem("bm-auth");
          let profile: AuthUser | null = null;
          try { if (oldUser) profile = localDataSchema.shape.user.parse(JSON.parse(oldUser)); } catch { /* Invalid profile. */ }
          data = {
            stories: seedStories, activeStoryId: "s1", notes: seedNotes, user: profile, unconfirmedStoryIds: [],
            characters: [...seedCharacters.filter((c) => !legacyCanvases[c.storyId]), ...Object.values(legacyCanvases).flatMap((m) => m.characters)],
            relations: [...seedRelations.filter((r) => !legacyCanvases[r.storyId]), ...Object.values(legacyCanvases).flatMap((m) => m.relations)],
            savedCanvases: legacyCanvases, timelines: legacyTimelines,
            theme: localStorage.getItem("bm-theme") === "light" ? "light" : "dark",
            lang: oldLang && oldLang in dictionaries ? oldLang as Lang : "id",
          };
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
    savedCanvases, timelines, notes, user, theme, lang, unconfirmedStoryIds,
  }), [stories, activeStoryId, allCharacters, allRelations, savedCanvases, timelines, notes, user, theme, lang, unconfirmedStoryIds]);
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
  const updateTimeline = useCallback((id: string, draft: TimelineEvent[]) => {
    setTimelines((prev) => ({ ...prev, [id]: { draft, saved: prev[id]?.saved ?? null } }));
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
      updateStory,
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
    [unconfirmedStoryIds, saveEditor, theme, toggleTheme, lang, setLang, stories, activeStoryId, setActiveStoryId, addStory, updateStory, updateContent, addChapter, updateChapter, openChapter, allCharacters, addCharacter, moveCharacter, updateCharacter, deleteCharacter, allRelations, addRelation, updateRelation, deleteRelation, savedCanvas, canvasDirty, saveCanvas, timelines, updateTimeline, saveTimeline, storageStatus, exportBackup, importBackup, notes, addNote, newStoryOpen, user, signIn, signOut, authOpen],
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
    {hydrated ? children : <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground" role="status">{storageStatus === "error" ? dictionaries[lang].storageError : dictionaries[lang].storageLoading}</div>}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export const GENRES = ["Wuxia", "Xianxia", "Fantasy", "Action", "Hero", "Romance", "Sci-Fi", "Crime", "Mystery", "Thriller", "Horror", "Drama", "Historical", "Comedy", "Adventure", "Slice of Life", "Teen Fiction / Youth", "Urban", "Supernatural"];
export const STORY_LANGS = ["Bahasa Indonesia", "English", "简体中文", "繁體中文"];
