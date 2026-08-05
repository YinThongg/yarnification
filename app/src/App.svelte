<script>
  import { onMount } from 'svelte';
  import seed from '../patterns/luoshen-vest.json';
  import { deletePattern, getPattern, listPatterns, seedPattern } from './stores/library.js';
  import PatternView from './PatternView.svelte';

  // Router state: `current` null → the library ("My patterns") screen; otherwise
  // the opened pattern is tracked in PatternView. The library lives in IndexedDB
  // (stores/library.js); the bundled vest is seeded in on first run.
  let patterns = $state([]);      // installed pattern records, newest first
  let current = $state(null);     // opened full pattern, or null
  let status = $state('loading'); // 'loading' | 'ready'
  let storeOk = true;             // false → IndexedDB unavailable, seed-only fallback

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

  async function open(id) {
    if (storeOk) {
      try {
        current = await getPattern(id);
        return;
      } catch {
        /* fall through to the in-memory copy */
      }
    }
    current = patterns.find((p) => p.id === id) ?? null;
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

  // "1", or "1(2, 3)" for multi-size — matches PatternView's header chip.
  function sizeLabel(chosen) {
    return chosen.length === 1 ? chosen[0] : `${chosen[0]}(${chosen.slice(1).join(', ')})`;
  }
</script>

{#if current}
  {#key current.id}
    <PatternView pattern={current} onBack={back} />
  {/key}
{:else}
  <div class="library">
    <header class="lib-top">
      <h1>My patterns</h1>
      <span class="count">{patterns.length} saved</span>
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
                <span class="pill">Size {sizeLabel(p.chosen)}</span>
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
{/if}

<style>
  .library { max-width: 1000px; margin: 0 auto; min-height: 100vh; padding: 18px 22px; }
  .lib-top { display: flex; align-items: baseline; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 18px; }
  .lib-top h1 { margin: 0; font-size: 1.3rem; }
  .count { color: var(--text-muted); font-size: 12px; }

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
