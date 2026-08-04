<script>
  // ── Props ────────────────────────────────────────────────────────────
  // The chart image and how many rows it has. In the real app these come
  // from the pattern data; here we hard-code the vest's 图表2 (77 rows).
  let { src = '/chart2.png', rows = 77 } = $props();

  // ── State (runes) ────────────────────────────────────────────────────
  // $state = a reactive value. When it changes, anything that reads it
  // re-renders automatically. This is the whole reason we use a framework.
  let current = $state(1);          // which printed row number you're on
  let topPct = $state(0.02);        // where row 1's band starts (fraction of image height)
  let botPct = $state(0.985);       // where the last row's band ends
  let topDown = $state(true);       // true: row 1 printed at TOP (this chart). toggle for bottom-up charts.
  let calibrating = $state(false);  // show the drag handles?

  let imgEl;                        // bound to the <img> so we can measure it

  // ── Derived geometry ─────────────────────────────────────────────────
  // $derived = a value computed from other state. Recomputes on its own.
  const rowH = $derived((botPct - topPct) / rows);   // band height as a fraction
  // band index from the top (0-based), accounting for numbering direction
  const bandIndex = $derived(topDown ? current - 1 : rows - current);
  const bandTop = $derived(topPct + bandIndex * rowH);

  // ── Row navigation ───────────────────────────────────────────────────
  function step(delta) {
    current = Math.min(rows, Math.max(1, current + delta));
  }
  function onKey(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight')   { step(+1); e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft')  { step(-1); e.preventDefault(); }
  }

  // ── Dragging the calibration handles ────────────────────────────────
  function dragHandle(which) {
    return (e) => {
      e.preventDefault();
      const rect = imgEl.getBoundingClientRect();
      const move = (ev) => {
        const y = (ev.clientY - rect.top) / rect.height; // 0..1 within image
        const clamped = Math.min(1, Math.max(0, y));
        if (which === 'top') topPct = Math.min(clamped, botPct - rowH);
        else                 botPct = Math.max(clamped, topPct + rowH);
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

<svelte:window on:keydown={onKey} />

<div class="wrap">
  <!-- Controls -->
  <div class="bar">
    <button onclick={() => step(-1)} aria-label="previous row">◀</button>
    <span class="rownum">Row <b>{current}</b> / {rows}</span>
    <button onclick={() => step(+1)} aria-label="next row">▶</button>

    <label class="toggle">
      <input type="checkbox" bind:checked={calibrating} />
      Calibrate
    </label>
    <label class="toggle">
      <input type="checkbox" bind:checked={topDown} />
      Row 1 at top
    </label>
    <label class="rowsin">
      rows
      <input type="number" min="1" bind:value={rows} />
    </label>
  </div>

  <!-- The chart with the overlay stacked on top -->
  <div class="stage">
    <img bind:this={imgEl} {src} alt="knitting chart" />

    <!-- current-row highlight band -->
    <div
      class="band"
      style="top:{bandTop * 100}%; height:{rowH * 100}%"
    ></div>

    {#if calibrating}
      <!-- draggable top / bottom edge lines -->
      <div class="edge" style="top:{topPct * 100}%" onpointerdown={dragHandle('top')}>
        <span>row 1 edge</span>
      </div>
      <div class="edge" style="top:{botPct * 100}%" onpointerdown={dragHandle('bot')}>
        <span>last row edge</span>
      </div>
    {/if}
  </div>

  <p class="hint">↑/↓ arrow keys move rows · toggle <b>Calibrate</b> and drag the two lines to fit any chart</p>
</div>

<style>
  .wrap { max-width: 520px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .bar {
    display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
    padding: .5rem .6rem; margin-bottom: .5rem;
    background: #f4f1ec; border: 1px solid #e0d8cc; border-radius: 10px;
  }
  .bar button {
    width: 34px; height: 34px; border-radius: 8px; border: 1px solid #cbb;
    background: #fff; cursor: pointer; font-size: 14px;
  }
  .bar button:hover { background: #efe9e0; }
  .rownum { font-variant-numeric: tabular-nums; }
  .rownum b { font-size: 1.15rem; }
  .toggle { display: inline-flex; align-items: center; gap: .3rem; font-size: .85rem; }
  .rowsin { font-size: .85rem; display: inline-flex; align-items: center; gap: .3rem; }
  .rowsin input { width: 52px; }

  .stage { position: relative; line-height: 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
  .stage img { width: 100%; display: block; user-select: none; -webkit-user-drag: none; }

  .band {
    position: absolute; left: 0; right: 0;
    background: rgba(232, 122, 90, 0.28);
    border-top: 2px solid rgba(210, 80, 45, 0.9);
    border-bottom: 2px solid rgba(210, 80, 45, 0.9);
    pointer-events: none;
    transition: top .08s ease;
  }
  .edge {
    position: absolute; left: 0; right: 0; height: 0;
    border-top: 2px dashed #2b6cb0; cursor: ns-resize;
  }
  .edge span {
    position: absolute; right: 4px; top: 2px;
    font-size: 10px; line-height: 1; color: #2b6cb0;
    background: #fff; padding: 1px 4px; border-radius: 4px; border: 1px solid #bcd;
  }
  .hint { font-size: .78rem; color: #777; text-align: center; margin-top: .5rem; }
</style>
