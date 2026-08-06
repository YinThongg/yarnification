import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRow, serializeRow, nextStitch, STITCHES, STITCH_ORDER } from './knit.js';

const types = (r) => r.cells.map((c) => c.type);

test('expands K<n> into n cells', () => {
  const r = parseRow('K24');
  assert.equal(r.cells.length, 24);
  assert.ok(r.cells.every((c) => c.type === 'K'));
  assert.equal(r.net, 0);
  assert.deepEqual(r.markers, []);
});

test('mixes counted and single tokens in order', () => {
  assert.deepEqual(types(parseRow('K2,P2,K1')), ['K', 'K', 'P', 'P', 'K']);
});

test('does not misparse K2TOG as K×2', () => {
  const r = parseRow('SSK,K2TOG');
  assert.deepEqual(types(r), ['SSK', 'K2TOG']);
  assert.equal(r.net, -2);
});

test('YO and a decrease cancel (eyelet row nets zero)', () => {
  const r = parseRow('K2,YO,K2TOG');
  assert.equal(r.net, 0);
  assert.deepEqual(types(r), ['K', 'K', 'YO', 'K2TOG']);
});

test('markers land between segments at the right cell index', () => {
  // K24,M1R | K1 | M1L,K49,M1R | K1 | M1L,K25   → the raglan increase row
  const r = parseRow('K24,M1R | K1 | M1L,K49,M1R | K1 | M1L,K25 [+4]');
  assert.equal(r.declared, 4);
  assert.equal(r.net, 4);          // 2×M1R + 2×M1L
  assert.equal(r.mismatch, false);
  // segment cell counts: 25 | 1 | 51 | 1 | 26  → markers sit at those boundaries
  assert.deepEqual(r.markers, [25, 26, 77, 78]);
  assert.equal(r.cells.length, 25 + 1 + 51 + 1 + 26);
});

test('flags a net-change mismatch against the declared bracket', () => {
  const r = parseRow('K24 [+1]');
  assert.equal(r.declared, 1);
  assert.equal(r.net, 0);
  assert.equal(r.mismatch, true);
});

test('accepts [+0] and omitted brackets without flagging', () => {
  assert.equal(parseRow('K24 [+0]').mismatch, false);
  assert.equal(parseRow('K24').mismatch, false);
  assert.equal(parseRow('K24').declared, null);
});

test('unrecognized tokens are flagged, not guessed', () => {
  const r = parseRow('K1,SKPO,K1');
  assert.deepEqual(types(r), ['K', '?', 'K']);
  assert.deepEqual(r.unknown, ['SKPO']);
  assert.equal(r.cells[1].raw, 'SKPO');
});

test('BOR at row edges sets flags without adding cells', () => {
  const r = parseRow('BOR,K24,BOR');
  assert.equal(r.cells.length, 24);
  assert.deepEqual(r.bor, { start: true, end: true });
});

test('turn records a short-row turn position', () => {
  const r = parseRow('turn,DS,P22,turn');
  assert.deepEqual(types(r), ['DS', ...Array(22).fill('P')]);
  assert.deepEqual(r.turns, [0, 23]); // before first cell, and after all 23
});

test('is case-insensitive for token names and counts', () => {
  assert.deepEqual(types(parseRow('k2,p1,ssk')), ['K', 'K', 'P', 'SSK']);
});

test('every ordered stitch type has display metadata', () => {
  for (const t of STITCH_ORDER) assert.ok(STITCHES[t]?.symbol, `missing meta for ${t}`);
});

test('nextStitch cycles through the order and wraps', () => {
  assert.equal(nextStitch('K'), 'P');
  assert.equal(nextStitch(STITCH_ORDER[STITCH_ORDER.length - 1]), 'K');
  assert.equal(nextStitch('?'), 'K'); // unknown → start of cycle
});

test('serializeRow groups K/P runs back into K<n>', () => {
  const r = parseRow('K2,P2,K1');
  assert.equal(serializeRow(r), 'K2,P2,K');
});

test('serializeRow round-trips markers, BOR and the [±n] bracket', () => {
  const src = 'BOR,K5,M1R | K1 | M1L,K5,BOR [+2]';
  const out = serializeRow(parseRow(src));
  // stable under re-parse
  assert.deepEqual(parseRow(out).cells.map((c) => c.type), parseRow(src).cells.map((c) => c.type));
  assert.deepEqual(parseRow(out).markers, parseRow(src).markers);
  assert.deepEqual(parseRow(out).bor, { start: true, end: true });
  assert.equal(parseRow(out).declared, 2);
});

test('serializeRow recomputes the bracket after an edit', () => {
  const r = parseRow('K4 [+0]');
  r.cells.push({ type: 'YO' }); // add a stitch
  assert.equal(serializeRow(r), 'K4,YO [+1]');
});
