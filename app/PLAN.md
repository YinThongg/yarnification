# Yarnification v2 — Build Plan

A knitting pattern tracker you can use offline. The app is a **renderer + tracker only** — it
never calls a model. Claude (in the loop, on request) converts a pattern PDF into the data file
the app loads. Built as a Svelte + Vite PWA.

## Core model

A pattern is data with this shape. The app is a dumb loop over `sections[].blocks[]`.

```
pattern
├─ meta         { title, yarn, needle, gauge, tools, sourceLang }
├─ sizes        all sizes kept (labels + finished measurements)   ← free, from the PDF
├─ chosen       [ "2" ]  or  [ "2", "3" ]                          ← user picked at generation
└─ sections[]
     ├─ name    "Lace border" / 蕾丝底边
     └─ blocks[]  one of three types:
          ├─ counter  plain rows: "knit to end", "repeat until 21cm"      → checkbox / counter
          ├─ grid     fully-written stitches: "K1,*(K4,yo,k2tog)* to end" → interactive .knit grid
          └─ chart    "work 图表N": cropped image + row-band overlay       → the prototype
```

Numbers resolve as `chosen` → display (`50` for one size, `50(58)` for two). All sizes stay in
the data; only `chosen` is shown. Rare size-specific whole steps carry an `appliesTo` tag.

## Design rules (locked)

- No AI/network in the app. Patterns arrive as a data file Claude produces.
- Charts are **cropped from the PDF**, never redrawn. Transcribing a chart to an interactive
  grid is an on-demand, per-chart action ("Make interactive"), verified against the crop.
- Never strip sizes from the data. Reading view shows only `chosen`.
- Preserve original-language source text per row; translation is additive.
- Flag unrecognized stitches on the cell — never guess silently.
- Keep the old `index.html` app untouched; v2 lives in `app/`.

---

## Phases

Each **step** is a small, self-contained unit with a checkable outcome. Each **phase** ends with a
demo ("done when"). Build top to bottom; don't start a phase until the previous one's demo passes.

### Phase 0 — Foundation  ✅ (done)
- [x] 0.1 Vite + Svelte 5 scaffold in `app/`.
- [x] 0.2 Chart row-band overlay prototype (`lib/ChartOverlay.svelte`) on the real 77-row 图表2.
- [x] 0.3 Launch config wired for preview.

---

### Phase 1 — Data model + static render
Render the mockup from real data, read-only. No persistence, no editing.

- [x] 1.1 **Schema** — `patterns/SCHEMA.md`: `meta`, `sizes`, `chosen`, `sections[].blocks[]`
      with the three block types, graded values stored whole.
- [x] 1.2 **Size resolver** — `lib/size.js` (`parseGraded`, `indicesFor`, `resolveGraded`,
      `resolveText`) + `size.test.js` (10 tests, `npm test`). Handles `a, b, c (d, e, f) [g, h, i]`.
- [x] 1.3 **Seed data** — `patterns/luoshen-vest.json` (Lace border section, all three block
      types), meta + sizes from the PDF, 图表1 size-variant crops in `public/charts/luoshen/`.
      Validated: resolves to size-2 numbers matching the mockup.
- [x] 1.4 **App shell** — `App.svelte`: header (title + resolved size/lang chips), sidebar +
      main regions, loads `luoshen-vest.json`. Theme tokens in `app.css`. Server pinned to :5175.
- [x] 1.5 **SectionList** — `lib/SectionList.svelte`, lists sections (name + 原文), tracks selected.
- [x] 1.6 **CounterBlock** — `lib/blocks/CounterBlock.svelte`, old-app row style: `[#][←/→]text`,
      resolved numbers, target, kind/grid tags, active highlight. (grid routed here until 1.8.)
- [x] 1.7 **ChartBlock** — `lib/blocks/ChartBlock.svelte`, chart-card with the row-band overlay,
      per-size image, repeat counter, calibrate. Verified stepping the band on real 图表1.
- [~] 1.10 partial — block loop wired into `App.svelte` (theme retuned to match old index.html).
- [~] 1.9 partial — bilingual EN/中文 shown inline per row (source text); a dedicated panel may
      still come. Language chip toggles EN / 中文 / both.
- [~] 2.4 + 2.5 pulled forward — keyboard: ↑/↓ active row, ←/→ chart row, +/=/−/_ repeat.
      Chart row/rep state lifted into `App.svelte` (not yet persisted — that's still 2.1).
- [ ] 1.8 **GridBlock stub** — `lib/blocks/GridBlock.svelte`, render the raw written stitch text
      (real interactive grid comes in Phase 5).
- [ ] 1.9 **Panels** — metadata panel + original-text panel (shows source text for selected row).
- [ ] 1.10 **Wire together** — `App` loops `sections → blocks`, renders the right component per
      `block.type`. Extend seed data to a 2nd section to prove the loop.
- **Done when:** the Lace border section renders from `luoshen-vest.json` and matches the mockup,
      switching sections in the sidebar works, and numbers show size 2 only.

---

### Phase 2 — Interactivity + progress
Make it a real tracker. State survives refresh.

- [ ] 2.1 **Progress store** — `stores/progress.js`, shape + `localStorage` load/save, keyed by
      `patternId + chosen`.
- [ ] 2.2 **Checkboxes** — CounterBlock rows tick on/off, wired to the store, persist.
- [ ] 2.3 **Row counter** — increment/decrement control with target display ("剩 7 sts").
- [ ] 2.4 **Current-row highlight + keys** — selected row highlighted; ↑/↓ move within a section.
- [ ] 2.5 **Repeat counters** — `Repeat n/N` for chart + repeat blocks, wired to store.
- [ ] 2.6 **Per-row notes** — freeform text saved per row.
- [ ] 2.7 **Chart calibration persists** — top/bottom/rows/direction saved per chart.
- [ ] 2.8 **Reset controls** — reset a section's or the whole pattern's progress.
- **Done when:** you can knit through the section, tick/count everything, refresh, and land back
      exactly where you were.

---

### Phase 3 — Offline / PWA + library
Installable, works with no internet.

- [ ] 3.1 **PWA plugin** — add `vite-plugin-pwa`; manifest (name, icons, theme color).
- [ ] 3.2 **Service worker** — precache app shell + pattern assets (images).
- [ ] 3.3 **Library store** — `stores/library.js`, list of installed patterns.
- [ ] 3.4 **My patterns screen** — list / open / delete saved patterns.
- [ ] 3.5 **Install + mobile** — installability check; verify on mobile viewport.
- [ ] 3.6 **Offline round-trip** — load with network cut, confirm everything works.
- **Done when:** installed to home screen, opened offline, a saved pattern loads and tracks.

---

### Phase 4 — Ingestion pipeline (the "loop me in" flow)
Get a new PDF in with minimal tokens. App does extraction; Claude does conversion.

- [ ] 4.1 **PDF upload + render** — in-app upload, render pages with `pdf.js`.
- [ ] 4.2 **Text extraction** — pull selectable text per page (local, no AI).
- [ ] 4.3 **Section detection** — heuristic split on bold headers / known markers.
- [ ] 4.4 **Chart-crop tool** — draw a box on a rendered page → export a PNG into pattern assets.
- [ ] 4.5 **Ask-before-generating UI** — summary confirm + 3 questions (size / language / scope).
- [ ] 4.6 **Export bundle** — package extracted text + crops + answers for Claude.
- [ ] 4.7 **Import contract** — define `pattern.json` handoff; import a returned JSON into library.
- [ ] 4.8 **(Optional) paste-JSON slot** — quick in-app import without a file.
- **Done when:** upload the vest PDF, crop its charts, answer 3 questions, hand the bundle to
      Claude, drop the returned JSON back, and it appears as a trackable pattern.

---

### Phase 5 — Grid depth + polish
Parity with the old app's power features, plus the new ones.

- [ ] 5.1 **Port `.knit` parser** — move parser to a module + tests.
- [ ] 5.2 **Real GridBlock** — render cells, symbols, per-type colors, reading direction.
- [ ] 5.3 **Markers/BOR + collapse + validation** — thick lines, BOR indicator, `...` collapse,
      count-mismatch flag.
- [ ] 5.4 **Edit mode** — cycle stitch type, add/remove stitches, add/delete rows.
- [ ] 5.5 **Make chart interactive** — transcribe one chart → `.knit`, image pinned beside to verify.
- [ ] 5.6 **Two-size display** — `50(58)` + `appliesTo` size-specific steps.
- [ ] 5.7 **Ambiguity flagging** — `?`-prefixed tokens highlighted with tooltip.
- [ ] 5.8 **Mobile touch + export** — touch the grid; print/export.
- **Done when:** a fully-written pattern renders as an editable interactive grid at parity with
      `index.html`, and a chart can be turned interactive.

---

## Open questions (decide when we reach them)
- Sidebar layout on mobile (drawer vs. top tabs).
- Where the chart crop-region calibration lives (per pattern vs. per session).
- Handoff format details for Phase 4 (single JSON vs. per-section fragments).
