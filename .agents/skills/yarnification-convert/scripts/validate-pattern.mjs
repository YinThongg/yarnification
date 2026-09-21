#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [file, sourceFile] = process.argv.slice(2);
if (!file || process.argv.length > 4) {
  console.error('Usage: node validate-pattern.mjs <pattern.json> [source.bundle.json]');
  process.exit(2);
}

const errors = [];
const warnings = [];
const error = (path, message) => errors.push(`${path}: ${message}`);
const warn = (path, message) => warnings.push(`${path}: ${message}`);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstNumber(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function resolvedTarget(block) {
  if (block.target === undefined || block.target === null) return null;
  if (typeof block.target === 'number') return block.target;
  const placeholder = String(block.target).match(/^\{([^}]+)\}$/);
  if (placeholder) return firstNumber(block.values?.[placeholder[1]]);
  return firstNumber(block.target);
}

const stitch = {
  K: { delta: 0, output: 1 },
  P: { delta: 0, output: 1 },
  K1TBL: { delta: 0, output: 1 },
  YO: { delta: 1, output: 1 },
  K2TOG: { delta: -1, output: 1 },
  SSK: { delta: -1, output: 1 },
  P2TOG: { delta: -1, output: 1 },
  SSP: { delta: -1, output: 1 },
  SL: { delta: 0, output: 1 },
  SLK: { delta: 0, output: 1 },
  SLP: { delta: 0, output: 1 },
  M1R: { delta: 1, output: 1 },
  M1L: { delta: 1, output: 1 },
  M1RP: { delta: 1, output: 1 },
  M1LP: { delta: 1, output: 1 },
  KFB: { delta: 1, output: 1 },
  DS: { delta: 0, output: 1 },
};

function analyzeKnit(value, path) {
  if (!nonEmptyString(value)) {
    error(path, 'must be a non-empty .knit row string');
    return null;
  }

  const declaredMatch = value.match(/\[([+-]\d+)\]\s*$/);
  const declared = declaredMatch ? Number(declaredMatch[1]) : null;
  const body = declaredMatch ? value.slice(0, declaredMatch.index) : value;
  let delta = 0;
  let output = 0;
  let hasTurn = false;
  let hasUnknown = false;

  for (const [segmentIndex, segment] of body.split('|').entries()) {
    if (!segment.trim()) error(path, `marker segment ${segmentIndex + 1} is empty`);
    for (const raw of segment.split(',')) {
      const token = raw.trim();
      if (!token) continue;
      const upper = token.toUpperCase();
      if (upper === 'BOR') continue;
      if (upper === 'TURN') {
        hasTurn = true;
        continue;
      }

      const counted = upper.match(/^([KP])(\d+)$/);
      if (counted) {
        const count = Number(counted[2]);
        if (count < 1) error(path, `${token} must have a positive count`);
        output += count;
        continue;
      }

      if (upper.startsWith('?')) {
        if (token.length === 1) error(path, 'unknown stitch marker must retain its source spelling after ?');
        else warn(path, `explicitly unknown stitch ${token}`);
        hasUnknown = true;
        output += 1;
        continue;
      }

      if (!stitch[upper]) {
        error(path, `unrecognized stitch ${token}; prefix it with ? instead of guessing`);
        output += 1;
        continue;
      }

      delta += stitch[upper].delta;
      output += stitch[upper].output;
    }
  }

  if (delta !== 0 && declared === null) {
    error(path, `row changes the stitch count by ${delta >= 0 ? '+' : ''}${delta} but has no [±N] marker`);
  } else if (declared !== null && declared !== delta) {
    if (hasUnknown) warn(path, `declares ${declared >= 0 ? '+' : ''}${declared}; arithmetic cannot be verified while the row has an unknown stitch`);
    else error(path, `declares ${declared >= 0 ? '+' : ''}${declared}, but stitch arithmetic is ${delta >= 0 ? '+' : ''}${delta}`);
  }

  return { delta, declared, output, hasTurn, hasUnknown };
}

function validateValues(values, path) {
  if (values === undefined) return;
  if (!isObject(values)) {
    error(path, 'must be an object');
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    if (!nonEmptyString(value)) error(`${path}.${key}`, 'must be a non-empty graded string');
  }
}

function countNumbers(value) {
  return (String(value).match(/\d+(?:\.\d+)?/g) ?? []).length;
}

function inferredGradedWidth(values) {
  let max = 0;
  const patterns = [
    /(?:\d+(?:\.\d+)?\s*,\s*){2,}\d+(?:\.\d+)?(?:\s*[([]\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)+\s*[)\]])+/g,
    /(?:\(\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)+\s*\)\s*){2,}/g,
  ];
  for (const raw of values) {
    const text = String(raw).replaceAll('，', ',').replaceAll('（', '(').replaceAll('）', ')').replaceAll('［', '[').replaceAll('］', ']');
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) max = Math.max(max, countNumbers(match[0]));
    }
  }
  return max;
}

function requestedSizes(value) {
  const source = String(value ?? '').trim();
  if (!source) return [];
  const commaParts = source.split(/[,，/\n]+/).map((part) => part.trim()).filter(Boolean);
  return commaParts.length > 1 ? commaParts : source.split(/\s+/).filter(Boolean);
}

function positiveIntegerList(value) {
  const numbers = String(value).match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return numbers.length > 0 && numbers.every((number) => Number.isInteger(number) && number > 0);
}

function validateBlock(block, path, labels) {
  if (!isObject(block)) {
    error(path, 'must be an object');
    return null;
  }
  if (!['counter', 'grid', 'chart'].includes(block.type)) {
    error(`${path}.type`, 'must be counter, grid, or chart');
    return null;
  }
  if (!nonEmptyString(block.source)) error(`${path}.source`, 'must preserve non-empty original-language source text');
  if (block.text !== undefined && !nonEmptyString(block.text)) error(`${path}.text`, 'must be a non-empty string when present');
  if (block.side !== undefined && block.side !== null && !['RS', 'WS'].includes(block.side)) {
    error(`${path}.side`, 'must be RS, WS, or null');
  }
  validateValues(block.values, `${path}.values`);

  if (block.appliesTo !== undefined) {
    if (!Array.isArray(block.appliesTo) || block.appliesTo.length === 0) {
      error(`${path}.appliesTo`, 'must be a non-empty array when present');
    } else {
      for (const label of block.appliesTo) {
        if (!labels.includes(label)) error(`${path}.appliesTo`, `contains unknown size label ${JSON.stringify(label)}`);
      }
    }
  }

  if (block.type === 'counter') {
    if (!['caston', 'setup', 'row', 'repeat'].includes(block.kind)) {
      error(`${path}.kind`, 'must be caston, setup, row, or repeat');
    }
    if (!nonEmptyString(block.text)) error(`${path}.text`, 'is required for a counter block');
    if (block.repeat !== undefined) {
      if (block.kind !== 'repeat') error(`${path}.repeat`, 'is only valid on a repeat counter');
      if (!positiveIntegerList(block.repeat)) error(`${path}.repeat`, 'must contain positive integer repeat totals');
    }
    const repeatSource = `${block.text ?? ''} ${block.source ?? ''}`;
    if (block.kind === 'repeat' && block.repeat === undefined && /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:times|repeats?)\b|(?:共|一共).*?\d+\s*次/i.test(repeatSource)) {
      error(`${path}.repeat`, 'is required when the source gives a finite repeat total');
    }
    if (block.until !== undefined && !nonEmptyString(block.until)) error(`${path}.until`, 'must be a non-empty stopping condition when present');
    return { type: 'counter', target: resolvedTarget(block) };
  }

  if (block.type === 'grid') {
    if (!nonEmptyString(block.text)) error(`${path}.text`, 'is required for a grid block');
    return { type: 'grid', ...analyzeKnit(block.knit, `${path}.knit`) };
  }

  if (!nonEmptyString(block.chartId)) error(`${path}.chartId`, 'is required for a chart block');
  if (!nonEmptyString(block.name)) error(`${path}.name`, 'is required for a chart block');
  if (!Number.isInteger(block.rows) || block.rows < 1) error(`${path}.rows`, 'must be a positive integer');
  if (!positiveIntegerList(block.repeat)) error(`${path}.repeat`, 'must contain positive integer repeat totals');
  if (block.imageBySize !== undefined && !isObject(block.imageBySize)) {
    error(`${path}.imageBySize`, 'must be an object when present');
  }
  return { type: 'chart', target: resolvedTarget(block) };
}

let pattern;
let sourceBundle = null;
try {
  pattern = JSON.parse(await readFile(file, 'utf8'));
} catch (cause) {
  console.error(`ERROR ${file}: ${cause.message}`);
  process.exit(1);
}

if (sourceFile) {
  try {
    sourceBundle = JSON.parse(await readFile(sourceFile, 'utf8'));
  } catch (cause) {
    console.error(`ERROR ${sourceFile}: ${cause.message}`);
    process.exit(1);
  }
  if (!isObject(sourceBundle) || sourceBundle.kind !== 'yarnification-bundle') {
    console.error(`ERROR ${sourceFile}: must be a Yarnification bundle`);
    process.exit(1);
  }
}

if (!isObject(pattern)) {
  error('$', 'must be a JSON object');
} else {
  if (!nonEmptyString(pattern.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pattern.id)) {
    error('$.id', 'must be a non-empty lowercase slug');
  }
  if (!isObject(pattern.meta)) error('$.meta', 'must be an object');
  else if (!nonEmptyString(pattern.meta.title)) error('$.meta.title', 'is required');

  const labels = pattern.sizes?.labels;
  if (!isObject(pattern.sizes) || !Array.isArray(labels) || labels.length === 0 || labels.some((label) => !nonEmptyString(label))) {
    error('$.sizes.labels', 'must be a non-empty array of non-empty strings');
  } else if (new Set(labels).size !== labels.length) {
    error('$.sizes.labels', 'must not contain duplicates');
  }

  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeSections = Array.isArray(pattern.sections) ? pattern.sections : [];
  const sourceStrings = [
    ...Object.values(pattern.meta ?? {}).filter((value) => typeof value === 'string'),
    ...safeSections.flatMap((section) => (
      isObject(section) && Array.isArray(section.blocks)
        ? section.blocks.flatMap((block) => isObject(block) ? [block.source, block.text, ...Object.values(block.values ?? {})] : [])
        : []
    )),
  ].filter(nonEmptyString);
  const sourceWidth = inferredGradedWidth(sourceStrings);
  if (sourceWidth > safeLabels.length) {
    error('$.sizes.labels', `contains ${safeLabels.length} label(s), but preserved source text contains grading for at least ${sourceWidth} sizes`);
  } else if (safeLabels.length === 1 && sourceStrings.some((value) => /所有尺码|all sizes/i.test(value))) {
    error('$.sizes.labels', 'contains one label even though the preserved source explicitly refers to all sizes');
  }
  if (pattern.sizes?.measurements !== undefined) {
    if (!Array.isArray(pattern.sizes.measurements)) error('$.sizes.measurements', 'must be an array');
    else pattern.sizes.measurements.forEach((measurement, index) => {
      const path = `$.sizes.measurements[${index}]`;
      if (!isObject(measurement)) return error(path, 'must be an object');
      if (!nonEmptyString(measurement.name)) error(`${path}.name`, 'is required');
      if (!Array.isArray(measurement.values) || measurement.values.length !== safeLabels.length) {
        error(`${path}.values`, `must contain one value for each of the ${safeLabels.length} size labels`);
      }
    });
  }

  if (!Array.isArray(pattern.chosen) || pattern.chosen.length < 1 || pattern.chosen.length > 2) {
    error('$.chosen', 'must contain one or two size labels');
  } else {
    for (const label of pattern.chosen) {
      if (!safeLabels.includes(label)) error('$.chosen', `contains unknown size label ${JSON.stringify(label)}`);
    }
  }

  if (!Array.isArray(pattern.sections) || pattern.sections.length === 0) {
    error('$.sections', 'must be a non-empty array');
  } else {
    const sectionIds = new Set();
    let liveCount = null;
    pattern.sections.forEach((section, sectionIndex) => {
      const sectionPath = `$.sections[${sectionIndex}]`;
      if (!isObject(section)) return error(sectionPath, 'must be an object');
      if (!nonEmptyString(section.id)) error(`${sectionPath}.id`, 'is required');
      else if (sectionIds.has(section.id)) error(`${sectionPath}.id`, 'must be unique');
      else sectionIds.add(section.id);
      if (!nonEmptyString(section.name)) error(`${sectionPath}.name`, 'is required');
      if (!Array.isArray(section.blocks) || section.blocks.length === 0) {
        error(`${sectionPath}.blocks`, 'must be a non-empty array');
        return;
      }

      section.blocks.forEach((block, blockIndex) => {
        const path = `${sectionPath}.blocks[${blockIndex}]`;
        const result = validateBlock(block, path, safeLabels);
        if (!result) return;

        if (result.type === 'counter') {
          if (block.kind === 'caston') {
            const caston = result.target ?? firstNumber(block.values?.n);
            if (caston === null) warn(path, 'cast-on count is not available as target or values.n, so continuity cannot be checked');
            else liveCount = caston;
          } else if (result.target !== null) {
            liveCount = result.target;
          }
          return;
        }

        if (result.type === 'chart') {
          if (result.target !== null) liveCount = result.target;
          else liveCount = null;
          return;
        }

        if (result.hasUnknown) {
          liveCount = null;
        } else if (!result.hasTurn && liveCount !== null) {
          const expected = liveCount + result.delta;
          if (result.output !== expected) {
            error(`${path}.knit`, `renders ${result.output} cells; expected ${expected} from prior count ${liveCount} and change ${result.delta >= 0 ? '+' : ''}${result.delta}`);
          }
          liveCount = expected;
        } else if (result.hasTurn && liveCount !== null) {
          liveCount += result.delta;
        }
      });
    });
  }

  const chartBlocks = safeSections.flatMap((section) => isObject(section) && Array.isArray(section.blocks) ? section.blocks : []).filter((block) => isObject(block) && block.type === 'chart');
  const chartIds = chartBlocks.map((block) => block.chartId).filter(nonEmptyString);
  for (const id of new Set(chartIds)) {
    if (chartIds.filter((value) => value === id).length > 1) error('$.sections', `chartId ${JSON.stringify(id)} must be unique`);
  }
  if (!sourceBundle && chartBlocks.length === 0 && sourceStrings.some((value) => /\bchart\b|diagram|图表|图解|符号/i.test(value))) {
    warn('$.sections', 'source text mentions a chart, diagram, or symbol key but the pattern has no chart blocks; inspect the rendered PDF');
  }

  if (sourceBundle) {
    if (!nonEmptyString(sourceBundle.draftId)) error('$source.draftId', 'is required');
    else if (pattern.draftId !== sourceBundle.draftId) error('$.draftId', `must exactly match source bundle ${JSON.stringify(sourceBundle.draftId)}`);

    if (!Array.isArray(sourceBundle.charts)) error('$source.charts', 'must be an array');
    const sourceChartIds = (Array.isArray(sourceBundle.charts) ? sourceBundle.charts : []).map((chart) => chart?.id).filter(nonEmptyString);
    const patternChartIds = chartBlocks.map((block) => block.chartId);
    for (const id of new Set(sourceChartIds)) {
      const sourceCount = sourceChartIds.filter((value) => value === id).length;
      const patternCount = patternChartIds.filter((value) => value === id).length;
      if (sourceCount !== 1) error('$source.charts', `chart id ${JSON.stringify(id)} must be unique`);
      if (patternCount !== 1) error('$.sections', `must contain exactly one chart block for source crop ${JSON.stringify(id)}; found ${patternCount}`);
    }
    for (const id of patternChartIds) {
      if (!sourceChartIds.includes(id)) error('$.sections', `contains chartId ${JSON.stringify(id)} that is not present in the source bundle`);
    }
    if (sourceChartIds.length === 0 && sourceBundle.chartReview !== 'confirmed-none') {
      error('$source.chartReview', 'must be "confirmed-none" when a bundle has no chart crops');
    }

    const requested = requestedSizes(sourceBundle.answers?.sizes);
    if (requested.length > 0) {
      for (const size of requested) {
        if (!pattern.chosen?.includes(size)) error('$.chosen', `does not include requested source size ${JSON.stringify(size)}`);
      }
    }
  }
}

for (const message of warnings) console.warn(`WARN  ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

if (errors.length > 0) {
  console.error(`FAILED ${file}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}

const blockCount = pattern.sections.reduce((sum, section) => sum + section.blocks.length, 0);
console.log(`OK ${file}: ${pattern.sections.length} section(s), ${blockCount} block(s), ${warnings.length} warning(s)`);
