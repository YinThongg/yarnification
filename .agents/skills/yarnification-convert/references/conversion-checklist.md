# Conversion checklist

Use this checklist as a gate, not as optional polish. A conversion is incomplete when it loses written instructions, retains only the chosen size, or loses chart linkage.

## 1. Inventory the source

Before writing JSON, record:

- title, designer, construction, yarn, yardage, needles, gauge, tools, and notes;
- the complete ordered size-label list and all measurements;
- the chosen size or between-size pair, confirmed by the user or supplied by the source bundle; never infer or default it from the source order;
- every named section and separate piece in knitting order;
- every chart, chart variant, schematic that carries knitting instructions, and symbol legend;
- every explicit row or round, repeated row range, finite repeat count, and repeat-until condition;
- every marker, BOR, side designation, turn, stitch-count checkpoint, and size-specific branch.

Search extracted text for chart references such as `chart`, `diagram`, `图表`, `图解`, `花样`, and `符号`, but also inspect every rendered page. A picture can be absent from extracted text.

## 2. Verify sizes

If the active size is not already explicit in the user's request or source bundle, ask before converting the pattern. Do not infer it from source order.

Treat grouped grading such as `(84, 89)(95, 100)(104, 109)(114, 119)` as eight source sizes even if the user chose only the first one. Store all eight labels and all eight values. Use `chosen` only to decide which counts to expand into `knit`.

Do not translate a numbered or named source size into a different label unless the source provides that mapping. If labels are missing from extraction, recover them from the rendered size table or ask the user.

## 3. Choose blocks

| Source behavior | Block | Required tracking |
| --- | --- | --- |
| Written cast-on, bind-off, setup, row/round, measurement, finishing, or other prose | `counter` | Checkbox, side where relevant, and optional stitch `target` |
| Instruction says to work from a chart | `chart` | Matching crop ID, chart rows, reading direction, and repeat total |
| Machine-readable stitch grid supplied by the source/bundle, or a grid explicitly requested by the user | `grid` | Cells, side, markers/BOR/turns, and stitch-count delta |
| Repeat rows/rounds a known number of times | `counter` with `kind: "repeat"` | `repeat` total plus the preserved row range |
| Repeat until a condition or measurement | `counter` with `kind: "repeat"` | `until` condition; no invented total |

Do not derive a stitch grid from prose merely because the row is detailed enough to expand. Use counters for written rows unless the user explicitly requests generated grids. Do not replace a chart with a prose transcription when the chart is present; preserve both the chart and any accompanying written instructions.

## 4. Preserve charts

For an ingestion bundle:

- copy top-level `draftId` byte-for-byte;
- create exactly one chart block for each `charts[].id`;
- use the crop ID as `chartId` byte-for-byte;
- never add file paths or data URLs—the app merges private crops from IndexedDB;
- preserve size-specific chart variants as separate crops/blocks when the PDF distinguishes them;
- set `rows`, `readDir`, `repeat`, and original-language `source` from the PDF;
- connect a symbol legend through `meta.symbolLegendImage` or a chart block's `legendImage` only when a real reusable asset exists.

If the bundle has `chartReview: "confirmed-none"`, accept zero chart blocks. Otherwise, zero captured charts means chart completeness is unresolved.

## 5. Preserve repeats

Keep the rows being repeated as individual counter blocks (or source-supplied/user-requested grid blocks), followed by one repeat counter that states the row range. For a known total, store a graded `repeat` string when totals differ by size. For an open-ended instruction, store the stopping condition in `until` and do not invent a total.

Examples:

```jsonc
{
  "type": "counter",
  "kind": "repeat",
  "text": "Work Rows 1-2 five times total.",
  "repeat": "5, 5, 6, 6",
  "source": "Verbatim source instruction"
}
```

```jsonc
{
  "type": "counter",
  "kind": "repeat",
  "text": "Repeat Round 2 until the underarm measures 11 cm.",
  "until": "11 cm or preferred fit",
  "source": "Verbatim source instruction"
}
```

## 6. Final audit

- Compare section order and block order with the source page by page.
- Compare the count of source chart crops with chart blocks and verify each ID.
- Confirm the complete source size list remains in `sizes.labels` and all measurement arrays align with it.
- Confirm every written row or round is preserved as a counter unless grid data was supplied or the user explicitly requested generated grids.
- For every warranted grid, confirm increases/decreases have the correct `[+N]`/`[-N]` marker.
- Confirm every repeat instruction has a tracker and its base rows remain adjacent.
- Confirm every block has verbatim `source` and every ambiguity is visible rather than silently guessed.
- Validate, then import into the app and inspect at least one normal row counter, every chart, every repeat control, and any warranted grids.
