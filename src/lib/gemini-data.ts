import { z } from "zod";
import { localDataSchema, timelineEventSchema, type LocalData } from "./local-data";

export const geminiInputSchema = z.object({
  consent: z.literal(true),
  task: z.enum(["timeline", "inspector"]),
  lang: localDataSchema.shape.lang,
  story: localDataSchema.shape.stories.element,
  characters: localDataSchema.shape.characters,
  canvas: localDataSchema.shape.savedCanvases.valueType.nullable(),
  timeline: z.array(timelineEventSchema),
  modes: z.array(z.enum(["diction", "atmosphere", "pacing"])).max(3).default([]),
});
export type GeminiInput = z.infer<typeof geminiInputSchema>;
export const findingSchema = z.object({
  kind: z.enum(["chronology", "text", "world", "relationship", "diction", "atmosphere", "pacing"]), body: z.string(), source: z.string(),
  chapterId: z.string().nullable(), paragraphIndex: z.number().int().nonnegative().nullable(), suggestion: z.string().nullable(),
});
export const geminiOutputSchema = z.object({
  events: z.array(timelineEventSchema.omit({ id: true }).extend({ id: z.string().nullable().optional() })), findings: z.array(findingSchema),
});
export type GeminiOutput = z.infer<typeof geminiOutputSchema>;
export function selectedStoryInput(data: LocalData, storyId: string, task: GeminiInput["task"], consent: boolean, modes: GeminiInput["modes"] = []): GeminiInput {
  if (!consent) throw new Error("Consent required");
  const story = data.stories.find((s) => s.id === storyId);
  if (!story) throw new Error("Story not found");
  return geminiInputSchema.parse({
    consent, task, lang: data.lang, story,
    characters: data.characters.filter((c) => c.storyId === storyId),
    canvas: task === "inspector" ? data.savedCanvases[storyId] ?? null : null,
    timeline: task === "inspector" ? data.timelines[storyId]?.saved ?? [] : data.timelines[storyId]?.draft ?? [],
    modes: task === "inspector" ? modes : [],
  });
}