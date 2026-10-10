import { test, expect } from "bun:test";
import { mergeTimeline } from "./timeline-merge";
const event = (id, text = id) => ({ id, time: "Day 1", era: "present", track: 1, event: text, location: "Writer location", characters: ["Ivana"], connection: "Manual note" });
test("updates retain old fields and IDs while synchronizing new events", () => {
  const old = event("old");
  const added = { ...event(null, "New chapter event"), id: null };
  const result = mergeTimeline([old], [old], [added, { ...old, location: "AI overwrite", connection: "" }], () => "new-id");
  expect(result.map((e) => e.id)).toEqual(["new-id", "old"]);
  expect(result[1]).toEqual(old);
});
test("omitted old events are retained and repeated proposals do not duplicate events", () => {
  const old = event("old");
  const proposal = { ...event(null, "new"), id: null };
  const result = mergeTimeline([old], [old], [proposal, proposal], () => "new-id");
  expect(result.map((e) => e.id)).toEqual(["new-id", "old"]);
});
test("manual edits and deletions during the request win", () => {
  const old = event("old"); const deleted = event("deleted"); const edited = { ...old, event: "Manually revised" };
  expect(mergeTimeline([old, deleted], [edited], [old, deleted], () => "unused")).toEqual([edited]);
});
test("manual reordering during the request wins", () => {
  const a = event("a"), b = event("b");
  expect(mergeTimeline([a, b], [b, a], [a, b], () => "unused").map((e) => e.id)).toEqual(["b", "a"]);
});
test("empty or failed-to-extract proposals never erase existing timeline", () => {
  const old = event("old");
  expect(mergeTimeline([old], [old], [], () => "unused")).toEqual([old]);
});