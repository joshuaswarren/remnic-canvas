/**
 * Space sync worker: one KV key per space, whole-document read-modify-write.
 * A space is a private-by-obscurity shared memory set; possession of the id
 * is the credential, like a private paste. Caps keep the free tier safe.
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  SPACES: KVNamespace;
}

interface SpaceMemory {
  id: string;
  kind: string;
  tags: string[];
  created: string;
  status: string;
  supersedes?: string;
  source: string;
  content: string;
}

interface SpaceDoc {
  updated: string;
  memories: SpaceMemory[];
}

const MAX_MEMORIES = 200;
const MAX_MEMORY_BYTES = 10_240;
const TTL_SECONDS = 30 * 24 * 3600;
// ponytail: per-isolate best-effort creation limiter; a KV-backed counter would
// spend the daily write budget we are protecting.
let creationsThisIsolate = 0;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function isValidMemory(m: unknown): m is SpaceMemory {
  if (typeof m !== "object" || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.id.length <= 64 &&
    typeof r.content === "string" &&
    typeof r.created === "string" &&
    typeof r.status === "string" &&
    JSON.stringify(m).length <= MAX_MEMORY_BYTES
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (request.method === "POST" && url.pathname === "/spaces") {
      if (++creationsThisIsolate > 50) return json({ error: "slow down" }, 429);
      const spaceId = crypto.randomUUID().replaceAll("-", "");
      const doc: SpaceDoc = { updated: new Date().toISOString(), memories: [] };
      await env.SPACES.put(`space:${spaceId}`, JSON.stringify(doc), { expirationTtl: TTL_SECONDS });
      return json({ spaceId });
    }

    const spaceMatch = /^\/spaces\/([a-z0-9]{16,64})$/.exec(url.pathname);
    if (request.method === "GET" && spaceMatch) {
      const raw = await env.SPACES.get(`space:${spaceMatch[1]}`);
      if (!raw) return json({ error: "not_found" }, 404);
      return new Response(raw, { headers: { "Content-Type": "application/json", ...CORS } });
    }

    const memoryMatch = /^\/spaces\/([a-z0-9]{16,64})\/memories\/([A-Za-z0-9_-]{1,64})$/.exec(url.pathname);
    if (request.method === "PUT" && memoryMatch) {
      const [, spaceId, memoryId] = memoryMatch;
      const raw = await env.SPACES.get(`space:${spaceId}`);
      if (!raw) return json({ error: "not_found" }, 404);
      let incoming: unknown;
      try {
        incoming = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      if (!isValidMemory(incoming) || incoming.id !== memoryId) return json({ error: "invalid_memory" }, 400);
      const doc = JSON.parse(raw) as SpaceDoc;
      const idx = doc.memories.findIndex((m) => m.id === memoryId);
      if (idx >= 0) doc.memories[idx] = incoming;
      else if (doc.memories.length >= MAX_MEMORIES) return json({ error: "space_full" }, 409);
      else doc.memories.push(incoming);
      doc.updated = new Date().toISOString();
      await env.SPACES.put(`space:${spaceId}`, JSON.stringify(doc), { expirationTtl: TTL_SECONDS });
      return json({ ok: true, updated: doc.updated });
    }

    return json({ error: "not_found" }, 404);
  },
};
