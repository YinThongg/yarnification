# Yarnification repository instructions

Preserve existing Svelte app behavior when changing code. Do not delete or replace current features unless the user explicitly asks.

## Pattern conversion

Use `.agents/skills/yarnification-convert/SKILL.md` whenever the user asks to convert, import, repair, or validate a knitting pattern. The supported output is `pattern.json` for the current app's import flow.

For PDFs, inspect rendered pages and preserve every chart crop. Preserve all source sizes, use grid blocks for explicit stitch rows, and add repeat trackers for every finite or open-ended repeat.

Do not generate or restore the retired standalone HTML/whiteboard tracker.

## Private data

Never stage or commit source pattern PDFs, extracted page images, OCR text, chart crops, generated pattern JSON, `.knit` files, or other per-pattern material unless the user explicitly requests it. Keep that material in paths covered by `.gitignore` and verify with `git status` before any commit.

Tracked tests and examples must use synthetic pattern content.
