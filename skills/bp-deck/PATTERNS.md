# Visual Patterns

Pick ONE pattern per slide. Don't combine more than two without strong reason.

---

## 1. Big Stat (single hero number)

For: making one number unforgettable. Most powerful pattern.

```javascript
// 80-110pt number, tiny label below
s.addText("85%", {
  x: 0.9, y: 0.8, w: 4.5, h: 1.4,
  fontSize: 96, fontFace: "Calibri Light", color: C.red, margin: 0,
});
s.addText("\u7684 Agent \u4EFB\u52A1\u5931\u8D25\u6765\u81EA\u6267\u884C\u5C42", {
  x: 0.9, y: 2.15, w: 5, h: 0.4,
  fontSize: 18, fontFace: "Georgia", color: C.text, bold: true, margin: 0,
});
s.addText("10,000 \u6B21\u771F\u5B9E\u4EFB\u52A1\u6267\u884C\u65E5\u5FD7 \u00b7 2026 Q1", {
  x: 0.9, y: 2.55, w: 5, h: 0.25,
  fontSize: 9, fontFace: "Calibri", color: C.dim, margin: 0,
});
```

**Variant: Two big numbers compared**

```javascript
// LEFT (us): big + accent color
s.addText("5", {
  x: 0.9, y: 1.5, w: 2.0, h: 1.4,
  fontSize: 110, fontFace: "Calibri Light", color: C.accent, align: "right", margin: 0,
});
s.addText("\u5C0F\u65F6", { x: 2.95, y: 2.0, w: 1.2, h: 0.5,
  fontSize: 24, fontFace: "Georgia", color: C.accent, bold: true, valign: "middle", margin: 0 });

// CENTER: vs
s.addText("vs", { x: 4.3, y: 2.0, w: 1.4, h: 0.6,
  fontSize: 22, fontFace: "Georgia", color: C.dim, italic: true, align: "center", valign: "middle", margin: 0 });

// RIGHT (them): big + dim color
s.addText("2\u20133", { x: 5.3, y: 1.5, w: 2.2, h: 1.4,
  fontSize: 110, fontFace: "Calibri Light", color: C.dim, align: "right", margin: 0 });
```

---

## 2. Comparison Table (5+ rows)

For: structured side-by-side comparison.

```javascript
const header = ["\u7EF4\u5EA6", "\u4ED6\u4EEC", "\u6211\u4EEC"].map(t => ({
  text: t, options: { fill: { color: C.text }, color: "FFFFFF", bold: true, fontSize: 10, align: "center" }
}));
const data = [
  ["\u6267\u884C\u65F6\u95F4", "60-180s", "2-10s"],
  ["Token \u6210\u672C", "$0.5-2.0", "$0.001-0.01"],
];
const rows = [header, ...data.map((row, ri) => row.map((cell, ci) => ({
  text: cell,
  options: {
    fontSize: 11, align: ci === 0 ? "left" : "center",
    bold: ci === 0 || ci === row.length - 1,
    color: ci === row.length - 1 ? C.accent : (ci === 0 ? C.text : C.sub),
    fill: ri % 2 === 0 ? { color: C.panel } : { color: C.bg },
  },
})))];
s.addTable(rows, {
  x: 0.5, y: 1.5, w: 9.0,
  colW: [1.5, 3.75, 3.75],
  border: { pt: 0, color: C.bg },  // CRITICAL: zero borders
  rowH: [0.38, 0.42, 0.42],
  margin: [4, 8, 4, 8], fontFace: "Calibri", autoPage: false,
});
```

**Rules:**
- `border: { pt: 0 }` — never visible cell borders
- Alternating row fills (`C.panel` / `C.bg`)
- Header row with dark fill + white text
- Last column (the winner) in accent color, bold

---

## 3. Iceberg (size-contrast ratio)

For: showing "small visible part vs large hidden majority".

```javascript
// Above water: small block
s.addShape(pres.shapes.RECTANGLE, {
  x: 1.5, y: 1.65, w: 1.8, h: 0.7, fill: { color: C.panel },
});
s.addText("CLI / API / MCP", { x: 1.5, y: 1.72, w: 1.8, h: 0.2,
  fontSize: 9, fontFace: "Calibri", color: C.sub, bold: true, align: "center", margin: 0 });
s.addText("\u5C11\u6570", { x: 1.5, y: 1.95, w: 1.8, h: 0.18,
  fontSize: 8, fontFace: "Calibri", color: C.dim, align: "center", margin: 0 });

// Water line — dashed
s.addShape(pres.shapes.LINE, {
  x: 0.8, y: 2.5, w: 3.2, h: 0,
  line: { color: C.dim, width: 0.5, dashType: "dash" },
});

// Below water: 3-4× larger block
s.addShape(pres.shapes.RECTANGLE, {
  x: 1.0, y: 2.65, w: 2.8, h: 2.2, fill: { color: C.panel },
});
```

**Rule:** Below-water block must be 3-5× larger than above-water to read instantly.

---

## 4. Tension Axis (two opposing concepts)

For: showing two forces in fundamental opposition.

```javascript
const axisY = 3.5, axisL = 1.5, axisR = 8.5;

// Main line
s.addShape(pres.shapes.LINE, { x: axisL, y: axisY, w: axisR - axisL, h: 0,
  line: { color: C.text, width: 2 } });

// Triangle endpoints (use unicode chars, not lines)
s.addText("\u25C0", { x: axisL - 0.25, y: axisY - 0.15, w: 0.3, h: 0.3,
  fontSize: 14, fontFace: "Calibri", color: C.text, align: "center", valign: "middle", margin: 0 });
s.addText("\u25B6", { x: axisR - 0.05, y: axisY - 0.15, w: 0.3, h: 0.3,
  fontSize: 14, fontFace: "Calibri", color: C.text, align: "center", valign: "middle", margin: 0 });

// Labels above endpoints
s.addText("\u6CDB\u5316", { x: axisL - 0.5, y: axisY - 0.6, w: 1.8, h: 0.3,
  fontSize: 14, fontFace: "Calibri", color: C.amber, bold: true, align: "center", margin: 0 });
s.addText("\u786E\u5B9A\u6027", { x: axisR - 1.3, y: axisY - 0.6, w: 1.8, h: 0.3,
  fontSize: 14, fontFace: "Calibri", color: C.accent, bold: true, align: "center", margin: 0 });

// Mid-axis label with white background to break the line visually
s.addShape(pres.shapes.RECTANGLE, { x: 4.0, y: axisY - 0.15, w: 2.0, h: 0.3, fill: { color: C.bg } });
s.addText("\u4F18\u5316\u65B9\u5411\u672C\u8D28\u76F8\u53CD", {
  x: 4.0, y: axisY - 0.15, w: 2.0, h: 0.3,
  fontSize: 9, fontFace: "Calibri", color: C.sub, align: "center", valign: "middle", margin: 0,
});
```

**Rule:** The axis should be a single thick line. Use `\u25C0` and `\u25B6` for solid arrowheads. Don't try to draw arrowheads with multiple LINE shapes — they look broken.

---

## 5. Timeline (3-5 milestones)

For: showing sequence of events / roadmap.

```javascript
const tlY = 1.8, tlL = 1.0, tlR = 9.0;
const tlW = tlR - tlL;

// Base line
s.addShape(pres.shapes.LINE, { x: tlL, y: tlY, w: tlW, h: 0,
  line: { color: C.rule, width: 1.5 } });

const milestones = [
  { x: tlL, date: "2026.05", title: "Sandbox", color: C.amber, bg: C.amberBg },
  { x: tlL + tlW * 0.33, date: "Q3", title: "playbookOS", color: C.accent, bg: C.accentBg },
  // ...
];

milestones.forEach(m => {
  // Dot on line
  s.addShape(pres.shapes.OVAL, {
    x: m.x - 0.07, y: tlY - 0.07, w: 0.14, h: 0.14, fill: { color: m.color },
  });
  // Date above
  s.addText(m.date, { x: m.x - 0.5, y: tlY - 0.35, w: 1.2, h: 0.22,
    fontSize: 9, fontFace: "Calibri", color: m.color, bold: true, align: "center", margin: 0 });
  // Card below with top accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: m.x - 0.3, y: tlY + 0.2, w: 2.0, h: 1.25, fill: { color: m.bg },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: m.x - 0.3, y: tlY + 0.2, w: 2.0, h: 0.03, fill: { color: m.color },
  });
  // Card content...
});
```

---

## 6. Two-Column with Vertical Divider

For: pain vs solution, before vs after, them vs us.

```javascript
// Left header
s.addText("\u4ED6\u4EEC", { x: 0.9, y: 1.5, w: 4, h: 0.3,
  fontSize: 13, fontFace: "Calibri", color: C.red, bold: true, margin: 0 });

// Vertical divider — single thin line
s.addShape(pres.shapes.LINE, { x: 5.0, y: 1.5, w: 0, h: 3.0,
  line: { color: C.rule, width: 0.5 } });

// Right header
s.addText("\u6211\u4EEC", { x: 5.4, y: 1.5, w: 4, h: 0.3,
  fontSize: 13, fontFace: "Calibri", color: C.accent, bold: true, margin: 0 });
```

**Rule:** No background fills on the columns. Just a thin vertical divider. Color comes from text only.

---

## 7. Pill Row (logos / categories)

For: list of brands, apps, categories without using actual logos.

```javascript
const items = ["Twitter / X", "Reddit", "YouTube", "LinkedIn", "+ \u66F4\u591A"];
const pillW = 1.05, gap = 0.12;
const totalW = items.length * pillW + (items.length - 1) * gap;
const startX = (10 - totalW) / 2;

items.forEach((name, i) => {
  const x = startX + i * (pillW + gap);
  const isMore = i === items.length - 1;
  s.addShape(pres.shapes.RECTANGLE, {
    x, y: 4.35, w: pillW, h: 0.4,
    fill: { color: isMore ? C.bg : C.panel },
    line: isMore ? { color: C.dim, width: 0.5, dashType: "dash" } : undefined,
  });
  s.addText(name, {
    x, y: 4.35, w: pillW, h: 0.4,
    fontSize: 9, fontFace: "Calibri",
    color: isMore ? C.dim : C.text, bold: !isMore,
    align: "center", valign: "middle", margin: 0,
  });
});
```

---

## 8. Layered Stack (3 horizontal layers)

For: protocol stack, architecture, hierarchy where one layer is missing/broken.

```javascript
const layers = [
  { name: "MCP \u534F\u8BAE\u5C42", desc: "...", tag: "\u2713 \u5DF2\u6709", tc: C.green, bg: C.panel },
  { name: "Harness \u8BC4\u6D4B\u5C42", desc: "...", tag: "\u2713 \u5DF2\u6709", tc: C.green, bg: C.panel },
  { name: "\u751F\u4EA7\u6267\u884C\u5C42", desc: "...", tag: "\u2717 \u7F3A\u5931", tc: C.red, bg: C.accentBg },
];

layers.forEach((l, i) => {
  const y = 1.55 + i * 1.05;
  const isGap = i === layers.length - 1;
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.9, y, w: 7.5, h: 0.85,
    fill: { color: l.bg },
    line: isGap ? { color: C.accent, width: 1 } : undefined,
  });
  s.addText(l.name, { x: 1.2, y: y + 0.1, w: 4, h: 0.3,
    fontSize: 14, fontFace: "Calibri", color: isGap ? C.accent : C.text, bold: true, margin: 0 });
  s.addText(l.desc, { x: 1.2, y: y + 0.42, w: 5.5, h: 0.3,
    fontSize: 11, fontFace: "Calibri", color: C.sub, margin: 0 });
  s.addText(l.tag, { x: 7.2, y: y + 0.28, w: 1, h: 0.3,
    fontSize: 10, fontFace: "Calibri", color: l.tc, bold: true, align: "center", margin: 0 });
});
```

---

## 9. Triangle / Flywheel (3 nodes)

For: showing 3 components in a feedback loop. Nodes use different accent colors but the same visual weight.

```javascript
// Top-left node
s.addShape(pres.shapes.RECTANGLE, {
  x: 0.6, y: 1.55, w: 3.5, h: 1.85,
  fill: { color: C.bg }, line: { color: C.amber, width: 1.2 },
});
s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.55, w: 3.5, h: 0.04, fill: { color: C.amber } });
// title + desc + output label

// Top-right node — same structure, different color
// Bottom-center node — same structure, accent color (the "main" one)

// Dashed arrows between nodes
s.addShape(pres.shapes.LINE, {
  x: 4.1, y: 2.0, w: 1.8, h: 0,
  line: { color: C.dim, width: 1, dashType: "dash" },
});
s.addText("\u2192", { x: 5.5, y: 1.85, w: 0.4, h: 0.3,
  fontSize: 14, fontFace: "Calibri", color: C.dim, align: "center", margin: 0 });
```

**Rule:** Three nodes, each with a top accent stripe (4pt tall, full-width) to mark its category color. Arrows are dashed to indicate flow without dominating.

---

## Choosing a Pattern

| Goal | Pattern |
|------|---------|
| Make one number unforgettable | Big Stat |
| Compare 4+ dimensions across competitors | Comparison Table |
| Show small-visible vs large-hidden | Iceberg |
| Argue two forces are fundamentally opposed | Tension Axis |
| Show roadmap / sequence | Timeline |
| Pain vs solution side-by-side | Two-Column |
| List brands without logos | Pill Row |
| Show layer stack with one missing | Layered Stack |
| Show 3-component feedback loop | Triangle / Flywheel |
