import { z } from "zod";
import { accountWorkspaceKey } from "./account-storage";

const chapter = z.object({
  id: z.string(), number: z.number().int().positive(), title: z.string(),
  status: z.enum(["done", "draft", "revision", "planned"]), summary: z.string(),
  words: z.number().nonnegative(), content: z.string(), target: z.number().nonnegative(), updatedAt: z.string(),
});
const story = z.object({
  id: z.string(), title: z.string(), genres: z.array(z.string()), language: z.string(),
  synopsis: z.string(), updatedAt: z.string(), chapters: z.array(chapter), content: z.string(), activeChapterId: z.string().optional(),
});
const character = z.object({
  id: z.string(), storyId: z.string(), name: z.string(), role: z.enum(["protagonist", "antagonist", "supporting"]),
  identity: z.string(), diction: z.string(), status: z.enum(["active", "deceased", "missing"]),
  hue: z.number().finite(), bio: z.string(), x: z.number().finite(), y: z.number().finite(),
});
const relation = z.object({
  id: z.string(), storyId: z.string(), from: z.string(), to: z.string(),
  type: z.enum(["conflict", "alliance", "secret", "romance", "family"]), label: z.string(),
  history: z.array(z.object({ chapter: z.number(), text: z.string() })),
});
const canvas = z.object({ characters: z.array(character), relations: z.array(relation) });
export const timelineEventSchema = z.object({
  id: z.string(), time: z.string(), era: z.enum(["past", "present"]), track: z.number().int().min(1).max(4),
  event: z.string(), location: z.string(), characters: z.array(z.string()), connection: z.string(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export const localDataSchema = z.object({
  writerName: z.string().trim().min(1).max(100).nullable().default(null),
  presetsCleaned: z.boolean().default(false),
  stories: z.array(story), activeStoryId: z.string(), characters: z.array(character), relations: z.array(relation),
  savedCanvases: z.record(canvas),
  unconfirmedStoryIds: z.array(z.string()).default([]),
  timelines: z.record(z.object({ draft: z.array(timelineEventSchema), saved: z.array(timelineEventSchema).nullable() })),
  notes: z.array(z.object({ id: z.string(), text: z.string(), createdAt: z.string(), tag: z.string() })),
  user: z.object({ name: z.string(), email: z.string(), plan: z.string() }).nullable(),
  theme: z.enum(["dark", "light"]), lang: z.enum(["id", "en", "zh-CN", "zh-TW"]),
});
export type LocalData = z.infer<typeof localDataSchema>;
const backupSchema = z.object({ app: z.literal("Benang Merah"), version: z.literal(1), exportedAt: z.string(), data: localDataSchema });

function validateReferences(data: LocalData) {
  const storyIds = new Set(data.stories.map((s) => s.id));
  if (storyIds.size !== data.stories.length || (data.stories.length > 0 && !storyIds.has(data.activeStoryId))) throw new Error("Invalid stories");
  const validateMap = (characters: LocalData["characters"], relations: LocalData["relations"]) => {
    const byId = new Map(characters.map((c) => [c.id, c]));
    if (byId.size !== characters.length || new Set(relations.map((r) => r.id)).size !== relations.length) throw new Error("Duplicate IDs");
    if (characters.some((c) => !storyIds.has(c.storyId)) || relations.some((r) => !storyIds.has(r.storyId) || r.from === r.to || byId.get(r.from)?.storyId !== r.storyId || byId.get(r.to)?.storyId !== r.storyId)) throw new Error("Invalid relationships");
  };
  validateMap(data.characters, data.relations);
  for (const [id, map] of Object.entries(data.savedCanvases)) {
    if (!storyIds.has(id) || map.characters.some((c) => c.storyId !== id) || map.relations.some((r) => r.storyId !== id)) throw new Error("Invalid map");
    validateMap(map.characters, map.relations);
  }
  for (const [id, timeline] of Object.entries(data.timelines)) {
    if (!storyIds.has(id)) throw new Error("Invalid timeline");
    for (const events of [timeline.draft, timeline.saved ?? []]) if (new Set(events.map((e) => e.id)).size !== events.length) throw new Error("Duplicate events");
  }
  for (const s of data.stories) if (new Set(s.chapters.map((c) => c.id)).size !== s.chapters.length || (s.activeChapterId && !s.chapters.some((c) => c.id === s.activeChapterId))) throw new Error("Invalid chapters");
  if (new Set(data.notes.map((n) => n.id)).size !== data.notes.length) throw new Error("Duplicate notes");
  return data;
}
export function parseBackup(value: unknown): LocalData {
  return validateReferences(backupSchema.parse(value).data);
}
export function makeBackup(data: LocalData) {
  return JSON.stringify({ app: "Benang Merah", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

let connection: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("benang-merah", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined; }; resolve(request.result); };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error("Database blocked")); };
  });
  return connection;
}
async function readWorkspace(key: string): Promise<LocalData | null> {
  const db = await openDatabase();
  const value: unknown = await new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readonly");
    const request = transaction.objectStore("workspace").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (value == null) return null;
  const parsed = localDataSchema.parse(value);
  // Older versions could save story-scoped data before a manuscript existed.
  // Repair only that known empty-ID defect; reject other invalid references.
  const orphanIds = new Set(parsed.characters.filter((c) => c.storyId === "").map((c) => c.id));
  const repaired = validateReferences({
    ...parsed,
    characters: parsed.characters.filter((c) => c.storyId !== ""),
    relations: parsed.relations.filter((r) => r.storyId !== "" && !orphanIds.has(r.from) && !orphanIds.has(r.to)),
    savedCanvases: Object.fromEntries(Object.entries(parsed.savedCanvases).filter(([id]) => id !== "")),
    timelines: Object.fromEntries(Object.entries(parsed.timelines).filter(([id]) => id !== "")),
  });
  if (JSON.stringify(parsed) !== JSON.stringify(repaired)) {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("workspace", "readwrite");
      transaction.objectStore("workspace").put(repaired, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Repair aborted"));
    });
  }
  return repaired;
}
let writes = Promise.resolve();
export function readLocalData(userId: string) { return readWorkspace(accountWorkspaceKey(userId)); }
export function readLegacyData() { return readWorkspace("data"); }
export async function claimLegacyWorkspace(userId: string): Promise<LocalData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    const store = transaction.objectStore("workspace");
    let claimed: LocalData | null = null;
    const owner = store.get("legacy-owner");
    owner.onsuccess = () => {
      if (owner.result) return;
      const legacy = store.get("data");
      legacy.onsuccess = () => {
        if (!legacy.result) return;
        try {
          claimed = validateReferences(localDataSchema.parse(legacy.result));
          store.put(claimed, accountWorkspaceKey(userId));
          store.put(userId, "legacy-owner");
          store.delete("data");
        } catch { transaction.abort(); }
      };
    };
    transaction.oncomplete = () => resolve(claimed);
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not claim legacy collection"));
    transaction.onerror = () => reject(transaction.error);
  });
}
export function writeLocalData(data: LocalData, userId: string): Promise<void> {
  const key = accountWorkspaceKey(userId);
  const validated = validateReferences(localDataSchema.parse(data));
  const next = writes.catch(() => undefined).then(async () => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("workspace", "readwrite");
      transaction.objectStore("workspace").put(validated, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Write aborted"));
    });
  });
  writes = next;
  return next;
}