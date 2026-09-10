<script>
  import { resolveGraded } from '../size.js';

  // A chart block: the cropped diagram image with a row-band overlay you tap
  // through, plus a repeat counter. Geometry from the original chart prototype
  // prototype; styled here as the old app's chart-card.
  // row / rep are controlled by the parent (so the keyboard can drive them).
  let {
    block, indices = [], chosen = [], lang = 'both',
    row = 1, rep = 1, onRow = () => {}, onRep = () => {},
    calibration = null, onCalibration = () => {},
    legendImage = null,
    active = false, onSelect = () => {},
  } = $props();

  // Pick the chart variant for the first chosen size label.
  const src = $derived(block.imageBySize?.[chosen[0]] ?? Object.values(block.imageBySize ?? {})[0] ?? '');
  const rows = $derived(Math.max(1, Number(calibration?.rows ?? block.rows) || 1));
  const repeatTotal = $derived(Number(resolveGraded(block.repeat ?? '1', indices)) || 1);
  const showZh = $derived(lang !== 'en' && !!block.source);
  const legendSrc = $derived(block.legendImage ?? legendImage ?? '');

  const topPct = $derived(Number(calibration?.topPct ?? block.calibration?.topPct ?? 0.02));
  const botPct = $derived(Number(calibration?.botPct ?? block.calibration?.botPct ?? 0.985));
  const topDown = $derived(calibration?.topDown ?? block.calibration?.topDown ?? true);
  let calibrating = $state(false);
  let imgEl;

  const rowH = $derived((botPct - topPct) / rows);
  const bandIndex = $derived(topDown ? row - 1 : rows - row);
  const bandTop = $derived(topPct + bandIndex * rowH);

  // Edge labels follow the chart's direction: row 1 sits at the bottom for a
  // bottom-up chart (topDown = false), at the top for a top-down one.
  const topLabel = $derived(topDown ? 'first row' : 'last row');
  const botLabel = $derived(topDown ? 'last row' : 'first row');
  let overlay = $state(null); // null | 'legend' | 'chart'

  function dragHandle(which) {
    return (e) => {
      e.preventDefault();
      const rect = imgEl.getBoundingClientRect();
      const move = (ev) => {
        const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
        if (which === 'top') onCalibration({ topPct: Math.min(y, botPct - rowH) });
        else onCalibration({ botPct: Math.max(y, topPct + rowH) });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }
</script>

<svelte:window onkeydown={(e) => { if (overlay && e.key === 'Escape') overlay = null; }} />

<div class="chart-card" class:focused={active}>
  <div class="head">
    <button class="title" onclick={onSelect}>
      {block.name}{#if block.nameSource && block.nameSource !== block.name}<span class="orig"> · {block.nameSource}</span>{/if}
      <span class="sub">rows 1–{rows}</span>
    </button>
    <div class="head-right">
      <div class="repeat">
        <button onclick={() => { onSelect(); onRep(-1); }} aria-label="previous repeat">−</button>
        <span>Repeat {rep} / {repeatTotal}</span>
        <button onclick={() => { onSelect(); onRep(1); }} aria-label="next repeat">+</button>
      </div>
      <div class="tools">
        {#if legendSrc}
          <button class="icon-btn" title="Stitch symbols" aria-label="Show stitch symbols"
            onclick={() => { onSelect(); overlay = 'legend'; }}>?</button>
        {/if}
        <button class="icon-btn" title="Expand" aria-label="Expand chart"
          onclick={() => { onSelect(); overlay = 'chart'; }}>⤢</button>
      </div>
    </div>
  </div>

  <div class="stage">
    <img bind:this={imgEl} {src} alt={block.name} />
    <div class="band" style="top:{bandTop * 100}%; height:{rowH * 100}%"></div>
    {#if calibrating}
      <button class="edge" style="top:{topPct * 100}%" onpointerdown={dragHandle('top')} aria-label="Move first chart edge"><span>{topLabel}</span></button>
      <button class="edge" style="top:{botPct * 100}%" onpointerdown={dragHandle('bot')} aria-label="Move last chart edge"><span>{botLabel}</span></button>
    {/if}
  </div>

  <div class="controls">
    <button onclick={() => { onSelect(); onRow(-1); }} aria-label="previous row">◀</button>
    <span class="rownum">Chart row <b>{row}</b> / {rows}</span>
    <button onclick={() => { onSelect(); onRow(1); }} aria-label="next row">▶</button>
    <label class="cal">
      <input type="checkbox" bind:checked={calibrating} /> calibrate
    </label>
  </div>

  {#if calibrating}
    <div class="calibration-controls">
      <label>rows <input type="number" min="1" value={rows} onchange={(e) => onCalibration({ rows: e.currentTarget.value })} /></label>
      <label><input type="checkbox" checked={topDown} onchange={(e) => onCalibration({ topDown: e.currentTarget.checked })} /> row 1 at top</label>
    </div>
  {/if}

  {#if showZh}<p class="source">{block.source}</p>{/if}
</div>

{#if overlay}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="backdrop" role="presentation" onclick={() => (overlay = null)}>
    <div class="sheet" role="dialog" aria-modal="true"
      aria-label={overlay === 'legend' ? 'Stitch symbols' : block.name}
      tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="sheet-head">
        <span class="sheet-title">{overlay === 'legend' ? 'Stitch symbols' : block.name}</span>
        {#if overlay === 'chart'}
          <span class="sheet-meta">Chart row {row} / {rows}</span>
        {/if}
        <button class="x" onclick={() => (overlay = null)} aria-label="Close">×</button>
      </div>
      <div class="sheet-body">
        {#if overlay === 'legend'}
          <img class="legend-image" src={legendSrc} alt="Stitch symbol legend" />
        {:else}
          <div class="stage large">
            <img {src} alt={block.name} />
            <div class="band" style="top:{bandTop * 100}%; height:{rowH * 100}%"></div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .chart-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 12px;
  }
  .chart-card.focused { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .head-right { display: flex; align-items: center; gap: 8px; }
  .title { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; text-align: left; font: inherit; font-size: 14px; font-weight: 600; }
  .title .orig { color: var(--text-muted); font-weight: 400; }
  .title .sub { margin-left: 8px; font-size: 12px; font-weight: 400; color: var(--text-faint); }

  .repeat { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .repeat button {
    width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--card); cursor: pointer; font-size: 14px; line-height: 1;
  }
  .repeat button:hover { background: var(--panel); }
  .tools { display: flex; align-items: center; gap: 4px; }
  .icon-btn {
    flex: none; cursor: pointer; border: 1px solid var(--border); background: var(--card);
    color: var(--text-muted); border-radius: 6px; font-size: 12px; padding: 1px 6px;
  }
  .icon-btn:hover { background: var(--panel); }

  .stage { position: relative; line-height: 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 460px; }
  .stage img { width: 100%; display: block; user-select: none; -webkit-user-drag: none; }
  .band {
    position: absolute; left: 0; right: 0; pointer-events: none;
    background: rgba(217, 119, 6, 0.22);
    border-top: 2px solid var(--accent); border-bottom: 2px solid var(--accent);
    transition: top .08s ease;
  }
  .edge { position: absolute; left: 0; right: 0; height: 0; padding: 0; border: 0; border-top: 2px dashed #2b6cb0; background: transparent; cursor: ns-resize; }
  .edge span {
    position: absolute; right: 4px; top: 2px; font-size: 10px; line-height: 1; color: #2b6cb0;
    background: #fff; padding: 1px 4px; border-radius: 4px; border: 1px solid #bcd;
  }

  .controls { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 13px; }
  .controls button {
    width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border);
    background: var(--card); cursor: pointer;
  }
  .controls button:hover { background: var(--panel); }
  .rownum { font-variant-numeric: tabular-nums; }
  .cal { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); }
  .calibration-controls { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 7px; font-size: 11px; color: var(--text-muted); }
  .calibration-controls label { display: inline-flex; align-items: center; gap: 4px; }
  .calibration-controls input[type="number"] { width: 54px; padding: 3px 4px; border: 1px solid var(--border); border-radius: 5px; }
  .source { margin: 8px 0 0; font-size: 12px; color: var(--text-faint); line-height: 1.4; }

  .backdrop {
    position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center;
    padding: 24px; background: rgba(0,0,0,0.4);
  }
  .sheet {
    width: 100%; max-width: 960px; max-height: 85vh; overflow: auto; padding: 16px 18px;
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }
  .sheet-head { display: flex; align-items: center; gap: 10px; }
  .sheet-title { font-size: 14px; font-weight: 600; }
  .sheet-meta { color: var(--text-faint); font-size: 11px; }
  .x { flex: none; margin-left: auto; cursor: pointer; border: none; background: none; font-size: 22px; line-height: 1; color: var(--text-muted); }
  .sheet-body { margin-top: 12px; }
  .stage.large { max-width: none; }
  .legend-image { display: block; max-width: 100%; height: auto; margin: 0 auto; }

  @media (max-width: 640px) {
    .head { align-items: flex-start; }
    .head-right { align-items: flex-end; flex-direction: column-reverse; }
    .backdrop { padding: 10px; }
  }
</style>
