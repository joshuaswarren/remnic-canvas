# Devpost submission package

Copy each value into the matching Devpost field.

## Project name

```text
Remnic Canvas
```

## Elevator pitch

```text
A visible memory page for you and every AI agent. Agents recall, propose, correct, and forget through native WebMCP tools while you approve every change.
```

Character count: 153 of 200.

## Thumbnail

Upload: `docs/assets/devpost/thumbnail.png`

Size: 1800 x 1200 (3:2), 486 KB.

## About the project

Paste the full contents of [`docs/devpost-about.md`](devpost-about.md).

It includes the required Inspiration, What it does, How I built it, Challenges, What I learned, and challenge-period work sections.

## Built with

Add these tags:

1. WebMCP
2. TypeScript
3. React
4. Vite
5. IndexedDB
6. MiniSearch
7. Cloudflare Pages
8. Cloudflare Workers
9. Workers KV
10. HTML
11. CSS
12. Vitest
13. Google Chrome
14. Remnic
15. OpenAI Codex
16. ElevenLabs
17. ffmpeg
18. GitHub

## Try it out links

Add all three:

1. Live demo: https://remnic-canvas.pages.dev/?demo
2. Public source: https://github.com/joshuaswarren/remnic-canvas
3. Video: https://youtu.be/KsNA9drjKsc

## Project media

Upload in this order:

1. `docs/assets/devpost/product-canvas.png`: The live memory canvas. Each approved memory stays visible as a card.
2. `docs/assets/devpost/native-webmcp-inspector.png`: Chrome's official WebMCP Inspector discovers the native tools and shows their schemas.
3. `docs/assets/devpost/human-edit-approval.png`: An agent proposal waits while the person edits the words before approval.
4. `docs/assets/devpost/cross-browser-sync.png`: Two browser clients share one memory space through the Cloudflare Worker.
5. `docs/assets/devpost/correction-and-forget.png`: Corrections keep visible history; forgetting needs explicit confirmation.
6. `docs/assets/devpost/markdown-export.png`: Every memory exports as readable markdown with YAML frontmatter.

All images are 1800 x 1200 and under 1 MB.

## Video demo link

```text
https://youtu.be/KsNA9drjKsc
```

## Submitter type

Select: Individual

## Country of residence

Select: United States

## Organization name

Leave blank. This is an individual submission.

## App status

Select: New project

Remnic Canvas is a new standalone app and repository created during the challenge window. Remnic is an existing external project used only for its open markdown format and as an optional destination.

## Existing-project update field

Leave blank after selecting New project. The challenge-period boundary is explained in the About section.

## Live link

```text
https://remnic-canvas.pages.dev/?demo
```

## Testing instructions

```text
No account or credentials are required.

Chrome path (fully verified):
1. Use Google Chrome 149 or newer.
2. Open chrome://flags/#enable-webmcp-testing, set WebMCP testing to Enabled, and relaunch Chrome.
3. Open https://remnic-canvas.pages.dev/?demo
4. The bottom-left pill should read: Agent tools live (document.modelContext.registerTool)
5. Chrome's official WebMCP Model Context Tool Inspector can discover all five tools.
6. Call recall_memories with {"query":"Lisbon trip dates","limit":5}. The first result should say: The Lisbon trip runs October 17 to October 24.
7. Call remember with {"content":"The rooftop bar closes at midnight.","kind":"fact","tags":["lisbon"]}. Approve the pending card on the page. The tool returns status approved and the card remains in the canvas.

ChatGPT path:
Open the same URL in ChatGPT's built-in browser with GPT-5.6 Sol or Terra when Site Tools are available for the judging account. My account did not yet have the Site Tools rollout, so native execution verification used the official Chrome path above.
```

## Public code repository

```text
https://github.com/joshuaswarren/remnic-canvas
```

The repository is public. GitHub detects its MIT license in the About panel.

## Which agents or clients did you test with?

```text
Google Chrome 151.0.7922.174 with chrome://flags/#enable-webmcp-testing and the official WebMCP Model Context Tool Inspector v1.9.13. The Inspector discovered all five tools, completed a native recall, and completed a native remember call through human approval.

I also tested ChatGPT desktop's built-in browser with GPT-5.6 Sol. The page rendered correctly, but Site Tools were not yet enabled for my account, so Chrome is the full native execution receipt.
```

## Which AI tools did you use?

```text
OpenAI Codex with GPT-5.6 Sol for implementation, debugging, tests, browser verification, documentation, and production QA. ChatGPT for product and browser workflows. ElevenLabs eleven_v3 with the Brian voice for narration.
```

## Learning level

Select the highest truthful option, such as A lot or High.

## Career value

Select: Yes
