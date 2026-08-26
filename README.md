# Remnic Canvas

Shared memory for you and your browser agent, on one web page.

Live demo: [remnic-canvas.pages.dev](https://remnic-canvas.pages.dev/?demo)
Video: [docs/assets/remnic-canvas-demo.mp4](docs/assets/remnic-canvas-demo.mp4) (YouTube link added at submission)

Browser agents forget everything between conversations. Their memory, where it exists at all, is invisible and locked to one vendor. Remnic Canvas fixes both problems with one page.

Open the canvas in ChatGPT's in-app browser or in Chrome with WebMCP enabled. The page registers five [WebMCP](https://github.com/webmachinelearning/webmcp) tools. Your agent can recall, remember, correct, and forget. You watch every memory land on a live canvas. Nothing is written until you approve it.

Close the conversation. Start a new one. The agent remembers, because the memory lives in the page, not in the model. Open the same canvas in a different vendor's agent and it recalls the same memories. One open web page, any agent, memory you own.

## How it works

The page calls `document.modelContext.registerTool()` five times. That is everything the agent can touch:

| Tool | What the agent can do | Your control |
| --- | --- | --- |
| `recall_memories` | Search memories by meaning | Read only |
| `remember` | Propose a new memory | You approve, edit, or reject the card |
| `correct_memory` | Propose a replacement for a stale memory | You approve; lineage stays visible |
| `forget_memory` | Ask to remove a memory | You confirm |
| `load_context` | Pull a working set of memories into its context | Read only, shown on the canvas |

Write tools wait for your decision. The tool call itself carries the handoff: the agent proposes, the card pulses on the canvas, you decide, and the agent gets your answer back as the tool result.

## Try it

1. Open the live demo in the ChatGPT desktop app's in-app browser (WebMCP works out of the box), or in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
2. Ask the agent to remember something. Approve the card when it pulses.
3. Start a new conversation on the same page. Ask what it knows.

## Where memories live

Three modes, no account in any of them:

1. **Your browser** (default). Memories persist in IndexedDB on your device. Nothing leaves your machine.
2. **A shared space.** One click creates a space with an unguessable link. Memories sync through a small Cloudflare Worker so a second device, or a second agent, can recall them. Spaces expire.
3. **Your own Remnic.** Point the canvas at a [Remnic](https://github.com/joshuaswarren/remnic) instance you run and the canvas becomes a live window into your real memory store.

Every mode speaks the same format: plain markdown files with YAML frontmatter, the same shape Remnic uses on disk. Export your canvas as `.md` files at any time and drop them into a Remnic store, or import from one.

## Why WebMCP

This app only works because the tools live in the page. The agent and the person share one live page: the agent writes through the same code path the buttons use, the person sees every action as it happens, and approval is enforced by the page, not promised by the model. A backend integration cannot do this. Screen-scraping cannot do it reliably.

## WebMCP Challenge entry

Remnic Canvas is an entry in the [OpenAI WebMCP Challenge](https://webmcp.devpost.com). All code in this repository was written during the submission window (August 25 to September 3, 2026). It builds on [Remnic](https://github.com/joshuaswarren/remnic), an open-source local-first memory project, as an external dependency: the canvas reads and writes Remnic's memory format and connects to its server API, and no Remnic code is copied here.

## Development

See [SPEC.md](SPEC.md) for the product spec, [DESIGN.md](DESIGN.md) for the visual language, and [AGENTS.md](AGENTS.md) for build rules.

## License

[MIT](LICENSE)
