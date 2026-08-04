<script>
  // The sidebar list of sections. Purely presentational: it takes the sections
  // and the currently-selected id, and calls onSelect when the user picks one.
  let { sections = [], selectedId = null, onSelect = () => {} } = $props();
</script>

<nav class="list" aria-label="Pattern sections">
  {#each sections as section, i}
    <button
      class="item"
      class:active={section.id === selectedId}
      onclick={() => onSelect(section.id)}
    >
      <span class="num">{i + 1}</span>
      <span class="labels">
        <span class="name">{section.name}</span>
        {#if section.nameSource && section.nameSource !== section.name}
          <span class="source">{section.nameSource}</span>
        {/if}
      </span>
    </button>
  {/each}
</nav>

<style>
  .list { display: flex; flex-direction: column; gap: 2px; }
  .item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; text-align: left; cursor: pointer;
    padding: 8px 10px; border: none; border-radius: 8px;
    background: transparent; color: var(--text); font: inherit;
  }
  .item:hover { background: var(--panel); }
  .item.active { background: var(--accent-soft); }
  .item.active .num { background: var(--accent); color: #fff; border-color: var(--accent); }

  .num {
    flex: none; width: 22px; height: 22px; border-radius: 6px;
    display: grid; place-items: center;
    font-size: 12px; font-variant-numeric: tabular-nums;
    background: var(--card); border: 1px solid var(--border); color: var(--text-muted);
  }
  .labels { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
  .name { font-size: 14px; }
  .source { font-size: 12px; color: var(--text-muted); }
</style>
