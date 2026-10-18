import { z } from "zod";
import { localDataSchema, type LocalData } from "./local-data";

const shape = localDataSchema.shape;
export const cloudBundleSchema = z.object({
  story: shape.stories.element,
  characters: shape.characters,
  relations: shape.relations,
  savedCanvas: shape.savedCanvases.valueSchema.nullable(),
  timeline: shape.timelines.valueSchema.nullable(),
});
export type CloudBundle = z.infer<typeof cloudBundleSchema>;

/** Collect everything that belongs to one manuscript. Notes are account-wide and stay local. */
export function bundleFor(data: LocalData, storyId: string): CloudBundle | null {
  const story = data.stories.find((s) => s.id === storyId);
  if (!story) return null;
  return {
    story,
    characters: data.characters.filter((c) => c.storyId === storyId),
    relations: data.relations.filter((r) => r.storyId === storyId),
    savedCanvas: data.savedCanvases[storyId] ?? null,
    timeline: data.timelines[storyId] ?? null,
  };
}

/** Replace one manuscript's data with a cloud copy when it is missing locally or newer; other work is untouched. */
export function applyBundle(data: LocalData, raw: unknown, force = false): LocalData {
  const parsed = cloudBundleSchema.safeParse(raw);
  if (!parsed.success) return data;
  const b = parsed.data;
  const id = b.story.id;
  const local = data.stories.find((s) => s.id === id);
  if (local && !force && local.updatedAt >= b.story.updatedAt) {
    return data.cloudStoryIds.includes(id) ? data : { ...data, cloudStoryIds: [...data.cloudStoryIds, id] };
  }
  const own = <T extends { storyId: string }>(items: T[]) => items.every((i) => i.storyId === id);
  if (!own(b.characters) || !own(b.relations)) return data;
  const savedCanvases = { ...data.savedCanvases };
  if (b.savedCanvas) savedCanvases[id] = b.savedCanvas; else delete savedCanvases[id];
  const timelines = { ...data.timelines };
  if (b.timeline) timelines[id] = b.timeline; else delete timelines[id];
  const stories = local ? data.stories.map((s) => (s.id === id ? b.story : s)) : [b.story, ...data.stories];
  return {
    ...data,
    stories,
    activeStoryId: data.activeStoryId && stories.some((s) => s.id === data.activeStoryId) ? data.activeStoryId : id,
    characters: [...data.characters.filter((c) => c.storyId !== id), ...b.characters],
    relations: [...data.relations.filter((r) => r.storyId !== id), ...b.relations],
    savedCanvases, timelines,
    cloudStoryIds: data.cloudStoryIds.includes(id) ? data.cloudStoryIds : [...data.cloudStoryIds, id],
  };
}

/** Stable fingerprint of a manuscript bundle, used to tell whether local edits are already in the cloud. */
export function bundleHash(bundle: CloudBundle | null): string {
  const text = JSON.stringify(bundle);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${text.length}:${(h >>> 0).toString(36)}`;
}

/**
 * Merge cloud rows on load. A cloud copy wins whenever this device has no unsynced edits for that
 * manuscript (covers character/map/timeline changes that don't bump story.updatedAt). A manuscript
 * this device had synced before but that no longer has a cloud row was deleted or un-synced elsewhere,
 * so sync is switched off here instead of re-uploading it. Local copies are never deleted.
 */
export function reconcileCloud(data: LocalData, rows: { story_id: string; bundle: unknown }[]): LocalData {
  let next = data;
  const synced = { ...data.cloudSynced };
  const remoteIds = new Set<string>();
  for (const row of rows) {
    const parsed = cloudBundleSchema.safeParse(row.bundle);
    if (!parsed.success || parsed.data.story.id !== row.story_id) continue;
    const id = row.story_id;
    remoteIds.add(id);
    const localBundle = bundleFor(next, id);
    const clean = !localBundle || synced[id] === bundleHash(localBundle);
    const merged = applyBundle(next, parsed.data, clean);
    if (merged === next && clean && localBundle) continue;
    next = merged;
    if (clean || bundleHash(bundleFor(next, id)) === bundleHash(parsed.data)) synced[id] = bundleHash(bundleFor(next, id));
  }
  const removed = next.cloudStoryIds.filter((id) => !remoteIds.has(id) && synced[id]);
  for (const id of removed) delete synced[id];
  for (const id of Object.keys(synced)) if (!remoteIds.has(id)) delete synced[id];
  return { ...next, cloudStoryIds: next.cloudStoryIds.filter((id) => !removed.includes(id)), cloudSynced: synced };
}
