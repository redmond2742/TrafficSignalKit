import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDetectorAssignments, buildServiceWindows, computeDetectorOffCounts, assignCycles } from '../src/utils/phaseBubbleScatter.js';

test('parseDetectorAssignments supports flexible input', () => {
  const map = parseDetectorAssignments('DET 1 1\n det   2   1\n#comment\nDET 2 1\nBAD');
  assert.deepEqual(map.get(1), [1, 2]);
});

test('buildServiceWindows extracts start/end', () => {
  const windows = buildServiceWindows([
    { tsMs: 1000, code: 1, param: 2 },
    { tsMs: 7000, code: 8, param: 2 },
    { tsMs: 9000, code: 1, param: 2 },
    { tsMs: 12000, code: 12, param: 2 },
  ], 2);
  assert.equal(windows.length, 2);
  assert.equal(windows[0].startTs, 1000);
  assert.equal(windows[0].endTs, 7000);
});

test('computeDetectorOffCounts counts on->off transitions in service windows', () => {
  const off = computeDetectorOffCounts([
    { tsMs: 1000, code: 82, param: 1 },
    { tsMs: 3000, code: 81, param: 1 },
    { tsMs: 4500, code: 82, param: 1 },
    { tsMs: 5000, code: 81, param: 1 },
  ], [{ startTs: 900, endTs: 5500 }], [1]);
  assert.deepEqual(off, [2]);
});

test('assignCycles keeps first service or aggregates', () => {
  const windows = [
    { startTs: 0, endTs: 10000 },
    { startTs: 12000, endTs: 18000 },
    { startTs: 70000, endTs: 82000 },
  ];
  const keep = assignCycles(windows, [60000], 'keep-first');
  const agg = assignCycles(windows, [60000], 'aggregate');
  assert.equal(keep.length, 2);
  assert.equal(keep[0].splitS, 10);
  assert.equal(agg[0].splitS, 16);
});
