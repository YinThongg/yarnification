<script>
  import ChartOverlay from './lib/ChartOverlay.svelte';
</script>

<main>
  <header>
    <h1>洛神背心 · 图表2</h1>
    <p>Level-1 chart overlay prototype — a 77-row lace chart you tap through row by row.</p>
  </header>

  <ChartOverlay src="/chart2.png" rows={77} />
</main>

<style>
  :global(body) { background: #faf8f4; margin: 0; }
  main { padding: 1.5rem 1rem 3rem; }
  header { text-align: center; margin-bottom: 1rem; font-family: system-ui, sans-serif; }
  header h1 { margin: 0 0 .25rem; font-size: 1.4rem; }
  header p { margin: 0; color: #777; font-size: .9rem; }
</style>
