# Remnic Canvas product spec

One page. A human and a browser agent share one memory store, live. The agent works through five WebMCP tools; the human sees, approves, edits, and owns everything.

## Users and the two flows that matter

1. The judge flow (primary). A judge opens the live URL in ChatGPT's in-app browser. Seeded demo memories are already on the canvas. They ask the agent to recall something, and it works. They ask it to remember something; a card pulses and they approve it. They start a new conversation, and it still remembers. They can open the same space link in Chrome, and it remembers there too. Under three minutes, zero setup.
2. The owner flow. A real user keeps the canvas as their agent-memory home page. Memories stay browser-local by default. A space adds sync when they want portability. Their own Remnic instance takes over when they run one.

## Architecture

```
Cloudflare Pages (static, free)
┌───────────────────────────────────────────┐
│ Canvas app (Vite + React + TS)            │
│                                           │
│  WebMCP layer: 5 tools                    │
│        │                                  │
│  MemoryStore interface                    │
│   ├─ BrowserStore   (IndexedDB, default)  │
│   ├─ SpaceStore    (sync Worker + KV)     │
│   └─ RemnicStore    (user's own server)   │
└───────────────────────────────────────────┘
Cloudflare Worker + Workers KV (free) ← SpaceStore only
```

Hosting cost is zero. Pages free tier serves unlimited static requests. Workers free tier allows 100k requests/day and Workers KV's free tier allows 100k reads and 1k writes per day, comfortably beyond judging traffic (a space write only happens on memory approval). No other infrastructure exists. R2 and D1 are deliberately not used.

## Memory model

A memory is a markdown document with YAML frontmatter, the same shape Remnic stores on disk. Canonical fields:

```yaml
---
id: mem_01J...            # ULID
kind: fact | preference | decision | note
tags: []
created: 2026-08-27T14:03:00Z
status: pending | active | superseded | forgotten
supersedes: mem_...        # present on corrections
source: agent | human
---
The user prefers window seats on flights under four hours.
```

Rules:

- `pending` memories are visible on the canvas but excluded from `recall_memories` and `load_context` results.
- A correction creates a new memory with `supersedes` set; the old one flips to `superseded`. Superseded memories never return from recall, but their lineage is visible in the UI.
- `forgotten` memories are tombstoned (content cleared, id retained) so the agent can be told "that was forgotten" rather than silently losing it.
- Export produces one `.md` file per memory, zipped. Import accepts the same. This is the Remnic interchange path and must round-trip.

## WebMCP tool contracts

Register all five on page load via `document.modelContext.registerTool(...)`. Feature-detect in this order: `document.modelContext`, `navigator.modelContext`, `@mcp-b` polyfill. Tool descriptions are part of the product: write them for an agent that has never seen the app, and state the approval behavior explicitly in the description of every write tool.

### recall_memories

```json
{ "query": "string", "limit": "number (default 8, max 25)" }
```

Returns `{ memories: [{ id, content, kind, tags, created, score }] }` ranked by MiniSearch across content and tags. Empty result returns `{ memories: [], hint: "No stored memories match. Ask the user, then remember the answer." }`. Canvas behavior: matching cards glow and the camera eases to frame them.

### remember

```json
{ "content": "string (1..2000 chars)", "kind": "fact|preference|decision|note", "tags": "string[] (optional)" }
```

Creates a `pending` card and awaits the human decision. Resolves with one of:

- `{ status: "approved", id, content }` (content may differ if the human edited)
- `{ status: "rejected", reason?: string }`
- `{ status: "pending", hint }` after 55 s; the card stays live on the canvas and a later human decision still applies to the store. Agent runtimes with tool-call time limits get a valid response instead of a hang.

### correct_memory

```json
{ "id": "string", "replacement": "string (1..2000 chars)" }
```

Same await-approval semantics as `remember`. On approval the store writes the replacement with `supersedes: <id>` and the canvas animates the lineage (old card folds behind the new one, thread drawn between them).

### forget_memory

```json
{ "id": "string", "reason": "string (optional)" }
```

Requires explicit human confirmation (no edit option). Resolves `{ status: "forgotten" | "declined" | "pending" }` with the same soft-pending semantics as `remember`.

### load_context

```json
{ "topic": "string (optional)" }
```

Returns `{ context: "markdown digest", count }`: the top active memories (all, or ranked by topic), formatted as a compact markdown list the agent can carry into its next task. Canvas behavior: included cards stack briefly into a "handed to agent" pile animation, then return.

Error shape for all tools: `{ error: { code: "not_found" | "invalid_input" | "store_unavailable", message } }`. Never throw raw exceptions across the tool boundary.

## Storage adapters

`MemoryStore` interface: `list()`, `get(id)`, `search(query, limit)`, `create(memory)`, `supersede(id, replacement)`, `tombstone(id)`, `subscribe(listener)`, `exportZip()`, `importFiles(files)`.

### BrowserStore (default)

IndexedDB via `idb`. MiniSearch index rebuilt in memory on load (fine below a few thousand memories). Persists across ChatGPT in-app browser conversations on the same device; verify this on day 1 and note the result here.

### SpaceStore

Backed by the sync Worker. A space is created client-side as a 26-char ULID + random suffix; possession of the URL is the only credential, like a private paste. The canvas polls or uses SSE for near-live updates (pick the simpler; polling every 3 s is acceptable).

Worker routes:

- `POST /spaces` → `{ spaceId }` (creates; rate-limited by IP)
- `GET /spaces/:id` → full memory list (JSON array of the frontmatter+content records)
- `PUT /spaces/:id/memories/:memId` → upsert one memory record

Polling: 5 s interval, paused when the tab is hidden. That keeps a full day of an open judge tab around 17k KV reads, well inside the free tier.

KV layout: one key per space, `space:<id>`, holding the full JSON array of memory records plus a `updated` stamp (a space is capped small, so read-modify-write of one value is fine; last-writer-wins is acceptable at this scale). Caps enforced in the Worker: 200 memories per space, 10 KB per memory, spaces expire via KV TTL refreshed to 30 days on each write. No auth, no PII, no logging beyond Cloudflare defaults.

`?space=<id>` in the canvas URL selects SpaceStore. This parameter is how the demo video moves one memory set between ChatGPT and Chrome.

### RemnicStore

Connect panel accepts a base URL for a running Remnic server ([github.com/joshuaswarren/remnic](https://github.com/joshuaswarren/remnic), default local port 4318). Implementation task: read the remnic repo's server package to confirm the current HTTP/MCP surface and map the adapter onto it; do not invent endpoints. If the live surface cannot support an operation (for example tombstoning), grey out that action in Remnic mode and say so in the connect panel. Mixed-content note: browsers treat `http://localhost` as a secure-context exception, so a https-hosted canvas can usually reach a local daemon; document what actually works after testing, including any CORS header the daemon needs.

RemnicStore is a stretch goal behind spaces. The `.md` export/import path is the guaranteed Remnic interoperability story and ships regardless.

## UI requirements

States that must exist and look intentional (DESIGN.md governs appearance):

1. Empty canvas with a short invitation and, in demo mode, a "seed demo memories" action.
2. Active canvas: cards clustered by kind/tags, gentle idle drift.
3. Pending approval: card pulses; inline Approve / Edit / Reject on the card, keyboard accessible.
4. Recall highlight: matched cards glow, others dim, camera frames the result.
5. Supersession lineage: tap a corrected card to see its history thread.
6. Agent activity rail: a compact right-side feed of tool calls as they happen ("Agent recalled 3 memories about travel"), so a watcher can narrate the collaboration.
7. Connect panel: mode switcher (browser / space / Remnic), export, import, space link copy.
8. No-WebMCP fallback: a normal browser sees the canvas plus a banner explaining how to open it in an agent browser. The page must never look broken.

Demo support: `?demo` seeds a fixed set of ~10 fictional memories (a trip-planning persona: preferences, dates, one deliberately stale fact for the correction beat) and `?reset` clears the store. Seed content lives in one file and contains no real names or personal data.

## Compatibility note (verified 2026-08-27)

Chrome 151 (`151.0.7922.174` on macOS), `chrome://flags/#enable-webmcp-testing` enabled: `document.modelContext` and `navigator.modelContext` both exist natively, `registerTool` is a function, `provideContext` is not. All five tools register and the page reports `Agent tools live (document.modelContext.registerTool)`. The official Chrome Web Store **WebMCP - Model Context Tool Inspector** v1.9.13 discovered all five tools. Through the Inspector (not the demo driver), `recall_memories({"query":"Lisbon trip dates","limit":5})` returned the correct ranked JSON with "The Lisbon trip runs October 17 to October 24." first. The Inspector then invoked `remember` with "The rooftop bar closes at midnight."; the real page displayed the pending approval card, human approval applied it to the store, the activity rail recorded proposal and approval, and the Inspector received `{"status":"approved",...}`. WebMCP requires an origin-isolated document, so the site must send `Origin-Agent-Cluster: ?1` (served from `public/_headers`; `window.originAgentCluster === true` confirmed). The `tools` permissions policy defaults to `self`, which suits a top-level page.

ChatGPT desktop app 26.818.61809 (macOS), model GPT-5.6 Sol: the first tests were invalid because Settings > Browser > "Web URL and link open destination" was set to `Default browser`; HTTPS URLs opened Helium/connected Chrome instead of ChatGPT's built-in browser. On 2026-08-27 that setting was changed temporarily to `ChatGPT`, the agent explicitly reported "I'm using the ChatGPT built-in browser", loaded the production demo, and waited. The page still reported `Waiting for an agent browser; tools register the moment one attaches`, and the agent reported `Tools were not live, so I did not call recall_memories`. The original `Default browser` setting was then restored. A separate control on `learn.chatgpt.com` advertised five site tools but the same session received no callable site tools, and Settings > Browser > Permissions has no "Enable site tools" toggle. Conclusion: the correct built-in-browser surface is still rollout-gated for this session/account; the production page itself passes native Chrome 151 WebMCP registration. GPT-5.6 Luna has WebMCP disabled per OpenAI's docs; use Sol or Terra.

IndexedDB persisted across a full page reload in headless Chromium (11 cards after reload). Persistence across separate ChatGPT conversations on one device is expected but was not observable while the session lacked site tools; shared spaces cover the cross-conversation demo beat regardless.

## Non-goals

Multi-user editing, accounts, mobile apps, embeddings or vector search, server-side rendering, offline service workers, agent-to-agent messaging, more than five tools.
