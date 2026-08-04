<script>
  import { resolveText, resolveGraded } from '../size.js';

  // A single instruction row. Handles both `counter` and (for now) `grid`
  // blocks — a real interactive grid replaces the grid path in step 1.8.
  let { block, indices = [], rowNo = null, lang = 'both', active = false, onSelect = () => {} } = $props();

  const text = $derived(resolveText(block.text ?? '', block.values ?? {}, indices));
  const target = $derived(block.target ? resolveText(block.target, block.values ?? {}, indices) : null);
  const arrow = $derived(block.side === 'RS' ? '←' : block.side === 'WS' ? '→' : '·');
  const showEn = $derived(lang !== 'zh');
  const showZh = $derived(lang !== 'en' && !!block.source);
  const tag = $derived(
    block.type === 'grid' ? 'grid'
    : block.kind === 'caston' ? 'cast on'
    : block.kind === 'repeat' ? 'repeat'
    : null
  );
</script>

<button class="row" class:active onclick={() => onSelect()}>
  <span class="num">{rowNo ?? ''}</span>
  <span class="dir" class:ws={block.side === 'WS'}>{arrow}</span>
  <span class="body">
    <span class="line">
      {#if showEn}<span class="text">{text}</span>{/if}
      {#if target && showEn}<span class="target">→ {target} sts</span>{/if}
    </span>
    {#if showZh}<span class="source">{block.source}</span>{/if}
  </span>
  {#if tag}<span class="tag" class:grid={block.type === 'grid'}>{tag}</span>{/if}
</button>

<style>
  .row {
    display: flex; align-items: center; gap: 10px; width: 100%;
    text-align: left; font: inherit; cursor: pointer;
    padding: 8px 10px; border: 1px solid transparent; border-radius: var(--radius);
    background: var(--card); color: var(--text);
    border-color: var(--border-soft);
  }
  .row:hover { background: #fdfdfc; border-color: var(--border); }
  .row.active { background: var(--highlight); border-color: var(--accent); }

  .num {
    flex: none; width: 22px; text-align: right;
    font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-faint);
  }
  .dir { flex: none; width: 14px; text-align: center; color: var(--accent); font-size: 13px; }
  .dir.ws { color: var(--text-faint); }

  .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .line { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .text { font-size: 14px; }
  .target { font-size: 12px; color: var(--text-muted); }
  .source { font-size: 12px; color: var(--text-faint); line-height: 1.4; }

  .tag {
    flex: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2px 7px; border-radius: 20px;
    background: var(--panel); color: var(--text-muted); border: 1px solid var(--border);
  }
  .tag.grid { background: var(--accent-soft); color: #92600b; border-color: var(--accent-soft); }
</style>
