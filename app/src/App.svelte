<script>
  import { onMount } from 'svelte';
  import seed from '../patterns/luoshen-vest.json';
  import { deletePattern, getPattern, listPatterns, putPattern, seedPattern } from './stores/library.js';
  import { loadChosen, saveChosen } from './lib/progress.js';
  import PatternView from './PatternView.svelte';
  import ImportDialog from './ImportDialog.svelte';
  // Ingest pulls in pdf.js (~400KB); load it only when the user opens the flow,
  // so the library + tracker stay lightweight for the common case.
  let ingestPromise = $state(null);

  // Router state: `current` null → the library ("My patterns") screen; otherwise
  // the opened pattern is tracked in PatternView. The library lives in IndexedDB
  // (stores/library.js); the bundled vest is seeded in on first run.
  let patterns = $state([]);      // installed pattern records, newest first
  let current = $state(null);     // opened full pattern, or null
  let chosen = $state([]);        // size label(s) for the open pattern (picker-controlled)
  let ingesting = $state(false);  // true → the "Add a pattern" ingestion flow
  let importing = $state(false);  // true → the "Import pattern.json" dialog

  function openIngest() {
    ingestPromise ??= import('./Ingest.svelte'); // cached after first open
    ingesting = true;
  }
  let status = $state('loading'); // 'loading' | 'ready'
  let storeOk = $state(true);     // false → IndexedDB unavailable, seed-only fallback

  async function refresh() {
    patterns = await listPatterns();
  }

  async function init() {
    try {
      await seedPattern(seed);
      await refresh();
    } catch {
      // IndexedDB unavailable (e.g. private browsing). Keep the app usable with
      // the bundled seed pattern in memory; the library just won't persist.
      storeOk = false;
      patterns = [{ ...seed, addedAt: Date.now() }];
    }
    status = 'ready';
  }

  onMount(init);

  // Open a pattern into the reading view, seeding the size picker from the saved
  // selection (or the pattern's own default).
  function show(record) {
    current = record;
    chosen = loadChosen(record.id) ?? record.chosen ?? [];
  }

  // Change which size(s) are being knit; persist and let the {#key} remount
  // PatternView so progress re-scopes to the new size combo.
  function changeChosen(next) {
    if (!next?.length || !current) return;
    saveChosen(current.id, next);
    chosen = next;
  }

  async function open(id) {
    let record = null;
    if (storeOk) {
      try { record = await getPattern(id); } catch { /* fall through to memory */ }
    }
    if (!record) record = patterns.find((p) => p.id === id) ?? null;
    if (record) show(record);
    else current = null;
  }

  async function back() {
    current = null;
    if (storeOk) await refresh();
  }

  async function remove(record) {
    const title = record.meta.titleEn ?? record.meta.title;
    if (!window.confirm(`Remove “${title}” from your patterns? Your saved progress for it is kept.`)) return;
    if (storeOk) {
      await deletePattern(record.id);
      await refresh();
    } else {
      patterns = patterns.filter((p) => p.id !== record.id);
    }
  }

  // Install a finished pattern from the ingestion flow, then return to the
  // library with it visible. In seed-only fallback we can't persist, so keep it
  // in the in-memory list at least for this session.
  async function importPattern(pattern) {
    if (storeOk) {
      const record = await putPattern(pattern);
      await refresh();
      ingesting = false;
      show(record);
    } else {
      const record = { ...pattern, addedAt: Date.now() };
      patterns = [record, ...patterns.filter((p) => p.id !== record.id)];
      ingesting = false;
      show(record);
    }
  }

  // Finished importing a pattern.json: refresh the library and open it.
  async function onImported(record) {
    importing = false;
    if (storeOk) await refresh();
    else patterns = [record, ...patterns.filter((p) => p.id !== record.id)];
    show(record);
  }

  // "1", or "1(2, 3)" for multi-size — matches PatternView's header chip.
  function sizeLabel(chosen) {
    return chosen.length === 1 ? chosen[0] : `${chosen[0]}(${chosen.slice(1).join(', ')})`;
  }
</script>

{#if current}
  {#key current.id + '|' + chosen.join(',')}
    <PatternView pattern={current} {chosen} onBack={back} onChangeChosen={changeChosen} />
  {/key}
{:else if ingesting}
  {#await ingestPromise then mod}
    {@const Ingest = mod.default}
    <Ingest onBack={() => (ingesting = false)} onImport={importPattern} />
  {:catch e}
    <p class="placeholder" style="padding:22px">Couldn't load the importer: {e.message}</p>
  {/await}
{:else}
  <div class="library">
    <header class="lib-top">
      <h1>My patterns</h1>
      <span class="count">{patterns.length} saved</span>
      <button class="ghost" onclick={() => (importing = true)}>Import JSON</button>
      <button class="add" onclick={openIngest}>+ Add pattern</button>
    </header>

    {#if status === 'loading'}
      <p class="placeholder">Loading your patterns…</p>
    {:else if patterns.length === 0}
      <p class="placeholder">No patterns yet. Importing patterns arrives in Phase 4.</p>
    {:else}
      <ul class="grid">
        {#each patterns as p (p.id)}
          <li class="card">
            <button class="card-open" onclick={() => open(p.id)}>
              <span class="card-title">{p.meta.titleEn ?? p.meta.title}</span>
              {#if p.meta.titleEn && p.meta.title !== p.meta.titleEn}
                <span class="card-orig">{p.meta.title}</span>
              {/if}
              <span class="card-meta">
                <span class="pill">Size {sizeLabel(loadChosen(p.id) ?? p.chosen)}</span>
                <span class="pill soft">{p.sections.length} section{p.sections.length === 1 ? '' : 's'}</span>
              </span>
            </button>
            <button class="card-del" title="Remove pattern" aria-label="Remove pattern" onclick={() => remove(p)}>×</button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if !storeOk && status === 'ready'}
      <p class="warn">Offline library storage is unavailable in this browser mode, so patterns won't persist.</p>
    {/if}
  </div>

  {#if importing}
    <ImportDialog onClose={() => (importing = false)} {onImported} />
  {/if}
{/if}

<style>
  .library { max-width: 1000px; margin: 0 auto; min-height: 100vh; padding: 18px 22px; }
  .lib-top { display: flex; align-items: baseline; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
  .lib-top h1 { margin: 0; font-size: 1.3rem; }
  .count { color: var(--text-muted); font-size: 12px; }
  .add {
    cursor: pointer; font: inherit; font-size: 13px; padding: 6px 12px;
    border-radius: 8px; background: var(--accent-soft); color: #92600b; border: 1px solid var(--accent-soft);
  }
  .add:hover { filter: brightness(0.97); }
  .ghost {
    margin-left: auto; cursor: pointer; font: inherit; font-size: 13px; padding: 6px 12px;
    border-radius: 8px; background: var(--card); color: var(--text-muted); border: 1px solid var(--border);
  }
  .ghost:hover { background: var(--panel); }

  .placeholder { color: var(--text-muted); font-size: 14px; }
  .warn { margin-top: 18px; color: var(--text-muted); font-size: 12px; }

  .grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .card { position: relative; }
  .card-open {
    display: flex; flex-direction: column; gap: 6px; width: 100%; text-align: left;
    padding: 14px; border: 1px solid var(--border); border-radius: 12px;
    background: var(--card); color: var(--text); cursor: pointer; font: inherit;
  }
  .card-open:hover { border-color: var(--accent); background: var(--panel); }
  .card-title { font-size: 15px; font-weight: 600; }
  .card-orig { font-size: 12px; color: var(--text-muted); }
  .card-meta { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
  .pill { font-size: 11px; padding: 3px 8px; border-radius: 20px; background: var(--accent-soft); color: #92600b; }
  .pill.soft { background: var(--panel); color: var(--text-muted); border: 1px solid var(--border); }

  .card-del {
    position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; line-height: 1;
    border: 1px solid var(--border); border-radius: 50%; background: var(--card);
    color: var(--text-muted); cursor: pointer; font-size: 15px;
  }
  .card-del:hover { color: #a33; border-color: #a33; }
</style>
