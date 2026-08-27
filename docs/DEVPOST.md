# Devpost submission text

Demo video: https://youtu.be/KsNA9drjKsc

## Inspiration

Current browser agents lack persistence between conversations. When memory exists, it remains invisible to the user, uneditable, and owned by the vendor. Since I build Remnic, an open-source memory store, I wanted to provide the missing component: memory that resides in the open web and remains visible to the person it describes.

## What it does

Remnic Canvas functions as a single web page serving as shared memory for you and your browser agent. The page registers five WebMCP tools: recall_memories, remember, correct_memory, forget_memory, and load_context. Your agent recalls facts, proposes new memories, corrects stale ones, and asks to forget. Every proposal lands on the canvas as a pulsing card. You approve, edit, or reject it, and the agent receives your decision as the result of its own tool call.

Close the conversation and start a new one: the agent still remembers, because the memory lives in the page. Click "Share with another agent" and open the link in a different agent browser: same memories. Export everything as plain markdown files that drop straight into a Remnic store.

## Why this is a strong fit for WebMCP

Memory is a trust problem, and trust needs a shared surface. A backend integration would move memory to a server the user never sees. Screen-scraping cannot guarantee an approval gate. With WebMCP, the tools run in the page itself: the agent writes through the same code path the buttons use, the approval gate is enforced by page code the model cannot bypass, and the human watches every change land in real time. The write tools do not resolve until the human decides. That handoff, a tool call that carries a human decision back to the agent, only works when the tool and the UI share one live page.

## What people and agents can do together now

1. A person can watch, in real time, what an agent wants to remember about them, and edit the words before they are kept.
2. An agent can carry context across conversations, and across vendors, through one open web page with no account.
3. A person can hand curated context to any agent: open the canvas, and the agent loads exactly the working set the person approved, nothing more.

## How I built it

Vite, React, and TypeScript on Cloudflare Pages. Tools register through document.modelContext.registerTool with JSON schemas; write tools await a promise the approval UI resolves. Memories are markdown files with YAML frontmatter, Remnic's on-disk format, stored in IndexedDB by default. Shared spaces sync through a small Cloudflare Worker with Workers KV. Corrections keep visible lineage; forgotten memories are tombstoned, not silently erased.

## What's next

A direct connection to a running Remnic instance, so the canvas becomes the visible front end of a full local-first memory store shared by every agent a person uses.
