export type MemoryKind = "fact" | "preference" | "decision" | "note";
export type MemoryStatus = "pending" | "active" | "superseded" | "forgotten";
export type MemorySource = "agent" | "human";

export interface Memory {
  id: string;
  kind: MemoryKind;
  tags: string[];
  created: string; // ISO 8601
  status: MemoryStatus;
  supersedes?: string;
  source: MemorySource;
  content: string;
}

export interface RecallHit {
  id: string;
  content: string;
  kind: MemoryKind;
  tags: string[];
  created: string;
  score: number;
}

export interface MemoryStore {
  list(): Promise<Memory[]>;
  get(id: string): Promise<Memory | undefined>;
  search(query: string, limit: number): Promise<RecallHit[]>;
  create(memory: Memory): Promise<void>;
  supersede(id: string, replacement: Memory): Promise<void>;
  tombstone(id: string): Promise<void>;
  update(memory: Memory): Promise<void>;
  clear(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export type ActivityActor = "agent" | "human";

export interface ActivityEntry {
  id: string;
  actor: ActivityActor;
  text: string;
  at: string;
}

export const MEMORY_KINDS: MemoryKind[] = ["fact", "preference", "decision", "note"];

export function isMemoryKind(value: unknown): value is MemoryKind {
  return typeof value === "string" && (MEMORY_KINDS as string[]).includes(value);
}

/** Serialize a memory to Remnic's on-disk markdown shape. */
export function toMarkdown(m: Memory): string {
  const lines = [
    "---",
    `id: ${m.id}`,
    `kind: ${m.kind}`,
    `tags: [${m.tags.join(", ")}]`,
    `created: ${m.created}`,
    `status: ${m.status}`,
  ];
  if (m.supersedes) lines.push(`supersedes: ${m.supersedes}`);
  lines.push(`source: ${m.source}`, "---", "", m.content, "");
  return lines.join("\n");
}

/** Parse the same shape back. Returns undefined when frontmatter is missing or broken. */
export function fromMarkdown(text: string): Memory | undefined {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.trim());
  if (!match) return undefined;
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  if (!fields.id || !isMemoryKind(fields.kind)) return undefined;
  const status = fields.status as MemoryStatus;
  return {
    id: fields.id,
    kind: fields.kind,
    tags: fields.tags ? fields.tags.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean) : [],
    created: fields.created ?? new Date().toISOString(),
    status: ["pending", "active", "superseded", "forgotten"].includes(status) ? status : "active",
    supersedes: fields.supersedes || undefined,
    source: fields.source === "human" ? "human" : "agent",
    content: match[2].trim(),
  };
}
