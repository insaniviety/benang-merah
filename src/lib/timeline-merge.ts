import type { TimelineEvent } from "./local-data";
import type { GeminiOutput } from "./gemini-data";

// Old event content belongs to the writer. AI proposes ordering and additions only.
export function mergeTimeline(baseline: TimelineEvent[], current: TimelineEvent[], proposed: GeminiOutput["events"], newId: () => string): TimelineEvent[] {
  const originalIds = new Set(baseline.map((e) => e.id));
  const byId = new Map(current.map((e) => [e.id, e]));
  const result: TimelineEvent[] = [];
  const used = new Set<string>();
  const key = (e: { event: string; era: string }) => `${e.era}:${e.event.trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
  const known = new Map(current.map((e) => [key(e), e]));
  for (const proposal of proposed) {
    const previous = proposal.id ? byId.get(proposal.id) : known.get(key(proposal));
    // A writer's deletion during the request must never be resurrected.
    if (proposal.id && originalIds.has(proposal.id) && !previous) continue;
    if (previous) {
      if (!used.has(previous.id)) { result.push(previous); used.add(previous.id); }
    } else {
      // Never accept an invented existing ID from the model.
      if (proposal.id) continue;
      const event: TimelineEvent = { ...proposal, id: newId() };
      result.push(event); used.add(event.id); known.set(key(event), event);
    }
  }
  for (const event of current) if (!used.has(event.id)) result.push(event);
  const baselineOrder = baseline.map((e) => e.id).filter((id) => byId.has(id));
  const currentOrder = current.filter((e) => originalIds.has(e.id)).map((e) => e.id);
  if (JSON.stringify(baselineOrder) !== JSON.stringify(currentOrder)) {
    // Concurrent manual reordering wins; append newly suggested events.
    return [...current, ...result.filter((e) => !byId.has(e.id))];
  }
  return result;
}