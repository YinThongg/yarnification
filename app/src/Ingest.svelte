<script>
  import { tick } from 'svelte';
  import { loadPdf, renderPage, extractText } from './lib/pdf.js';
  import { saveDraft } from './stores/library.js';

  // Ingestion flow: upload a pattern PDF → render + extract text locally → crop
  // its charts → answer 3 questions → export a bundle for Claude. Claude returns
  // pattern.json (imported elsewhere); the cropped images are kept in a draft and
  // merged back in on import. `onBack` returns to the library.
  let { onBack, onImport } = $props();

  let fileName = $state('');
  let numPages = $state(0);
  let status = $state('idle'); // idle | loading | ready | error
  let error = $state('');

  let doc = null;              // pdf.js document (not reactive)
  let canvases = $state([]);   // one <canvas> per page
  let pagesText = $state([]);  // [{ page, lines, text }]

  let charts = $state([]);     // [{ id, page, dataUrl }] cropped charts
  let cropPage = $state(null); // page index (0-based) in crop mode, or null
  let selection = $state(null);// active drag rect in CSS px { x, y, w, h }
  let dragging = false;
  let cropStart = null;

  let answers = $state({ sizes: '', language: 'both', scope: 'Whole pattern' });
  let draftId = '';
  let exportMsg = $state('');
  let promptText = $state('');

  const slug = (s) =>
    (s || 'pattern').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pattern';

  async function onFile(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      status = 'error';
      error = `“${file.name}” is not a PDF.`;
      return;
    }
    fileName = file.name;
    status = 'loading';
    error = '';
    numPages = 0;
    doc = null;
    canvases = [];
    pagesText = [];
    charts = [];
    cropPage = null;
    exportMsg = '';
    promptText = '';
    draftId = `${slug(file.name)}-${Date.now().toString(36)}`;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      doc = await loadPdf(bytes);
      numPages = doc.numPages;
      pagesText = await extractText(doc);
      status = 'ready';
      await tick(); // let the canvas elements mount before we draw into them
      for (let i = 1; i <= numPages; i++) {
        if (canvases[i - 1]) await renderPage(doc, i, canvases[i - 1]);
      }
    } catch (err) {
      status = 'error';
      error = String(err?.message ?? err);
    }
  }

  // --- Chart cropping -------------------------------------------------------
  function toggleCrop(i) {
    cropPage = cropPage === i ? null : i;
    selection = null;
  }
  function pointFromEvent(overlay, e) {
    const r = overlay.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function beginCrop(i, e) {
    if (cropPage !== i) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* synthetic/again — fine */ }
    dragging = true;
    cropStart = pointFromEvent(e.currentTarget, e);
    selection = { ...cropStart, w: 0, h: 0 };
  }
  function moveCrop(e) {
    if (!dragging) return;
    const p = pointFromEvent(e.currentTarget, e);
    selection = {
      x: Math.min(cropStart.x, p.x),
      y: Math.min(cropStart.y, p.y),
      w: Math.abs(p.x - cropStart.x),
      h: Math.abs(p.y - cropStart.y),
    };
  }
  function endCrop(i) {
    if (!dragging) return;
    dragging = false;
    const sel = selection;
    selection = null;
    if (!sel || sel.w < 8 || sel.h < 8) return; // ignore stray clicks
    captureCrop(i, sel);
  }
  function captureCrop(i, sel) {
    const canvas = canvases[i];
    const scale = canvas.width / canvas.clientWidth; // CSS px → canvas px
    const sx = Math.round(sel.x * scale);
    const sy = Math.round(sel.y * scale);
    const sw = Math.round(sel.w * scale);
    const sh = Math.round(sel.h * scale);
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    tmp.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    charts = [...charts, { id: `chart${charts.length + 1}`, page: i + 1, dataUrl: tmp.toDataURL('image/png') }];
    cropPage = null;
  }
  function removeChart(id) {
    // Renumber so ids stay chart1..N contiguous (they map to 图表1..N).
    charts = charts.filter((c) => c.id !== id).map((c, n) => ({ ...c, id: `chart${n + 1}` }));
  }

  // --- Section hints (light heuristic; Claude does the real structuring) -----
  const HEADER_RE = /(蕾丝|底边|身体|前片|后片|前身|后身|袖|领|图表|说明|尺寸|尺码|密度|材料|用针|border|body|front|back|sleeve|neck|chart|gauge)/i;
  const sectionHints = $derived.by(() => {
    const hits = [];
    for (const p of pagesText) {
      for (const line of p.lines) {
        if (line.length <= 18 && HEADER_RE.test(line)) hits.push({ page: p.page, line });
      }
    }
    return hits;
  });
  const sizeHint = $derived(
    pagesText.flatMap((p) => p.lines).find((l) => /尺码|尺寸|size/i.test(l)) ?? ''
  );
  const bustHint = $derived(
    pagesText.flatMap((p) => p.lines).find((l) => /胸围|bust/i.test(l)) ?? ''
  );

  // --- Export ---------------------------------------------------------------
  function buildBundle() {
    return {
      kind: 'yarnification-bundle',
      version: 1,
      draftId,
      source: { fileName, numPages },
      answers: { ...answers },
      charts: charts.map((c) => ({ id: c.id, page: c.page })), // no image data — kept in the draft
      sectionHints,
      pages: pagesText.map((p) => ({ page: p.page, text: p.text })),
    };
  }

  function buildPrompt(bundle) {
    return [
      'You are converting a knitting pattern into Yarnification’s pattern.json.',
      'Rules: follow patterns/SCHEMA.md; keep ALL sizes in `sizes` (chosen = the answer below);',
      'preserve original-language `source` text per row; each 图表N/chart becomes a `chart` block',
      `whose id matches the crop ids below; set the top-level "draftId" to "${bundle.draftId}" so`,
      'the app can merge the cropped chart images back in on import. Return ONLY the JSON.',
      '',
      'BUNDLE:',
      '```json',
      JSON.stringify(bundle, null, 2),
      '```',
    ].join('\n');
  }

  async function persistDraft() {
    try {
      // $state.snapshot → plain objects; IndexedDB's structured clone can't
      // clone Svelte's reactive proxies (throws DataCloneError otherwise).
      await saveDraft({
        id: draftId,
        source: { fileName, numPages },
        answers: $state.snapshot(answers),
        charts: $state.snapshot(charts),
      });
      return true;
    } catch {
      return false; // IndexedDB genuinely unavailable (private mode) — export still works
    }
  }

  async function downloadBundle() {
    const bundle = buildBundle();
    const saved = await persistDraft();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draftId}.bundle.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    exportMsg = saved
      ? 'Bundle downloaded. Give it to Claude, then import the returned pattern.json.'
      : 'Bundle downloaded, but the chart crops could not be saved (private mode) — importing may lose images.';
  }

  async function copyPrompt() {
    const bundle = buildBundle();
    const saved = await persistDraft();
    promptText = buildPrompt(bundle);
    let copied = false;
    try {
      await navigator.clipboard.writeText(promptText);
      copied = true;
    } catch {
      /* clipboard blocked — the textarea below lets the user copy manually */
    }
    exportMsg = (copied ? 'Prompt copied to clipboard. ' : 'Prompt ready below (copy it). ') +
      (saved ? 'Paste it to Claude, then import the returned JSON.' : '(Crops could not be saved — private mode.)');
  }

  const canExport = $derived(status === 'ready' && answers.sizes.trim().length > 0);
</script>

<div class="ingest">
  <header class="top">
    <button class="back" onclick={onBack} aria-label="Back to my patterns">‹ Patterns</button>
    <h1>Add a pattern</h1>
  </header>

  <div class="intro">
    <p>Upload a pattern PDF. The app reads it locally — text and chart crops are extracted here,
      then handed to Claude to convert into a trackable pattern. Nothing is uploaded to a server.</p>
    <label class="filebtn">
      {status === 'idle' ? 'Choose PDF…' : 'Choose a different PDF…'}
      <input type="file" accept="application/pdf,.pdf" onchange={onFile} />
    </label>
    {#if fileName}<span class="fname">{fileName}{numPages ? ` · ${numPages} page${numPages === 1 ? '' : 's'}` : ''}</span>{/if}
  </div>

  {#if status === 'loading'}
    <p class="msg">Rendering pages…</p>
  {:else if status === 'error'}
    <p class="msg err">Couldn't read that PDF: {error}</p>
  {/if}

  {#if status === 'ready'}
    <div class="cols">
      <div class="pages">
        <h2 class="col-title">Pages — crop each chart</h2>
        {#each Array(numPages) as _, i (i)}
          <div class="page">
            <div class="canvas-wrap" class:cropping={cropPage === i}>
              <canvas bind:this={canvases[i]}></canvas>
              {#if cropPage === i}
                <div
                  class="overlay"
                  role="application"
                  aria-label="Drag a box around a chart to crop it"
                  onpointerdown={(e) => beginCrop(i, e)}
                  onpointermove={moveCrop}
                  onpointerup={() => endCrop(i)}
                >
                  {#if selection}
                    <div class="sel" style="left:{selection.x}px;top:{selection.y}px;width:{selection.w}px;height:{selection.h}px"></div>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="cap">
              <span>Page {i + 1}{pagesText[i] ? ` · ${pagesText[i].lines.length} text lines` : ''}</span>
              <button class="crop-btn" onclick={() => toggleCrop(i)}>
                {cropPage === i ? 'Cancel — drag a box on the page' : '+ Crop chart'}
              </button>
            </div>
            {#if pagesText[i]?.text}
              <details class="text">
                <summary>Extracted text</summary>
                <pre>{pagesText[i].text}</pre>
              </details>
            {/if}
          </div>
        {/each}
      </div>

      <aside class="side">
        <section class="panel">
          <h2 class="col-title">Charts captured</h2>
          {#if charts.length === 0}
            <p class="hint">None yet. Click “Crop chart” under a page, then drag a box around a chart.</p>
          {:else}
            <ul class="chartlist">
              {#each charts as c (c.id)}
                <li>
                  <img src={c.dataUrl} alt={`${c.id} crop`} />
                  <div class="chartmeta">
                    <strong>{c.id}</strong><span>page {c.page}</span>
                    <button class="link-del" onclick={() => removeChart(c.id)}>remove</button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="panel">
          <h2 class="col-title">Details for Claude</h2>
          <label class="q">Which size(s)? <span class="req">*</span>
            <input type="text" bind:value={answers.sizes} placeholder="e.g. 1  or  1, 2" />
          </label>
          {#if sizeHint}<p class="hint">Found: {sizeHint}</p>{/if}
          {#if bustHint}<p class="hint">{bustHint}</p>{/if}

          <label class="q">Display language
            <select bind:value={answers.language}>
              <option value="both">Original + English</option>
              <option value="zh">Original only</option>
              <option value="en">English only</option>
            </select>
          </label>

          <label class="q">Scope
            <input type="text" bind:value={answers.scope} placeholder="Whole pattern, or which sections" />
          </label>
        </section>

        <section class="panel">
          <h2 class="col-title">Export bundle</h2>
          <p class="hint">{charts.length} chart{charts.length === 1 ? '' : 's'} · {sectionHints.length} section hints · {numPages} pages of text</p>
          <div class="exports">
            <button class="primary" disabled={!canExport} onclick={downloadBundle}>⬇ Download bundle.json</button>
            <button disabled={!canExport} onclick={copyPrompt}>📋 Copy prompt</button>
          </div>
          {#if !canExport}<p class="hint">Enter at least one size to export.</p>{/if}
          {#if exportMsg}<p class="ok">{exportMsg}</p>{/if}
          {#if promptText}
            <textarea class="prompt" readonly rows="6">{promptText}</textarea>
          {/if}
        </section>
      </aside>
    </div>
  {/if}
</div>

<style>
  .ingest { max-width: 1100px; margin: 0 auto; min-height: 100vh; padding: 18px 22px; }
  .top { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
  .top h1 { margin: 0; font-size: 1.3rem; }
  .back {
    cursor: pointer; font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 20px;
    background: var(--card); border: 1px solid var(--border); color: var(--text-muted);
  }
  .back:hover { background: var(--panel); }

  .intro { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; max-width: 640px; }
  .intro p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
  .filebtn {
    display: inline-block; cursor: pointer; font-size: 13px; padding: 8px 14px; border-radius: 8px;
    background: var(--accent-soft); color: #92600b; border: 1px solid var(--accent-soft);
  }
  .filebtn:hover { filter: brightness(0.97); }
  .filebtn input { display: none; }
  .fname { font-size: 12px; color: var(--text-muted); }

  .msg { margin-top: 16px; font-size: 13px; color: var(--text-muted); }
  .msg.err { color: #a33; }

  .cols { display: grid; grid-template-columns: 1fr 320px; gap: 22px; margin-top: 20px; align-items: start; }
  .col-title { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }

  .pages { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .page { min-width: 0; }
  .canvas-wrap { position: relative; display: inline-block; max-width: 100%; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: #fff; }
  .canvas-wrap.cropping { outline: 2px solid var(--accent); }
  .canvas-wrap canvas { display: block; max-width: 100%; height: auto; }
  .overlay { position: absolute; inset: 0; cursor: crosshair; touch-action: none; }
  .sel { position: absolute; border: 2px solid var(--accent); background: rgba(217,119,6,0.15); pointer-events: none; }
  .cap { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 11px; color: var(--text-faint); }
  .crop-btn { cursor: pointer; font: inherit; font-size: 11px; padding: 3px 9px; border-radius: 14px; border: 1px solid var(--border); background: var(--card); color: var(--text-muted); }
  .crop-btn:hover { background: var(--panel); }

  .text { margin-top: 8px; }
  .text summary { cursor: pointer; font-size: 12px; color: var(--accent); }
  .text pre {
    margin: 8px 0 0; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--panel); font-size: 12px; line-height: 1.5; white-space: pre-wrap;
    word-break: break-word; max-height: 320px; overflow: auto;
  }

  .side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 12px; }
  .panel { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; background: var(--card); }
  .hint { margin: 6px 0 0; font-size: 11px; color: var(--text-faint); line-height: 1.5; }
  .ok { margin: 8px 0 0; font-size: 12px; color: #2a7; line-height: 1.5; }

  .chartlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .chartlist img { display: block; max-width: 100%; border: 1px solid var(--border); border-radius: 4px; }
  .chartmeta { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; font-size: 12px; }
  .chartmeta span { color: var(--text-muted); }
  .link-del { margin-left: auto; cursor: pointer; border: none; background: none; color: #a33; font-size: 11px; padding: 0; }

  .q { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: 12px; color: var(--text-muted); }
  .q input, .q select { padding: 7px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--card); color: var(--text); font: inherit; font-size: 13px; }
  .q input:focus, .q select:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
  .req { color: var(--accent); }

  .exports { display: flex; flex-direction: column; gap: 8px; }
  .exports button { cursor: pointer; font: inherit; font-size: 13px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
  .exports button:hover:not(:disabled) { background: var(--panel); }
  .exports button:disabled { opacity: 0.5; cursor: default; }
  .exports .primary { background: var(--accent-soft); border-color: var(--accent-soft); color: #92600b; }
  .prompt { width: 100%; margin-top: 10px; resize: vertical; padding: 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); color: var(--text); font: inherit; font-size: 11px; line-height: 1.4; }

  @media (max-width: 820px) {
    .cols { grid-template-columns: 1fr; }
    .side { position: static; }
  }
</style>
