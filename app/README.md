# Yarnification app

The current Yarnification tracker is a Svelte 5 + Vite PWA. It imports `pattern.json`, stores patterns in IndexedDB, and keeps progress in local browser storage.

## Development

```bash
npm install
npm run dev
```

Run verification with:

```bash
npm test
npm run build
```

Private patterns may be kept as JSON files under `app/patterns/`; that directory is ignored and loaded only when files exist. A clean checkout uses the synthetic `src/demo-grid.json` seed.

## Pattern workflow

1. Open **Add a pattern** and choose a PDF.
2. Review every page, crop every knitting chart, and enter the chosen size.
3. Export the bundle and use the repository's `$yarnification-convert` Codex skill.
4. Import the returned `pattern.json`.

The generated file keeps every source size and uses the chosen size only for stitch-grid expansion.
