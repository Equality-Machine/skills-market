# Pitfalls

Hard-won lessons. Read before building.

## 1. Chinese full-width quotes break JS strings

ASCII `"` and Chinese full-width `"` `"` look identical in source but JS treats them all as string delimiters. Pasting Chinese text containing `""` inside a JS string literal will silently break with `SyntaxError: missing ) after argument list`.

**Always use unicode escapes for Chinese:**

```javascript
// ❌ WRONG — breaks JS parser:
s.addText("\u6253\u5F00\u4E00\u5F20"\u6D3B\u5730\u56FE"", { ... });

// ✅ CORRECT — escape the quotes too:
s.addText("\u6253\u5F00\u4E00\u5F20\u201C\u6D3B\u5730\u56FE\u201D", { ... });
```

**Practice:** Convert all Chinese strings to `\uXXXX` escapes before writing. Use this Python helper:

```python
def escape(s):
    return ''.join(f'\\u{ord(c):04X}' if ord(c) > 127 else c for c in s)
```

## 2. NODE_PATH for global packages

`pptxgenjs` is installed globally via `npm install -g`. Plain `node script.js` won't find it. Always run with:

```bash
NODE_PATH=$(npm root -g) node script.js
# Or hardcoded for nvm users:
NODE_PATH=/Users/b4yesc4t/.nvm/versions/node/v22.21.1/lib/node_modules node script.js
```

## 3. Don't reuse option objects

pptxgenjs **mutates** option objects in-place (e.g. converts shadow values to EMU units). Sharing an object between two calls corrupts the second one.

```javascript
// ❌ WRONG:
const shadow = { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 };
s.addShape(pres.shapes.RECTANGLE, { shadow, ... });
s.addShape(pres.shapes.RECTANGLE, { shadow, ... });  // shadow now has EMU values

// ✅ CORRECT:
const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 });
s.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });
```

## 4. Hex colors must NOT have `#`

```javascript
color: "FF0000"      // ✅ CORRECT
color: "#FF0000"     // ❌ corrupts the file silently
```

## 5. Don't encode opacity in 8-char hex

```javascript
shadow: { color: "00000020" }                  // ❌ CORRUPTS FILE
shadow: { color: "000000", opacity: 0.12 }     // ✅ CORRECT
```

## 6. `rectRadius` only works with `ROUNDED_RECTANGLE`

Setting `rectRadius` on a plain `RECTANGLE` is silently ignored. And don't pair `ROUNDED_RECTANGLE` with rectangular accent overlays — the overlay won't cover the rounded corners.

For the BP-deck style we typically don't use rounded rectangles. Stick with `RECTANGLE`.

## 7. Bullets — use `bullet: true`, never unicode `•`

```javascript
// ❌ WRONG — creates double bullets:
s.addText("• item", { ... });

// ✅ CORRECT:
s.addText([
  { text: "First", options: { bullet: true, breakLine: true } },
  { text: "Second", options: { bullet: true } },
], { ... });
```

For BP-deck style we generally **don't use bullets**. Use indented `\u00b7` (middle dot) inline or just spacing.

## 8. Multi-line text needs `breakLine: true`

```javascript
s.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2", options: { breakLine: true } },
  { text: "Line 3" },  // last item doesn't need it
], { ... });
```

Or use `\n` inside a single string:

```javascript
s.addText("Line 1\nLine 2\nLine 3", { ... });
```

## 9. Text box internal margin

Text boxes have default internal padding that throws off alignment with shapes. When aligning text edges with shape edges:

```javascript
s.addText("Title", { x: 0.5, y: 0.3, w: 9, h: 0.6, margin: 0 });
```

In BP-deck patterns, **always set `margin: 0`** for text. Use container shape position to control padding instead.

## 10. Tables: `border: { pt: 0 }` is critical

Default table borders are heavy and ugly. The BP-deck style uses zero borders + alternating row fills.

```javascript
s.addTable(rows, {
  x: 0.5, y: 1.4, w: 9.0,
  border: { pt: 0, color: C.bg },  // pt: 0 removes borders
  rowH: [0.38, 0.42, /* ... */ ],
  // ...
});
```

## 11. Fresh `pptxgen()` per file

Don't reuse a `pres` instance across files. Create a new one each time:

```javascript
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
// ... build slide ...
await pres.writeFile({ fileName: out });
```

## 12. Arrowhead drawing

Don't try to draw arrowheads with two angled `LINE` shapes — they look broken on different render engines (LibreOffice vs PowerPoint). Use unicode triangles:

```javascript
s.addText("\u25C0", { ... });  // ◀ left
s.addText("\u25B6", { ... });  // ▶ right
s.addText("\u25B2", { ... });  // ▲ up
s.addText("\u25BC", { ... });  // ▼ down
```

## 13. Content QA via markitdown

After generation, ALWAYS verify content extraction:

```bash
/opt/homebrew/Caskroom/miniforge/base/bin/python3 -m markitdown output.pptx
```

This catches: missing text, wrong character encoding, leftover placeholder text. Look for stray `xxxx`, `lorem`, or template fragments.

## 14. LibreOffice may not be installed

Visual QA via `soffice` → PDF → PNG won't work without LibreOffice. On macOS, install via `brew install --cask libreoffice` if needed. Otherwise rely on text QA + opening the .pptx in Keynote/PowerPoint manually.

## 15. Common useful Unicode

| Character | Code | Use |
|-----------|------|-----|
| ◀ | `\u25C0` | left arrow head |
| ▶ | `\u25B6` | right arrow head |
| ▲ | `\u25B2` | up arrow |
| ▼ | `\u25BC` | down arrow |
| → | `\u2192` | right flow arrow |
| ← | `\u2190` | left flow arrow |
| ↑ | `\u2191` | up flow arrow |
| ↓ | `\u2193` | down flow arrow |
| ✓ | `\u2713` | check mark |
| ✗ | `\u2717` | cross mark |
| · | `\u00b7` | middle dot |
| · | `\u2022` | bullet |
| — | `\u2014` | em dash |
| – | `\u2013` | en dash |
| " | `\u201C` | left curly quote |
| " | `\u201D` | right curly quote |
| ★ | `\u2605` | star |
