import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONS,
  FPS_PER_MPH,
  MAX_APPROACHES,
  QUEUE_HOLD_FT,
  TECHNOLOGIES,
  busAt,
  busMotion,
  computeTiming,
  defaultApproach,
  fromSaveFile,
  latencyOf,
  lostTimeEstimate,
  newApproach,
  normalizeConfig,
  toSaveFile,
} from '../src/utils/tspTiming.js';

const near = (actual, expected, tolerance = 0.005) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not ${expected}`);

/** The worked example: a 1,000 ft emitter range, detector 100 ft past the stop bar, 35 mph, 4 s lost. */
const worked = (overrides = {}) => defaultApproach({
  technology: 'emitter', emitterDistance: 1000, detectorToStopBar: 100, speed: 35, lostTime: 4,
  intersectionLength: 80, ...overrides,
});

/* ------------------------------------------------------------ the formula */

test('1.4667 is feet per second in a mile per hour', () => {
  near(FPS_PER_MPH, 1.4667, 0.0001);
  near(60 * FPS_PER_MPH, 88, 1e-9);
});

test('the worked example: TSD 21 s, TED 24 s', () => {
  const t = computeTiming(worked());
  assert.equal(t.d, 900);
  near(t.travel, 17.532);
  near(t.eta, 21.532);
  assert.equal(t.tsd, 21);
  near(t.crossTime, 1.558);
  near(t.tedExact, 23.091);
  assert.equal(t.ted, 24);
  assert.deepEqual(t.errors, []);
});

test('the formula is the one on the page: (emitter - detector) / (1.4667 x speed) + lost', () => {
  for (const [range, offset, speed, lost] of [[1200, 60, 25, 0], [2500, 150, 45, 12], [600, 0, 30, 3.5]]) {
    const t = computeTiming(worked({ emitterDistance: range, detectorToStopBar: offset, speed, lostTime: lost }));
    near(t.tsdExact, (range - offset) / (1.4667 * speed) + lost, 0.01);
  }
});

test('a detector before the stop bar adds its distance instead', () => {
  const t = computeTiming(worked({ detectorPosition: 'before' }));
  assert.equal(t.d, 1100);
});

test('the working is written out with the numbers in it', () => {
  const text = computeTiming(worked()).steps.map((s) => `${s.label}: ${s.text}`).join('\n');
  assert.match(text, /1,000 ft emitter range − 100 ft detector past the stop bar = 900 ft/);
  assert.match(text, /35 mph × 1\.4667 = 51\.33 ft\/s/);
  assert.match(text, /900 ft ÷ 51\.33 ft\/s = 17\.53 s/);
  assert.match(text, /TSD: 21\.53 s, rounded down = 21 s/);
  assert.match(text, /TED: 21\.53 s \+ 1\.56 s = 23\.09 s, rounded up = 24 s/);
});

/* ------------------------------------------------------------- rounding */

test('TSD rounds down and TED rounds up, but an exact second stays put', () => {
  // 880 ft at 30 mph is exactly 20 s; an 88 ft intersection exactly 2 s more.
  const t = computeTiming(worked({ emitterDistance: 880, detectorToStopBar: 0, speed: 30, lostTime: 0, intersectionLength: 88 }));
  near(t.tsdExact, 20, 1e-9);
  assert.equal(t.tsd, 20);
  assert.equal(t.ted, 22);
  const late = computeTiming(worked({ emitterDistance: 880, detectorToStopBar: 0, speed: 30, lostTime: 0.9, intersectionLength: 88 }));
  assert.equal(late.tsd, 20, '20.9 rounds down');
  assert.equal(late.ted, 23, '22.9 rounds up');
});

test('float noise does not cost a second either way', () => {
  // (20 - 1) s of driving at 20 mph, plus 1 s lost, is 19.999999999999996 in floats.
  const eta = computeTiming(worked({
    technology: 'cloud', cloudTrigger: 'eta', checkInEta: 20, lostTime: 1, speed: 20, latency: { cloud: 0 },
  }));
  assert.equal(eta.tsd, 20);
  // 880 ft then 44 ft at 35 mph comes to 18.000000000000004.
  const ted = computeTiming(worked({ emitterDistance: 880, detectorToStopBar: 0, lostTime: 0, intersectionLength: 44, speed: 35 }));
  assert.equal(ted.ted, 18);
});

/* ---------------------------------------------------------- technologies */

test('every technology has a default latency, emitter none', () => {
  assert.equal(TECHNOLOGIES.emitter.latency, 0);
  assert.ok(TECHNOLOGIES.cloud.latency > 0);
  assert.ok(TECHNOLOGIES.video.latency > 0);
});

test('cloud by distance: the check-in point, less the latency', () => {
  const t = computeTiming(worked({ technology: 'cloud', checkInDistance: 1000, lostTime: 0, latency: { cloud: 2 } }));
  assert.equal(t.d, 1000);
  near(t.eta, 1000 / (35 * FPS_PER_MPH) - 2);
  assert.equal(t.tsd, 17);
});

test('cloud by ETA: TSD is the threshold less the latency, whatever the speed', () => {
  for (const speed of [25, 35, 45, 55]) {
    const t = computeTiming(worked({
      technology: 'cloud', cloudTrigger: 'eta', checkInEta: 30, lostTime: 4, speed, latency: { cloud: 2 },
    }));
    assert.equal(t.tsd, 28, `${speed} mph: float noise must not floor 28 to 27`);
    near(t.d, 26 * speed * FPS_PER_MPH, 1e-6);
  }
});

test('video: the zone setback, less the latency', () => {
  const t = computeTiming(worked({ technology: 'video', zoneSetback: 264, speed: 30, lostTime: 0, latency: { video: 0.5 } }));
  assert.equal(t.d, 264);
  near(t.eta, 5.5, 1e-9);
  assert.equal(t.tsd, 5);
});

test('each technology keeps its own latency', () => {
  const a = worked({ latency: { emitter: 0, cloud: 3, video: 1 } });
  assert.equal(latencyOf(a), 0);
  assert.equal(latencyOf({ ...a, technology: 'cloud' }), 3);
  assert.equal(latencyOf({ ...a, technology: 'video' }), 1);
  assert.equal(latencyOf({ technology: 'cloud' }), TECHNOLOGIES.cloud.latency, 'missing falls back to the default');
  assert.equal(latencyOf({ technology: 'cloud', latency: { cloud: -3 } }), 0, 'a message cannot arrive early');
});

/* --------------------------------------------------------------- crossing */

test('the bus length counts only when switched on, and only toward TED', () => {
  const without = computeTiming(worked());
  const withBus = computeTiming(worked({ includeBusLength: true, busLength: 40 }));
  assert.equal(withBus.tsdExact, without.tsdExact);
  assert.equal(withBus.crossDistance, 120);
  near(withBus.tedExact - without.tedExact, 40 / (35 * FPS_PER_MPH), 1e-9);
  assert.equal(computeTiming(worked({ includeBusLength: false, busLength: 60 })).crossDistance, 80);
});

test('a slower speed through the intersection stretches only TED', () => {
  const t = computeTiming(worked({ crossingSpeed: 15 }));
  near(t.crossTime, 80 / (15 * FPS_PER_MPH), 1e-9);
  near(t.tsdExact, computeTiming(worked()).tsdExact, 1e-12);
  // Blank is "same as approach", not zero.
  near(computeTiming(worked({ crossingSpeed: '' })).crossTime, computeTiming(worked()).crossTime, 1e-12);
  assert.match(computeTiming(worked({ crossingSpeed: 0 })).errors.join(), /speed through the intersection/);
});

/* -------------------------------------------------------- errors, warnings */

test('no speed, no answer', () => {
  for (const speed of [0, -5, '', null, 'fast']) {
    const t = computeTiming(worked({ speed }));
    assert.equal(t.tsd, null);
    assert.match(t.errors.join(), /approach speed/);
  }
});

test('a request that starts past the stop bar is an error, per technology', () => {
  const emitter = computeTiming(worked({ emitterDistance: 100, detectorToStopBar: 100 }));
  assert.equal(emitter.tsd, null);
  assert.match(emitter.errors.join(), /emitter range/);
  assert.match(computeTiming(worked({ technology: 'cloud', checkInDistance: 0 })).errors.join(), /check-in point/);
  assert.match(computeTiming(worked({ technology: 'video', zoneSetback: 0 })).errors.join(), /detection zone/);
  assert.match(
    computeTiming(worked({ technology: 'cloud', cloudTrigger: 'eta', checkInEta: 4, lostTime: 4 })).errors.join(),
    /ETA threshold/,
  );
});

test('a TSD under 1 s is an error: NTCIP 1211 cannot carry it', () => {
  // 30 ft at 30 mph is 0.68 s.
  const t = computeTiming(worked({ emitterDistance: 30, detectorToStopBar: 0, speed: 30, lostTime: 0 }));
  assert.match(t.errors.join(), /at least 1 s/);
  const ok = computeTiming(worked({ emitterDistance: 44, detectorToStopBar: 0, speed: 30, lostTime: 0 }));
  assert.equal(ok.tsd, 1);
  assert.deepEqual(ok.errors, []);
});

test('latency can push TSD under a second; the error says to cut it', () => {
  const t = computeTiming(worked({ technology: 'video', zoneSetback: 60, speed: 30, lostTime: 0, latency: { video: 1 } }));
  assert.match(t.errors.join(), /cut the latency/);
});

test('a near-side stop beyond the request point is flagged', () => {
  const t = computeTiming(worked({ nearSideStop: true, stopDistance: 950, lostTime: 20 }));
  assert.match(t.warnings.join(), /upstream of where the request starts/);
  const inside = computeTiming(worked({ nearSideStop: true, stopDistance: 75, lostTime: 20 }));
  assert.deepEqual(inside.warnings, []);
});

test('a near-side stop with no lost time is flagged', () => {
  const t = computeTiming(worked({ nearSideStop: true, stopDistance: 75, lostTime: 0 }));
  assert.match(t.warnings.join(), /no lost time/);
});

test('a TED beyond what NTCIP can carry is flagged', () => {
  assert.deepEqual(computeTiming(worked()).warnings, []);
  const huge = computeTiming(worked({ speed: 0.1, emitterDistance: 10000, detectorToStopBar: 0 }));
  assert.ok(huge.ted > 65535);
  assert.match(huge.warnings.join(), /65,535/);
});

/* -------------------------------------------------------------- lost time */

test('lost time adds braking, pulling away, dwell and queue', () => {
  // 30 mph is 44 ft/s: 44 / 8 = 5.5 s each way at 4 ft/s^2.
  const lost = lostTimeEstimate({ speed: 30, braking: 4, accel: 4, dwell: 15, queue: 3 });
  near(lost.braking, 5.5, 1e-9);
  near(lost.accel, 5.5, 1e-9);
  assert.equal(lost.total, 29);
  const rolling = lostTimeEstimate({ speed: 30, stops: false, dwell: 0, queue: 3 });
  assert.equal(rolling.total, 3, 'a bus that does not stop loses only the queue');
  // Gentler acceleration loses more.
  assert.ok(lostTimeEstimate({ speed: 30, accel: 2 }).accel > lost.accel);
});

/* ------------------------------------------------------------- the motion */

const motionFor = (overrides) => {
  const a = worked(overrides);
  const t = computeTiming(a);
  return { a, t, m: busMotion(a, t) };
};

test('the bus is at the request point when the request starts', () => {
  const { t, m } = motionFor({ technology: 'cloud', checkInDistance: 1000, latency: { cloud: 2 } });
  near(busAt(m, -2).x, -t.d, 1e-9);
  assert.equal(busAt(m, -1).state, 'sending');
  assert.equal(busAt(m, -1).inTransit, true);
});

test('the bus front is at the stop bar at the exact TSD, and clear at the exact TED', () => {
  for (const overrides of [{}, { nearSideStop: true, stopDistance: 120 }, { technology: 'video', latency: { video: 0.5 } }, { includeBusLength: true }]) {
    const { t, m } = motionFor(overrides);
    near(busAt(m, t.eta).x, 0, 1e-6);
    near(busAt(m, t.tedExact).x, t.crossDistance, 1e-6);
  }
});

test('the bus holds for exactly the lost time, at the near-side stop', () => {
  const { t, m } = motionFor({ nearSideStop: true, stopDistance: 120, lostTime: 20 });
  const hold = m.segments.find((s) => s.kind === 'hold');
  near(hold.t1 - hold.t0, 20, 1e-9);
  assert.equal(hold.x0, -120);
  const mid = busAt(m, (hold.t0 + hold.t1) / 2);
  assert.equal(mid.state, 'holding');
  assert.match(mid.label, /Dwell at stop · 10 s left/);
  assert.match(busAt(m, hold.t0 + 0.7).label, /· 20 s left/, '19.3 s left counts as 20');
  assert.ok(hold.t1 < t.eta);
});

test('with no near-side stop, the lost time is spent in the queue', () => {
  const { m } = motionFor({ lostTime: 6 });
  const hold = m.segments.find((s) => s.kind === 'hold');
  assert.equal(hold.x0, -QUEUE_HOLD_FT);
  assert.match(busAt(m, hold.t0 + 1).label, /Queued/);
  assert.equal(motionFor({ lostTime: 0 }).m.segments.some((s) => s.kind === 'hold'), false);
});

test('the bus never moves backward, and the request is live from receipt to TED', () => {
  const { t, m } = motionFor({ nearSideStop: true, stopDistance: 200, lostTime: 15 });
  let last = -Infinity;
  for (let time = m.start; time <= m.end; time += 0.05) {
    const at = busAt(m, time);
    assert.ok(at.x >= last - 1e-9, `moved back at ${time}`);
    last = at.x;
    assert.equal(at.active, time >= 0 && time < t.tedExact);
  }
  assert.equal(busAt(m, m.end + 100).x, busAt(m, m.end).x, 'stays put after the end');
  assert.equal(busAt(m, m.start - 100).x, busAt(m, m.start).x, 'and before the start');
});

test('a stop beyond the request point is held at the request point', () => {
  const { t, m } = motionFor({ nearSideStop: true, stopDistance: 5000, lostTime: 10 });
  assert.equal(m.hold, t.d);
  near(busAt(m, t.eta).x, 0, 1e-6);
});

test('no motion without a timing', () => {
  assert.equal(busMotion(worked(), computeTiming(worked({ speed: 0 }))), null);
  assert.equal(busAt(null, 0), null);
});

/* ---------------------------------------------------- approaches and files */

test('new approaches take the next free direction and a fresh id', () => {
  const first = defaultApproach();
  const second = newApproach([first], first);
  assert.equal(second.name, DIRECTIONS[1]);
  assert.notEqual(second.id, first.id);
  second.latency.cloud = 9;
  assert.notEqual(first.latency.cloud, 9, 'a copy, not a shared object');
  const all = [first, second];
  for (let i = 0; i < 4; i += 1) all.push(newApproach(all));
  assert.deepEqual(all.map((a) => a.name).slice(0, 4), DIRECTIONS);
  assert.equal(all[4].name, 'Approach 5');
  assert.equal(new Set(all.map((a) => a.id)).size, all.length);
});

test('a configuration from junk still has one sound approach', () => {
  for (const junk of [null, 42, 'x', {}, { approaches: 'no' }, { approaches: [] }]) {
    const config = normalizeConfig(junk);
    assert.equal(config.approaches.length, 1);
    assert.deepEqual(computeTiming(config.approaches[0]).errors, []);
    assert.equal(config.activeId, config.approaches[0].id);
  }
});

test('normalising clamps numbers, fixes enums and repairs duplicate ids', () => {
  const config = normalizeConfig({
    intersection: '  Main & 1st  ',
    activeId: 'b',
    approaches: [
      { id: 'b', name: 'NB', technology: 'laser', speed: 900, phase: 99, emitterDistance: 'far', latency: { cloud: -3 } },
      { id: 'b', name: '', technology: 'video', cloudTrigger: 'eta', detectorPosition: 'sideways', crossingSpeed: 'x' },
    ],
  });
  const [a, b] = config.approaches;
  assert.equal(config.intersection, 'Main & 1st');
  assert.equal(a.technology, 'emitter');
  assert.equal(a.speed, 80);
  assert.equal(a.phase, 2);
  assert.equal(a.emitterDistance, 1000);
  assert.equal(a.latency.cloud, 0);
  assert.notEqual(b.id, a.id);
  assert.equal(b.name, DIRECTIONS[0], 'a blank name gets the next free direction');
  assert.equal(b.technology, 'video');
  assert.equal(b.cloudTrigger, 'eta');
  assert.equal(b.detectorPosition, 'past');
  assert.equal(b.crossingSpeed, null);
  assert.equal(config.activeId, 'b');
});

test('the selected approach survives a reload, and a missing one falls back to the first', () => {
  const approaches = [{ id: 'a' }, { id: 'b' }];
  assert.equal(normalizeConfig({ approaches, activeId: 'b' }).activeId, 'b');
  assert.equal(normalizeConfig({ approaches, activeId: 'gone' }).activeId, 'a');
});

test('a file holds at most the approach cap', () => {
  const many = Array.from({ length: 40 }, () => ({}));
  assert.equal(normalizeConfig({ approaches: many }).approaches.length, MAX_APPROACHES);
});

test('a saved file opens to the same configuration', () => {
  const config = normalizeConfig({
    intersection: 'Ygnacio Valley Rd & Civic Dr',
    approaches: [worked({ id: 'ap1', name: 'Eastbound', phase: 6 }), worked({ id: 'ap2', name: 'Westbound', technology: 'cloud' })],
    activeId: 'ap2',
  });
  const text = JSON.stringify(toSaveFile(config));
  assert.deepEqual(fromSaveFile(text), config);
  assert.equal(JSON.parse(text).tool, 'tsp-timing');
});

test('a file that is not this tool\'s is refused with a reason', () => {
  assert.throws(() => fromSaveFile('not json'), /not JSON/);
  assert.throws(() => fromSaveFile(JSON.stringify({ tool: 'traffic-control-plan' })), /not a TSP timing file/);
  assert.throws(() => fromSaveFile('null'), /not a TSP timing file/);
});
