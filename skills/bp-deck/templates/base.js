// BP-deck base template — copy this and fill in the slide body.
// Run with: NODE_PATH=$(npm root -g) node this_file.js
//
// Replace:
//   - SECTION_LABEL  → e.g. "\u4EFB\u52A1\u5931\u8D25\u5728\u54EA\u91CC"
//   - PAGE_TITLE     → e.g. "85% \u7684 Agent \u4EFB\u52A1..."
//   - PAGE_NUM       → "5"
//   - OUTPUT_PATH    → absolute path to output .pptx

const pptxgen = require("pptxgenjs");

// ─── Design tokens ─────────────────────────────────────────────
const C = {
  bg:      "FFFFFF",
  bgWarm:  "F9FAF8",
  panel:   "F3F4F1",
  panelAlt:"E8E9E5",

  text:    "111827",
  sub:     "6B7280",
  dim:     "9CA3AF",
  rule:    "E5E7EB",

  accent:     "0F766E",
  accentLight:"14B8A6",
  accentBg:   "F0FDFA",

  red:     "DC2626",
  redBg:   "FEF2F2",
  green:   "059669",
  amber:   "D97706",
  amberBg: "FFFBEB",
  blue:    "2563EB",
  blueBg:  "EFF6FF",
};

const L = { ml: 0.9, cw: 8.2 };

// ─── Helpers ───────────────────────────────────────────────────
function sLabel(s, text) {
  s.addText(text, {
    x: L.ml, y: 0.45, w: 5, h: 0.25,
    fontSize: 9, fontFace: "Calibri", color: C.accent, charSpacing: 5, margin: 0,
  });
}

function sTitle(s, text, opts = {}) {
  s.addText(text, {
    x: L.ml, y: opts.y || 0.75, w: L.cw, h: 0.55,
    fontSize: opts.size || 24, fontFace: "Georgia", color: C.text, bold: true, margin: 0,
  });
}

function sFooter(s, text, opts = {}) {
  // Simple string OR rich-text array
  if (typeof text === "string") {
    s.addText(text, {
      x: L.ml, y: 5.0, w: L.cw, h: 0.3,
      fontSize: 10, fontFace: "Georgia", color: C.dim, italic: true, margin: 0,
    });
  } else {
    s.addText(text, {
      x: L.ml, y: 5.0, w: L.cw, h: 0.3,
      fontSize: 11, fontFace: "Georgia", margin: 0,
    });
  }
}

function sNum(s, n) {
  s.addText(String(n), {
    x: 9.0, y: 5.15, w: 0.6, h: 0.25,
    fontSize: 8, fontFace: "Calibri", color: C.dim, align: "right",
  });
}

function topAccent(s, pres) {
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.025,
    fill: { color: C.accent },
  });
}

// ─── Build ─────────────────────────────────────────────────────
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";

  const s = pres.addSlide();
  s.background = { color: C.bg };  // or C.bgWarm for rhythm
  topAccent(s, pres);

  sLabel(s, "SECTION_LABEL");
  sTitle(s, "PAGE_TITLE");

  // ════════════════════════════════════════════════════════════
  // BODY — pick a pattern from PATTERNS.md and fill it in here.
  // Body region: x: 0.9, y: 1.4 - 4.7, w: 8.2
  // ════════════════════════════════════════════════════════════

  // [your slide body goes here]

  // ════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════
  // Plain footer:
  // sFooter(s, "\u6A21\u578B\u5728\u8003\u8BD5\u4E0A\u903C\u8FD1\u4EBA\u7C7B\u3002");

  // Or rich two-color punchline:
  // sFooter(s, [
  //   { text: "playbookOS \u7684\u7B54\u6848\uFF1A", options: { color: C.accent, bold: true } },
  //   { text: "\u8BA9\u6A21\u578B\u8D1F\u8D23 \u201C\u601D\u8003\u4E00\u6B21\u201D\u3002", options: { color: C.sub } },
  // ]);

  sNum(s, "PAGE_NUM");

  const out = "OUTPUT_PATH";
  await pres.writeFile({ fileName: out });
  console.log("Done: " + out);
}

main().catch(e => { console.error(e); process.exit(1); });
