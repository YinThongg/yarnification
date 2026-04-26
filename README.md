# Yarnification — Knitting Pattern Tracker

A browser-based knitting chart tracker. Single standalone HTML file, no build step, no server.

## Features

- **Knitting chart grid** — standard symbols (K, P, YO, K2tog, SSK, Sl) with per-type color coding
- **Correct reading direction** — RS rows display right-to-left (←), WS rows left-to-right (→) as per standard chart convention
- **Row sidebar** — row number and stitch count per row
- **Active row highlighting** — selected row highlighted in yellow; navigate with ↑/↓ arrow keys
- **Row instruction panel** — shows the written instruction for the selected row
- **Edit mode** — click any stitch cell to cycle its type; add/remove stitches; add/delete rows
- **Notes per row** — freeform text note saved per row
- **Repeat counter** — for repeat-section rows, track progress with +/− buttons
- **Legend** — stitch symbol and color reference

## Getting Started

Just open `index.html` in a browser. No installation needed.

```bash
open index.html
# or
npx serve .
```

Requires an internet connection on first load to pull Tailwind CSS from CDN. For offline use, replace the CDN `<script>` tag with a local copy of Tailwind.

## Project Structure

```
yarnification/
├── index.html   # Everything — layout, styles, logic, pattern data
└── README.md
```

## Roadmap

- [ ] PDF upload + parsing to extract pattern rows automatically
- [ ] Save/load patterns (localStorage or file export)
- [ ] Multiple pattern support
- [ ] Stitch count validation (detect decrease/increase mismatches)
- [ ] Print/export as PDF chart
- [ ] Mobile touch support for the chart grid
