// .knit row parser — turns a compact stitch sequence into an expanded cell array
// the grid renders. See KNIT-NOTATION.md for the full format. This module is the
// row-level slice: one row's stitch sequence → cells + markers + net-change check.
//
//   parseRow("K24,M1R | K1 | M1L,K25 [+4]")
//     → { cells: [K×24, M1R, «marker» K, «marker» M1L, K×25], markers:[25,26],
//         net: 2, declared: 4, mismatch: true, bor:{…}, turns:[], unknown:[] }
//
// Cells are logical (RS knit order); the renderer handles WS right-to-left flip.

// Per-stitch display + arithmetic. Symbols/colors ported from the old index.html;
// `delta` is the net stitch-count change the token contributes (KNIT-NOTATION).
export const STITCHES = {
  K:     { symbol: '·',  label: 'K',    desc: 'Knit',              delta: 0,  bg: '#f8fafc', border: '#cbd5e1', text: '#334155' },
  P:     { symbol: '–',  label: 'P',    desc: 'Purl',              delta: 0,  bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  YO:    { symbol: 'O',  label: 'YO',   desc: 'Yarn Over',         delta: 1,  bg: '#f0fdf4', border: '#6ee7b7', text: '#065f46' },
  K2TOG: { symbol: '/',  label: 'K2tog',desc: 'Knit 2 Together',   delta: -1, bg: '#fff1f2', border: '#fda4af', text: '#9f1239' },
  SSK:   { symbol: '\\', label: 'SSK',  desc: 'Slip Slip Knit',    delta: -1, bg: '#faf5ff', border: '#c4b5fd', text: '#5b21b6' },
  SL:    { symbol: 'v',  label: 'Sl',   desc: 'Slip',              delta: 0,  bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  M1R:   { symbol: '+',  label: 'M1R',  desc: 'Make 1 Right',      delta: 1,  bg: '#f0fdf4', border: '#4ade80', text: '#14532d' },
  M1L:   { symbol: '+',  label: 'M1L',  desc: 'Make 1 Left',       delta: 1,  bg: '#f0fdf4', border: '#4ade80', text: '#14532d' },
  M1RP:  { symbol: '+',  label: 'M1Rp', desc: 'Make 1 Right Purl', delta: 1,  bg: '#fefce8', border: '#fbbf24', text: '#78350f' },
  M1LP:  { symbol: '+',  label: 'M1Lp', desc: 'Make 1 Left Purl',  delta: 1,  bg: '#fefce8', border: '#fbbf24', text: '#78350f' },
  KFB:   { symbol: '+',  label: 'KFB',  desc: 'Knit Front & Back', delta: 1,  bg: '#f0fdf4', border: '#4ade80', text: '#14532d' },
  DS:    { symbol: 'DS', label: 'DS',   desc: 'Double Stitch',     delta: 0,  bg: '#fdf4ff', border: '#e879f9', text: '#701a75' },
  // Unrecognized token — flagged in the grid rather than guessed (per spec rule 8).
  '?':   { symbol: '?',  label: '?',    desc: 'Unrecognized',      delta: 0,  bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

// The cycle order for edit mode (matches the old app's tap-to-cycle list).
export const STITCH_ORDER = ['K', 'P', 'YO', 'K2TOG', 'SSK', 'SL', 'M1R', 'M1L', 'M1RP', 'M1LP', 'KFB', 'DS'];

// Classify one comma token → { type, count } | { bor } | { turn } | { unknown }.
function classify(raw) {
  const t = raw.trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  if (upper === 'BOR') return { bor: true };
  if (upper === 'TURN') return { turn: true };

  // K<n> / P<n> — only when digits run to the end (so "K2TOG" is NOT K×2).
  const counted = t.match(/^([KkPp])(\d+)$/);
  if (counted) return { type: counted[1].toUpperCase(), count: Number(counted[2]) };

  if (upper in STITCHES && upper !== '?') return { type: upper, count: 1 };
  return { unknown: t };
}

// Next stitch type in the edit-mode cycle (tap a cell to advance). Unknown → K.
export function nextStitch(type) {
  const i = STITCH_ORDER.indexOf(type);
  return i === -1 ? STITCH_ORDER[0] : STITCH_ORDER[(i + 1) % STITCH_ORDER.length];
}

// Serialize an (edited) cell array back to compact .knit. Inverse of parseRow:
// groups K/P runs into K<n>/P<n>, re-inserts | markers and BOR, and recomputes
// the [±n] bracket when the row had one. parseRow(serializeRow(parseRow(x))) is stable.
export function serializeRow({ cells, markers = [], bor = {}, declared = null }) {
  const markerSet = new Set(markers);
  const segments = [[]];
  const cur = () => segments[segments.length - 1];
  if (bor.start) cur().push('BOR');

  let i = 0;
  while (i < cells.length) {
    if (markerSet.has(i)) segments.push([]); // a marker opens a new segment
    const type = cells[i].type;
    if (type === '?') { cur().push(cells[i].raw ?? '?'); i++; continue; }
    if (type === 'K' || type === 'P') {
      let n = 1; i++;
      while (i < cells.length && !markerSet.has(i) && cells[i].type === type) { n++; i++; }
      cur().push(n > 1 ? type + n : type);
    } else {
      cur().push(type); i++;
    }
  }
  if (markerSet.has(cells.length)) segments.push([]);
  if (bor.end) cur().push('BOR');

  let out = segments.map((s) => s.join(',')).filter((s) => s.length).join(' | ');
  if (declared !== null) {
    const net = cells.reduce((sum, c) => sum + (STITCHES[c.type]?.delta ?? 0), 0);
    out += ` [${net >= 0 ? '+' : ''}${net}]`;
  }
  return out;
}

// Parse a full row stitch sequence (may include a trailing [±n] and | markers).
export function parseRow(sequence) {
  const declaredMatch = String(sequence).match(/\[([+-]\d+)\]\s*$/);
  const declared = declaredMatch ? Number(declaredMatch[1]) : null;
  const body = declaredMatch ? String(sequence).slice(0, declaredMatch.index) : String(sequence);

  const cells = [];
  const markers = new Set();   // cell index a marker sits *before*
  const turns = [];
  const unknown = [];
  const bor = { start: false, end: false };
  let net = 0;

  const segments = body.split('|');
  segments.forEach((segment, segIndex) => {
    if (segIndex > 0) markers.add(cells.length); // marker between the two segments
    for (const tok of segment.split(',')) {
      const c = classify(tok);
      if (!c) continue;
      if (c.bor) { if (cells.length === 0) bor.start = true; else bor.end = true; continue; }
      if (c.turn) { turns.push(cells.length); continue; }
      if (c.unknown !== undefined) { cells.push({ type: '?', raw: c.unknown }); unknown.push(c.unknown); continue; }
      for (let i = 0; i < c.count; i++) cells.push({ type: c.type });
      net += (STITCHES[c.type]?.delta ?? 0) * c.count;
    }
  });

  return {
    cells,
    markers: [...markers],
    bor,
    turns,
    net,
    declared,
    mismatch: declared !== null && declared !== net,
    unknown,
  };
}
