<script>
  import { resolveText } from '../size.js';

  // Phase 1 grid stub: keep written stitch instructions distinct from plain
  // counter rows. Phase 5 replaces this body with the interactive .knit grid.
  let {
    block, indices = [], rowNo = null, lang = 'both', active = false,
    done = false, onToggle = () => {}, onSelect = () => {},
  } = $props();

  const text = $derived(resolveText(block.text ?? '', block.values ?? {}, indices));
  const arrow = $derived(block.side === 'RS' ? '←' : block.side === 'WS' ? '→' : '·');
  const showEn = $derived(lang !== 'zh');
  const showSource = $derived(lang !== 'en' && !!block.source);
</script>

<div
  class="row"
  class:active
  class:done
  onclick={onSelect}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
>
  <input
    type="checkbox"
    class="check"
    checked={done}
    onclick={(e) => e.stopPropagation()}
    onchange={onToggle}
    aria-label="row done"
  />
  <span class="num">{rowNo ?? ''}</span>
  <span class="dir" class:ws={block.side === 'WS'}>{arrow}</span>
  <span class="body">
    {#if showEn}<span class="text">{text}</span>{/if}
    {#if showSource}<span class="source">{block.source}</span>{/if}
  </span>
  <span class="tag">grid</span>
</div>

<style>
  .row {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 10px; border: 1px solid var(--border-soft); border-radius: var(--radius);
    background: var(--card); color: var(--text); cursor: pointer;
  }
  .row:hover { background: #fdfdfc; border-color: var(--border); }
  .row.active { background: var(--highlight); border-color: var(--accent); }
  .row.done { opacity: 0.55; }
  .row.done .text { text-decoration: line-through; }
  .check { flex: none; width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
  .num { flex: none; width: 20px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-faint); }
  .dir { flex: none; width: 14px; text-align: center; color: var(--accent); font-size: 13px; }
  .dir.ws { color: var(--text-faint); }
  .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .text { font-size: 14px; }
  .source { font-size: 12px; color: var(--text-faint); line-height: 1.4; }
  .tag {
    flex: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2px 7px; border-radius: 20px;
    background: var(--accent-soft); color: #92600b; border: 1px solid var(--accent-soft);
  }
</style>
