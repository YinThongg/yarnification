# Yarnification

An offline-first Svelte knitting pattern tracker. Patterns are imported as structured
`pattern.json` data and stored locally in the browser.

## Run the app

```bash
cd app
npm install
npm run dev
```

## Convert a pattern with Codex

The repository includes a repo-scoped Codex skill, so a clone contains the conversion workflow and
validator:

1. In the app, choose **Add a pattern** and select the PDF.
2. Inspect every rendered page and crop every knitting chart. If there are none, confirm that check.
3. Enter the chosen size, export `bundle.json`, and give it to Codex with `$yarnification-convert`.
4. Import the validated `pattern.json` that Codex returns.

The skill preserves all source sizes while expanding grids for the chosen size. It also enforces
chart linkage, original-language source text, stitch-count changes, and repeat trackers.

## Private pattern data

Source PDFs, extracted pages, chart crops, bundles, generated pattern files, and private seed
patterns are ignored. Keep temporary work in `.yarnification-work/` and output in
`.yarnification-output/`. The tracked `app/src/demo-grid.json` is synthetic and exists only to
exercise the UI.
