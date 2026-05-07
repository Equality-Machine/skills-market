# Design System

## First Principles

1. **Typography IS the design.** Weight × size × greyscale contrast does all the work.
2. **One accent color, used ≤15% of visual area.** Rest is grayscale.
3. **Depth through type weight, not colored panels.**
4. **Data pops, decoration disappears.**
5. **Generous whitespace = luxury on white.**

## Color Palette

```javascript
const C = {
  // Backgrounds
  bg:      "FFFFFF",   // pure white — default
  bgWarm:  "F9FAF8",   // barely warm off-white — alternate for rhythm
  panel:   "F3F4F1",   // subtle warm gray — for grouping/containers
  panelAlt:"E8E9E5",   // slightly darker — emphasis containers

  // Text (warm-leaning grays)
  text:    "111827",   // primary — near-black
  sub:     "6B7280",   // secondary — body
  dim:     "9CA3AF",   // tertiary — captions, page numbers
  rule:    "E5E7EB",   // hairline rules

  // ONE brand accent — teal-green (Efflora = "to bloom")
  accent:     "0F766E",   // primary — for accents only
  accentLight:"14B8A6",   // lighter variant — secondary accent
  accentBg:   "F0FDFA",   // barely-there tint — for accent backgrounds

  // Semantic — use sparingly, only for true semantics
  red:     "DC2626",   // problems, costs, "wrong"
  redBg:   "FEF2F2",
  green:   "059669",   // wins, "right"
  amber:   "D97706",   // warnings, secondary themes (orange-ish)
  amberBg: "FFFBEB",
  blue:    "2563EB",   // tertiary differentiation when needed
  blueBg:  "EFF6FF",
};
```

## Typography Hierarchy

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Hero number | Calibri Light | 52-110pt | regular | accent or red |
| Page title | Georgia | 22-26pt | bold | text |
| Section label | Calibri | 9pt | regular, charSpacing 5 | accent |
| Body | Calibri | 11-14pt | regular | sub |
| Caption | Calibri | 8-10pt | regular | dim |
| Footer | Georgia | 10-11pt | italic | dim |
| Page number | Calibri | 8pt | regular | dim |

**Critical:** Chinese needs ~2pt larger nominal than Latin at the same hierarchy, and line-height 1.5-1.6× (vs 1.4× for Latin).

## Layout Constants (10×5.625)

```javascript
const L = {
  ml:    0.9,   // margin left
  mr:    0.9,   // margin right
  cw:    8.2,   // content width = 10 - ml - mr
  topAccent: 0.025,  // top accent stripe height
};
```

| Region | Y-range |
|--------|---------|
| Top accent stripe | 0 – 0.025 |
| Section label | 0.45 |
| Page title | 0.75 – 1.3 |
| Body content | 1.4 – 4.7 |
| Footer / punchline | 5.0 – 5.3 |
| Page number | 5.15 |

## Slide Skeleton (every slide)

```javascript
// 1. Top accent stripe — 2.5pt height, full width
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.025, fill: { color: C.accent } });

// 2. Section label — uppercase, charSpacing 5
s.addText("\u8282\u70B9\u540D", {
  x: 0.9, y: 0.45, w: 5, h: 0.25,
  fontSize: 9, fontFace: "Calibri", color: C.accent, charSpacing: 5, margin: 0,
});

// 3. Page title — Georgia bold, one line
s.addText("\u9875\u9762\u6807\u9898", {
  x: 0.9, y: 0.75, w: 8.2, h: 0.55,
  fontSize: 24, fontFace: "Georgia", color: C.text, bold: true, margin: 0,
});

// 4. Body (1.4 - 4.7) — pick a pattern from PATTERNS.md

// 5. Footer / punchline — italic Georgia or two-color emphasis
s.addText([...], { x: 0.9, y: 5.0, w: 8.2, h: 0.3, fontSize: 11, fontFace: "Georgia", margin: 0 });

// 6. Page number — small, right-aligned
s.addText("5", {
  x: 9.0, y: 5.15, w: 0.6, h: 0.25,
  fontSize: 8, fontFace: "Calibri", color: C.dim, align: "right",
});
```

## Visual Rhythm Across a Deck

Alternate page background between `C.bg` (pure white) and `C.bgWarm` (off-white) every 3-4 slides to create rhythm. Don't change every slide — that's noise. The cover and closing slides typically use `bg`. Comparison/data tables look richer on `bgWarm`.

## What NOT to do

- ❌ Drop shadows on text or shapes
- ❌ Gradients (except the cover, if at all)
- ❌ Decorative emoji-style icons (FA, MD, etc.)
- ❌ Card inside card inside card
- ❌ Full borders on rectangles (use top accent strip or fill only)
- ❌ Centered body text (only center hero statements and titles)
- ❌ Mixing 3+ accent colors
- ❌ Underlines beneath titles ("AI deck" tell)
- ❌ "Thank you" closing slide — close with the ask + a memorable number
