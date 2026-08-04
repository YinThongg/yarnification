<script>
  import { resolveGraded } from '../size.js';

  // A chart block: the cropped diagram image with a row-band overlay you tap
  // through, plus a repeat counter. Geometry ported from the ChartOverlay
  // prototype; styled here as the old app's chart-card.
  // row / rep are controlled by the parent (so the keyboard can drive them).
  let {
    block, indices = [], chosen = [], lang = 'both',
    row = 1, rep = 1, onRow = () => {}, onRep = () => {},
    active = false, onSelect = () => {},
  } = $props();

  // Pick the chart variant for the first chosen size label.
  const src = $derived(block.imageBySize?.[chosen[0]] ?? Object.values(block.imageBySize ?? {})[0] ?? '');
  const rows = $derived(block.rows ?? 1);
  const repeatTotal = $derived(Number(resolveGraded(block.repeat ?? '1', indices)) || 1);
  const showZh = $derived(lang !== 'en' && !!block.source);

  const cal = block.calibration ?? { topPct: 0.02, botPct: 0.985, topDown: true };
  let topPct = $state(cal.topPct);
  let botPct = $state(cal.botPct);
  let topDown = $state(cal.topDown);
  let calibrating = $state(false);
  let imgEl;

  const rowH = $derived((botPct - topPct) / rows);
  const bandIndex = $derived(topDown ? row - 1 : rows - row);
  const bandTop = $derived(topPct + bandIndex * rowH);

  // Edge labels follow the chart's direction: row 1 sits at the bottom for a
  // bottom-up chart (topDown = false), at the top for a top-down one.
  const topLabel = $derived(topDown ? 'first row' : 'last row');
  const botLabel = $derived(topDown ? 'last row' : 'first row');

  function dragHandle(which) {
    return (e) => {
      e.preventDefault();
      const rect = imgEl.getBoundingClientRect();
      const move = (ev) => {
        const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
        if (which === 'top') topPct = Math.min(y, botPct - rowH);
        else botPct = Math.max(y, topPct + rowH);
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

<div class="chart-card" class:focused={active} onclick={onSelect} role="group">
  <div class="head">
    <span class="title">
      {block.name}{#if block.nameSource && block.nameSource !== block.name}<span class="orig"> · {block.nameSource}</span>{/if}
      <span class="sub">rows 1–{rows}</span>
    </span>
    <div class="repeat">
      <button onclick={(e) => { e.stopPropagation(); onRep(-1); }} aria-label="previous repeat">−</button>
      <span>Repeat {rep} / {repeatTotal}</span>
      <button onclick={(e) => { e.stopPropagation(); onRep(1); }} aria-label="next repeat">+</button>
    </div>
  </div>

  <div class="stage">
    <img bind:this={imgEl} {src} alt={block.name} />
    <div class="band" style="top:{bandTop * 100}%; height:{rowH * 100}%"></div>
    {#if calibrating}
      <div class="edge" style="top:{topPct * 100}%" onpointerdown={dragHandle('top')}><span>{topLabel}</span></div>
      <div class="edge" style="top:{botPct * 100}%" onpointerdown={dragHandle('bot')}><span>{botLabel}</span></div>
    {/if}
  </div>

  <div class="controls">
    <button onclick={(e) => { e.stopPropagation(); onRow(-1); }} aria-label="previous row">◀</button>
    <span class="rownum">Chart row <b>{row}</b> / {rows}</span>
    <button onclick={(e) => { e.stopPropagation(); onRow(1); }} aria-label="next row">▶</button>
    <label class="cal">
      <input type="checkbox" bind:checked={calibrating} onclick={(e) => e.stopPropagation()} /> calibrate
    </label>
  </div>

  {#if showZh}<p class="source">{block.source}</p>{/if}
</div>

<style>
  .chart-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 12px; cursor: pointer;
  }
  .chart-card.focused { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .title { font-size: 14px; font-weight: 600; }
  .title .orig { color: var(--text-muted); font-weight: 400; }
  .title .sub { margin-left: 8px; font-size: 12px; font-weight: 400; color: var(--text-faint); }

  .repeat { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .repeat button {
    width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--card); cursor: pointer; font-size: 14px; line-height: 1;
  }
  .repeat button:hover { background: var(--panel); }

  .stage { position: relative; line-height: 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: 460px; }
  .stage img { width: 100%; display: block; user-select: none; -webkit-user-drag: none; }
  .band {
    position: absolute; left: 0; right: 0; pointer-events: none;
    background: rgba(217, 119, 6, 0.22);
    border-top: 2px solid var(--accent); border-bottom: 2px solid var(--accent);
    transition: top .08s ease;
  }
  .edge { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed #2b6cb0; cursor: ns-resize; }
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
  .source { margin: 8px 0 0; font-size: 12px; color: var(--text-faint); line-height: 1.4; }
</style>
