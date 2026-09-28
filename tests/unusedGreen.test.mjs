import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETECTOR_OFF,
  DETECTOR_ON,
  analyzeGreens,
  analyzeSignal,
  buildBusyIntervals,
  buildGreenIntervals,
  detectLayout,
  mergeIntervals,
  scanGreenRows,
  subtractIntervals,
  summarizePhase,
} from '../src/utils/unusedGreen.js';

const T0 = 1710432000;
const at = (s) => T0 + s;
const row = (s, code, param) => `${at(s)},${code},${param}`;
const scan = (lines) => {
  const text = lines.join('\n');
  return scanGreenRows(text, detectLayout(text));
};
const S = 1000;
const ms = (s) => (T0 + s) * 1000;

/* ---------------------------------------------------------------- the scan */

test('the scan keeps the seven codes it needs and drops the rest', () => {
  const result = scan([
    row(0, 1, 2), row(40, 8, 2),
    row(2, 21, 2), row(12, 22, 2), row(20, 23, 2),
    row(5, 82, 5), row(6, 81, 5),
    row(7, 0, 2), row(8, 10, 2), row(9, 43, 1), row(10, 131, 3),
  ]);
  assert.equal(result.signal.length, 5, 'green, yellow and three ped codes');
  assert.equal(result.detector.length, 2);
  assert.equal(result.stats.scanned, 11);
  assert.equal(result.stats.kept, 7);
  assert.deepEqual(result.channels, [5]);
  assert.deepEqual(result.phases, [2]);
});

test('an out-of-order file sorts without an OFF overtaking its ON', () => {
  const result = scan([row(9, 81, 5), row(0, 82, 5), row(0, 81, 7), row(0, 82, 7)]);
  assert.deepEqual(result.detector.slice(0, 3).map((d) => d.code), [
    DETECTOR_ON, DETECTOR_ON, DETECTOR_OFF,
  ]);
});

/* ------------------------------------------------------------ green spans */

test('a green runs from code 1 to the code 8 that ends it', () => {
  const { signal } = scan([row(0, 1, 2), row(40, 8, 2), row(100, 1, 2), row(130, 8, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens.length, 2);
  assert.equal(greens[0].endMs - greens[0].startMs, 40 * S);
  assert.equal(greens[1].endMs - greens[1].startMs, 30 * S);
});

test('greens for other phases are not collected', () => {
  const { signal } = scan([row(0, 1, 2), row(5, 1, 6), row(40, 8, 2), row(45, 8, 6)]);
  assert.equal(buildGreenIntervals(signal, 2).length, 1);
  assert.equal(buildGreenIntervals(signal, 6)[0].endMs - buildGreenIntervals(signal, 6)[0].startMs, 40 * S);
});

test('a green still running when the file ends is dropped, not guessed', () => {
  const { signal } = scan([row(0, 1, 2), row(40, 8, 2), row(100, 1, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens.length, 1, 'the unterminated green has no known length');
});

test('a green that ends when it starts is not a cycle', () => {
  // Duplicate timestamps and a phase that yellows the instant it greens both
  // produce this. Kept, it is a cycle with no green in it: a zero-length row
  // in the table and a share of idle divided by nothing.
  const { signal } = scan([row(0, 1, 2), row(0, 8, 2), row(50, 1, 2), row(80, 8, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens.length, 1, 'only the real green survives');
  assert.equal(greens[0].endMs - greens[0].startMs, 30 * S);
});

test('a second green with no yellow between takes the later start', () => {
  const { signal } = scan([row(0, 1, 2), row(10, 1, 2), row(40, 8, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens.length, 1);
  // The first start lost its yellow somewhere; pairing across the gap would
  // report a 40s green when only 30s of it is known.
  assert.equal(greens[0].endMs - greens[0].startMs, 30 * S);
});

/* --------------------------------------------------------------- intervals */

test('mergeIntervals folds overlaps and touching spans', () => {
  const merged = mergeIntervals([
    { startMs: 0, endMs: 10 },
    { startMs: 5, endMs: 12 },
    { startMs: 12, endMs: 20 },
    { startMs: 30, endMs: 40 },
  ]);
  assert.deepEqual(merged, [{ startMs: 0, endMs: 20 }, { startMs: 30, endMs: 40 }]);
});

test('mergeIntervals drops what is not a span and sorts what is', () => {
  const merged = mergeIntervals([
    { startMs: 30, endMs: 40 },
    { startMs: 10, endMs: 10 },
    { startMs: 20, endMs: 15 },
    { startMs: 0, endMs: 5 },
  ]);
  assert.deepEqual(merged, [{ startMs: 0, endMs: 5 }, { startMs: 30, endMs: 40 }]);
});

test('subtractIntervals returns what the busy timeline leaves', () => {
  const span = { startMs: 0, endMs: 100 };
  assert.deepEqual(subtractIntervals(span, []), [{ startMs: 0, endMs: 100 }]);
  assert.deepEqual(
    subtractIntervals(span, [{ startMs: 20, endMs: 30 }, { startMs: 60, endMs: 70 }]),
    [{ startMs: 0, endMs: 20 }, { startMs: 30, endMs: 60 }, { startMs: 70, endMs: 100 }],
  );
  assert.deepEqual(subtractIntervals(span, [{ startMs: 0, endMs: 100 }]), []);
});

test('subtractIntervals ignores busy time entirely after the span', () => {
  // The busy timeline covers the whole file, so most of it lies outside any
  // one green. An interval starting past the end must stop the walk, not
  // open a gap that runs from inside the span out to wherever it begins.
  assert.deepEqual(
    subtractIntervals({ startMs: 0, endMs: 100 }, [
      { startMs: 20, endMs: 30 },
      { startMs: 150, endMs: 200 },
      { startMs: 400, endMs: 500 },
    ]),
    [{ startMs: 0, endMs: 20 }, { startMs: 30, endMs: 100 }],
  );
});

test('subtractIntervals clips busy time that runs past either end', () => {
  const span = { startMs: 50, endMs: 100 };
  // Busy either side must not create gaps outside the span or negative ones.
  assert.deepEqual(
    subtractIntervals(span, [{ startMs: 0, endMs: 60 }, { startMs: 90, endMs: 200 }]),
    [{ startMs: 60, endMs: 90 }],
  );
  assert.deepEqual(subtractIntervals(span, [{ startMs: 0, endMs: 200 }]), []);
});

/* ----------------------------------------------------------- busy timeline */

test('a detector drop is credited with clearance time', () => {
  const { detector } = scan([row(10, 82, 5), row(12, 81, 5)]);
  const none = buildBusyIntervals(detector, [5], { clearanceSeconds: 0 });
  assert.equal(none[0].endMs, ms(12));
  const credited = buildBusyIntervals(detector, [5], { clearanceSeconds: 3 });
  // The vehicle is still in the box after its rear bumper leaves the loop.
  assert.equal(credited[0].endMs, ms(15));
});

test('clearance closes the gaps inside a platoon', () => {
  const { detector } = scan([
    row(10, 82, 5), row(11, 81, 5),
    row(13, 82, 5), row(14, 81, 5),
    row(16, 82, 5), row(17, 81, 5),
  ]);
  assert.equal(buildBusyIntervals(detector, [5], { clearanceSeconds: 0 }).length, 3);
  assert.equal(
    buildBusyIntervals(detector, [5], { clearanceSeconds: 3 }).length,
    1,
    'three vehicles two seconds apart are one occupied stretch',
  );
});

test('several channels on one phase merge into one timeline', () => {
  const { detector } = scan([
    row(10, 82, 5), row(20, 81, 5),
    row(15, 82, 6), row(30, 81, 6),
  ]);
  const busy = buildBusyIntervals(detector, [5, 6], { clearanceSeconds: 0 });
  assert.equal(busy.length, 1, 'overlapping lanes are one occupancy, not two');
  assert.equal(busy[0].startMs, ms(10));
  assert.equal(busy[0].endMs, ms(30));
});

test('a channel belonging to another phase is ignored', () => {
  const { detector } = scan([row(10, 82, 9), row(20, 81, 9)]);
  assert.deepEqual(buildBusyIntervals(detector, [5], { clearanceSeconds: 0 }), []);
});

test('a detector still down when the file ends stays down', () => {
  const { detector } = scan([row(10, 82, 5)]);
  const busy = buildBusyIntervals(detector, [5], { clearanceSeconds: 0 });
  // Releasing it would invent idle time at the one point there is no evidence
  // either way.
  assert.equal(busy.length, 1);
  assert.equal(busy[0].endMs, Infinity);
});

/* ------------------------------------------------------------- the finding */

const PHASE_CHANNELS = new Map([[2, [5]]]);

test('a green with nothing on the detectors is idle end to end', () => {
  const { signal, detector } = scan([row(0, 1, 2), row(30, 8, 2)]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.equal(cycle.greenMs, 30 * S);
  assert.equal(cycle.idleMs, 30 * S);
  assert.equal(cycle.idleShare, 1);
  assert.equal(cycle.pedServed, false);
});

test('a green fully occupied has no idle in it', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(30, 8, 2), row(0, 82, 5), row(30, 81, 5),
  ]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.equal(cycle.idleMs, 0);
  assert.equal(cycle.gapCount, 0);
});

test('idle is the part of the green the detectors left quiet', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(60, 8, 2),
    row(0, 82, 5), row(10, 81, 5),   // busy 0-10
    row(40, 82, 5), row(50, 81, 5),  // busy 40-50
  ]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  // Quiet from 10 to 40 and from 50 to 60.
  assert.equal(cycle.idleMs, 40 * S);
  assert.equal(cycle.gapCount, 2);
  assert.equal(cycle.longestIdleMs, 30 * S);
  assert.ok(Math.abs(cycle.idleShare - 40 / 60) < 1e-9);
});

test('a gap shorter than the floor is platoon spacing, not reclaimable time', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(30, 8, 2),
    row(0, 82, 5), row(10, 81, 5),
    row(12, 82, 5), row(30, 81, 5),  // a 2s gap at 10-12
  ]);
  const counted = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  })[0];
  assert.equal(counted.idleMs, 2 * S, 'with no floor the 2s gap counts');
  const floored = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 3,
  })[0];
  assert.equal(floored.idleMs, 0, 'with a 3s floor it does not');
});

test('the ped share is the idle that fell after the ped phase finished', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(60, 8, 2),
    row(0, 21, 2), row(7, 22, 2), row(25, 23, 2),  // walk, clearance, solid DW
    row(0, 82, 5), row(10, 81, 5),                 // one vehicle early on
  ]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.equal(cycle.pedServed, true);
  assert.equal(cycle.pedEndMs, ms(25));
  assert.equal(cycle.idleMs, 50 * S, 'quiet from 10 to 60');
  // The green was held for a ped who finished at 25, and ran on to 60 with
  // nothing on the detectors: 35 seconds with a cause and a fix.
  assert.equal(cycle.idleAfterPedMs, 35 * S);
  assert.ok(cycle.idleAfterPedMs < cycle.idleMs, 'the ped share is part of the idle');
});

test('a ped phase that ended before the green does not claim it', () => {
  const { signal, detector } = scan([
    row(0, 23, 2),                    // a ped service from the previous cycle
    row(10, 1, 2), row(40, 8, 2),
  ]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.equal(cycle.pedServed, false);
  assert.equal(cycle.idleAfterPedMs, 0);
  assert.equal(cycle.idleMs, 30 * S, 'the idle itself is still counted');
});

test('the last ped service inside a green is the one holding it', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(60, 8, 2),
    row(10, 23, 2), row(30, 23, 2),
  ]);
  const [cycle] = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.equal(cycle.pedEndMs, ms(30));
  assert.equal(cycle.idleAfterPedMs, 30 * S);
});

test('cycles are numbered in the order they ran', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(30, 8, 2),
    row(90, 1, 2), row(120, 8, 2),
    row(180, 1, 2), row(210, 8, 2),
  ]);
  const rows = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5],
    clearanceSeconds: 0, minGapSeconds: 0,
  });
  assert.deepEqual(rows.map((r) => r.cycle), [1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.startMs), [ms(0), ms(90), ms(180)]);
});

/* -------------------------------------------------------------- summaries */

test('summarizePhase totals the cycles', () => {
  const summary = summarizePhase([
    { greenMs: 30 * S, idleMs: 10 * S, idleAfterPedMs: 0, pedServed: false },
    { greenMs: 30 * S, idleMs: 20 * S, idleAfterPedMs: 15 * S, pedServed: true },
    { greenMs: 40 * S, idleMs: 0, idleAfterPedMs: 0, pedServed: false },
  ]);
  assert.equal(summary.cycles, 3);
  assert.equal(summary.greenMs, 100 * S);
  assert.equal(summary.idleMs, 30 * S);
  assert.equal(summary.idleAfterPedMs, 15 * S);
  assert.equal(summary.medianIdleMs, 10 * S);
  assert.equal(summary.worstIdleMs, 20 * S);
  assert.equal(summary.pedCycles, 1);
  assert.ok(Math.abs(summary.idleShare - 0.3) < 1e-9);
});

test('summarizePhase survives an empty set', () => {
  const summary = summarizePhase([]);
  assert.equal(summary.cycles, 0);
  assert.equal(summary.medianIdleMs, null);
});

test('analyzeSignal ranks the phases by the time they waste', () => {
  const { signal, detector } = scan([
    // Phase 2 is busy for most of its green; phase 6 is quiet through all of it.
    row(0, 1, 2), row(30, 8, 2), row(0, 82, 5), row(28, 81, 5),
    row(0, 1, 6), row(40, 8, 6),
  ]);
  const result = analyzeSignal({
    signalRows: signal, detectorRows: detector,
    phaseChannels: new Map([[2, [5]], [6, [9]]]),
    clearanceSeconds: 0, minGapSeconds: 0, label: 'Signal 1',
  });
  assert.deepEqual(result.phases.map((p) => p.phase), [6, 2], 'worst first');
  assert.equal(result.phases[0].summary.idleMs, 40 * S);
  assert.equal(result.phases[1].summary.idleMs, 2 * S);
  assert.equal(result.totals.idleMs, 42 * S);
  assert.equal(result.rows.every((r) => r.signal === 'Signal 1'), true);
});

test('analyzeSignal with no assignments finds nothing rather than everything', () => {
  const { signal, detector } = scan([row(0, 1, 2), row(30, 8, 2)]);
  const result = analyzeSignal({
    signalRows: signal, detectorRows: detector, phaseChannels: new Map(),
  });
  // A phase with no detectors assigned is not a phase with no traffic; it is
  // a phase nothing is known about, and it must not be reported as idle.
  assert.deepEqual(result.phases, []);
  assert.equal(result.totals.cycles, 0);
});
