import type { LocalData } from "./local-data";

export function emptyWorkspace(): LocalData {
  return { stories: [], activeStoryId: "", characters: [], relations: [], savedCanvases: {},
    timelines: {}, notes: [], user: null, writerName: null, presetsCleaned: true,
    theme: "dark", lang: "id", unconfirmedStoryIds: [], cloudStoryIds: [], cloudSynced: {} };
}

export function removeManuscripts(data: LocalData, ids: Set<string>): LocalData {
  const stories = data.stories.filter((story) => !ids.has(story.id));
  return { ...data, stories,
    activeStoryId: stories.some((story) => story.id === data.activeStoryId) ? data.activeStoryId : stories[0]?.id ?? "",
    characters: data.characters.filter((character) => !ids.has(character.storyId)),
    relations: data.relations.filter((relation) => !ids.has(relation.storyId)),
    savedCanvases: Object.fromEntries(Object.entries(data.savedCanvases).filter(([id]) => !ids.has(id))),
    timelines: Object.fromEntries(Object.entries(data.timelines).filter(([id]) => !ids.has(id))),
    unconfirmedStoryIds: data.unconfirmedStoryIds.filter((id) => !ids.has(id)),
    cloudStoryIds: (data.cloudStoryIds ?? []).filter((id) => !ids.has(id)),
  };
}

export function cleanLegacyPresets(data: LocalData): LocalData {
  if (data.presetsCleaned) return data;
  const cleaned = removeManuscripts(data, new Set(["s1", "s2", "s3"]));
  return { ...cleaned, presetsCleaned: true,
    writerName: data.writerName ?? (data.user?.name.trim() || null),
    notes: cleaned.notes.filter((note) => note.id !== "n1" && note.id !== "n2") };
}