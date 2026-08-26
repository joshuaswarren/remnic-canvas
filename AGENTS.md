# Agent build rules for Remnic Canvas

This repository is a WebMCP Challenge entry. Deadline: September 3, 2026, 1:00 pm PT (submissions on [Devpost](https://webmcp.devpost.com)). Judging runs through September 21, so the live URL must stay up until then.

Read [SPEC.md](SPEC.md) (what to build), [DESIGN.md](DESIGN.md) (how it must look and move), and [docs/VIDEO.md](docs/VIDEO.md) (the 3-minute demo the whole project serves) before writing code.

## What wins

Four equally weighted judging criteria: WebMCP leverage, execution, potential impact, creativity and ambition. Two facts control every tradeoff:

1. **Judges may score from the video and live URL alone.** They are not required to read this repo. Work that is invisible in a 3-minute video or the first two minutes on the live URL is worth close to nothing.
2. A focused workflow that feels finished beats a wide tool surface. Five tools, one canvas, one clear story.

## FORBIDDEN: process artifacts (hard rule)

Previous hackathon entries from this author lost while carrying elaborate self-verification apparatus. Judges never saw any of it. None of the following may be built, no matter how rigorous it feels:

- Verifier scripts, "judge packages", clean-room replay tooling, or reproduction harnesses
- SHA-256 pinning, attestations, launcher trust roots, integrity manifests
- Claim ledgers, evidence documents, compliance checklists, provenance write-ups
- Coverage targets, mutation testing, more than one CI workflow
- Recording/replay binding, sanitized capture pipelines
- Any document whose audience is "a skeptical judge auditing us"

The complete evidence story for this contest is: **the live URL works, the video shows it, the commit history is dated.** That is all the rules require and all the judges use.

If you find yourself building something in this list, stop and re-read this section. If a task seems to require it, the task is wrong: cut the task.

## Priorities, in order

1. **Day-1 gate:** a stub tool registered via `document.modelContext` and successfully called by ChatGPT's in-app browser on a deployed URL. Prove the pipe before building anything else. If `document.modelContext` is absent, feature-detect `navigator.modelContext` and, only if both are absent, fall back to the `@mcp-b` polyfill. Record which path ChatGPT and Chrome actually take in SPEC.md's compatibility note.
2. The five tools working against the browser store, with the approval flow.
3. The canvas UI at DESIGN.md quality. Beauty is a scored feature, not polish to defer.
4. Shared spaces (Cloudflare Worker + Workers KV) so the cross-agent demo beat works.
5. Remnic connect mode and `.md` export/import.
6. Video recording support: seeded demo memories, a `?demo` reset, clean initial state.

Cut from the bottom, never from the top. If time runs short, spaces and Remnic connect degrade to documented stretch goals; the approval flow and the visual canvas never degrade.

## Hard product rules

- **Exactly five tools.** Do not add a sixth. Do not mirror UI buttons as tools.
- Write tools resolve when the human decides, or resolve softly with `pending` at 55 s while the card stays actionable. The approval gate lives in page code. The model cannot bypass it.
- No accounts, no auth, no analytics, no cookies, no tracking of any kind.
- No personal data anywhere: seed memories are fictional and reviewed against SPEC.md's seed list.
- Everything works with JavaScript on a static host. The only server code is the optional sync Worker.

## Stack

- Vite + React + TypeScript, static build, deployed to Cloudflare Pages (free tier).
- Sync worker: Cloudflare Workers + Workers KV (free tier). One worker, three routes, see SPEC.md. Do not use R2 or D1.
- Search: MiniSearch (or equivalent small client-side BM25 library). No server-side search.
- Motion: Motion (framer-motion successor) or hand-rolled springs. Respect `prefers-reduced-motion`.
- Types for WebMCP: the `webmcp-types` npm package.

## Repo conduct

- One CI workflow at most: lint, typecheck, test, build. Nothing else.
- Tests: one Vitest suite covering the memory store and the five tool contracts (schema in, result out, approval semantics), plus at most one Playwright smoke test. No coverage thresholds.
- Keep the README honest: update the live URL and video link the moment they exist, and never before.
- Public repo. Never commit hostnames, IPs, tokens, client names, or anything from the author's private infrastructure.
- Commit messages: plain, present tense, no ceremony.
- Docs style: sentence-case headings, short sentences, no em dashes, no marketing vocabulary of the kind AI text is known for.

## Definition of done

1. Live URL on Cloudflare Pages passes the full demo script in docs/VIDEO.md in ChatGPT's in-app browser.
2. The cross-agent beat works: a memory stored via ChatGPT is recalled via Chrome (through a shared space), or the limitation is documented and the video script adjusted.
3. Screenshots at 375, 768, 1024, and 1440 px look intentional, including empty and pending states.
4. Vitest suite green, one workflow green.
5. README live URL and video link updated.
