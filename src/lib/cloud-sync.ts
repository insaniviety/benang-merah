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
export function applyBundle(data: LocalData, raw: unknown): LocalData {
  const parsed = cloudBundleSchema.safeParse(raw);
  if (!parsed.success) return data;
  const b = parsed.data;
  const id = b.story.id;
  const local = data.stories.find((s) => s.id === id);
  if (local && local.updatedAt >= b.story.updatedAt) {
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
