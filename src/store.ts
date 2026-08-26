import { openDB, type IDBPDatabase } from "idb";
import MiniSearch from "minisearch";
import type { Memory, MemoryStore, RecallHit } from "./types";

const STORE = "memories";

/**
 * BrowserStore: IndexedDB persistence with an in-memory MiniSearch index,
 * rebuilt on load. Fine below a few thousand memories.
 */
export class BrowserStore implements MemoryStore {
  private db: Promise<IDBPDatabase>;
  private index: MiniSearch<Memory>;
  private listeners = new Set<() => void>();
  private cache = new Map<string, Memory>();
  private ready: Promise<void>;

  constructor(dbName = "remnic-canvas") {
    this.db = openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "id" });
      },
    });
    this.index = new MiniSearch<Memory>({
      fields: ["content", "tags", "kind"],
      storeFields: [],
      extractField: (doc, field) => {
        const value = doc[field as keyof Memory];
        return Array.isArray(value) ? value.join(" ") : String(value ?? "");
      },
      searchOptions: { boost: { content: 2 }, fuzzy: 0.2, prefix: true },
    });
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const db = await this.db;
    const all: Memory[] = await db.getAll(STORE);
    for (const m of all) {
      this.cache.set(m.id, m);
      if (m.status === "active") this.index.add(m);
    }
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private async put(m: Memory): Promise<void> {
    const db = await this.db;
    await db.put(STORE, m);
    const prev = this.cache.get(m.id);
    if (prev && this.index.has(m.id)) this.index.discard(m.id);
    this.cache.set(m.id, m);
    if (m.status === "active") this.index.add(m);
    this.notify();
  }

  async list(): Promise<Memory[]> {
    await this.ready;
    return [...this.cache.values()].sort((a, b) => a.created.localeCompare(b.created));
  }

  async get(id: string): Promise<Memory | undefined> {
    await this.ready;
    return this.cache.get(id);
  }

  async search(query: string, limit: number): Promise<RecallHit[]> {
    await this.ready;
    return this.index
      .search(query)
      .slice(0, limit)
      .map((r) => {
        const m = this.cache.get(String(r.id))!;
        return { id: m.id, content: m.content, kind: m.kind, tags: m.tags, created: m.created, score: r.score };
      });
  }

  async create(memory: Memory): Promise<void> {
    await this.ready;
    await this.put(memory);
  }

  async update(memory: Memory): Promise<void> {
    await this.ready;
    await this.put(memory);
  }

  async supersede(id: string, replacement: Memory): Promise<void> {
    await this.ready;
    const old = this.cache.get(id);
    if (!old) throw new Error("not_found");
    await this.put({ ...old, status: "superseded" });
    await this.put({ ...replacement, supersedes: id });
  }

  async tombstone(id: string): Promise<void> {
    await this.ready;
    const old = this.cache.get(id);
    if (!old) throw new Error("not_found");
    await this.put({ ...old, status: "forgotten", content: "" });
  }

  async clear(): Promise<void> {
    await this.ready;
    const db = await this.db;
    await db.clear(STORE);
    this.cache.clear();
    this.index.removeAll();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
