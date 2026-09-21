---
name: yarnification-convert
description: Convert, import, repair, or validate a knitting pattern PDF, extracted text, or Yarnification bundle into app-ready pattern.json, preserving all sizes, chart crops, written instructions, original-language source, and repeat tracking. Use for any Yarnification pattern ingestion or pattern-data repair; never generate the retired standalone HTML tracker.
---

# Yarnification Convert

Produce validated `pattern.json` for the Yarnification Svelte app. Keep pattern sources and generated results private and out of Git.

## Inspect before converting

Read:

- [references/pattern-json.md](references/pattern-json.md) for the import contract.
- [references/conversion-checklist.md](references/conversion-checklist.md) for the required inventory, block decisions, chart rules, and final audit.
- [references/knit-notation.md](references/knit-notation.md) before writing any grid block.

Use ignored directories such as `.yarnification-work/` for extraction and `.yarnification-output/` for results. Never put a source PDF, page render, OCR text, chart crop, bundle, generated pattern JSON, or `.knit` file inside this skill.

Before converting any graded pattern, ask the user which size or between-size pair should be active unless the request or source bundle already states it. Do not infer or default the active size from the source order. Record the answer in `chosen`; it selects the working size but never removes the other source sizes or graded values.

For PDF input, inspect every rendered page as well as extracted text. Text extraction alone cannot prove that a PDF has no chart. If any chart, schematic used as knitting instructions, or symbol legend is present, capture it through Yarnification's PDF ingestion flow before completing the conversion. If the visual source is unavailable, stop and explain that chart completeness cannot be verified.

For a Yarnification bundle, use `pages`, `answers`, `sectionHints`, `charts`, `chartReview`, and `draftId`. Treat its chart list as mandatory: create exactly one matching chart block for every crop ID and copy `draftId` exactly so the app can merge locally stored crops.

## Build the pattern

Create one JSON object following the app contract.

- Preserve every source size label and every graded value. `chosen` selects the working size; it never reduces `sizes.labels` or erases other sizes.
- Do not synthesize stitch grids from written prose. Preserve written row and round instructions as `counter` blocks, even when they contain a complete stitch sequence.
- Create a `grid` only when the source or bundle directly supplies machine-readable stitch-grid data, or when the user explicitly requests generated grids. When a grid is warranted, use the first `chosen` size for its `knit` expansion and never substitute another size's counts.
- Preserve verbatim original-language instructions in every block's `source`. Add translations in display fields without replacing the source.
- Classify blocks by behavior: written instructions become `counter`; instructions delegated to an image become `chart`; directly supplied or explicitly requested stitch-grid data becomes `grid`; repeated row ranges and repeat-until instructions become repeat counters.
- Keep base rows immediately before their repeat tracker. Record a known finite repeat total in the repeat block's `repeat`; leave open-ended repeats unbounded and retain their `until` condition.
- Preserve markers, BOR, RS/WS direction, increases, decreases, short-row turns, and stitch-count checkpoints in counter text and source. For a warranted grid, represent them explicitly in `.knit`, append `[+N]` or `[-N]` when the row changes the stitch count, and prefix genuinely unclear source abbreviations with `?`; never guess.
- Create a new section or piece only when the source clearly separates it. Ask the user if separation affects knitting order and remains ambiguous.

Write to the requested path or `.yarnification-output/<pattern-id>.pattern.json`. Do not overwrite an existing output without permission.

## Validate against the source

For a bundle conversion, always run:

```bash
node .agents/skills/yarnification-convert/scripts/validate-pattern.mjs \
  .yarnification-output/<pattern-id>.pattern.json \
  .yarnification-work/<pattern-id>.bundle.json
```

For text or PDF input without a bundle, run the validator with only the pattern path, then manually complete the visual chart audit from [references/conversion-checklist.md](references/conversion-checklist.md).

Fix every error and investigate every warning. Do not hand off a pattern with missing charts, missing source sizes, incomplete written instructions, empty warranted grids, untracked repeats, or unexplained warnings.

Finally run `git status --short --ignored` and confirm every per-pattern input and output is ignored. Never stage or publish private pattern material unless the user explicitly requests it.
