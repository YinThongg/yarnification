# Yarnification

A knitting pattern tracker you can use offline. Follow a pattern row by row, with counters,
charts, and per-row notes — no internet needed once a pattern is loaded.

## Two things in this repo

- **`index.html`** — the original single-file tracker (Tailwind CDN, embedded pattern). Still works: just open it in a browser.
- **`app/`** — the v2 rebuild: a Svelte + Vite app that renders patterns from data. See [`app/PLAN.md`](app/PLAN.md) for the roadmap.

## Running the v2 app

```bash
cd app
npm install
npm run dev
```

## Note on patterns

The app is a renderer/tracker only — it doesn't include any copyrighted knitting patterns.
Sample pattern content (chart images, pattern data) is kept out of this repo on purpose.
