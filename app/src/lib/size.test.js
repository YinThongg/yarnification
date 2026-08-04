import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGraded, indicesFor, resolveGraded, resolveText } from './size.js';

test('parseGraded flattens brackets and peels a unit', () => {
  assert.deepEqual(
    parseGraded('21, 21.5, 22 (22.5, 23, 24) [25, 26, 27] cm'),
    { values: ['21', '21.5', '22', '22.5', '23', '24', '25', '26', '27'], unit: 'cm' }
  );
});

test('parseGraded treats a single value as ungraded', () => {
  assert.deepEqual(parseGraded('3.25mm'), { values: ['3.25'], unit: 'mm' });
});

test('parseGraded handles a CJK unit', () => {
  assert.deepEqual(parseGraded('178, 194, 210针').unit, '针');
});

test('indicesFor maps chosen labels to positions', () => {
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  assert.deepEqual(indicesFor(labels, ['2']), [1]);
  assert.deepEqual(indicesFor(labels, ['2', '3']), [1, 2]);
  assert.deepEqual(indicesFor(labels, ['x']), []); // unknown label dropped
});

test('resolveGraded picks one size', () => {
  assert.equal(resolveGraded('178, 194, 210 (226, 242, 258) [290, 322, 354]', [1]), '194');
});

test('resolveGraded formats two sizes as primary(secondary)', () => {
  assert.equal(resolveGraded('78, 82, 87 (94, 103, 109) [119, 130, 141] cm', [1, 2]), '82(87) cm');
});

test('resolveGraded returns ungraded strings as-is', () => {
  assert.equal(resolveGraded('3.25mm', [1]), '3.25mm');
});

test('resolveGraded falls back to the raw string when unresolvable', () => {
  assert.equal(resolveGraded('50, 58, 63', [8]), '50, 58, 63'); // index out of range
});

test('resolveText fills placeholders and leaves unknown ones visible', () => {
  assert.equal(
    resolveText('K1, *(K4, yo, k2tog)* to last {edge} st, K1', { edge: '1, 1, 0 (2, 1, 0) [1, 2, 0]' }, [1]),
    'K1, *(K4, yo, k2tog)* to last 1 st, K1'
  );
  assert.equal(resolveText('work {missing}', {}, [1]), 'work {missing}');
});

test('resolveText with two chosen sizes', () => {
  assert.equal(
    resolveText('CO {n} sts', { n: '178, 194, 210 (226, 242, 258) [290, 322, 354]' }, [1, 2]),
    'CO 194(210) sts'
  );
});
