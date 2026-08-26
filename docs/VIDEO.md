# Demo video script (under 3:00)

The judged artifact. Everything in the repo exists so these beats work live. Record at 1440 px, dark room aesthetic matching the canvas, voiceover in plain first person. No background music (copyright rule), no title cards longer than 2 s.

Prep: fresh browser profile, `?demo` seeds loaded, one deliberately stale memory in the seed set ("The hotel is booked for October 12" when the trip moved to October 19).

| Time | Beat | On screen |
| --- | --- | --- |
| 0:00-0:20 | Problem. "Browser agents forget everything between conversations. And where memory exists, you can't see it, and it belongs to the vendor, not you." | Split shot: a chat agent failing to recall yesterday's context |
| 0:20-0:50 | First contact. Open the canvas in ChatGPT's in-app browser. Ask: "What do you know about my Lisbon trip?" Agent calls `recall_memories`; cards glow and the camera frames them; agent answers from them. | Recall highlight + activity rail |
| 0:50-1:25 | The handoff. "Remember that my sister is joining for the first weekend." Card springs in, pulses. Edit it inline before approving ("first weekend" → exact dates). Agent acknowledges the edited version, because the tool result carried my decision back. | Pending pulse → edit → amber approval |
| 1:25-1:50 | Memory outlives the conversation. Close the chat. New conversation, same page: "Where are we staying?" It knows. | New chat, instant recall |
| 1:50-2:20 | The kicker. Copy the space link. Open it in Chrome with WebMCP enabled, ask Gemini-side agent the same question. Same memories. "One open web page. Any agent. Memory I own." | Chrome window side by side |
| 2:20-2:45 | Correction + ownership. Agent notices the stale hotel date during planning, calls `correct_memory`; approve; lineage fans out. Then click export: "every memory is a markdown file; this drops straight into Remnic, the open-source memory store this is built on." | Lineage fan, export dialog |
| 2:45-3:00 | Close. "Five WebMCP tools. No account. No backend integration. The page is the memory." URL on screen. | Hero shot of the full canvas |

Fallback: if the Chrome cross-agent beat is not reliable on recording day, replace 1:50-2:20 with a second device opening the space link inside ChatGPT, and keep the "any agent" claim scoped to what is shown.
