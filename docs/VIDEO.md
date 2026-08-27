# Demo video

The final cut is 1 minute 58 seconds at 1080p. The contest cap is 3 minutes. [Watch it on YouTube](https://youtu.be/KsNA9drjKsc). ElevenLabs Brian (`eleven_v3`) reads the script. The end card credits ElevenLabs. The source master lives in this repo and in the [v0.1.0 release](https://github.com/joshuaswarren/remnic-canvas/releases).

## Production

The screen capture uses the live site at remnic-canvas.pages.dev. Chrome's screencast API recorded it at 1920x1080.

Chrome 151 ran with `enable-webmcp-testing`. The official WebMCP Model Context Tool Inspector v1.9.13 found all five tools. It called `recall_memories` and completed a real `remember` call through human approval. The video shows the real Inspector result.

A demo driver invokes the same registered `execute` contracts for other actions. This makes their timing repeatable on camera. The two-pane scene shows two clients in one shared space. Each client polls the production Cloudflare Worker. Nothing on screen is mocked. The cards, approval, correction, sync, and markdown export are real app behavior.

The intro, chapter cards, Inspector proof, markdown proof, and end card use HTML and CSS motion. Captions stay on screen during the demo. ffmpeg generates the quiet music bed from sine waves and pink noise. The video uses no copyrighted music or stock assets.

## Beat sheet

| Time | Beat |
| --- | --- |
| 0:00 | Tight problem hook: tomorrow's chat remembers nothing; hidden vendor memory is not yours |
| 0:13 | Product reveal and real Chrome Inspector proof |
| 0:35 | Recall, pending card, 150% edit punch-in, human approval, edited tool result |
| 0:59 | Approve in one browser; sync and recall in another |
| 1:19 | Correction with visible history; explicit forget with dissolve |
| 1:33 | Export action and context load |
| 1:46 | Real markdown record with readable frontmatter and editable content |
| 1:54 | Animated URL/end card and ElevenLabs credit |

## Narration

The exact final script ships as the `narration.md` release asset.
