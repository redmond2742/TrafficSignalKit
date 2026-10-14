import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETECTOR_OFF,
  DETECTOR_ON,
  PHASE_MAX_OUT,
  analyzeGreens,
  analyzeSignal,
  buildBusyIntervals,
  buildCycles,
  buildGreenIntervals,
  buildPedIntervals,
  coveredUntil,
  detectLayout,
  firstCall,
  greenTail,
  mergeIntervals,
  scanGreenRows,
  summarizeGreens,
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

test('the scan keeps the eleven codes it needs and drops the rest', () => {
  const result = scan([
    row(0, 1, 2), row(39, 4, 2), row(40, 8, 2), row(44, 9, 2),
    row(2, 21, 2), row(12, 22, 2), row(20, 23, 2),
    row(5, 82, 5), row(6, 81, 5),
    row(7, 0, 2), row(8, 10, 2), row(9, 43, 1), row(10, 131, 3),
  ]);
  assert.equal(result.signal.length, 7, 'green, gap out, yellow, end of yellow and three ped codes');
  assert.equal(result.detector.length, 2);
  assert.equal(result.stats.scanned, 13);
  assert.equal(result.stats.kept, 9);
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

test('a green says how it ended, when the controller logged it', () => {
  const { signal } = scan([row(0, 1, 2), row(39, 5, 2), row(40, 8, 2), row(100, 1, 2), row(130, 8, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens[0].termination, PHASE_MAX_OUT);
  assert.equal(greens[1].termination, null, 'one green\'s ending does not carry into the next');
});

test('a green knows when its red began: the end of the yellow before it', () => {
  const { signal } = scan([row(0, 1, 2), row(40, 8, 2), row(44, 9, 2), row(100, 1, 2), row(130, 8, 2)]);
  const greens = buildGreenIntervals(signal, 2);
  assert.equal(greens[0].redFromMs, null, 'the first green\'s red began before the file did');
  assert.equal(greens[1].redFromMs, ms(44));
  // Without code 9 the yellow's start stands in for its end.
  const bare = scan([row(0, 1, 2), row(40, 8, 2), row(100, 1, 2), row(130, 8, 2)]);
  assert.equal(buildGreenIntervals(bare.signal, 2)[1].redFromMs, ms(40));
  // An end of yellow with no yellow before it belongs to nothing.
  const stray = scan([row(-5, 9, 2), row(0, 1, 2), row(40, 8, 2)]);
  assert.equal(buildGreenIntervals(stray.signal, 2)[0].redFromMs, null);
  // A yellow whose end went unlogged falls back to its own start, not to the
  // end of some earlier yellow.
  const gap = scan([
    row(0, 1, 2), row(40, 8, 2), row(44, 9, 2),
    row(100, 1, 2), row(130, 8, 2),
    row(200, 1, 2), row(230, 8, 2),
  ]);
  assert.equal(buildGreenIntervals(gap.signal, 2)[2].redFromMs, ms(130));
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

/* ------------------------------------------------------------- pedestrians */

test('a ped service runs from walk to solid don\'t walk', () => {
  const { signal } = scan([row(2, 21, 2), row(12, 22, 2), row(20, 23, 2), row(5, 21, 4), row(9, 23, 4)]);
  assert.deepEqual(buildPedIntervals(signal, 2), [{ startMs: ms(2), endMs: ms(20) }]);
});

test('a walk shown twice is one service, from the first walk', () => {
  const { signal } = scan([row(2, 21, 2), row(10, 21, 2), row(20, 23, 2)]);
  assert.deepEqual(buildPedIntervals(signal, 2), [{ startMs: ms(2), endMs: ms(20) }]);
});

test('a ped service cut off by either end of the file still counts', () => {
  const early = scan([row(20, 23, 2)]);
  assert.equal(buildPedIntervals(early.signal, 2)[0].endMs, ms(20), 'the file began mid-walk');
  const late = scan([row(2, 21, 2)]);
  assert.equal(buildPedIntervals(late.signal, 2)[0].endMs, Infinity, 'still walking when it ended');
});

/* ------------------------------------------------------------- coverage */

test('coveredUntil finds where a timeline last covers a span', () => {
  const timeline = [{ startMs: 0, endMs: 10 }, { startMs: 20, endMs: 30 }];
  assert.equal(coveredUntil(timeline, 15, 40), 30);
  assert.equal(coveredUntil(timeline, 5, 25), 25, 'capped at the span\'s end');
  assert.equal(coveredUntil(timeline, 12, 18), null, 'between the two');
  assert.equal(coveredUntil(timeline, 30, 40), null, 'ending as the span starts is not covering it');
  assert.equal(coveredUntil(timeline, -20, -10), null);
  assert.equal(coveredUntil([], 0, 10), null);
  // Something starting exactly as the span ends did not cover it; what came
  // before it still did.
  assert.equal(coveredUntil(timeline, 0, 20), 10);
});

/* ----------------------------------------------------- heavy: wasted green */

const green = (start, end) => ({ startMs: start * S, endMs: end * S });
const spans = (...pairs) => pairs.map(([a, b]) => ({ startMs: a * S, endMs: b * S }));

test('a green nobody used is wasted end to end', () => {
  const tail = greenTail(green(0, 40), [], []);
  assert.equal(tail.wasteMs, 40 * S);
  assert.equal(tail.endedBy, 'nothing');
});

test('wasted green starts after the last vehicle, not the first gap', () => {
  const tail = greenTail(green(0, 40), spans([5, 8], [20, 25]), []);
  assert.equal(tail.wasteMs, 15 * S);
  assert.equal(tail.endedBy, 'vehicle');
  assert.equal(tail.usedUntilMs, 25 * S);
});

test('a ped phase finishing later than the last vehicle holds the green legitimately', () => {
  const tail = greenTail(green(0, 40), spans([5, 15]), spans([2, 20]));
  assert.equal(tail.wasteMs, 20 * S);
  assert.equal(tail.endedBy, 'ped');
  const vehicleLast = greenTail(green(0, 40), spans([5, 30]), spans([2, 20]));
  assert.equal(vehicleLast.wasteMs, 10 * S);
  assert.equal(vehicleLast.endedBy, 'vehicle');
  // Finishing together, the vehicle gets the credit: the ped did not hold it any longer.
  assert.equal(greenTail(green(0, 40), spans([5, 20]), spans([2, 20])).endedBy, 'vehicle');
});

test('a vehicle arriving as the yellow starts did not use the green', () => {
  const tail = greenTail(green(0, 40), spans([5, 10], [40, 45]), []);
  assert.equal(tail.wasteMs, 30 * S);
});

test('a green used right up to yellow wastes nothing', () => {
  assert.equal(greenTail(green(0, 40), spans([30, 50]), []).wasteMs, 0, 'a vehicle still crossing');
  assert.equal(greenTail(green(0, 40), [], [{ startMs: 2 * S, endMs: Infinity }]).wasteMs, 0, 'ped still running');
});

test('a vehicle that arrived before the green and left during it counts', () => {
  const tail = greenTail(green(10, 40), spans([0, 18]), []);
  assert.equal(tail.wasteMs, 22 * S);
  assert.equal(tail.endedBy, 'vehicle');
});

test('a tail shorter than the floor is how a phase gaps out, not waste', () => {
  const tail = greenTail(green(0, 40), spans([5, 38]), [], 3 * S);
  assert.equal(tail.wasteMs, 0);
  assert.equal(tail.endedBy, 'vehicle', 'it still says who used the green last');
  assert.equal(greenTail(green(0, 40), spans([5, 37]), [], 3 * S).wasteMs, 3 * S, 'at the floor it counts');
});

/* ------------------------------------------------- light: the wait for green */

test('the wait runs from the first vehicle to arrive on red to the green', () => {
  const call = firstCall(spans([50, 52], [60, 61]), 44 * S, 100 * S);
  assert.equal(call.callMs, 50 * S);
  assert.equal(call.standing, false);
});

test('a detector already occupied when red began calls from then', () => {
  const call = firstCall(spans([40, 60]), 44 * S, 100 * S);
  assert.equal(call.callMs, 44 * S);
  assert.equal(call.standing, true);
  // One that let go exactly as red began was not still there.
  const gone = firstCall(spans([30, 44], [70, 71]), 44 * S, 100 * S);
  assert.equal(gone.callMs, 70 * S);
  assert.equal(gone.standing, false);
});

test('no call on red means the green came back for some other reason', () => {
  assert.equal(firstCall(spans([10, 12]), 44 * S, 100 * S), null, 'an arrival before red');
  assert.equal(firstCall(spans([100, 102]), 44 * S, 100 * S), null, 'an arrival on green waits for nothing');
  assert.equal(firstCall(spans([50, 52]), null, 100 * S), null, 'no known red');
  assert.equal(firstCall(spans([50, 52]), 100 * S, 100 * S), null, 'no red at all');
  assert.equal(firstCall(spans([90, 110]), 100 * S, 100 * S), null, 'no red, even with a vehicle there');
});

/* ----------------------------------------------------------------- cycles */

test('a cycle ends when a phase already served in it comes round again', () => {
  const { signal } = scan([
    row(0, 1, 2), row(0, 1, 6), row(30, 8, 2), row(30, 8, 6),
    row(40, 1, 4), row(40, 1, 8), row(70, 8, 4), row(70, 8, 8),
    row(80, 1, 2), row(80, 1, 6), row(110, 8, 2), row(110, 8, 6),
  ]);
  const cycles = buildCycles(signal);
  assert.deepEqual(cycles.map((c) => [c.index, c.startMs, c.endMs]), [
    [1, ms(0), ms(80)],
    [2, ms(80), ms(110)],
  ]);
});

test('a skipped phase does not split a cycle, and a duplicate start does not make an empty one', () => {
  const { signal } = scan([
    row(0, 1, 2), row(0, 1, 2), row(30, 8, 2),
    row(40, 1, 8), row(60, 8, 8),
    row(70, 1, 2), row(90, 8, 2),
  ]);
  const cycles = buildCycles(signal);
  assert.equal(cycles.length, 2);
  assert.equal(cycles[0].endMs - cycles[0].startMs, 70 * S);
  assert.deepEqual(buildCycles([]), []);
});

/* ------------------------------------------------------------- one phase */

test('each green carries both measures and the cycle it ran in', () => {
  const { signal, detector } = scan([
    // Cycle 1: phase 2 green 0-40, one vehicle 5-8, ped to 20.
    row(0, 1, 2), row(2, 21, 2), row(5, 82, 5), row(8, 81, 5), row(20, 23, 2),
    row(39, 5, 2), row(40, 8, 2), row(44, 9, 2),
    row(50, 1, 4), row(70, 8, 4),
    // A vehicle arrives on red at 60 and waits for phase 2.
    row(60, 82, 5), row(61, 81, 5),
    // Cycle 2: phase 2 green 80-110, the waiting vehicle went at 80.
    row(80, 1, 2), row(83, 82, 5), row(84, 81, 5), row(110, 8, 2),
  ]);
  const cycles = buildCycles(signal);
  const rows = analyzeGreens({ signalRows: signal, detectorRows: detector, phase: 2, channels: [5], cycles });
  assert.equal(rows.length, 2);
  const [first, second] = rows;
  assert.equal(first.cycle, 1);
  assert.equal(first.wasteMs, 20 * S, 'ped finished at 20, yellow at 40');
  assert.equal(first.endedBy, 'ped');
  assert.equal(first.termination, PHASE_MAX_OUT);
  assert.equal(first.delayMs, null, 'no red known before the first green');
  assert.equal(second.cycle, 2);
  assert.equal(second.delayMs, 20 * S, 'arrived at 60, green at 80');
  assert.equal(second.callMs, ms(60));
  assert.equal(second.wasteMs, 23 * S, 'last vehicle 84 + 3s clearance, yellow 110');

  // The floor reaches the per-green rows.
  const strict = analyzeGreens({
    signalRows: signal, detectorRows: detector, phase: 2, channels: [5], cycles, minGapSeconds: 25,
  });
  assert.deepEqual(strict.map((r) => r.wasteMs), [0, 0]);
});

test('the wait uses bare occupancy: a vehicle that left before red began is not waiting', () => {
  // Off at 43, red at 44. With the 3s clearance allowance it would look like
  // a car still on the loop when red began, and the wait would date from 44.
  const { signal, detector } = scan([
    row(0, 1, 2), row(42, 82, 5), row(43, 81, 5), row(40, 8, 2), row(44, 9, 2),
    row(60, 82, 5), row(61, 81, 5),
    row(80, 1, 2), row(110, 8, 2),
  ]);
  const rows = analyzeGreens({ signalRows: signal, detectorRows: detector, phase: 2, channels: [5], cycles: buildCycles(signal) });
  assert.equal(rows[1].callMs, ms(60));
  assert.equal(rows[1].standingCall, false);
});

test('a green with no call on red is marked, and has no wait', () => {
  const { signal, detector } = scan([
    row(0, 1, 2), row(30, 8, 2), row(34, 9, 2),
    row(40, 1, 4), row(60, 8, 4),
    row(70, 1, 2), row(90, 8, 2),
  ]);
  const rows = analyzeGreens({ signalRows: signal, detectorRows: detector, phase: 2, channels: [5], cycles: buildCycles(signal) });
  assert.equal(rows[1].noCall, true);
  assert.equal(rows[1].delayMs, null);
  assert.equal(rows[0].noCall, false, 'the first green had no known red to call during');
});

/* ------------------------------------------------------------- summaries */

const fakeRow = (overrides) => ({
  greenMs: 30 * S, wasteMs: 0, delayMs: null, termination: null, standingCall: false, noCall: false, ...overrides,
});

test('summaries total the waste and spread the waits', () => {
  const summary = summarizeGreens([
    fakeRow({ wasteMs: 10 * S, delayMs: 4 * S, termination: 5 }),
    fakeRow({ wasteMs: 0, delayMs: 8 * S, termination: 4 }),
    fakeRow({ wasteMs: 5 * S, delayMs: 12 * S, standingCall: true, termination: 5 }),
    fakeRow({ wasteMs: 0, noCall: true }),
  ]);
  assert.equal(summary.greens, 4);
  assert.equal(summary.wasteMs, 15 * S);
  assert.equal(summary.wasteShare, 15 / 120);
  assert.equal(summary.wastedGreens, 2);
  assert.equal(summary.worstWasteMs, 10 * S);
  assert.deepEqual(summary.terminations, { 4: 1, 5: 2 });
  assert.equal(summary.calls, 3);
  assert.equal(summary.meanDelayMs, 8 * S);
  assert.equal(summary.medianDelayMs, 8 * S);
  assert.equal(summary.p85DelayMs, 10.8 * S);
  assert.equal(summary.worstDelayMs, 12 * S);
  assert.equal(summary.standingCalls, 1);
  assert.equal(summary.noCalls, 1);
});

test('an empty summary is zeros and blanks, not NaN', () => {
  const summary = summarizeGreens([]);
  assert.equal(summary.wasteShare, 0);
  assert.equal(summary.wastePerGreenMs, 0);
  assert.equal(summary.meanDelayMs, null);
  assert.equal(summary.worstDelayMs, null);
  assert.equal(summarizeGreens(undefined).greens, 0);
});

/* ------------------------------------------------------------- the signal */

const twoPhaseDay = () => scan([
  // Cycle 1
  row(0, 1, 2), row(5, 82, 5), row(6, 81, 5), row(30, 8, 2), row(34, 9, 2),
  row(40, 1, 4), row(42, 82, 7), row(43, 81, 7), row(60, 8, 4), row(64, 9, 4),
  // Calls on red: phase 2 at 50, phase 4 at 75
  row(50, 82, 5), row(51, 81, 5), row(75, 82, 7), row(76, 81, 7),
  // Cycle 2
  row(70, 1, 2), row(100, 8, 2), row(104, 9, 2),
  row(110, 1, 4), row(130, 8, 4),
  row(140, 1, 2), row(150, 8, 2),
]);

test('each cycle stacks every phase\'s share of both measures', () => {
  const { signal, detector } = twoPhaseDay();
  const result = analyzeSignal({
    signalRows: signal, detectorRows: detector,
    phaseChannels: new Map([[2, [5]], [4, [7]]]),
    clearanceSeconds: 3, minGapSeconds: 3, label: 'A',
  });
  assert.equal(result.cycles.length, 3);
  const [one, two] = result.cycles;
  // Cycle 1: phase 2 used to 6+3=9, yellow 30 -> 21; phase 4 used to 43+3=46, yellow 60 -> 14.
  assert.equal(one.waste[2], 21 * S);
  assert.equal(one.waste[4], 14 * S);
  assert.equal(one.wasteMs, 35 * S);
  // Cycle 2: phase 2 called at 50, green at 70 -> 20; phase 4 called at 75, green at 110 -> 35.
  assert.equal(two.delay[2], 20 * S);
  assert.equal(two.delay[4], 35 * S);
  assert.equal(two.delayMs, 55 * S);
  // Cycle 1's greens had no known red, so no wait -- blank, not zero.
  assert.deepEqual(one.delay, {});
  assert.equal(one.delayMs, 0);
  assert.equal(two.signal, 'A');
  assert.equal(result.rows.every((row) => row.signal === 'A'), true);
  assert.deepEqual(result.phases.map((p) => p.phase), [2, 4]);
  assert.equal(result.totals.greens, result.rows.length);
});

test('a phase with no channels still marks the cycles but is not measured', () => {
  const { signal, detector } = twoPhaseDay();
  const result = analyzeSignal({ signalRows: signal, detectorRows: detector, phaseChannels: new Map([[2, [5]]]) });
  assert.equal(result.cycles.length, 3, 'phase 4 still ran, so the cycles are the same');
  assert.equal(result.rows.every((row) => row.phase === 2), true);
  assert.equal(result.cycles[0].waste[4], undefined);
  const nothing = analyzeSignal({ signalRows: signal, detectorRows: detector, phaseChannels: new Map() });
  assert.deepEqual(nothing.rows, []);
  assert.equal(nothing.totals.wasteMs, 0);
});
