# Remnic Canvas visual language

The canvas must be beautiful enough that a judge screenshots it. This file is the bar. Deviate only upward.

## Concept: a desk at night

Memory as physical, warm, and human against a deep, calm dark. The metaphor: index cards on a night desk, with the agent as an aurora that moves light between them. Two actors, two colors, always distinguishable at a glance:

- Human actions are warm amber.
- Agent actions are cool aurora teal.

A viewer should be able to watch the canvas with the chat hidden and still narrate who did what.

## Tokens

```css
--bg:            #0B0E14;   /* deep ink, near-black blue */
--bg-raise:      #121722;   /* rails, panels */
--card:          #F6F1E7;   /* warm paper */
--card-ink:      #23201A;   /* card text */
--card-meta:     #8A8377;   /* card frontmatter, timestamps */
--human:         #F2A950;   /* amber: approvals, edits, human glow */
--agent:         #6FE3CE;   /* aurora teal: tool calls, recall glow */
--danger:        #E5684B;   /* forget, reject */
--thread:        #3D4557;   /* lineage threads, idle lines */
--focus:         #FFFFFF;   /* focus rings on dark */
```

(If a token clashes in practice, adjust hue, keep the warm-card-on-dark-ink contrast and the amber/teal actor split.)

Type:

- Card content: Newsreader (or Source Serif 4), 400/500, optical sizing on. Memory text deserves a serif; it reads as something kept.
- UI chrome, rail, buttons: Inter (or system-ui), 13 to 14 px, medium.
- One display moment only: the empty-state headline.

Contrast: WCAG AA minimum everywhere, including card-meta on paper.

## Layout

- Canvas fills the viewport. Cards cluster loosely by kind with a gentle force layout or hand-tuned grid drift; never a rigid table.
- Right rail (320 px, collapsible): agent activity feed, newest on top, each entry tinted by actor color.
- Bottom-left: mode chip (Browser / Space / Remnic) + connect panel trigger.
- Cards: paper token, 1 px inner hairline, soft 24 px shadow at 12 percent, radius 10 px, max-width ~340 px. Frontmatter kind + age render as small caps meta line. Tags as quiet pills.
- 375 px width: single-column card stream, rail becomes a sheet. The canvas is a product at every width in {375, 768, 1024, 1440}.

## Motion

Motion is the product's voice. Every rule below has a reduced-motion equivalent (opacity-only, no transforms).

1. Card arrival (agent proposes): card springs in slightly oversized, settles with a soft overshoot (spring, ~300 ms), teal rim light that fades over 2 s.
2. Pending pulse: slow 2.4 s breathing glow in teal until the human decides. Never a spinner.
3. Approval: rim flips to amber, one clean pulse, card settles into its cluster.
4. Recall: matched cards lift 4 px and glow teal; non-matches dim to 40 percent; camera eases to frame matches (450 ms, standard ease); everything relaxes after 4 s.
5. Correction lineage: old card folds back and tucks behind the new card; a thread line connects them; tapping fans the history out like held playing cards.
6. Forget: card desaturates, lifts, and dissolves upward into a few drifting particles. Quietly final, not violent.
7. load_context: included cards briefly stack into a neat pile, a teal copy of the pile slides toward the rail, originals return. Reads as "the agent took a copy."
8. Idle: sub-pixel drift and occasional thread shimmer. The canvas should feel alive at rest but never busy.

Nothing bounces more than once. Nothing moves faster than 200 ms or slower than 600 ms except the pending pulse.

## Tone in words

Microcopy is calm and first-person-neutral: "Waiting for you", "Remembered", "Forgotten", "The agent took 6 memories". No exclamation marks, no mascot speak, no "oops".

## The screenshot test

Before calling the UI done, take the four-width screenshots including empty state, pending state, recall state, and lineage fan. Each one, standing alone, should look like a product page hero image. If any looks like a hackathon admin panel, it fails this file.
