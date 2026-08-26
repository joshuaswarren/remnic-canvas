import { useEffect, useMemo, useRef, useState } from "react";
import { ulid } from "ulid";
import { BrowserStore, SpaceStore } from "./store";
import { watchAndRegisterWebMcp, type Decision, type PendingApproval, type ToolEvent } from "./tools";
import { seedMemories } from "./seed";
import { exportZip, importFiles } from "./interchange";
import type { ActivityEntry, Memory } from "./types";

const params = new URLSearchParams(location.search);
const activeSpaceId = params.get("space");
const store = activeSpaceId ? new SpaceStore(activeSpaceId) : new BrowserStore();

async function shareToNewSpace(): Promise<void> {
  const spaceId = await SpaceStore.createSpace();
  const space = new SpaceStore(spaceId);
  for (const m of await store.list()) {
    if (m.status !== "forgotten") await space.create(m);
  }
  location.href = `${location.pathname}?space=${spaceId}`;
}

export default function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [pending, setPending] = useState<PendingApproval | undefined>();
  const [recalled, setRecalled] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [surface, setSurface] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | undefined>();
  const editRef = useRef<HTMLTextAreaElement>(null);
  const recallTimer = useRef<number | undefined>(undefined);
  const flags = useMemo(() => new URLSearchParams(location.search), []);
  const wantsDemo = flags.has("demo");
  const wantsReset = flags.has("reset");

  function log(actor: ActivityEntry["actor"], text: string) {
    setActivity((a) => [{ id: ulid(), actor, text, at: new Date().toISOString() }, ...a].slice(0, 50));
  }

  useEffect(() => {
    const refresh = () => void store.list().then(setMemories);
    const unsubscribe = store.subscribe(refresh);
    (async () => {
      if (wantsReset) await store.clear();
      if (wantsDemo && (await store.list()).filter((m) => m.status !== "forgotten").length === 0) {
        for (const m of seedMemories()) await store.create(m);
        log("human", "Seeded 10 demo memories");
      }
      refresh();
      watchAndRegisterWebMcp(
        {
          store,
          onEvent: (e: ToolEvent) => log(e.summary.startsWith("You ") ? "human" : "agent", e.summary),
          onPending: setPending,
          onRecall: (ids) => {
            setRecalled(ids);
            clearTimeout(recallTimer.current);
            recallTimer.current = window.setTimeout(() => setRecalled([]), 4000);
          },
        },
        (used) => {
          setSurface(used);
          log("agent", `Tools registered via ${used}`);
        },
      );
    })();
    return unsubscribe;
  }, [wantsDemo, wantsReset]);

  const [fanned, setFanned] = useState<string | undefined>();
  const [ghosts, setGhosts] = useState<Array<{ id: string; kind: string; content: string }>>([]);

  function decide(p: PendingApproval, decision: Decision) {
    setEditing(undefined);
    if (p.action === "forget" && decision.status === "approved") {
      const m = memories.find((x) => x.id === p.memoryId);
      if (m) {
        setGhosts((g) => [...g, { id: m.id, kind: m.kind, content: m.content }]);
        window.setTimeout(() => setGhosts((g) => g.filter((x) => x.id !== m.id)), 700);
      }
    }
    p.resolve(decision);
  }

  function lineageOf(m: Memory): Memory[] {
    const chain: Memory[] = [];
    let cursor = m.supersedes ? byId.get(m.supersedes) : undefined;
    while (cursor && chain.length < 10) {
      chain.push(cursor);
      cursor = cursor.supersedes ? byId.get(cursor.supersedes) : undefined;
    }
    return chain;
  }

  const pendingMemory = pending && memories.find((m) => m.id === pending.memoryId);
  const kept = memories.filter((m) => m.status !== "forgotten" && m.status !== "superseded");
  const visible = [...kept.filter((m) => m.status === "pending"), ...kept.filter((m) => m.status !== "pending")];
  const byId = new Map(memories.map((m) => [m.id, m]));

  return (
    <>
      <main className="canvas">
        <header className="canvas-header">
          <h1>Remnic Canvas</h1>
          <p>
            Shared memory for you and your browser agent. Ask your agent to recall, remember, correct, or forget;
            every change lands here first, and nothing is kept without you.
          </p>
        </header>
        {visible.length === 0 ? (
          <div className="empty">
            <p>Nothing remembered yet. Ask your agent to remember something, or start from the demo set.</p>
            <button
              onClick={async () => {
                for (const m of seedMemories()) await store.create(m);
                log("human", "Seeded 10 demo memories");
              }}
            >
              Seed demo memories
            </button>
          </div>
        ) : (
          <div className={`cards${recalled.length > 0 ? " recall-active" : ""}`}>
            {visible.map((m) => {
              const isPending = pending?.memoryId === m.id;
              const classes = [
                "card",
                m.status === "pending" || isPending ? "pending" : "",
                recalled.includes(m.id) ? "recalled" : "",
                m.status === "superseded" ? "superseded" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <article key={m.id} className={classes}>
                  <div className="meta">
                    <span>{m.kind}</span>
                    <span>{new Date(m.created).toLocaleDateString()}</span>
                    {m.status === "superseded" && <span>superseded</span>}
                  </div>
                  {isPending && editing === m.id ? (
                    <textarea ref={editRef} defaultValue={m.content} aria-label="Edit memory before approving" />
                  ) : (
                    <div className="content">{m.content}</div>
                  )}
                  {m.tags.length > 0 && (
                    <div className="tags">
                      {m.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.supersedes && (
                    <div className="lineage">
                      <button className="lineage-toggle" onClick={() => setFanned(fanned === m.id ? undefined : m.id)}>
                        {fanned === m.id ? "hide history" : `history (${lineageOf(m).length})`}
                      </button>
                      {fanned === m.id &&
                        lineageOf(m).map((old) => (
                          <div key={old.id} className="history-card">
                            <span className="history-date">{new Date(old.created).toLocaleDateString()}</span>
                            {old.content || "(cleared)"}
                          </div>
                        ))}
                    </div>
                  )}
                  {isPending && pending && (
                    <div className="approve-bar" role="group" aria-label="Approve or reject this memory">
                      {pending.action === "forget" ? (
                        <>
                          <button className="approve" onClick={() => decide(pending, { status: "approved", content: m.content })}>
                            Forget it
                          </button>
                          <button className="reject" onClick={() => decide(pending, { status: "rejected" })}>
                            Keep it
                          </button>
                        </>
                      ) : editing === m.id ? (
                        <>
                          <button
                            className="approve"
                            onClick={() => decide(pending, { status: "approved", content: editRef.current?.value.trim() || m.content })}
                          >
                            Approve edit
                          </button>
                          <button className="reject" onClick={() => setEditing(undefined)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="approve" onClick={() => decide(pending, { status: "approved", content: m.content })}>
                            Approve
                          </button>
                          <button className="edit" onClick={() => setEditing(m.id)}>
                            Edit
                          </button>
                          <button className="reject" onClick={() => decide(pending, { status: "rejected" })}>
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {ghosts.map((g) => (
              <article key={`ghost-${g.id}`} className="card dissolve" aria-hidden="true">
                <div className="meta">
                  <span>{g.kind}</span>
                  <span>forgotten</span>
                </div>
                <div className="content">{g.content}</div>
              </article>
            ))}
          </div>
        )}
        <div className="statusline">
          <span className={`dot${surface ? " on" : ""}`} />
          {surface
            ? `Agent tools live (${surface})`
            : "Waiting for an agent browser; tools register the moment one attaches"}
          {pendingMemory && <strong>Waiting for you</strong>}
          <button
            onClick={async () => {
              const url = URL.createObjectURL(exportZip(await store.list()));
              const a = Object.assign(document.createElement("a"), { href: url, download: "remnic-canvas-memories.zip" });
              a.click();
              URL.revokeObjectURL(url);
              log("human", "Exported memories as Remnic markdown");
            }}
          >
            Export
          </button>
          <label className="import-label">
            Import
            <input
              type="file"
              accept=".md,.zip"
              multiple
              hidden
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                const { imported, skipped } = await importFiles(store, e.target.files);
                log("human", `Imported ${imported} memories${skipped ? `, skipped ${skipped}` : ""}`);
                e.target.value = "";
              }}
            />
          </label>
          {activeSpaceId ? (
            <>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(location.href);
                  log("human", "Copied the space link");
                }}
              >
                Copy space link
              </button>
              <a href={location.pathname}>Leave space</a>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  shareToNewSpace().catch(() => log("human", "Could not create a space; sync service unreachable"))
                }
              >
                Share with another agent
              </button>
              <button
                onClick={async () => {
                  await store.clear();
                  log("human", "Cleared all memories");
                }}
              >
                Reset
              </button>
            </>
          )}
        </div>
      </main>
      <aside className="rail" aria-label="Agent activity">
        <h2>Activity</h2>
        {activity.length === 0 && <div className="entry human">Quiet so far. Talk to your agent.</div>}
        {activity.map((e) => (
          <div key={e.id} className={`entry ${e.actor}`}>
            {e.text}
            <time>{new Date(e.at).toLocaleTimeString()}</time>
          </div>
        ))}
      </aside>
    </>
  );
}
