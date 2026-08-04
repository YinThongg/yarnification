<script>
  import pattern from '../patterns/luoshen-vest.json';
  import { indicesFor, resolveGraded } from './lib/size.js';
  import SectionList from './lib/SectionList.svelte';
  import CounterBlock from './lib/blocks/CounterBlock.svelte';
  import ChartBlock from './lib/blocks/ChartBlock.svelte';

  // Which section is open. Default to the first.
  let selectedId = $state(pattern.sections[0]?.id ?? null);
  const selected = $derived(pattern.sections.find((s) => s.id === selectedId));

  // Which block within the section is active (yellow highlight / keyboard target).
  let activeBlock = $state(0);

  // Language display: 'both' | 'en' | 'zh'.
  let lang = $state('both');
  const langLabel = { both: 'EN + 中文', en: 'English', zh: '中文' };
  function cycleLang() { lang = lang === 'both' ? 'en' : lang === 'en' ? 'zh' : 'both'; }

  // Per-chart counters (row within the chart, and which repeat). Lifted here so
  // the keyboard can drive them. Keyed by block index within the section.
  let chart = $state({});
  const csOf = (i) => chart[i] ?? { row: 1, rep: 1 };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function bumpRow(i, d, rows) { const c = csOf(i); chart = { ...chart, [i]: { ...c, row: clamp(c.row + d, 1, rows) } }; }
  function bumpRep(i, d, total) { const c = csOf(i); chart = { ...chart, [i]: { ...c, rep: clamp(c.rep + d, 1, total) } }; }

  // Chosen size → indices, used to resolve every graded number.
  const idx = $derived(indicesFor(pattern.sizes.labels, pattern.chosen));

  // Attach a running row number to each text row (charts don't get one).
  const items = $derived.by(() => {
    let n = 0;
    return (selected?.blocks ?? []).map((block, i) => ({
      block,
      i,
      rowNo: block.type === 'chart' ? null : ++n,
    }));
  });

  function selectSection(id) { selectedId = id; activeBlock = 0; }

  // Header chip: "Size 1 · 78cm".
  const sizeLabel = $derived(
    pattern.chosen.length === 1
      ? pattern.chosen[0]
      : pattern.chosen[0] + '(' + pattern.chosen.slice(1).join(', ') + ')'
  );
  const bust = $derived(pattern.sizes.measurements.find((m) => m.name === 'Finished bust'));
  const bustLabel = $derived(bust ? resolveGraded(bust.values.join(', '), idx) + bust.unit : '');

  // Keyboard: ↑/↓ move the active row, ←/→ step the active chart's row,
  // +/= and -/_ step the active chart's repeat.
  function onKey(e) {
    const blocks = selected?.blocks ?? [];
    if (blocks.length === 0) return;
    if (e.key === 'ArrowUp') { activeBlock = Math.max(0, activeBlock - 1); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { activeBlock = Math.min(blocks.length - 1, activeBlock + 1); e.preventDefault(); return; }

    const b = blocks[activeBlock];
    if (b?.type !== 'chart') return;
    const total = Number(resolveGraded(b.repeat ?? '1', idx)) || 1;
    if (e.key === 'ArrowLeft') { bumpRow(activeBlock, -1, b.rows); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { bumpRow(activeBlock, 1, b.rows); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { bumpRep(activeBlock, 1, total); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { bumpRep(activeBlock, -1, total); e.preventDefault(); }
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="app">
  <header class="topbar">
    <div class="title">
      <h1>{pattern.meta.titleEn ?? pattern.meta.title}</h1>
      {#if pattern.meta.titleEn}<span class="orig">{pattern.meta.title}</span>{/if}
    </div>
    <div class="chips">
      <span class="chip accent">Size {sizeLabel}{bustLabel ? ` · ${bustLabel}` : ''}</span>
      <button class="chip toggle" onclick={cycleLang} title="Toggle language">{langLabel[lang]}</button>
    </div>
  </header>

  <div class="body">
    <aside class="sidebar">
      <div class="side-label">Sections</div>
      <SectionList sections={pattern.sections} {selectedId} onSelect={selectSection} />
      <p class="keyhint">↑ ↓ rows · ← → chart row · + − repeat</p>
    </aside>

    <main class="content">
      {#if selected}
        <div class="section-head">
          <h2>{selected.name}</h2>
          {#if selected.nameSource && selected.nameSource !== selected.name}
            <span class="orig">{selected.nameSource}</span>
          {/if}
        </div>
        <div class="blocks">
          {#each items as item (item.i)}
            {#if item.block.type === 'chart'}
              <ChartBlock
                block={item.block}
                indices={idx}
                chosen={pattern.chosen}
                {lang}
                row={csOf(item.i).row}
                rep={csOf(item.i).rep}
                onRow={(d) => bumpRow(item.i, d, item.block.rows)}
                onRep={(d) => bumpRep(item.i, d, Number(resolveGraded(item.block.repeat ?? '1', idx)) || 1)}
                active={activeBlock === item.i}
                onSelect={() => (activeBlock = item.i)}
              />
            {:else}
              <CounterBlock
                block={item.block}
                indices={idx}
                rowNo={item.rowNo}
                {lang}
                active={activeBlock === item.i}
                onSelect={() => (activeBlock = item.i)}
              />
            {/if}
          {/each}
        </div>
      {:else}
        <p class="placeholder">No section selected.</p>
      {/if}
    </main>
  </div>
</div>

<style>
  .app { max-width: 1000px; margin: 0 auto; min-height: 100vh; }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
    padding: 14px 18px; border-bottom: 1px solid var(--border);
  }
  .title { display: flex; align-items: baseline; gap: 8px; }
  .title h1 { margin: 0; font-size: 1.3rem; }
  .orig { color: var(--text-muted); font-size: 0.85rem; }

  .chips { display: flex; gap: 6px; }
  .chip {
    font-size: 12px; padding: 4px 10px; border-radius: 20px;
    background: var(--card); border: 1px solid var(--border); color: var(--text-muted);
  }
  .chip.accent { background: var(--accent-soft); border-color: var(--accent-soft); color: #92600b; }
  .chip.toggle { cursor: pointer; }
  .chip.toggle:hover { background: var(--panel); }

  .body { display: grid; grid-template-columns: 220px 1fr; gap: 0; }
  .sidebar { padding: 14px; border-right: 1px solid var(--border); }
  .side-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-muted); margin: 0 10px 8px;
  }
  .keyhint { margin: 14px 10px 0; font-size: 11px; color: var(--text-faint); line-height: 1.5; }

  .content { padding: 18px 22px; }
  .section-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
  .section-head h2 { margin: 0; font-size: 1.1rem; }
  .placeholder { color: var(--text-muted); font-size: 14px; }
  .blocks { display: flex; flex-direction: column; gap: 6px; max-width: 620px; }

  @media (max-width: 640px) {
    .body { grid-template-columns: 1fr; }
    .sidebar { border-right: none; border-bottom: 1px solid var(--border); }
  }
</style>
