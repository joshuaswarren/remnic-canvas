import { ulid } from "ulid";
import type { Memory, MemoryStore } from "./types";
import { isMemoryKind } from "./types";

export const APPROVAL_TIMEOUT_MS = 55_000;

export type Decision =
  | { status: "approved"; content: string }
  | { status: "rejected"; reason?: string };

export interface PendingApproval {
  memoryId: string;
  /** "remember" proposes a new card; "correct" proposes a replacement of `supersedes`. */
  action: "remember" | "correct" | "forget";
  resolve: (d: Decision) => void;
}

export interface ToolEvent {
  tool: string;
  summary: string;
}

export interface ToolHost {
  store: MemoryStore;
  onEvent: (e: ToolEvent) => void;
  onPending: (p: PendingApproval | undefined) => void;
  onRecall: (ids: string[]) => void;
  /** Override for tests; production uses APPROVAL_TIMEOUT_MS. */
  approvalTimeoutMs?: number;
}

interface ToolError {
  error: { code: "not_found" | "invalid_input" | "store_unavailable"; message: string };
}

function invalid(message: string): ToolError {
  return { error: { code: "invalid_input", message } };
}

interface SettledOutcome {
  status: string;
  [key: string]: unknown;
}

/**
 * Ask the human. Resolves with the decision's outcome, or a soft "pending"
 * outcome at the deadline so agent runtimes with tool-call time limits get a
 * valid response. The approval card STAYS live after the soft resolution: a
 * later human decision still applies to the store through `apply`.
 */
function awaitDecision(
  host: ToolHost,
  memoryId: string,
  action: PendingApproval["action"],
  apply: (d: Decision) => Promise<SettledOutcome>,
): Promise<SettledOutcome> {
  const { promise, resolve } = Promise.withResolvers<SettledOutcome>();
  let settled = false;
  const settle = (o: SettledOutcome) => {
    if (!settled) {
      settled = true;
      resolve(o);
    }
  };
  const timer = setTimeout(() => {
    settle({
      status: "pending",
      hint: "The human has not decided yet. The card stays on the canvas; use recall_memories or load_context later to see the outcome.",
    });
  }, host.approvalTimeoutMs ?? APPROVAL_TIMEOUT_MS);
  host.onPending({
    memoryId,
    action,
    resolve: (d) => {
      clearTimeout(timer);
      host.onPending(undefined);
      void apply(d).then(settle);
    },
  });
  return promise;
}

export function buildTools(host: ToolHost) {
  const { store } = host;
  return [
    {
      name: "recall_memories",
      description:
        "Search the user's memories on this page by meaning. Read-only. Returns ranked matches; pending and superseded memories are excluded. If nothing matches, ask the user and then use remember.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look for, in natural language." },
          limit: { type: "number", description: "Max results, default 8, max 25." },
        },
        required: ["query"],
      },
      execute: async (input: Record<string, unknown>) => {
        const query = typeof input.query === "string" ? input.query.trim() : "";
        if (!query) return invalid("query is required");
        const limit = Math.min(Math.max(Number(input.limit) || 8, 1), 25);
        const memories = await store.search(query, limit);
        host.onRecall(memories.map((m) => m.id));
        host.onEvent({ tool: "recall_memories", summary: `Agent recalled ${memories.length} memories for "${query}"` });
        if (memories.length === 0) {
          return { memories: [], hint: "No stored memories match. Ask the user, then remember the answer." };
        }
        return { memories };
      },
    },
    {
      name: "remember",
      description:
        "Propose a new memory. The card appears on the canvas and WAITS for the human to approve, edit, or reject it; this call resolves with their decision, or with status pending if the human has not decided within about a minute (the card stays on the canvas). Only store durable facts, preferences, decisions, or notes the user would want kept.",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "The memory text, 1 to 2000 characters." },
          kind: { type: "string", enum: ["fact", "preference", "decision", "note"] },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["content"],
      },
      execute: async (input: Record<string, unknown>) => {
        const content = typeof input.content === "string" ? input.content.trim() : "";
        if (!content || content.length > 2000) return invalid("content must be 1..2000 characters");
        const memory: Memory = {
          id: ulid(),
          kind: isMemoryKind(input.kind) ? input.kind : "note",
          tags: Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === "string") : [],
          created: new Date().toISOString(),
          status: "pending",
          source: "agent",
          content,
        };
        await store.create(memory);
        host.onEvent({ tool: "remember", summary: "Agent proposed a memory, waiting for you" });
        return awaitDecision(host, memory.id, "remember", async (decision) => {
          if (decision.status === "approved") {
            await store.update({ ...memory, status: "active", content: decision.content });
            host.onEvent({ tool: "remember", summary: "You approved the memory" });
            return { status: "approved", id: memory.id, content: decision.content };
          }
          await store.tombstone(memory.id);
          host.onEvent({ tool: "remember", summary: "You rejected the memory" });
          return { status: "rejected", ...(decision.reason ? { reason: decision.reason } : {}) };
        });
      },
    },
    {
      name: "correct_memory",
      description:
        "Propose a replacement for a stale or wrong memory by id. The human approves or rejects; on approval the old memory is superseded and stays visible in the card's history. Resolves with the decision.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Id of the memory to correct." },
          replacement: { type: "string", description: "Corrected text, 1 to 2000 characters." },
        },
        required: ["id", "replacement"],
      },
      execute: async (input: Record<string, unknown>) => {
        const id = typeof input.id === "string" ? input.id : "";
        const replacement = typeof input.replacement === "string" ? input.replacement.trim() : "";
        if (!replacement || replacement.length > 2000) return invalid("replacement must be 1..2000 characters");
        const old = await store.get(id);
        if (!old || old.status !== "active") return { error: { code: "not_found", message: "no active memory with that id" } };
        const proposal: Memory = {
          id: ulid(),
          kind: old.kind,
          tags: old.tags,
          created: new Date().toISOString(),
          status: "pending",
          supersedes: old.id,
          source: "agent",
          content: replacement,
        };
        await store.create(proposal);
        host.onEvent({ tool: "correct_memory", summary: "Agent proposed a correction, waiting for you" });
        return awaitDecision(host, proposal.id, "correct", async (decision) => {
          if (decision.status === "approved") {
            await store.supersede(old.id, { ...proposal, status: "active", content: decision.content });
            host.onEvent({ tool: "correct_memory", summary: "You approved the correction" });
            return { status: "approved", id: proposal.id, content: decision.content };
          }
          await store.tombstone(proposal.id);
          host.onEvent({ tool: "correct_memory", summary: "You rejected the correction" });
          return { status: "rejected", ...(decision.reason ? { reason: decision.reason } : {}) };
        });
      },
    },
    {
      name: "forget_memory",
      description:
        "Ask to remove a memory by id. The human must confirm; the memory is tombstoned (its text is cleared, the id is kept). Resolves with forgotten or declined, or pending when the human has not decided yet.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["id"],
      },
      execute: async (input: Record<string, unknown>) => {
        const id = typeof input.id === "string" ? input.id : "";
        const old = await store.get(id);
        if (!old || old.status !== "active") return { error: { code: "not_found", message: "no active memory with that id" } };
        host.onEvent({ tool: "forget_memory", summary: "Agent asked to forget a memory, waiting for you" });
        return awaitDecision(host, id, "forget", async (decision) => {
          if (decision.status === "approved") {
            await store.tombstone(id);
            host.onEvent({ tool: "forget_memory", summary: "You confirmed: memory forgotten" });
            return { status: "forgotten" };
          }
          host.onEvent({ tool: "forget_memory", summary: "You declined the forget request" });
          return { status: "declined" };
        });
      },
    },
    {
      name: "load_context",
      description:
        "Pull a compact markdown digest of the user's active memories into your context, optionally focused on a topic. Read-only. Use this at the start of a task to know what is already established.",
      inputSchema: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Optional topic to focus the digest." },
        },
      },
      execute: async (input: Record<string, unknown>) => {
        const topic = typeof input.topic === "string" ? input.topic.trim() : "";
        const active = topic
          ? await store.search(topic, 25)
          : (await store.list()).filter((m) => m.status === "active").map((m) => ({ ...m, score: 0 }));
        host.onRecall(active.map((m) => m.id));
        const lines = active.map((m) => `- (${m.kind}) ${m.content}`);
        host.onEvent({ tool: "load_context", summary: `Agent took ${active.length} memories into context` });
        return { context: lines.join("\n"), count: active.length };
      },
    },
  ];
}

/**
 * Register the tools against whichever WebMCP surface the browser exposes.
 * Returns the name of the surface used, or undefined when none exists.
 */
export async function registerWebMcp(host: ToolHost): Promise<string | undefined> {
  const ctx = document.modelContext ?? navigator.modelContext;
  if (!ctx) return undefined;
  const tools = buildTools(host);
  if (typeof ctx.registerTool === "function") {
    for (const tool of tools) await ctx.registerTool(tool);
    return document.modelContext ? "document.modelContext.registerTool" : "navigator.modelContext.registerTool";
  }
  if (typeof ctx.provideContext === "function") {
    await ctx.provideContext({ tools });
    return document.modelContext ? "document.modelContext.provideContext" : "navigator.modelContext.provideContext";
  }
  return undefined;
}

/**
 * Some agent browsers inject the WebMCP API only when an agent session
 * attaches to the tab, which can happen long after page load. Watch for the
 * API and register the moment it appears; report each attempt's outcome so
 * the UI can narrate it.
 */
export function watchAndRegisterWebMcp(host: ToolHost, onRegistered: (surface: string) => void): void {
  let done = false;
  const attempt = () => {
    if (done) return;
    void registerWebMcp(host).then((surface) => {
      if (surface && !done) {
        done = true;
        window.clearInterval(timer);
        onRegistered(surface);
      }
    });
  };
  const timer = window.setInterval(attempt, 1000);
  attempt();
}
