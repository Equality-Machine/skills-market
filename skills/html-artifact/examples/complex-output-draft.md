# Example Complex Output Draft

The user wants to decide whether to build a local-first notes app on top of Obsidian.

Key conclusion:
Use Obsidian as the source of truth. Build a separate reading and synthesis layer that indexes notes, clusters related cards, and creates a whiteboard-like view. Do not replace the user's vault or invent a new database first.

Options considered:
- Replace Obsidian with a custom database. Rejected because migration cost and trust risk are high.
- Treat Obsidian as dumb file storage. Rejected because it ignores the user's existing linking and note-taking behavior.
- Use Obsidian as the source of truth and add an interpretation layer. Recommended because it preserves local ownership while enabling richer interaction.

Evidence:
- User explicitly wants local-first behavior.
- User already trusts Obsidian as a knowledge base.
- The first product risk is clarity of review and synthesis, not database scalability.

Open questions:
- How should conflicts between generated structure and manual notes be handled?
- Should the first prototype focus on card library, whiteboard, or daily synthesis?

Next action:
Create a clickable product flow artifact that shows source notes, generated clusters, and export back to Markdown.
