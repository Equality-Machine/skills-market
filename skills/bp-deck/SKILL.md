---
name: bp-deck
description: Create clean, minimalist pitch deck / BP slides on white background using pptxgenjs. Use when user asks to make a slide, pitch deck page, BP 页面, 单独写一页, or wants to build presentations in the Efflora-style first-principles design (oversized numbers, single accent color, generous whitespace, no decorative icons). Each slide outputs as standalone .pptx.
---

# BP Deck Skill

A reusable design system for clean, first-principles pitch deck slides. Built around a single brand accent on white, oversized numbers, and grayscale-everything-else.

## Quick start

When user asks for a slide:

1. **Discuss design before coding.** Tell user 2-3 sentences about how you'll lay it out. Wait for confirmation. Don't jump straight to code.
2. **Pick a pattern** from [PATTERNS.md](PATTERNS.md): big-stat, comparison-table, iceberg, tension-axis, timeline, two-column, pill-row.
3. **Copy boilerplate** from [templates/base.js](templates/base.js) — it has the design tokens, helper functions, and slide skeleton already.
4. **Write the slide** — keep one core idea per slide, max 3 visual elements. Use Chinese unicode escapes (`\u4E2D\u6587`) to avoid quote-mark JS parsing breaks (see [PITFALLS.md](PITFALLS.md)).
5. **Build & verify**:
   ```bash
   NODE_PATH=$(npm root -g) node /path/to/script.js
   /opt/homebrew/Caskroom/miniforge/base/bin/python3 -m markitdown /path/to/output.pptx
   ```

## Core design rules

Read [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for full palette, typography, and layout constants.

**The five non-negotiables:**

1. **White background only** (`FFFFFF` or warm `F9FAF8` for rhythm). Never dark.
2. **One accent color** (`0F766E` teal). Used for ≤15% of visual area. Everything else grayscale.
3. **Oversized numbers do the work.** 52-110pt Calibri Light for hero stats. Tiny labels (8-10pt) below.
4. **No decorative icons, no card-on-card, no shadows, no gradients.** Geometry + type only.
5. **Generous margins** (0.9" left/right). White space = luxury.

## File output convention

- Each slide = one standalone `.pptx` file
- Naming: `Efflora_BP_<Topic>.pptx` (e.g. `Efflora_BP_S5_Iceberg.pptx`, `Efflora_BP_Sandbox_Capability.pptx`)
- Source `.js` next to the output, named after the same topic
- Default location: working directory unless user specifies

## Process discipline

- **Don't modify the existing main deck** unless explicitly asked. Always make new standalone files.
- **Critique the user's metaphor** if it doesn't land. Don't blindly transcribe vague briefs.
- **Show, don't decorate.** When tempted to add a colored card or icon to "make it look better," delete it instead. Type weight + size contrast carries the design.
- **One sentence per visual element.** If a card needs a paragraph to make sense, the layout is wrong.

## When user asks to redesign an existing slide

1. Extract the existing content with markitdown to understand what it tries to say
2. Identify what's broken — usually: too dense, mixed metaphor, weak data-to-claim link, decorative noise
3. Propose a new structure in 2-3 sentences and wait for sign-off
4. Build, then run markitdown content QA before declaring done
