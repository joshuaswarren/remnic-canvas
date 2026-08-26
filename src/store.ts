import { openDB, type IDBPDatabase } from "idb";
import MiniSearch from "minisearch";
import type { Memory, MemoryStore, RecallHit } from "./types";

const STORE = "memories";

export const SPACE_API = "https://remnic-canvas-space.joshua-s-warren.workers.dev";

/**
 * Shared in-memory cache + MiniSearch index over a persistence backend.
 * Rebuilt on load; fine below a few thousand memories.
 */
abstract class IndexedMemoryStore implements MemoryStore {
  private index: MiniSearch<Memory>;
  private listeners = new Set<() => void>();
  protected cache = new Map<string, Memory>();
  protected ready!: Promise<void>;

  constructor() {
    this.index = new MiniSearch<Memory>({
      fields: ["content", "tags", "kind"],
      storeFields: [],
      extractField: (doc, field) => {
        const value = doc[field as keyof Memory];
        return Array.isArray(value) ? value.join(" ") : String(value ?? "");
      },
      searchOptions: { boost: { content: 2 }, fuzzy: 0.2, prefix: true },
    });
  }

  /** Subclasses call this once their persistence fields are initialized. */
  protected init(): void {
    this.ready = this.loadAll().then((all) => this.replaceCache(all));
  }

  protected abstract loadAll(): Promise<Memory[]>;
  protected abstract persist(memory: Memory): Promise<void>;
  protected abstract wipe(): Promise<void>;

  protected replaceCache(all: Memory[]): void {
    this.cache.clear();
    this.index.removeAll();
    for (const m of all) {
      this.cache.set(m.id, m);
      if (m.status === "active") this.index.add(m);
    }
    this.notify();
  }

  protected notify(): void {
    for (const l of this.listeners) l();
  }

  private async put(m: Memory): Promise<void> {
    await this.persist(m);
    if (this.index.has(m.id)) this.index.discard(m.id);
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
    await this.wipe();
    this.cache.clear();
    this.index.removeAll();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class BrowserStore extends IndexedMemoryStore {
  private db: Promise<IDBPDatabase>;

  constructor(dbName = "remnic-canvas") {
    super();
    this.db = openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "id" });
      },
    });
    this.init();
  }

  protected async loadAll(): Promise<Memory[]> {
    return (await this.db).getAll(STORE);
  }

  protected async persist(memory: Memory): Promise<void> {
    await (await this.db).put(STORE, memory);
  }

  protected async wipe(): Promise<void> {
    await (await this.db).clear(STORE);
  }
}

/** Memory set synced through the space worker; possession of the URL is the credential. */
export class SpaceStore extends IndexedMemoryStore {
  private pollTimer: number | undefined;
  private lastUpdated = "";

  constructor(private spaceId: string) {
    super();
    this.init();
    const poll = () => void this.refresh();
    this.pollTimer = window.setInterval(() => {
      if (!document.hidden) poll();
    }, 5000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) poll();
    });
  }

  static async createSpace(): Promise<string> {
    const res = await fetch(`${SPACE_API}/spaces`, { method: "POST" });
    if (!res.ok) throw new Error("space_create_failed");
    const body = (await res.json()) as { spaceId: string };
    return body.spaceId;
  }

  private async fetchDoc(): Promise<{ updated: string; memories: Memory[] } | undefined> {
    const res = await fetch(`${SPACE_API}/spaces/${this.spaceId}`);
    if (!res.ok) return undefined;
    return (await res.json()) as { updated: string; memories: Memory[] };
  }

  private async refresh(): Promise<void> {
    const doc = await this.fetchDoc();
    if (doc && doc.updated !== this.lastUpdated) {
      this.lastUpdated = doc.updated;
      this.replaceCache(doc.memories);
    }
  }

  protected async loadAll(): Promise<Memory[]> {
    const doc = await this.fetchDoc();
    this.lastUpdated = doc?.updated ?? "";
    return doc?.memories ?? [];
  }

  protected async persist(memory: Memory): Promise<void> {
    const res = await fetch(`${SPACE_API}/spaces/${this.spaceId}/memories/${memory.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memory),
    });
    if (!res.ok) throw new Error("store_unavailable");
  }

  protected async wipe(): Promise<void> {
    // Spaces expire on their own (30-day TTL); leaving the space is the reset.
    window.clearInterval(this.pollTimer);
  }
}
