import { ulid } from "ulid";
import type { Memory, MemoryKind } from "./types";

/**
 * Fictional demo persona: planning a Lisbon trip. No real names, no real
 * personal data. One memory is deliberately stale (the hotel date) so the
 * correction flow has something to find.
 */
const SEEDS: Array<{ kind: MemoryKind; tags: string[]; content: string }> = [
  { kind: "preference", tags: ["travel"], content: "Prefers window seats on flights under four hours." },
  { kind: "fact", tags: ["travel", "lisbon"], content: "The Lisbon trip runs October 17 to October 24." },
  { kind: "fact", tags: ["travel", "lisbon"], content: "The hotel is booked for October 12." },
  { kind: "preference", tags: ["food"], content: "Vegetarian, but eats fish when traveling." },
  { kind: "decision", tags: ["travel", "lisbon"], content: "Skipping the rental car; trams and walking only." },
  { kind: "preference", tags: ["travel"], content: "Museums in the morning, never after lunch." },
  { kind: "fact", tags: ["lisbon"], content: "Staying in the Alfama district, near the cathedral." },
  { kind: "note", tags: ["lisbon", "food"], content: "A friend recommended the time-out market for the first evening." },
  { kind: "preference", tags: ["planning"], content: "Wants one unplanned day in every trip." },
  { kind: "decision", tags: ["budget"], content: "Trip budget is 2,400 euros, flights included." },
];

export function seedMemories(): Memory[] {
  const base = Date.now() - SEEDS.length * 60_000;
  return SEEDS.map((s, i) => ({
    id: ulid(base + i * 60_000),
    kind: s.kind,
    tags: s.tags,
    created: new Date(base + i * 60_000).toISOString(),
    status: "active" as const,
    source: "human" as const,
    content: s.content,
  }));
}
