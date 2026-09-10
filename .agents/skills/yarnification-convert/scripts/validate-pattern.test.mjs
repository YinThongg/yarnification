import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = new URL('./validate-pattern.mjs', import.meta.url);

function basePattern() {
  return {
    id: 'synthetic-swatch',
    draftId: 'synthetic-draft',
    meta: { title: 'Synthetic swatch', sourceLang: 'en' },
    sizes: { labels: ['XS', 'S'], measurements: [] },
    chosen: ['XS'],
    sections: [{
      id: 'swatch',
      name: 'Swatch',
      blocks: [
        { type: 'counter', kind: 'caston', text: 'Cast on 4 sts.', target: '4', source: 'Cast on 4 sts.' },
        { type: 'grid', side: 'RS', text: 'Knit.', knit: 'K4', source: 'Row 1: K4.' },
        { type: 'chart', chartId: 'chart1', name: 'Chart 1', rows: 2, repeat: '1, 1', source: 'Work Chart 1.' },
      ],
    }],
  };
}

function baseBundle() {
  return {
    kind: 'yarnification-bundle',
    version: 2,
    draftId: 'synthetic-draft',
    source: { fileName: 'synthetic.pdf', numPages: 1 },
    answers: { sizes: 'XS' },
    chartReview: 'captured',
    charts: [{ id: 'chart1', page: 1 }],
    pages: [{ page: 1, text: 'Synthetic pattern text.' }],
  };
}

async function validate(pattern, bundle) {
  const dir = await mkdtemp(join(tmpdir(), 'yarnification-validator-'));
  try {
    const patternPath = join(dir, 'pattern.json');
    const bundlePath = join(dir, 'bundle.json');
    await writeFile(patternPath, JSON.stringify(pattern));
    const args = [validator.pathname, patternPath];
    if (bundle) {
      await writeFile(bundlePath, JSON.stringify(bundle));
      args.push(bundlePath);
    }
    return spawnSync(process.execPath, args, { encoding: 'utf8' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('accepts a pattern whose draft, requested size, and chart IDs match its bundle', async () => {
  const result = await validate(basePattern(), baseBundle());
  assert.equal(result.status, 0, result.stderr);
});

test('rejects a missing chart block and mismatched draft', async () => {
  const pattern = basePattern();
  pattern.draftId = 'wrong-draft';
  pattern.sections[0].blocks.pop();
  const result = await validate(pattern, baseBundle());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must exactly match source bundle/);
  assert.match(result.stderr, /exactly one chart block/);
});

test('rejects a chosen-size-only pattern and flattened stitch row', async () => {
  const pattern = basePattern();
  pattern.sizes.labels = ['XS'];
  pattern.sections[0].blocks[1] = {
    type: 'counter', kind: 'row', text: 'Row 1: K2, P2.', source: 'Sizes: (4, 5)(6, 7). Row 1: K2, P2.',
  };
  const result = await validate(pattern);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /grading for at least 4 sizes/);
  assert.match(result.stderr, /use a grid block/);
});

test('requires a total for a finite repeat tracker', async () => {
  const pattern = basePattern();
  pattern.sections[0].blocks.splice(2, 0, {
    type: 'counter', kind: 'repeat', text: 'Work Rows 1-2 five times total.', source: 'Repeat 5 times.',
  });
  const result = await validate(pattern);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /finite repeat total/);
});
