<script>
  import { getDraft, deleteDraft, putPattern } from './stores/library.js';

  // Import a pattern.json returned by Claude: paste it or pick the file, we
  // validate it, merge the chart crops saved in the matching draft back into the
  // chart blocks, install it, and open it. `onImported(record)` hands back the
  // saved pattern; `onClose` dismisses.
  let { onClose, onImported } = $props();

  let text = $state('');
  let fileName = $state('');
  let error = $state('');
  let note = $state('');
  let busy = $state(false);

  async function onFile(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    fileName = file.name;
    error = '';
    try {
      text = await file.text();
    } catch {
      error = `Couldn't read ${file.name}.`;
    }
  }

  function validate(p) {
    if (!p || typeof p !== 'object') return 'Not a JSON object.';
    if (typeof p.id !== 'string' || !p.id) return 'Missing "id".';
    if (!p.sizes || !Array.isArray(p.sizes.labels)) return 'Missing "sizes.labels".';
    if (!Array.isArray(p.chosen) || p.chosen.length === 0) return 'Missing "chosen".';
    if (!Array.isArray(p.sections)) return 'Missing "sections".';
    return null;
  }

  // Put each draft crop into the chart block's imageBySize (single crop shared
  // across every size label — ChartBlock reads imageBySize[chosen[0]]).
  function mergeCrops(pattern, draft) {
    const byId = Object.fromEntries((draft?.charts ?? []).map((c) => [c.id, c.dataUrl]));
    const labels = pattern.sizes.labels;
    let chartBlocks = 0;
    let merged = 0;
    for (const section of pattern.sections) {
      for (const block of section.blocks ?? []) {
        if (block.type !== 'chart') continue;
        chartBlocks++;
        const url = byId[block.chartId];
        if (url) {
          block.imageBySize = Object.fromEntries(labels.map((l) => [l, url]));
          merged++;
        }
      }
    }
    return { chartBlocks, merged };
  }

  async function add() {
    error = '';
    note = '';
    let pattern;
    try {
      pattern = JSON.parse(text);
    } catch (e) {
      error = `Invalid JSON: ${e.message}`;
      return;
    }
    const bad = validate(pattern);
    if (bad) {
      error = bad;
      return;
    }

    busy = true;
    try {
      let draft = null;
      if (pattern.draftId) {
        try { draft = await getDraft(pattern.draftId); } catch { /* no store */ }
      }
      const { chartBlocks, merged } = mergeCrops(pattern, draft);
      const record = await putPattern(pattern);
      if (pattern.draftId && draft) {
        try { await deleteDraft(pattern.draftId); } catch { /* best effort */ }
      }
      if (chartBlocks > merged) {
        // Installed, but some charts have no image — surface it rather than fail.
        note = `Imported. ${chartBlocks - merged} of ${chartBlocks} chart${chartBlocks === 1 ? '' : 's'} had no matching crop` +
          (pattern.draftId ? (draft ? '.' : ' — the draft for this pattern wasn’t found on this device.') : ' (no draftId in the JSON).');
      }
      onImported(record);
    } catch (e) {
      error = `Couldn't save: ${e.message ?? e}`;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" role="presentation" onclick={onClose}>
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="imp-title" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <header class="head">
      <h2 id="imp-title">Import pattern.json</h2>
      <button class="x" onclick={onClose} aria-label="Close">×</button>
    </header>

    <p class="lead">Paste the JSON Claude returned, or choose the file. Its chart images are merged
      from the crops you captured when exporting.</p>

    <label class="filebtn">
      Choose pattern.json…
      <input type="file" accept="application/json,.json" onchange={onFile} />
    </label>
    {#if fileName}<span class="fname">{fileName}</span>{/if}

    <textarea bind:value={text} rows="9" placeholder="{'{'}\n  &quot;id&quot;: &quot;…&quot;,\n  &quot;sections&quot;: […]\n{'}'}"></textarea>

    {#if error}<p class="err">{error}</p>{/if}
    {#if note}<p class="warn">{note}</p>{/if}

    <div class="actions">
      <button onclick={onClose}>Cancel</button>
      <button class="primary" disabled={busy || !text.trim()} onclick={add}>{busy ? 'Importing…' : 'Add to library'}</button>
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; }
  .dialog { width: 100%; max-width: 560px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
  .head { display: flex; align-items: center; justify-content: space-between; }
  .head h2 { margin: 0; font-size: 1.1rem; }
  .x { cursor: pointer; border: none; background: none; font-size: 22px; line-height: 1; color: var(--text-muted); }
  .lead { margin: 8px 0 14px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }

  .filebtn { display: inline-block; cursor: pointer; font-size: 13px; padding: 7px 12px; border-radius: 8px; background: var(--panel); color: var(--text); border: 1px solid var(--border); }
  .filebtn:hover { background: var(--card); }
  .filebtn input { display: none; }
  .fname { margin-left: 8px; font-size: 12px; color: var(--text-muted); }

  textarea { width: 100%; margin-top: 12px; resize: vertical; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); color: var(--text); font: inherit; font-size: 12px; line-height: 1.5; }
  textarea:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }

  .err { margin: 10px 0 0; font-size: 12px; color: #a33; }
  .warn { margin: 10px 0 0; font-size: 12px; color: #92600b; }

  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  .actions button { cursor: pointer; font: inherit; font-size: 13px; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
  .actions button:hover:not(:disabled) { background: var(--panel); }
  .actions .primary { background: var(--accent-soft); border-color: var(--accent-soft); color: #92600b; }
  .actions .primary:disabled { opacity: 0.5; cursor: default; }
</style>
