# Yarnification — Template Data Guide

Reference for generating pattern data to inject into `index.html`. Not user docs.

---

## 1. Stitch Types

All valid stitch keys and their display properties:

| Key | Symbol | Label | Description |
|---|---|---|---|
| `K` | `·` | K | Knit |
| `P` | `–` | P | Purl |
| `YO` | `O` | YO | Yarn Over |
| `K2TOG` | `/` | K2tog | Knit 2 Together |
| `SSK` | `\` | SSK | Slip Slip Knit |
| `SL` | `v` | Sl | Slip |

Stitch cycle order (Space key): `K → P → YO → K2TOG → SSK → SL → K`

Defined in `STITCH_TYPES` array and `SC` object at the top of `<script>`. To add a new type, add to both.

---

## 2. Row Object Schema

Each row in `pattern` is a plain object:

```js
{
  num: 1,                  // Integer. Display row number. Re-numbered automatically on add/delete.
  side: 'RS',              // 'RS' or 'WS'. RS rows display right-to-left (←); WS left-to-right (→).
  isRepeat: true,          // Boolean. If true, repeat counter is shown in the sidebar.
  repeatTotal: 8,          // Integer. Max repeat count for the counter. Ignored if isRepeat: false.
  stitches: ['K','P',...], // Array of stitch keys. Length = stitch count for this row.
  instruction: 'Row 1 (RS): *K2, P2; repeat from * to end. (24 sts)\nAnnotation on next line.',
                           // String. Shown verbatim in the sidebar instruction panel. \n renders as newline.
}
```

**Important:** `stitches` is the canonical (un-reversed) array regardless of RS/WS. The renderer reverses it for display on RS rows automatically. Click handlers convert display index back to array index.

### `ms()` helper

Shorthand for building repetitive stitch arrays:

```js
ms('K',2,'P',2)  // → ['K','K','P','P']
ms('K2TOG',1,'K',4,'SSK',1)  // → ['K2TOG','K','K','K','K','SSK']
```

Signature: `ms(...pairs)` where pairs are `(stitchKey, count)`.

---

## 3. Grid Object Schema

Each grid is an entry in the top-level `grids` array:

```js
{
  id: 'g0',              // String. Unique identifier (not currently used at runtime, for reference).
  label: 'Ribbed Beanie',// String. Displayed above the chart card on the canvas.
  x: 60,                 // Number. Canvas-space X position in pixels.
  y: 60,                 // Number. Canvas-space Y position in pixels.
  activeRow: 0,          // Number. Index into pattern[]. Which row is highlighted. Mutated at runtime.
  pattern: [ /* rows */ ],
}
```

### Canvas positioning

- Canvas uses `position: absolute` with `transform: translate(cx,cy) scale(cz)` on a `#canvas` div.
- Grid objects are `position: absolute` children of `#canvas` at `left: g.x px; top: g.y px`.
- On init, `fitToView()` is called in a `requestAnimationFrame` — it reads rendered `offsetWidth`/`offsetHeight` and auto-computes `cx`, `cy`, `cz` to fit all grids.
- **To place multiple grids**: set distinct `x`/`y` values with enough spacing. E.g. if grid A is ~700px wide, place grid B at `x: 800` to put it to the right.

### Adding a second grid

Append to the `grids` array. Everything else is automatic:

```js
const grids = [
  { id: 'g0', label: 'Brim', x: 60, y: 60, activeRow: 0, pattern: [...] },
  { id: 'g1', label: 'Body', x: 900, y: 60, activeRow: 0, pattern: [...] },
];
```

---

## 4. Sidebar / Right Panel — Data Connections

The right panel (`#rightPanel`) always reflects `grids[focusedGrid]` at row `grids[focusedGrid].activeRow`.

| Panel element | Source |
|---|---|
| `#panelTitle` | `"Row " + row.num` |
| `#rowSideLabel` | `row.side + " · read " + (RS ? "←" : "→")` |
| `#rowInstruction` | `row.instruction` (verbatim, `white-space: pre-line`) |
| `#notesInput` | `notes["${gi}_${ri}"]` — runtime dict, not persisted across page loads |
| `#repeatSection` | Rendered only if `row.isRepeat === true`; counter stored in `repeatCounters["${gi}_${ri}"]` |
| `#currentRowDisplay` (topbar) | `row.num` |

### Notes

`notes` is a plain `{}` object keyed by `"${gridIndex}_${rowIndex}"`. It is **runtime-only** — not saved to localStorage or anywhere persistent. Pre-populating notes at load time:

```js
let notes = { '0_0': 'Cast on 24 sts using long-tail method.' };
```

### Repeat counter

`repeatCounters` is keyed the same way as `notes`. Pre-seeding:

```js
let repeatCounters = { '0_0': 3 };
```

Counter only renders when `row.isRepeat === true`. `repeatTotal` is the max the counter counts to (e.g. number of times the repeat section appears).

---

## 5. Injection Points

To populate a new pattern, replace **only** the `grids` array (lines ~405–473). Everything else (rendering, keyboard, canvas, panel) is generic.

Minimal single-grid stub:

```js
const grids = [
  {
    id: 'g0',
    label: 'My Pattern',
    x: 60, y: 60,
    activeRow: 0,
    pattern: [
      { num:1, side:'RS', isRepeat:false, repeatTotal:0,
        stitches: ms('K',20),
        instruction: 'Row 1 (RS): Knit to end. (20 sts)' },
      { num:2, side:'WS', isRepeat:false, repeatTotal:0,
        stitches: ms('P',20),
        instruction: 'Row 2 (WS): Purl to end. (20 sts)' },
    ],
  },
];
```

---

## 6. Runtime State (do not inject, mutated at runtime)

| Variable | Type | Purpose |
|---|---|---|
| `focusedGrid` | number | Index of the grid whose row panel is shown |
| `editMode` | bool | Enables cell click/keyboard editing |
| `selectedCell` | `{gi,ri,si}` or `null` | Currently selected stitch; `si` is the array index (not display index) |
| `notes` | `{}` | Runtime notes keyed `"${gi}_${ri}"` |
| `repeatCounters` | `{}` | Repeat progress keyed `"${gi}_${ri}"` |
| `cx, cy, cz` | numbers | Canvas pan/zoom transform |
