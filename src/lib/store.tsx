import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, type Dict, type Lang } from "./i18n";

export type Theme = "dark" | "light";
export type ChapterStatus = "done" | "draft" | "planned";
export type Role = "protagonist" | "antagonist" | "supporting";
export type CharStatus = "active" | "deceased" | "missing";
export type RelationType = "conflict" | "alliance" | "secret" | "romance";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  status: ChapterStatus;
  summary: string;
  words: number;
}
export interface Story {
  id: string;
  title: string;
  genre: string;
  language: string;
  synopsis: string;
  updatedAt: string;
  chapters: Chapter[];
  content: string;
}
export interface Character {
  id: string;
  storyId: string;
  name: string;
  role: Role;
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
export interface Note {
  id: string;
  text: string;
  createdAt: string;
  tag: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const seedStories: Story[] = [
  {
    id: "s1",
    title: "Pedang di Bawah Bulan Merah",
    genre: "Wuxia",
    language: "Bahasa Indonesia",
    synopsis:
      "Seorang pendekar buangan kembali ke Lembah Sembilan Naga untuk membalas kematian gurunya, hanya untuk menemukan bahwa musuh sejatinya adalah saudara seperguruannya sendiri.",
    updatedAt: "2026-09-18T21:40:00Z",
    content:
      "Angin dari utara membawa bau besi dan hujan.\n\nLing Yue berdiri di ambang gerbang Lembah Sembilan Naga, jubahnya yang lusuh berkibar seperti bendera yang lupa kepada siapa ia berkibar. Sepuluh tahun. Sepuluh tahun sejak ia dibuang, dan gerbang itu masih setinggi dulu, masih diukir dengan naga yang sama—hanya saja kini matanya tampak lebih lelah.\n\n\"Kau tidak seharusnya kembali,\" suara itu datang dari balik kabut. Tenang. Terlalu tenang.\n\nLing Yue tidak menoleh. Ia tahu suara itu. Ia telah mendengarnya di setiap mimpi buruknya. \"Dan kau tidak seharusnya membunuh Guru, Kakak Seperguruan.\"\n\nHening. Lalu tawa kecil, hampir seperti helaan napas. \"Kau masih memanggilku begitu.\"\n\n",
    chapters: [
      { id: "c1", number: 1, title: "Gerbang yang Lupa", status: "done", summary: "Ling Yue kembali ke lembah setelah sepuluh tahun pembuangan.", words: 3120 },
      { id: "c2", number: 2, title: "Bayangan di Paviliun Timur", status: "done", summary: "Pertemuan pertama dengan Shen Hao; luka lama terbuka.", words: 2870 },
      { id: "c3", number: 3, title: "Surat yang Tak Pernah Dikirim", status: "done", summary: "Mei Lin menemukan surat wasiat sang Guru.", words: 2410 },
      { id: "c4", number: 4, title: "Bulan Merah Pertama", status: "draft", summary: "Duel di jembatan batu; rahasia Shen Hao setengah terungkap.", words: 1560 },
      { id: "c5", number: 5, title: "Sembilan Naga Terbangun", status: "planned", summary: "Klimaks di altar kuno.", words: 0 },
    ],
  },
  {
    id: "s2",
    title: "The Cartographer of Lost Hours",
    genre: "Fantasy",
    language: "English",
    synopsis:
      "In a city where time can be mapped like terrain, a young cartographer discovers a district that exists only between midnight and one.",
    updatedAt: "2026-09-15T09:12:00Z",
    content:
      "The map was wrong, which was impossible, because Ilse had drawn it herself.\n\nShe traced the ink with one finger—Weaver's Lane, the clocktower, the crooked square where the pigeons refused to land—and stopped at a street that should not have been there. A thin line, barely a hair, running between two buildings that in daylight stood shoulder to shoulder.\n\n",
    chapters: [
      { id: "c6", number: 1, title: "The Thirteenth Hour", status: "done", summary: "Ilse discovers the impossible street.", words: 4020 },
      { id: "c7", number: 2, title: "Ink That Remembers", status: "done", summary: "The guild's archives hint at earlier cartographers who vanished.", words: 3350 },
      { id: "c8", number: 3, title: "Between Midnight and One", status: "draft", summary: "Ilse enters the district.", words: 980 },
    ],
  },
  {
    id: "s3",
    title: "Hujan di Kedai Kopi Terakhir",
    genre: "Romance",
    language: "Bahasa Indonesia",
    synopsis:
      "Dua orang asing yang selalu berteduh di kedai kopi yang sama setiap kali hujan turun, tanpa pernah berbicara—sampai kedai itu diumumkan akan tutup.",
    updatedAt: "2026-09-10T14:03:00Z",
    content:
      "Hujan selalu datang pukul empat. Begitu juga dia.\n\n",
    chapters: [
      { id: "c9", number: 1, title: "Pukul Empat", status: "done", summary: "Ritual diam dua orang asing.", words: 2200 },
      { id: "c10", number: 2, title: "Pengumuman", status: "draft", summary: "Kedai akan tutup akhir bulan.", words: 640 },
    ],
  },
];

const seedCharacters: Character[] = [
  { id: "k1", storyId: "s1", name: "Ling Yue", role: "protagonist", diction: "Hemat kata, kalimat pendek, sering diam sebelum menjawab. Tidak pernah memakai kata 'aku' saat marah.", status: "active", hue: 15, bio: "Pendekar buangan, murid ketiga Guru Bai.", x: 120, y: 200 },
  { id: "k2", storyId: "s1", name: "Shen Hao", role: "antagonist", diction: "Formal dan puitis, senang metafora tentang air dan bayangan. Selalu tenang, bahkan saat mengancam.", status: "active", hue: 260, bio: "Kakak seperguruan Ling Yue; pewaris sah lembah.", x: 560, y: 120 },
  { id: "k3", storyId: "s1", name: "Mei Lin", role: "supporting", diction: "Ceplas-ceplos, humor kering, sering menyela. Memanggil semua orang dengan julukan.", status: "active", hue: 80, bio: "Tabib lembah, penjaga rahasia surat Guru.", x: 340, y: 380 },
  { id: "k4", storyId: "s1", name: "Guru Bai", role: "supporting", diction: "Berbicara dalam peribahasa; kalimatnya sering diulang murid-muridnya.", status: "deceased", hue: 200, bio: "Pendiri Lembah Sembilan Naga. Tewas di bab prolog.", x: 620, y: 400 },
  { id: "k5", storyId: "s1", name: "Xiao Feng", role: "supporting", diction: "Lugu, banyak bertanya, gugup di depan Shen Hao.", status: "missing", hue: 320, bio: "Murid termuda yang menghilang malam pembunuhan.", x: 160, y: 470 },
  { id: "k6", storyId: "s2", name: "Ilse Varen", role: "protagonist", diction: "Precise, slightly pedantic, thinks in measurements.", status: "active", hue: 200, bio: "Junior cartographer of the Guild.", x: 200, y: 220 },
  { id: "k7", storyId: "s2", name: "The Keeper", role: "antagonist", diction: "Speaks only in questions.", status: "active", hue: 30, bio: "Guardian of the thirteenth hour.", x: 560, y: 260 },
  { id: "k8", storyId: "s3", name: "Raka", role: "protagonist", diction: "Pendiam, banyak monolog batin.", status: "active", hue: 40, bio: "Arsitek yang baru pindah kota.", x: 200, y: 220 },
  { id: "k9", storyId: "s3", name: "Nayla", role: "protagonist", diction: "Hangat, senang bercanda dengan barista.", status: "active", hue: 340, bio: "Ilustrator lepas.", x: 540, y: 240 },
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
  updateContent: (id: string, content: string) => void;
  characters: Character[];
  addCharacter: (c: Omit<Character, "id" | "storyId" | "hue" | "x" | "y">) => void;
  moveCharacter: (id: string, x: number, y: number) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  relations: Relation[];
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

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Lang>("id");
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [activeStoryId, setActiveStoryId] = useState("s1");
  const [allCharacters, setCharacters] = useState<Character[]>(seedCharacters);
  const [allRelations, setRelations] = useState<Relation[]>(seedRelations);
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [newStoryOpen, setNewStoryOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("bm-theme") as Theme | null;
    const savedLang = localStorage.getItem("bm-lang") as Lang | null;
    if (savedTheme === "light") setTheme("light");
    if (savedLang && savedLang in dictionaries) setLangState(savedLang);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("bm-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("bm-lang", lang);
  }, [lang]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const addStory: StoreValue["addStory"] = useCallback((s) => {
    const story: Story = { ...s, id: uid(), updatedAt: new Date().toISOString(), chapters: [], content: "" };
    setStories((prev) => [story, ...prev]);
    setActiveStoryId(story.id);
  }, []);

  const updateContent = useCallback((id: string, content: string) => {
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, content, updatedAt: new Date().toISOString() } : s)));
  }, []);

  const addCharacter: StoreValue["addCharacter"] = useCallback(
    (c) => {
      setCharacters((prev) => [
        ...prev,
        { ...c, id: uid(), storyId: activeStoryId, hue: Math.floor(Math.random() * 360), x: 120 + Math.random() * 400, y: 120 + Math.random() * 300 },
      ]);
    },
    [activeStoryId],
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
      updateContent,
      characters: allCharacters.filter((c) => c.storyId === activeStoryId),
      addCharacter,
      moveCharacter,
      updateCharacter,
      deleteCharacter,
      relations: allRelations.filter((r) => r.storyId === activeStoryId),
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
    [theme, toggleTheme, lang, setLang, stories, activeStoryId, addStory, updateContent, allCharacters, addCharacter, moveCharacter, updateCharacter, deleteCharacter, allRelations, notes, addNote, newStoryOpen, user, signIn, signOut, authOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export const GENRES = ["Wuxia", "Fantasy", "Romance", "Xianxia", "Mystery", "Sci-Fi", "Horror", "Drama", "Historical"];
export const STORY_LANGS = ["Bahasa Indonesia", "English", "简体中文", "繁體中文"];
