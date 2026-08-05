<script>
  import { indicesFor, resolveGraded } from './lib/size.js';
  import { clearProgress, loadProgress, saveProgress } from './lib/progress.js';
  import SectionList from './lib/SectionList.svelte';
  import MetadataPanel from './lib/MetadataPanel.svelte';
  import CounterBlock from './lib/blocks/CounterBlock.svelte';
  import ChartBlock from './lib/blocks/ChartBlock.svelte';
  import GridBlock from './lib/blocks/GridBlock.svelte';

  // The pattern to track comes from the library (App picks it). `onBack` returns
  // to the library screen. This component is keyed on pattern.id by the parent,
  // so switching patterns remounts it and re-reads that pattern's saved progress.
  let { pattern, onBack } = $props();

  // Keep progress separate if the same pattern is generated for another size.
  const progressId = `${pattern.id}:${pattern.chosen.join('+')}`;
  const saved = loadProgress(progressId);

  // Which section is open. Default to the first.
  const savedSectionExists = pattern.sections.some((section) => section.id === saved.selectedId);
  let selectedId = $state(savedSectionExists ? saved.selectedId : pattern.sections[0]?.id ?? null);
  const selected = $derived(pattern.sections.find((s) => s.id === selectedId));

  // Which block within the section is active (yellow highlight / keyboard target).
  let activeBlock = $state(saved.activeBlock ?? 0);

  // Language display: 'both' | 'en' | 'zh'.
  let lang = $state('both');
  const langLabel = { both: 'EN + 中文', en: 'English', zh: '中文' };
  function cycleLang() { lang = lang === 'both' ? 'en' : lang === 'en' ? 'zh' : 'both'; }

  // Per-chart counters (row within the chart, and which repeat). Lifted here so
  // the keyboard can drive them. Keyed by "sectionId:blockIndex" so counters in
  // different sections never collide.
  let chart = $state(saved.chart ?? {});
  let done = $state(saved.done ?? {});   // "sectionId:i" -> true  (row ticked off)
  let reps = $state(saved.reps ?? {});   // "sectionId:i" -> count (repeat rows)
  let notes = $state(saved.notes ?? {}); // text-row keys; charts add their current chart row
  let calibrations = $state(saved.calibrations ?? {});
  const keyOf = (i) => `${selectedId}:${i}`;
  const csOf = (i) => chart[keyOf(i)] ?? { row: 1, rep: 1 };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function bumpRow(i, d, rows) { const k = keyOf(i); const c = csOf(i); chart = { ...chart, [k]: { ...c, row: clamp(c.row + d, 1, rows) } }; }
  function bumpRep(i, d, total) { const k = keyOf(i); const c = csOf(i); chart = { ...chart, [k]: { ...c, rep: clamp(c.rep + d, 1, total) } }; }
  function toggleDone(i) { const k = keyOf(i); done = { ...done, [k]: !done[k] }; }
  function bumpCount(i, d) { const k = keyOf(i); reps = { ...reps, [k]: Math.max(0, (reps[k] ?? 0) + d) }; }

  // Chosen size → indices, used to resolve every graded number.
  const idx = $derived(indicesFor(pattern.sizes.labels, pattern.chosen));

  function applies(block) {
    return !block.appliesTo?.length || block.appliesTo.some((size) => pattern.chosen.includes(size));
  }

  // Hide steps that do not apply to the chosen size, while retaining the
  // original block index as the stable persistence key.
  const items = $derived.by(() => {
    let n = 0;
    return (selected?.blocks ?? [])
      .map((block, i) => ({ block, i }))
      .filter(({ block }) => applies(block))
      .map(({ block, i }) => ({ block, i, rowNo: block.type === 'chart' ? null : ++n }));
  });

  const activeItem = $derived(items.find((item) => item.i === activeBlock) ?? items[0]);
  const noteKey = $derived(
    activeItem
      ? activeItem.block.type === 'chart'
        ? `${selectedId}:${activeItem.i}:chart:${csOf(activeItem.i).row}`
        : `${selectedId}:${activeItem.i}`
      : null
  );
  const currentNote = $derived(noteKey ? notes[noteKey] ?? '' : '');
  const activeLabel = $derived(
    activeItem?.block.type === 'chart'
      ? `${activeItem.block.name} · row ${csOf(activeItem.i).row}`
      : activeItem ? `Row ${activeItem.rowNo}` : 'No row selected'
  );

  function firstBlockFor(sectionId) {
    const section = pattern.sections.find((entry) => entry.id === sectionId);
    return section?.blocks.findIndex(applies) ?? 0;
  }

  function selectSection(id) { selectedId = id; activeBlock = Math.max(0, firstBlockFor(id)); }

  function setNote(value) {
    if (!noteKey) return;
    if (value) notes = { ...notes, [noteKey]: value };
    else {
      const next = { ...notes };
      delete next[noteKey];
      notes = next;
    }
  }

  function calibrationOf(i, block) {
    return calibrations[keyOf(i)] ?? {
      topPct: block.calibration?.topPct ?? 0.02,
      botPct: block.calibration?.botPct ?? 0.985,
      topDown: block.calibration?.topDown ?? true,
      rows: block.rows ?? 1,
    };
  }

  function chartRows(i, block) {
    return Math.max(1, Number(calibrationOf(i, block).rows) || block.rows || 1);
  }

  function setCalibration(i, block, next) {
    const k = keyOf(i);
    const value = { ...calibrationOf(i, block), ...next };
    value.rows = Math.max(1, Math.round(Number(value.rows) || block.rows || 1));
    calibrations = { ...calibrations, [k]: value };

    const current = csOf(i);
    if (current.row > value.rows) {
      chart = { ...chart, [k]: { ...current, row: value.rows } };
    }
  }

  function withoutSection(values, sectionId) {
    const prefix = `${sectionId}:`;
    return Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith(prefix)));
  }

  function resetSection() {
    if (!selectedId || !window.confirm(`Reset all progress in ${selected?.name ?? 'this section'}?`)) return;
    chart = withoutSection(chart, selectedId);
    done = withoutSection(done, selectedId);
    reps = withoutSection(reps, selectedId);
    notes = withoutSection(notes, selectedId);
    calibrations = withoutSection(calibrations, selectedId);
    activeBlock = Math.max(0, firstBlockFor(selectedId));
  }

  function resetPattern() {
    if (!window.confirm('Reset all progress and notes for this pattern?')) return;
    clearProgress(progressId);
    chart = {};
    done = {};
    reps = {};
    notes = {};
    calibrations = {};
    selectedId = pattern.sections[0]?.id ?? null;
    activeBlock = Math.max(0, firstBlockFor(selectedId));
  }

  // Normalize progress from an older pattern revision, then persist changes.
  $effect(() => {
    if (items.length && !items.some((item) => item.i === activeBlock)) activeBlock = items[0].i;
  });
  $effect(() => {
    saveProgress(progressId, { selectedId, activeBlock, chart, done, reps, notes, calibrations });
  });

  // Header chip: chosen size plus its resolved finished-bust measurement.
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
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || e.target?.isContentEditable) return;
    if (items.length === 0) return;
    const activePosition = Math.max(0, items.findIndex((item) => item.i === activeBlock));
    if (e.key === 'ArrowUp') { activeBlock = items[Math.max(0, activePosition - 1)].i; e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { activeBlock = items[Math.min(items.length - 1, activePosition + 1)].i; e.preventDefault(); return; }

    const b = activeItem?.block;
    if (b?.type !== 'chart') return;
    const total = Number(resolveGraded(b.repeat ?? '1', idx)) || 1;
    if (e.key === 'ArrowLeft') { bumpRow(activeBlock, -1, chartRows(activeBlock, b)); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { bumpRow(activeBlock, 1, chartRows(activeBlock, b)); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { bumpRep(activeBlock, 1, total); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { bumpRep(activeBlock, -1, total); e.preventDefault(); }
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="app">
  <header class="topbar">
    <div class="title">
      <button class="back" onclick={onBack} title="Back to my patterns" aria-label="Back to my patterns">‹ Patterns</button>
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

      <section class="row-panel" aria-labelledby="active-row-title">
        <h3 id="active-row-title">{activeLabel}</h3>
        <span class="panel-label">Original instruction</span>
        <p class="source-text">{activeItem?.block.source ?? 'No source text for this row.'}</p>
        <label class="panel-label" for="row-note">Notes</label>
        <textarea
          id="row-note"
          rows="3"
          placeholder="Add notes for this row…"
          value={currentNote}
          oninput={(e) => setNote(e.currentTarget.value)}
          disabled={!activeItem}
        ></textarea>
      </section>

      <MetadataPanel meta={pattern.meta} measurements={pattern.sizes.measurements} indices={idx} />

      <div class="resets">
        <button onclick={resetSection}>Reset section</button>
        <button class="danger" onclick={resetPattern}>Reset pattern</button>
      </div>
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
                calibration={calibrationOf(item.i, item.block)}
                onRow={(d) => { activeBlock = item.i; bumpRow(item.i, d, chartRows(item.i, item.block)); }}
                onRep={(d) => bumpRep(item.i, d, Number(resolveGraded(item.block.repeat ?? '1', idx)) || 1)}
                onCalibration={(next) => setCalibration(item.i, item.block, next)}
                active={activeBlock === item.i}
                onSelect={() => (activeBlock = item.i)}
              />
            {:else if item.block.type === 'grid'}
              <GridBlock
                block={item.block}
                indices={idx}
                rowNo={item.rowNo}
                {lang}
                active={activeBlock === item.i}
                done={!!done[`${selectedId}:${item.i}`]}
                onToggle={() => toggleDone(item.i)}
                onSelect={() => (activeBlock = item.i)}
              />
            {:else}
              <CounterBlock
                block={item.block}
                indices={idx}
                rowNo={item.rowNo}
                {lang}
                active={activeBlock === item.i}
                done={!!done[`${selectedId}:${item.i}`]}
                onToggle={() => toggleDone(item.i)}
                count={reps[`${selectedId}:${item.i}`] ?? 0}
                onCount={(d) => bumpCount(item.i, d)}
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
  .back {
    align-self: center; cursor: pointer; font: inherit; font-size: 12px;
    padding: 4px 10px; border-radius: 20px; margin-right: 2px;
    background: var(--card); border: 1px solid var(--border); color: var(--text-muted);
  }
  .back:hover { background: var(--panel); }

  .chips { display: flex; gap: 6px; }
  .chip {
    font-size: 12px; padding: 4px 10px; border-radius: 20px;
    background: var(--card); border: 1px solid var(--border); color: var(--text-muted);
  }
  .chip.accent { background: var(--accent-soft); border-color: var(--accent-soft); color: #92600b; }
  .chip.toggle { cursor: pointer; }
  .chip.toggle:hover { background: var(--panel); }

  .body { display: grid; grid-template-columns: 260px 1fr; gap: 0; }
  .sidebar { padding: 14px; border-right: 1px solid var(--border); }
  .side-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-muted); margin: 0 10px 8px;
  }
  .keyhint { margin: 14px 10px 0; font-size: 11px; color: var(--text-faint); line-height: 1.5; }
  .row-panel { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
  .row-panel h3 { margin: 0 0 10px; font-size: 13px; }
  .panel-label { display: block; margin: 8px 0 3px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-faint); }
  .source-text { margin: 0; font-size: 11px; line-height: 1.5; color: var(--text-muted); }
  textarea { width: 100%; resize: vertical; padding: 7px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--card); color: var(--text); font: inherit; font-size: 12px; line-height: 1.4; }
  textarea:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
  .resets { display: flex; gap: 6px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
  .resets button { flex: 1; padding: 6px; border: 1px solid var(--border); border-radius: 7px; background: var(--card); color: var(--text-muted); cursor: pointer; font-size: 11px; }
  .resets button:hover { background: var(--panel); }
  .resets .danger { color: #a33; }

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
