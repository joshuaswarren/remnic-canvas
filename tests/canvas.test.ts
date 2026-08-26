import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BrowserStore } from "../src/store";
import { buildTools, type Decision, type PendingApproval, type ToolHost } from "../src/tools";
import { fromMarkdown, toMarkdown, type Memory } from "../src/types";
import { seedMemories } from "../src/seed";

let dbCounter = 0;

function makeHost(decider?: (p: PendingApproval) => Decision) {
  const store = new BrowserStore(`test-db-${++dbCounter}`);
  const events: string[] = [];
  const recalls: string[][] = [];
  const host: ToolHost = {
    store,
    onEvent: (e) => events.push(e.summary),
    onRecall: (ids) => recalls.push(ids),
    onPending: (p) => {
      if (p && decider) p.resolve(decider(p));
    },
  };
  return { host, store, events, recalls };
}

function findTool(host: ToolHost, name: string) {
  const tool = buildTools(host).find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} missing`);
  return tool;
}

describe("markdown round-trip (Remnic interchange)", () => {
  it("round-trips every seed memory", () => {
    for (const m of seedMemories()) {
      expect(fromMarkdown(toMarkdown(m))).toEqual(m);
    }
  });

  it("rejects text without frontmatter", () => {
    expect(fromMarkdown("just a paragraph")).toBeUndefined();
  });
});

describe("remember", () => {

  it("stores on approval, including human edits", async () => {
    const { host, store } = makeHost(() => ({ status: "approved", content: "edited text" }));
    const result = (await findTool(host, "remember").execute({ content: "original text", kind: "fact" })) as {
      status: string;
      id: string;
    };
    expect(result.status).toBe("approved");
    const saved = await store.get(result.id);
    expect(saved?.status).toBe("active");
    expect(saved?.content).toBe("edited text");
  });

  it("tombstones on rejection", async () => {
    const { host, store } = makeHost(() => ({ status: "rejected", reason: "too personal" }));
    const result = (await findTool(host, "remember").execute({ content: "secret" })) as { status: string; reason?: string };
    expect(result).toEqual({ status: "rejected", reason: "too personal" });
    const all = await store.list();
    expect(all[0]?.status).toBe("forgotten");
    expect(all[0]?.content).toBe("");
  });

  it("validates input", async () => {
    const { host } = makeHost();
    const result = (await findTool(host, "remember").execute({})) as { error?: { code: string } };
    expect(result.error?.code).toBe("invalid_input");
  });
});

describe("recall_memories and load_context", () => {

  it("recalls approved memories but never pending ones", async () => {
    const { host, store } = makeHost(() => ({ status: "approved", content: "The trip budget is 2,400 euros." }));
    await findTool(host, "remember").execute({ content: "The trip budget is 2,400 euros.", kind: "decision" });
    const pending: Memory = {
      id: "01PENDING",
      kind: "note",
      tags: [],
      created: new Date().toISOString(),
      status: "pending",
      source: "agent",
      content: "budget pending note",
    };
    await store.create(pending);
    const result = (await findTool(host, "recall_memories").execute({ query: "budget" })) as {
      memories: Array<{ id: string }>;
    };
    expect(result.memories.length).toBe(1);
    expect(result.memories[0].id).not.toBe("01PENDING");
  });

  it("returns a hint when nothing matches", async () => {
    const { host } = makeHost();
    const result = (await findTool(host, "recall_memories").execute({ query: "zebras" })) as { memories: unknown[]; hint?: string };
    expect(result.memories).toEqual([]);
    expect(result.hint).toContain("remember");
  });

  it("builds a digest of active memories", async () => {
    const { host, store } = makeHost();
    for (const m of seedMemories()) await store.create(m);
    const result = (await findTool(host, "load_context").execute({})) as { context: string; count: number };
    expect(result.count).toBe(10);
    expect(result.context).toContain("window seats");
  });
});

describe("correct_memory", () => {

  it("supersedes with visible lineage on approval", async () => {
    const { host, store } = makeHost((p) => ({
      status: "approved",
      content: p.action === "correct" ? "The hotel is booked for October 19." : "seed",
    }));
    const [stale] = seedMemories().filter((m) => m.content.includes("October 12"));
    await store.create(stale);
    const result = (await findTool(host, "correct_memory").execute({
      id: stale.id,
      replacement: "The hotel is booked for October 19.",
    })) as { status: string; id: string };
    expect(result.status).toBe("approved");
    expect((await store.get(stale.id))?.status).toBe("superseded");
    const replacement = await store.get(result.id);
    expect(replacement?.supersedes).toBe(stale.id);
    const hits = await store.search("hotel booked", 5);
    expect(hits.map((h) => h.id)).toEqual([result.id]);
  });

  it("returns not_found for unknown ids", async () => {
    const { host } = makeHost();
    const result = (await findTool(host, "correct_memory").execute({ id: "nope", replacement: "x" })) as {
      error?: { code: string };
    };
    expect(result.error?.code).toBe("not_found");
  });
});

describe("forget_memory", () => {

  it("tombstones only after confirmation and excludes from recall", async () => {
    const { host, store } = makeHost((p) => (p.action === "forget" ? { status: "approved", content: "" } : { status: "rejected" }));
    const [seed] = seedMemories();
    await store.create(seed);
    const result = (await findTool(host, "forget_memory").execute({ id: seed.id })) as { status: string };
    expect(result.status).toBe("forgotten");
    expect((await store.get(seed.id))?.content).toBe("");
    expect(await store.search("window seats", 5)).toEqual([]);
  });

  it("declines when the human keeps it", async () => {
    const { host, store } = makeHost(() => ({ status: "rejected" }));
    const [seed] = seedMemories();
    await store.create(seed);
    const result = (await findTool(host, "forget_memory").execute({ id: seed.id })) as { status: string };
    expect(result.status).toBe("declined");
    expect((await store.get(seed.id))?.status).toBe("active");
  });
});

describe("interchange", () => {
  it("export/import round-trips through the zip", async () => {
    const { exportZip, importFiles } = await import("../src/interchange");
    const seeds = seedMemories();
    const blob = exportZip(seeds);
    const file = new File([new Uint8Array(await blob.arrayBuffer())], "memories.zip");
    const target = new BrowserStore(`test-db-import-${Date.now()}`);
    const list = { length: 1, 0: file, item: () => file, [Symbol.iterator]: [file][Symbol.iterator].bind([file]) } as unknown as FileList;
    const { imported, skipped } = await importFiles(target, list);
    expect(imported).toBe(10);
    expect(skipped).toBe(0);
    expect((await target.list()).map((m) => m.content).sort()).toEqual(seeds.map((m) => m.content).sort());
  });
});

describe("soft pending timeout", () => {
  it("resolves pending at the deadline and still applies a late decision", async () => {
    const store = new BrowserStore(`test-db-late-${Date.now()}`);
    let captured: PendingApproval | undefined;
    const host: ToolHost = {
      store,
      approvalTimeoutMs: 40,
      onEvent: () => {},
      onRecall: () => {},
      onPending: (p) => {
        if (p) captured = p;
      },
    };
    const result = (await findTool(host, "remember").execute({ content: "slow human memory", kind: "note" })) as {
      status: string;
      hint?: string;
    };
    expect(result.status).toBe("pending");
    expect(result.hint).toContain("recall");
    expect(captured).toBeDefined();
    captured!.resolve({ status: "approved", content: "slow human memory" });
    await new Promise((r) => setTimeout(r, 20));
    const all = (await store.list()).filter((m) => m.status === "active");
    expect(all.map((m) => m.content)).toEqual(["slow human memory"]);
  });
});
