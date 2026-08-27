# Demo video

Final cut: 1 minute 58 seconds, 1080p, under the contest's 3-minute cap. Narration is ElevenLabs Brian (`eleven_v3`), credited on the end card. The submission upload lives on YouTube; the source master ships in this repo and with the [v0.1.0 release](https://github.com/joshuaswarren/remnic-canvas/releases).

## How it was produced

Screen capture is the live production site at remnic-canvas.pages.dev, recorded through Chrome's screencast API at 1920x1080. Chrome 151 ran with `enable-webmcp-testing`. The official WebMCP Model Context Tool Inspector v1.9.13 discovered all five native tools, called `recall_memories`, and completed a real `remember` call through human approval; the video includes the real Inspector result. Other demo actions use a driver that invokes the same registered `execute` contracts so their timing is deterministic on camera. The two-pane segment is two independent clients of one shared space, each with its own poller, syncing through the production Cloudflare Worker. Nothing on screen is mocked. Every card, approval, correction, sync, and exported markdown record is real app behavior.

The intro, chapter stingers, Inspector proof, markdown proof, and end card are HTML/CSS motion pages captured through the same deterministic pipeline. Captions remain on screen throughout the demo. The music bed is generated from local sine and pink-noise sources with ffmpeg; no copyrighted music or stock assets are used.

## Beat sheet (as produced)

| Time | Beat |
| --- | --- |
| 0:00 | Compressed problem hook: tomorrow's chat remembers nothing; hidden vendor memory is not yours |
| 0:13 | Product reveal; native registration; real Chrome Inspector proof with five discovered tools and approved result |
| 0:35 | The handoff: recall, pending card, 150% edit punch-in, human approval, edited tool result |
| 0:59 | It travels: approve in one browser, sync and recall in another |
| 1:19 | You govern it: correction with visible lineage, explicit forget with dissolve |
| 1:33 | Export action and context load |
| 1:46 | Real exported markdown record: readable frontmatter and editable content |
| 1:54 | Animated URL/end card and ElevenLabs attribution |

## Narration

The exact final narration ships as the `narration.md` release asset.
