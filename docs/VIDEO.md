# Demo video

Final cut: 1 minute 52 seconds, 1080p. Narration is Joshua's voice. The submission upload lives on YouTube; the source master ships with the [v0.1.0 release](https://github.com/joshuaswarren/remnic-canvas/releases).

## How it was produced

Screen capture is the live production site at remnic-canvas.pages.dev. It was recorded through Chrome's screencast API at 1920x1080. The demo driver registers a model context provider that implements `document.modelContext.registerTool`. It invokes the page's five registered WebMCP tools through their real `execute` contracts. That is the same code path an agent browser calls. The two-pane segment is two independent clients of one shared space. Each pane runs its own poller and syncs through the production Cloudflare Worker. Nothing on screen is mocked. Every card, approval, correction, and sync is the deployed app doing real work. The video does not claim a specific agent product is driving; the narration says "an agent" throughout.

## Beat sheet (as produced)

| Time | Beat |
| --- | --- |
| 0:00 | Hook: agents forget; memory is invisible and vendor-owned |
| 0:14 | Canvas intro; demo cards land; status pill confirms native WebMCP registration |
| 0:33 | Recall glow; agent proposes a memory; card pulses; human edits inline and approves; the edited text returns as the agent's tool result |
| 0:57 | Two browsers, one shared space: approve on the left, it appears and recalls on the right |
| 1:15 | Correction with visible lineage; explicit forget with dissolve |
| 1:32 | Export as Remnic markdown; close |
| 1:48 | End card |

## Narration (as recorded)

See the release assets for the exact per-segment narration text and audio.
