---
name: html-artifact
description: Generate self-contained, reading-first HTML artifacts from already-produced complex agent output. Use when the user invokes /html, asks to turn a plan, research summary, comparison, code review, decision tree, long explanation, or other complex Human-Agent output into human-friendly HTML, or when the agent suggested an HTML artifact and the user confirmed. Do not use for building full web apps or for doing the upstream research, planning, or analysis itself.
---

# HTML Artifact

## Overview

Turn a complex output draft into a saved `.html` file that is easier for a human to read, navigate, and continue from. HTML is the reading layer; Markdown export is the handoff and memory layer.

## Defaults

- Work from the current complex output draft, not the full transcript.
- Do not redo the upstream task. Preserve the existing substance, key basis, assumptions, unresolved points, and next actions.
- Save the artifact by default at `artifacts/html/{timestamp}-{topic-slug}.html`.
- Do not paste the full HTML source into chat unless the user explicitly asks for source.
- Produce a single self-contained HTML file: inline CSS, inline JavaScript, inline SVG or CSS visuals, no CDN, no remote fonts, no external scripts, no build step.
- Include a Markdown export affordance when useful, usually a `Copy Markdown` button backed by an embedded Markdown payload.
- Prioritize ease of use. Do not require browser verification by default.

## Workflow

1. Identify the complex output draft: the plan, review, comparison, research result, decision tree, or explanation worth HTML-structuring.
2. Build a structure blueprint before writing HTML:
   - Reader goal: what the human should understand or decide.
   - Top-line answer: the conclusion or recommended path.
   - Content hierarchy: sections, sequence, grouping, and importance.
   - Key basis: evidence, assumptions, sources, caveats, and open questions.
   - Interaction needs: navigation, folding, filtering, tabs, copy buttons, theme toggle, or none.
   - Markdown export: what should be copied back to an agent or stored in Obsidian.
3. Choose the structure pattern that best fits the content shape.
4. Generate the self-contained HTML artifact with restrained visual design and high interaction quality.
5. Save the file at the artifact path. Create parent directories if needed.
6. Reply with the file path, the chosen structure pattern, and whether Markdown export is included.

## Structure Patterns

Choose internally. Do not make the user pick a template category.

- Comparison or tradeoff: recommendation strip, decision matrix, option cards, risk notes.
- Execution plan: phases, timeline, owner/task groups, validation checkpoints.
- Research summary: answer first, evidence cards, source index, assumptions, open questions.
- Code review: severity groups, file anchors, impact, suggested fixes, verification gaps.
- Decision tree: branch map, default recommendation, edge cases, rejection reasons.
- Long explanation: executive summary, layered sections, glossary, expandable details.
- Conversation synthesis: decisions, rationale, unresolved questions, next actions, reusable prompt.

## HTML Requirements

- Make the page readable within five seconds: title, short context line, and primary conclusion must be visible near the top.
- Improve structure instead of wrapping Markdown. Reorder and group content when that makes the logic clearer.
- Use semantic HTML with stable heading hierarchy, readable type sizes, sufficient contrast, and scan-friendly spacing.
- Keep visual style clear and restrained. Avoid decorative animation, marketing hero layouts, heavy gradients, and app-like chrome unless the content genuinely needs it.
- Make interactions local, predictable, and useful. Good defaults include sticky table of contents, collapsible detail sections, filters, tabs, copy buttons, and theme toggle.
- Keep JavaScript local to the page. Do not use `fetch`, remote scripts, analytics, network requests, or external side effects by default.
- Support responsive reading. Desktop can be primary, but mobile must not break: no hidden content, uncontrolled horizontal overflow, or untappable controls.
- Escape source text when showing raw code, logs, prompts, or user-provided snippets. Display them in `pre`/`code` blocks rather than injecting them as live markup.
- Include print-friendly CSS when it is cheap and useful.

## Markdown Export

When including Markdown export, embed the concise reusable substance, not the whole HTML or full transcript. Include:

- Title and context
- Key conclusions or decisions
- Important rationale and evidence
- Assumptions and unresolved questions
- Next actions or a next prompt for the agent

Prefer a `Copy Markdown` button. If the user asks for a separate `.md` file, save it beside the `.html` file with the same basename.

## Success Standard

The artifact is useful when all five are true:

1. The reader can understand the topic and conclusion within five seconds.
2. The structure is clearer than the source output.
3. The light interactions reduce reading or handoff effort.
4. The file is portable and self-contained.
5. The result can continue the Human-Agent loop through copy/export affordances.

## Completion Response

Keep the final response short:

- Link the saved artifact file.
- State the structure pattern used.
- State whether Markdown export is included.
- Mention any important limitation only if it matters.
