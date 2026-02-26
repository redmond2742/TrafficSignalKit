import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDetectorAssignments, buildServiceWindows, computeDetectorOffCounts, computeDetectorDelayToGreen, buildPhaseBubblePoints, assignCycles, bubbleRadius } from '../src/utils/phaseBubbleScatter.js';

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


test('computeDetectorDelayToGreen finds first detector call before each green start', () => {
  const windows = [
    { startTs: 10000, endTs: 15000 },
    { startTs: 30000, endTs: 36000 },
  ];
  const events = [
    { tsMs: 5000, code: 82, param: 1 },
    { tsMs: 12000, code: 82, param: 1 },
    { tsMs: 21000, code: 82, param: 1 },
    { tsMs: 28000, code: 82, param: 1 },
  ];
  const delays = computeDetectorDelayToGreen(events, windows, [1]);
  assert.deepEqual(delays, [5, 9]);
});

test('buildPhaseBubblePoints includes detector_delay_s metric', () => {
  const events = [
    { tsMs: 1000, code: 1, param: 2 },
    { tsMs: 6000, code: 8, param: 2 },
    { tsMs: 9000, code: 82, param: 11 },
    { tsMs: 12000, code: 1, param: 2 },
    { tsMs: 17000, code: 12, param: 2 },
  ];
  const points = buildPhaseBubblePoints({ events, selectedPhase: 2, assignedDetectors: [11], includeFirst: true });
  assert.equal(points.length, 2);
  assert.equal(points[0].detector_delay_s, null);
  assert.equal(points[1].detector_delay_s, 3);
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


test('bubbleRadius increases with split time in linear mode', () => {
  const options = { mode: 'linear', splits: [5, 10, 20], capP95: false, minRadius: 4, maxRadius: 20 };
  const small = bubbleRadius(5, options);
  const large = bubbleRadius(20, options);
  assert.ok(large > small);
  assert.equal(large, 20);
});

test('bubbleRadius supports scaled sizing mode', () => {
  const options = { mode: 'scaled', scaledMode: 'log', splits: [1, 5, 30], capP95: false, minRadius: 4, maxRadius: 20 };
  const tiny = bubbleRadius(1, options);
  const big = bubbleRadius(30, options);
  assert.ok(big > tiny);
  assert.equal(big, 20);
});
