<script>
  import { resolveText } from '../size.js';
  import { parseRow, serializeRow, nextStitch, STITCHES } from '../knit.js';

  // Grid block. When the block carries `.knit` notation we render it as an
  // interactive strip of stitch cells (Phase 5); otherwise we fall back to the
  // Phase 1 text stub. Collapse of long runs + count validation come in 5.3.
  let {
    block, indices = [], rowNo = null, lang = 'both', active = false,
    done = false, onToggle = () => {}, onSelect = () => {}, onEditKnit = null,
  } = $props();

  const text = $derived(resolveText(block.text ?? '', block.values ?? {}, indices));
  const arrow = $derived(block.side === 'RS' ? '←' : block.side === 'WS' ? '→' : '·');
  const showEn = $derived(lang !== 'zh');
  const showSource = $derived(lang !== 'en' && !!block.source);

  const parsed = $derived(block.knit ? parseRow(block.knit) : null);

  // Interleave markers/BOR with cells in logical order. Markers/BOR/edges are the
  // "change points"; a run of identical cells is naturally bounded by them.
  const seqBase = $derived.by(() => {
    if (!parsed) return [];
    const seq = [];
    if (parsed.bor.start) seq.push({ kind: 'bor' });
    for (let i = 0; i <= parsed.cells.length; i++) {
      if (parsed.markers.includes(i)) seq.push({ kind: 'marker' });
      if (i < parsed.cells.length) seq.push({ kind: 'cell', cell: parsed.cells[i] });
    }
    if (parsed.bor.end) seq.push({ kind: 'bor' });
    return seq;
  });

  // Collapse a run of >10 identical cells to: 2 · … · 2 (keep 2 either side of
  // every change point), with the run total on the ellipsis. Long rows stay legible.
  function collapseRuns(seq) {
    const out = [];
    let i = 0;
    while (i < seq.length) {
      const item = seq[i];
      if (item.kind !== 'cell') { out.push(item); i++; continue; }
      let j = i;
      while (j < seq.length && seq[j].kind === 'cell'
        && seq[j].cell.type === item.cell.type && seq[j].cell.raw === item.cell.raw) j++;
      const run = j - i;
      if (run > 10) {
        out.push(seq[i], seq[i + 1], { kind: 'ellipsis', total: run, type: item.cell.type }, seq[j - 2], seq[j - 1]);
      } else {
        for (let k = i; k < j; k++) out.push(seq[k]);
      }
      i = j;
    }
    return out;
  }

  // RS reads right-to-left, so flip the visual order (stitch 1 on the right).
  const orient = (seq) => (block.side === 'RS' ? [...seq].reverse() : seq);
  const stripInline = $derived(orient(collapseRuns(seqBase)));
  const stripFull = $derived(orient(seqBase));

  const count = $derived(parsed ? parsed.cells.length : 0);
  let expanded = $state(false);

  function meta(type) { return STITCHES[type] ?? STITCHES['?']; }

  // --- Edit mode ------------------------------------------------------------
  // Edits work on a local cell copy in logical order (stitch 1 → left) to avoid
  // reversal-index confusion. Add/remove happen at the end so interior markers
  // stay valid; Save serializes back to .knit and persists via onEditKnit.
  let editing = $state(false);
  let editCells = $state([]);
  let editMarkers = [];
  let editBor = { start: false, end: false };
  let editDeclared = null;

  function startEdit() {
    if (!parsed) return;
    editCells = parsed.cells.map((c) => ({ ...c }));
    editMarkers = [...parsed.markers];
    editBor = { ...parsed.bor };
    editDeclared = parsed.declared;
    editing = true;
  }
  function cycleCell(i) {
    editCells = editCells.map((c, k) => (k === i ? { type: nextStitch(c.type) } : c));
  }
  function addStitch() { editCells = [...editCells, { type: 'K' }]; }
  function removeStitch() { if (editCells.length > 1) editCells = editCells.slice(0, -1); }
  function saveEdit() {
    const knit = serializeRow({ cells: editCells, markers: editMarkers, bor: editBor, declared: editDeclared });
    editing = false;
    onEditKnit?.(knit);
  }
  function cancelEdit() { editing = false; }
</script>

<svelte:window onkeydown={(e) => { if (expanded && e.key === 'Escape') expanded = false; }} />

{#snippet cellStrip(items, big)}
  <div class="cells" class:big role="img" aria-label={`Stitch row: ${block.text ?? ''}`}>
    {#each items as item, k (k)}
      {#if item.kind === 'marker'}
        <span class="marker"></span>
      {:else if item.kind === 'bor'}
        <span class="bor" title="Beginning of round">BOR</span>
      {:else if item.kind === 'ellipsis'}
        <span class="ellipsis" title={`${item.total} × ${meta(item.type).label}`}>…<em>{item.total}</em></span>
      {:else}
        {@const m = meta(item.cell.type)}
        <span
          class="cell"
          class:unknown={item.cell.type === '?'}
          style="background:{m.bg};border-color:{m.border};color:{m.text}"
          title={item.cell.type === '?' ? `Unrecognized: ${item.cell.raw}` : m.desc}
        >{item.cell.type === '?' ? (item.cell.raw ?? '?') : m.symbol}</span>
      {/if}
    {/each}
  </div>
{/snippet}

{#if parsed}
  <div class="grid-card" class:active class:done role="button" tabindex="0"
    onclick={onSelect}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
    <div class="head">
      <input type="checkbox" class="check" checked={done}
        onclick={(e) => e.stopPropagation()} onchange={onToggle} aria-label="row done" />
      <span class="num">{rowNo ?? ''}</span>
      <span class="dir" class:ws={block.side === 'WS'}>{arrow}</span>
      <span class="caption">{text}</span>
      <span class="sts">{count} sts</span>
      {#if parsed.mismatch}
        <span class="warn" title={`Stitch count off: notation says ${parsed.declared >= 0 ? '+' : ''}${parsed.declared}, cells net ${parsed.net >= 0 ? '+' : ''}${parsed.net}`}>!</span>
      {/if}
      {#if onEditKnit && !editing}
        <button class="icon-btn" title="Edit stitches" aria-label="Edit stitches"
          onclick={(e) => { e.stopPropagation(); startEdit(); }}>✎</button>
      {/if}
      <button class="icon-btn" title="Expand" aria-label="Expand grid"
        onclick={(e) => { e.stopPropagation(); expanded = true; }}>⤢</button>
      <span class="tag">grid</span>
    </div>

    {#if editing}
      <div class="cells edit" role="group" aria-label="Editable stitches">
        {#each editCells as c, i (i)}
          {@const m = meta(c.type)}
          <button class="cell editable" class:unknown={c.type === '?'}
            style="background:{m.bg};border-color:{m.border};color:{m.text}"
            title={`${m.desc} — tap to change`}
            onclick={(e) => { e.stopPropagation(); cycleCell(i); }}
          >{c.type === '?' ? (c.raw ?? '?') : m.symbol}</button>
        {/each}
      </div>
      <div class="edit-tools">
        <button onclick={addStitch}>+ stitch</button>
        <button onclick={removeStitch} disabled={editCells.length <= 1}>− stitch</button>
        <span class="hint">tap a cell to cycle · stitch 1 on the left · {editCells.length} sts</span>
        <button class="save" onclick={saveEdit}>Save</button>
        <button onclick={cancelEdit}>Cancel</button>
      </div>
    {:else}
      {@render cellStrip(stripInline, false)}
    {/if}
    {#if showSource}<div class="source">{block.source}</div>{/if}
  </div>

  {#if expanded}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="backdrop" role="presentation" onclick={() => (expanded = false)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Grid" tabindex="-1" onclick={(e) => e.stopPropagation()}>
        <div class="sheet-head">
          <span class="caption">{text}</span>
          <span class="sts">{count} sts · reads {block.side === 'WS' ? 'left→right (WS)' : 'right→left (RS)'}</span>
          <button class="x" onclick={() => (expanded = false)} aria-label="Close">×</button>
        </div>
        <div class="sheet-body">{@render cellStrip(stripFull, true)}</div>
        {#if block.source}<div class="source">{block.source}</div>{/if}
      </div>
    </div>
  {/if}
{:else}
  <!-- Phase 1 text stub: no .knit data on this block yet -->
  <div class="row" class:active class:done onclick={onSelect} role="button" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
    <input type="checkbox" class="check" checked={done}
      onclick={(e) => e.stopPropagation()} onchange={onToggle} aria-label="row done" />
    <span class="num">{rowNo ?? ''}</span>
    <span class="dir" class:ws={block.side === 'WS'}>{arrow}</span>
    <span class="body">
      {#if showEn}<span class="text">{text}</span>{/if}
      {#if showSource}<span class="source">{block.source}</span>{/if}
    </span>
    <span class="tag">grid</span>
  </div>
{/if}

<style>
  /* ── shared row chrome ── */
  .row, .grid-card {
    width: 100%; border: 1px solid var(--border-soft); border-radius: var(--radius);
    background: var(--card); color: var(--text); cursor: pointer;
  }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
  .row:hover, .grid-card:hover { background: #fdfdfc; border-color: var(--border); }
  .grid-card { padding: 8px 10px; }
  .row.active, .grid-card.active { background: var(--highlight); border-color: var(--accent); }
  .row.done, .grid-card.done { opacity: 0.55; }
  .row.done .text { text-decoration: line-through; }

  .check { flex: none; width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
  .num { flex: none; width: 20px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-faint); }
  .dir { flex: none; width: 14px; text-align: center; color: var(--accent); font-size: 13px; }
  .dir.ws { color: var(--text-faint); }
  .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .text { font-size: 14px; }
  .tag {
    flex: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2px 7px; border-radius: 20px;
    background: var(--accent-soft); color: #92600b; border: 1px solid var(--accent-soft);
  }

  /* ── grid card head ── */
  .head { display: flex; align-items: center; gap: 8px; }
  .caption { flex: 1; min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sts { flex: none; font-size: 11px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
  .warn {
    flex: none; width: 16px; height: 16px; border-radius: 50%; font-size: 11px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    background: #fef2f2; color: #b91c1c; border: 1px solid #ef4444;
  }
  .icon-btn { flex: none; cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--text-muted); border-radius: 6px; font-size: 12px; padding: 1px 6px; }
  .icon-btn:hover { background: var(--panel); }

  .cell.editable { cursor: pointer; }
  .cells.edit { flex-wrap: wrap; overflow: visible; }
  .cells.edit .cell.editable:hover { outline: 2px solid var(--accent); outline-offset: 1px; }
  .edit-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .edit-tools button { cursor: pointer; font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 7px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
  .edit-tools button:hover:not(:disabled) { background: var(--panel); }
  .edit-tools button:disabled { opacity: 0.5; cursor: default; }
  .edit-tools .save { background: var(--accent-soft); border-color: var(--accent-soft); color: #92600b; }
  .edit-tools .hint { flex: 1; min-width: 120px; font-size: 11px; color: var(--text-faint); }

  /* ── the stitch strip ── */
  .cells { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 2px; margin-top: 8px; padding-bottom: 4px; }
  .cell {
    flex: none; width: 22px; height: 22px; border: 1px solid; border-radius: 4px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; line-height: 1; font-variant-numeric: tabular-nums;
  }
  .cell.unknown { font-size: 9px; font-weight: 700; }
  .cells.big .cell { width: 40px; height: 40px; font-size: 20px; border-radius: 6px; }
  .cells.big .cell.unknown { font-size: 12px; }
  .ellipsis {
    flex: none; align-self: center; display: inline-flex; flex-direction: column; align-items: center;
    min-width: 22px; color: var(--text-muted); font-size: 13px; line-height: 1;
  }
  .ellipsis em { font-style: normal; font-size: 8px; color: var(--text-faint); margin-top: 1px; font-variant-numeric: tabular-nums; }
  .cells.big .ellipsis { min-width: 40px; font-size: 20px; }
  .cells.big .ellipsis em { font-size: 11px; }
  .marker { flex: none; width: 3px; align-self: stretch; background: var(--accent); border-radius: 2px; margin: 0 1px; }
  .cells.big .marker { width: 4px; }
  .bor {
    flex: none; align-self: center; font-size: 8px; font-weight: 700; letter-spacing: .02em;
    padding: 2px 3px; border-radius: 4px; background: var(--accent); color: #fff;
  }
  .cells.big .bor { font-size: 11px; padding: 3px 5px; }

  .source { margin-top: 6px; font-size: 12px; color: var(--text-faint); line-height: 1.4; }

  /* ── fullscreen sheet ── */
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 40; }
  .sheet { width: 100%; max-width: 900px; max-height: 85vh; overflow: auto; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); cursor: default; }
  .sheet-head { display: flex; align-items: center; gap: 10px; }
  .sheet-head .caption { font-size: 14px; font-weight: 600; white-space: normal; }
  .x { flex: none; margin-left: auto; cursor: pointer; border: none; background: none; font-size: 22px; line-height: 1; color: var(--text-muted); }
  .sheet-body { margin-top: 12px; }
  .sheet-body .cells { flex-wrap: wrap; overflow-x: visible; }
</style>
