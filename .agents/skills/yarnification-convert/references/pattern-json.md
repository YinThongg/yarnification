# Yarnification `pattern.json` contract

The Svelte app imports one JSON object with metadata, every available size, the active size selection, and ordered sections containing blocks.

## Top level

```jsonc
{
  "id": "stable-pattern-slug",
  "draftId": "optional-id-copied-from-bundle",
  "meta": {
    "title": "Original title",
    "titleEn": "Optional translated title",
    "designer": "Optional designer",
    "yarn": "Full yarn information",
    "yardage": "Optional yardage",
    "needle": "Needle sizes",
    "gauge": "Gauge",
    "tools": "Optional tools",
    "sourceLang": "ISO language code",
    "notes": "Construction and finished-measurement notes"
  },
  "sizes": {
    "labels": ["XS", "S", "M"],
    "measurements": [
      { "name": "Finished bust", "unit": "cm", "values": ["84", "92", "100"] }
    ]
  },
  "chosen": ["XS"],
  "sections": []
}
```

`sizes.labels` determines graded-value order. `chosen` contains one label, or two labels when the user is knitting between sizes. Preserve all sizes. If a source-supplied or user-requested grid is present, its `knit` string represents the first chosen size.

## Sections

```jsonc
{
  "id": "body",
  "name": "Body",
  "nameSource": "Original-language section name",
  "blocks": []
}
```

Section and pattern IDs are stable lowercase slugs. Keep blocks in knitting order.

## Shared block fields

Every block has a `type` of `counter`, `grid`, or `chart`. Every block must include non-empty verbatim original-language `source` text.

Optional shared fields:

- `text`: user-facing instruction; may contain `{key}` placeholders.
- `values`: maps placeholders to complete graded strings, such as `"84, 92, 100"`.
- `side`: `RS`, `WS`, or `null`.
- `appliesTo`: size labels for a size-specific instruction.

## Counter blocks

Use for all written instructions, including cast-ons, setup, complete row/round sequences, narrative steps, and repeat-until instructions. Do not synthesize a grid from prose unless the user explicitly requests it.

```jsonc
{
  "type": "counter",
  "kind": "caston",
  "text": "Cast on {n} sts.",
  "values": { "n": "84, 92, 100" },
  "target": "{n}",
  "source": "Verbatim source instruction"
}
```

`kind` is `caston`, `setup`, `row`, or `repeat`. `target` is an optional stitch-count checkpoint and may refer to a value placeholder.

For `kind: "repeat"`, add `repeat` when the source gives a finite total. It may be a graded string and drives a bounded repeat counter. For an open-ended repeat, omit `repeat` and preserve the stopping condition in `until`.

## Grid blocks

Use only when the source or bundle directly supplies machine-readable stitch-grid data, or when the user explicitly requests a generated grid. A detailed written row remains a counter by default.

```jsonc
{
  "type": "grid",
  "side": "RS",
  "text": "Knit to marker, increase around each raglan stitch.",
  "knit": "BOR,K24,M1R | K1 | M1L,K25,BOR [+2]",
  "source": "Verbatim source row"
}
```

Follow [knit-notation.md](knit-notation.md). A `grid` block must have a complete `knit` value for the first chosen size.

## Chart blocks

Use a chart block when the source delegates to a diagram.

```jsonc
{
  "type": "chart",
  "chartId": "chart1",
  "name": "Chart 1",
  "nameSource": "Original chart name",
  "rows": 12,
  "repeat": "2, 2, 3",
  "readDir": "rs-rtl",
  "source": "Verbatim source chart instruction"
}
```

For a Yarnification bundle, use its chart ID unchanged and omit invented image paths. The app merges the locally stored crop during import by `draftId` plus `chartId`. Existing reusable chart assets may instead use `imageBySize`, mapping size labels to image URLs.

Every chart crop in a bundle must have exactly one chart block. A zero-chart bundle is complete only when its `chartReview` says `confirmed-none`.
