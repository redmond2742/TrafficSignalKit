import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETECTOR_OFF,
  DETECTOR_ON,
  bucketOccupancies,
  bucketStart,
  buildOccupancies,
  buildPhaseIntervals,
  detectLayout,
  estimateSpeedMph,
  occupancySecondsForSpeed,
  scanLoopRows,
  stateAt,
  summarizeOccupancies,
} from '../src/utils/singleLoopSpeed.js';

/** Epoch seconds keep the fixtures free of any local-timezone dependency. */
const T0 = 1710432000;
const at = (offset) => T0 + offset;
const row = (offset, code, param) => `${at(offset)},${code},${param}`;
const scan = (lines) => {
  const text = lines.join('\n');
  return scanLoopRows(text, detectLayout(text));
};

/* ------------------------------------------------------------ the formula */

test('speed comes from loop plus vehicle over occupancy', () => {
  // 6 ft loop + 17 ft vehicle = 23 ft covered while the loop is held down.
  // Half a second of that is 46 ft/s, which is 31.36 mph.
  const mph = estimateSpeedMph(500, 6, 17);
  assert.ok(Math.abs(mph - 31.36) < 0.01, `${mph}`);
  // Twice the occupancy is half the speed.
  assert.ok(Math.abs(estimateSpeedMph(1000, 6, 17) - 15.68) < 0.01);
});

test('the loop length is part of the distance, not a bystander', () => {
  // Leaving the loop out understates the distance and so the speed. At a 6 ft
  // loop and a 17 ft vehicle that is a 26% error, which is the difference
  // between a compliant street and a speeding complaint.
  const withLoop = estimateSpeedMph(1000, 6, 17);
  const vehicleOnly = estimateSpeedMph(1000, 0, 17);
  assert.ok(withLoop > vehicleOnly);
  assert.ok(Math.abs(withLoop / vehicleOnly - 23 / 17) < 1e-9);
});

test('estimateSpeedMph refuses what it cannot answer', () => {
  assert.equal(estimateSpeedMph(0, 6, 17), null, 'no time, no speed');
  assert.equal(estimateSpeedMph(-100, 6, 17), null);
  assert.equal(estimateSpeedMph(500, 0, 0), null, 'no distance, no speed');
  assert.equal(estimateSpeedMph(500, NaN, 17), null);
  assert.equal(estimateSpeedMph('x', 6, 17), null);
});

test('occupancySecondsForSpeed inverts the formula', () => {
  for (const mph of [5, 25, 45, 70]) {
    const seconds = occupancySecondsForSpeed(mph, 6, 17);
    assert.ok(Math.abs(estimateSpeedMph(seconds * 1000, 6, 17) - mph) < 1e-9, `${mph} mph`);
  }
  assert.equal(occupancySecondsForSpeed(0, 6, 17), null);
  assert.equal(occupancySecondsForSpeed(30, 0, 0), null);
});

/* -------------------------------------------------------------- the scan */

test('the scan keeps detector and colour rows and drops the rest', () => {
  const result = scan([
    row(0, 82, 2),
    row(1, 81, 2),
    row(2, 1, 6),       // begin green, phase 6
    row(3, 8, 6),       // begin yellow
    row(4, 10, 6),      // begin red
    row(5, 0, 6),       // phase on -- not a colour change
    row(6, 43, 1),      // coordination
    row(7, 102, 1),     // preemption
    row(8, 21, 2),      // pedestrian
  ]);
  assert.equal(result.detector.length, 2);
  assert.equal(result.phase.length, 3);
  assert.deepEqual(result.phase.map((p) => p.state), ['green', 'yellow', 'red']);
  assert.equal(result.stats.scanned, 9);
  assert.equal(result.stats.kept, 5);
});

test('the scan reports the channels and phases it found', () => {
  const result = scan([
    row(0, 82, 5), row(1, 81, 5),
    row(2, 82, 12), row(3, 81, 12),
    row(4, 82, 2), row(5, 81, 2),
    row(6, 1, 6), row(7, 1, 2),
  ]);
  // Numeric order, not the order they appear or lexical order -- 12 belongs
  // after 5, which a string sort would get wrong.
  assert.deepEqual(result.channels, [2, 5, 12]);
  assert.deepEqual(result.phases, [2, 6]);
});

test('the scan handles a leading signal-id column', () => {
  const text = ['SIG1,' + row(0, 82, 2), 'SIG1,' + row(1, 81, 2)].join('\n');
  const result = scanLoopRows(text, detectLayout(text));
  assert.equal(result.detector.length, 2);
  assert.equal(result.detector[0].channel, 2);
});

test('an out-of-order file is sorted, and an OFF never overtakes its ON', () => {
  // Listed backwards, with three rows sharing one millisecond.
  const result = scan([
    row(10, 81, 2), row(0, 82, 2), row(0, 81, 4), row(0, 82, 3), row(5, 81, 3),
  ]);
  assert.deepEqual(
    result.detector.map((d) => d.tsMs),
    [T0 * 1000, T0 * 1000, T0 * 1000, (T0 + 5) * 1000, (T0 + 10) * 1000],
  );
  // Within that millisecond both ONs sort ahead of the OFF. Let the OFF go
  // first and it consumes channel 4's slot before either ON is recorded.
  assert.deepEqual(result.detector.slice(0, 3).map((d) => d.code), [
    DETECTOR_ON, DETECTOR_ON, DETECTOR_OFF,
  ]);
  // And the pairing that the ordering exists to protect comes out right.
  const { occupancies, unmatchedOff } = buildOccupancies(result.detector);
  assert.deepEqual(
    occupancies.map((o) => `${o.channel}:${o.occupancyMs}`).sort(),
    ['2:10000', '3:5000'],
  );
  assert.equal(unmatchedOff, 1, 'channel 4 dropped without ever picking up');
});

test('malformed and unreadable rows are counted, not thrown', () => {
  const text = [row(0, 82, 2), 'not a row at all', '', row(1, 81, 2), 'nope,82,2'].join('\n');
  const result = scanLoopRows(text, detectLayout(text));
  assert.equal(result.detector.length, 2);
  assert.ok(result.stats.malformed + result.stats.badTimestamps >= 2);
});

/* --------------------------------------------------------- pairing on/off */

test('ON and OFF pair into an occupancy per channel', () => {
  const { detector } = scan([
    row(0, 82, 2), row(2, 82, 3), row(3, 81, 2), row(9, 81, 3),
  ]);
  const { occupancies } = buildOccupancies(detector);
  // Two channels overlapping: each must pair with its own ON, not the newest.
  assert.equal(occupancies.length, 2);
  const byChannel = Object.fromEntries(occupancies.map((o) => [o.channel, o.occupancyMs]));
  assert.equal(byChannel[2], 3000);
  assert.equal(byChannel[3], 7000);
});

test('an unpaired ON or OFF is dropped rather than invented', () => {
  const { detector } = scan([row(0, 82, 2), row(5, 82, 4), row(6, 81, 4), row(7, 81, 9)]);
  const result = buildOccupancies(detector);
  assert.equal(result.occupancies.length, 1, 'only channel 4 completed');
  assert.equal(result.unmatchedOn, 1, 'channel 2 never dropped');
  assert.equal(result.unmatchedOff, 1, 'channel 9 never picked up');
});

test('a second ON replaces an unclosed one', () => {
  const { detector } = scan([row(0, 82, 2), row(4, 82, 2), row(6, 81, 2)]);
  const result = buildOccupancies(detector);
  assert.equal(result.occupancies.length, 1);
  // Paired with the newer ON: the older one lost its OFF, and pairing across
  // the gap would report a 6s occupancy that nothing observed.
  assert.equal(result.occupancies[0].occupancyMs, 2000);
  assert.equal(result.unmatchedOn, 1);
});

test('a drop before its pick-up is not an occupancy', () => {
  const rows = [
    { tsMs: 5000, code: DETECTOR_ON, channel: 2 },
    { tsMs: 5000, code: DETECTOR_OFF, channel: 2 },
  ];
  const result = buildOccupancies(rows);
  assert.deepEqual(result.occupancies, [], 'zero length is not a vehicle');
  assert.equal(result.unmatchedOff, 1);
});

test('the occupancy cap separates moving vehicles from queued ones', () => {
  const { detector } = scan([
    row(0, 82, 2), row(1, 81, 2),        // 1s -- moving
    row(10, 82, 2), row(70, 81, 2),      // 60s -- sat on the loop at red
  ]);
  const capped = buildOccupancies(detector, { maxOccupancySeconds: 30 });
  assert.equal(capped.occupancies.length, 1);
  assert.equal(capped.overlong, 1);
  // Without a cap both are kept: the caller decides, because a stop-bar loop
  // at red legitimately holds for minutes.
  assert.equal(buildOccupancies(detector).occupancies.length, 2);
});

/* ------------------------------------------------------- the colour timeline */

test('phase intervals run green to yellow to red', () => {
  const { phase } = scan([
    row(0, 1, 2), row(30, 8, 2), row(34, 10, 2), row(40, 1, 2),
  ]);
  const intervals = buildPhaseIntervals(phase, 2);
  assert.deepEqual(intervals.map((i) => i.state), ['green', 'yellow', 'red', 'green']);
  assert.equal(intervals[0].endMs, (T0 + 30) * 1000);
  assert.equal(intervals[2].endMs, (T0 + 40) * 1000);
  assert.equal(intervals[3].endMs, Infinity, 'the tail stays open');
});

test('phase intervals ignore the other phases', () => {
  const { phase } = scan([row(0, 1, 2), row(5, 1, 6), row(30, 8, 2)]);
  const intervals = buildPhaseIntervals(phase, 2);
  assert.equal(intervals.length, 2);
  assert.deepEqual(intervals.map((i) => i.state), ['green', 'yellow']);
});

test('a repeated colour does not open a new interval', () => {
  const { phase } = scan([row(0, 1, 2), row(5, 1, 2), row(30, 8, 2)]);
  const intervals = buildPhaseIntervals(phase, 2);
  assert.equal(intervals.length, 2);
  assert.equal(intervals[0].startMs, T0 * 1000, 'the first green still starts the span');
});

test('stateAt finds the colour showing at a moment', () => {
  const { phase } = scan([row(0, 1, 2), row(30, 8, 2), row(34, 10, 2), row(60, 1, 2)]);
  const intervals = buildPhaseIntervals(phase, 2);
  assert.equal(stateAt(intervals, at(0) * 1000), 'green');
  assert.equal(stateAt(intervals, at(29) * 1000), 'green');
  assert.equal(stateAt(intervals, at(30) * 1000), 'yellow', 'the change is inclusive of its own start');
  assert.equal(stateAt(intervals, at(33) * 1000), 'yellow');
  assert.equal(stateAt(intervals, at(34) * 1000), 'red');
  assert.equal(stateAt(intervals, at(59) * 1000), 'red');
  assert.equal(stateAt(intervals, at(120) * 1000), 'green', 'the tail runs on');
});

test('stateAt reports nothing in a gap between intervals', () => {
  // buildPhaseIntervals produces a contiguous run, but stateAt is exported on
  // its own and takes whatever it is handed. A set with a hole in it -- data
  // missing for a stretch, or two days stitched together -- must read as
  // unknown across the hole rather than stretching the previous colour over
  // it, which would silently assign every vehicle in the gap to one phase.
  const intervals = [
    { state: 'green', startMs: 1000, endMs: 2000 },
    { state: 'red', startMs: 9000, endMs: Infinity },
  ];
  assert.equal(stateAt(intervals, 1500), 'green');
  assert.equal(stateAt(intervals, 1999), 'green');
  assert.equal(stateAt(intervals, 2000), '', 'the interval has ended');
  assert.equal(stateAt(intervals, 5000), '', 'nothing is known in the hole');
  assert.equal(stateAt(intervals, 9000), 'red');
});

test('stateAt admits when it does not know', () => {
  const { phase } = scan([row(100, 1, 2)]);
  const intervals = buildPhaseIntervals(phase, 2);
  // Before the first change the colour is genuinely unknown. Calling it red
  // would put every vehicle in the opening minutes into the wrong bucket.
  assert.equal(stateAt(intervals, at(0) * 1000), '');
  assert.equal(stateAt([], at(0) * 1000), '');
  assert.equal(stateAt(intervals, NaN), '');
});

/* ------------------------------------------------------------- bucketing */

test('bucketStart snaps to local calendar parts', () => {
  const ms = new Date(2024, 2, 14, 7, 42, 18, 500).getTime();
  assert.equal(bucketStart(ms, 'minute'), new Date(2024, 2, 14, 7, 42).getTime());
  assert.equal(bucketStart(ms, 'hour'), new Date(2024, 2, 14, 7).getTime());
  assert.equal(bucketStart(ms, 'day'), new Date(2024, 2, 14).getTime());
  assert.equal(bucketStart(ms, 'event'), ms);
  assert.equal(bucketStart(NaN, 'hour'), null);
});

test('hour buckets are local hours, not epoch arithmetic', () => {
  // Dividing the epoch gives an hour of UTC, which is offset from the local
  // hour anywhere with a half-hour zone, and never local midnight for a day.
  const ms = new Date(2024, 6, 4, 13, 30).getTime();
  const start = bucketStart(ms, 'hour');
  assert.equal(new Date(start).getMinutes(), 0);
  assert.equal(new Date(start).getHours(), 13);
  const day = bucketStart(ms, 'day');
  assert.equal(new Date(day).getHours(), 0);
  assert.equal(new Date(day).getDate(), 4);
});

test('each event is its own row when the bucket is event', () => {
  const rows = bucketOccupancies(
    [
      { channel: 2, onMs: 1000, offMs: 1500, occupancyMs: 500, state: 'green' },
      { channel: 2, onMs: 9000, offMs: 10000, occupancyMs: 1000, state: 'red' },
    ],
    'event', 6, 17,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].count, 1);
  assert.equal(rows[0].state, 'green');
  assert.ok(Math.abs(rows[0].medianMph - 31.36) < 0.01);
});

test('buckets total the occupancy and report the typical speed', () => {
  const base = new Date(2024, 2, 14, 7, 0, 0).getTime();
  const rows = bucketOccupancies(
    [
      { channel: 2, onMs: base + 1000, occupancyMs: 400 },
      { channel: 2, onMs: base + 2000, occupancyMs: 500 },
      { channel: 2, onMs: base + 3000, occupancyMs: 600 },
      { channel: 2, onMs: base + 3600000 + 1000, occupancyMs: 1000 },
    ],
    'hour', 6, 17,
  );
  assert.equal(rows.length, 2, 'two hours');
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].totalMs, 1500);
  assert.equal(rows[0].medianMs, 500);
  // The speed of the typical vehicle, from the median occupancy.
  assert.ok(Math.abs(rows[0].medianMph - 31.36) < 0.01);
  assert.ok(Math.abs(rows[0].occupiedShare - 1500 / 3600000) < 1e-12);
});

test('a bucket is not dragged off by one stopped vehicle', () => {
  const base = new Date(2024, 2, 14, 7, 0, 0).getTime();
  const rows = bucketOccupancies(
    [
      { channel: 2, onMs: base + 1000, occupancyMs: 500 },
      { channel: 2, onMs: base + 2000, occupancyMs: 500 },
      { channel: 2, onMs: base + 3000, occupancyMs: 500 },
      { channel: 2, onMs: base + 4000, occupancyMs: 120000 }, // sat on the loop
    ],
    'hour', 6, 17,
  );
  // A mean occupancy here is 30s and reads as 0.5 mph. The median is 500ms
  // and reads as 31 mph, which is what the other three vehicles did.
  assert.equal(rows[0].medianMs, 500);
  assert.ok(rows[0].medianMph > 30, `${rows[0].medianMph}`);
});

test('buckets come back in time order whatever order they arrived', () => {
  const base = new Date(2024, 2, 14, 7, 0, 0).getTime();
  const rows = bucketOccupancies(
    [
      { channel: 2, onMs: base + 7200000, occupancyMs: 500 },
      { channel: 2, onMs: base, occupancyMs: 500 },
      { channel: 2, onMs: base + 3600000, occupancyMs: 500 },
    ],
    'hour', 6, 17,
  );
  assert.deepEqual(rows.map((r) => r.startMs), [base, base + 3600000, base + 7200000]);
});

/* ------------------------------------------------------------- the summary */

test('summarizeOccupancies names the fastest and slowest the right way round', () => {
  const summary = summarizeOccupancies(
    [
      { occupancyMs: 400 },   // shortest occupancy = fastest vehicle
      { occupancyMs: 500 },
      { occupancyMs: 2000 },  // longest occupancy = slowest vehicle
    ],
    6, 17,
  );
  assert.equal(summary.count, 3);
  assert.equal(summary.totalMs, 2900);
  assert.equal(summary.medianMs, 500);
  assert.ok(summary.fastestMph > summary.slowestMph, 'shorter occupancy is faster');
  assert.ok(Math.abs(summary.fastestMph - 39.2) < 0.1, `${summary.fastestMph}`);
  assert.ok(Math.abs(summary.slowestMph - 7.84) < 0.1, `${summary.slowestMph}`);
});

test('summarizeOccupancies survives an empty set', () => {
  const summary = summarizeOccupancies([], 6, 17);
  assert.equal(summary.count, 0);
  assert.equal(summary.medianMph, null);
});
