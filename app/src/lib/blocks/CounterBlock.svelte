<script>
  import { resolveText } from '../size.js';

  // An instruction row. Normal rows get a checkbox (done/not). Repeat rows
  // ("repeat until …") get a +/- counter instead. Handles `grid` blocks too
  // until the real interactive grid replaces that path in step 1.8.
  let {
    block, indices = [], rowNo = null, lang = 'both', active = false,
    done = false, onToggle = () => {},
    count = 0, onCount = () => {},
    onSelect = () => {},
  } = $props();

  const isRepeat = $derived(block.kind === 'repeat');
  const text = $derived(resolveText(block.text ?? '', block.values ?? {}, indices));
  const target = $derived(block.target ? resolveText(block.target, block.values ?? {}, indices) : null);
  const until = $derived(block.until ?? null);
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

<div class="row" class:active class:done={done && !isRepeat} onclick={() => onSelect()} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') onSelect(); }}>
  {#if isRepeat}
    <span class="counter" role="group">
      <button class="cbtn" onclick={(e) => { e.stopPropagation(); onCount(-1); }} aria-label="one fewer">−</button>
      <span class="cnum">×{count}</span>
      <button class="cbtn" onclick={(e) => { e.stopPropagation(); onCount(1); }} aria-label="one more">+</button>
    </span>
  {:else}
    <input
      type="checkbox" class="check" checked={done}
      onclick={(e) => e.stopPropagation()}
      onchange={() => onToggle()}
      aria-label="row done"
    />
  {/if}

  <span class="num">{rowNo ?? ''}</span>
  <span class="dir" class:ws={block.side === 'WS'}>{arrow}</span>
  <span class="body">
    <span class="line">
      {#if showEn}<span class="text">{text}</span>{/if}
      {#if target && showEn}<span class="target">→ {target} sts</span>{/if}
      {#if until && showEn}<span class="target">{until}</span>{/if}
    </span>
    {#if showZh}<span class="source">{block.source}</span>{/if}
  </span>
  {#if tag}<span class="tag" class:grid={block.type === 'grid'}>{tag}</span>{/if}
</div>

<style>
  .row {
    display: flex; align-items: center; gap: 10px; width: 100%;
    text-align: left; font: inherit; cursor: pointer;
    padding: 8px 10px; border: 1px solid var(--border-soft); border-radius: var(--radius);
    background: var(--card); color: var(--text);
  }
  .row:hover { background: #fdfdfc; border-color: var(--border); }
  .row.active { background: var(--highlight); border-color: var(--accent); }
  .row.done { opacity: 0.55; }
  .row.done .text { text-decoration: line-through; }

  .check { flex: none; width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

  .counter { flex: none; display: inline-flex; align-items: center; gap: 4px; }
  .cbtn {
    width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--card); cursor: pointer; font-size: 13px; line-height: 1;
  }
  .cbtn:hover { background: var(--panel); }
  .cnum { min-width: 26px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--accent); }

  .num { flex: none; width: 20px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-faint); }
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
