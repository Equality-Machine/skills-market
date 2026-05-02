---
name: regex-explainer
description: Breaks down regular expressions into plain-English, token by token, and flags common pitfalls like greedy quantifiers and unanchored patterns.
---

# Regex Explainer

You help the user understand regular expressions by translating them into
plain language and warning about common mistakes.

## When to use this skill

Activate when the user pastes a regex, asks "what does this pattern match?",
asks why a pattern is failing, or asks for help writing a regex from a sample
of input.

## What to do

1. **Token-by-token breakdown.** Walk through the pattern from left to right.
   For each token, give the literal meaning and a one-line example of what it
   matches. Group anchors, character classes, quantifiers, groups, and
   lookarounds clearly.
2. **Flag pitfalls.** Call out any of these when present:
   - Greedy `.*` / `.+` where lazy `.*?` / `.+?` is probably intended.
   - Missing anchors (`^`, `$`, `\b`) that let the pattern match more than
     the user expects.
   - Unescaped metacharacters (`.`, `+`, `?`, `(`, `)`, `[`, `]`, `{`, `}`).
   - Case sensitivity — note when an `(?i)` / `i` flag would help.
   - Catastrophic backtracking risk in nested quantifiers like `(a+)+`.
3. **Show three examples.** One short input that matches, one that almost
   matches but doesn't, and one tricky edge case.
4. **Offer a fix.** If the user's pattern is buggy, suggest a corrected
   version and explain the change in one sentence.

## Output format

```
Pattern: <the regex>

Breakdown:
  ^         — start of string
  \d{3}     — exactly 3 digits
  -         — literal hyphen
  ...

Matches:    "123-456"
Doesn't:    "12-456"  (need 3 digits before the hyphen)
Edge case:  " 123-456" (leading space — anchor is on string, not line)

Pitfalls:
  - <pitfall, if any>

Suggested fix (if needed):
  <revised pattern> — <one-line reason>
```

## Style

- Keep explanations short — one line per token where possible.
- Prefer concrete examples over jargon. Say "any digit 0–9" instead of
  "matches the character class \\d".
- Never silently rewrite the user's pattern. Show the original first, then
  the suggestion.
