<script>
  import { resolveGraded } from './size.js';

  let { meta = {}, measurements = [], indices = [] } = $props();

  const fields = $derived([
    ['Yarn', meta.yarn],
    ['Yardage', meta.yardage ? resolveGraded(meta.yardage, indices) : null],
    ['Needles', meta.needle],
    ['Gauge', meta.gauge],
    ['Construction', meta.notes],
  ].filter(([, value]) => value));
</script>

<details class="panel">
  <summary>Pattern info</summary>
  <div class="contents">
    {#each measurements as measurement}
      <div class="field">
        <span>{measurement.name}</span>
        <b>{resolveGraded(measurement.values.join(', '), indices)}{measurement.unit}</b>
      </div>
    {/each}
    {#each fields as [label, value]}
      <div class="detail">
        <span>{label}</span>
        <p>{value}</p>
      </div>
    {/each}
  </div>
</details>

<style>
  .panel { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
  summary { cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
  summary:hover { color: var(--text); }
  .contents { margin-top: 9px; }
  .field { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 12px; }
  .field span { color: var(--text-muted); }
  .field b { font-weight: 600; text-align: right; }
  .detail { margin-top: 9px; }
  .detail span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-faint); }
  .detail p { margin: 2px 0 0; font-size: 11px; line-height: 1.45; color: var(--text-muted); overflow-wrap: anywhere; }
</style>
