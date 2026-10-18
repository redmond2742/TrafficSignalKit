import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateIntersection,
  sampleHighResLog,
  sampleNeighbourLog,
  sampleDetectorMap,
  sampleCorridorPair,
  sampleCorridorLogs,
  samplePatternWeek,
  sampleBlockLogicCsv,
  sampleGpx,
  sampleGpxPass,
  sampleSignalLocations,
  SAMPLE_CORRIDOR,
  formatSampleTime,
  SAMPLE_TIMING,
  SAMPLE_STUCK,
  SAMPLE_PREEMPT,
  SAMPLE_BUSES,
} from '../src/utils/sampleData.js';
import { parseTimestamp } from '../src/utils/highResTimestamp.js';
import { buildPatternSegments } from '../src/utils/patternUsage.js';

const events = simulateIntersection({ seed: 20260414 });
const T = SAMPLE_TIMING;
const of = (code, param) => events.filter((e) => e.code === code && (param === undefined || e.param === param));

test('the same button gives the same data every time', () => {
  assert.equal(sampleHighResLog(), sampleHighResLog());
  assert.deepEqual(simulateIntersection({ seed: 20260414 }), events);
  assert.notDeepEqual(simulateIntersection({ seed: 7 }).slice(0, 200), events.slice(0, 200));
});

test('every line is timestamp, code, parameter, in order, inside the hour', () => {
  const lines = sampleHighResLog().split('\n');
  assert.ok(lines.length > 5000, `only ${lines.length} lines`);
  const start = new Date(2026, 3, 14, 7).getTime();
  let previous = -Infinity;
  for (const line of lines) {
    assert.match(line, /^4\/14\/2026 07:\d{2}:\d{2}\.\d,\d+,\d+$/);
    const ms = parseTimestamp(line.split(',')[0]);
    assert.ok(ms >= start && ms < start + 3600e3, line);
    assert.ok(ms >= previous, `out of order at ${line}`);
    previous = ms;
  }
});

test('timestamps are tenths of a second after 7:00', () => {
  assert.equal(formatSampleTime(0), '4/14/2026 07:00:00.0');
  assert.equal(formatSampleTime(61.25), '4/14/2026 07:01:01.3');
  assert.equal(formatSampleTime(3599.9), '4/14/2026 07:59:59.9');
});

/** Each phase's state through the hour, from its own events. */
function intervals(phase) {
  const out = [];
  let current = null;
  for (const e of events.filter((x) => x.param === phase && [1, 8, 10, 12].includes(x.code))) {
    if (e.code === 1) {
      assert.equal(current, null, `phase ${phase} green again at ${formatSampleTime(e.t)}`);
      current = { green: e.t };
    } else if (current) {
      if (e.code === 8) current.yellow = e.t;
      if (e.code === 10) current.red = e.t;
      if (e.code === 12) {
        assert.ok(current.yellow !== undefined && current.red !== undefined, `phase ${phase} skipped a step`);
        current.end = e.t;
        out.push(current);
        current = null;
      }
    }
  }
  return out;
}

test('each service runs green, yellow, red clearance, inactive, with its timing', () => {
  for (let phase = 1; phase <= 8; phase += 1) {
    const p = T.phases[phase];
    const services = intervals(phase);
    assert.ok(services.length > 20, `phase ${phase} served ${services.length} times`);
    for (const s of services) {
      assert.ok(Math.abs(s.red - s.yellow - p.yellow) < 0.11, `phase ${phase} yellow`);
      assert.ok(Math.abs(s.end - s.red - p.red) < 0.11, `phase ${phase} red`);
      if (s.green >= 0) assert.ok(s.yellow - s.green >= p.minGreen - 0.11, `phase ${phase} under min green`);
      if (p.maxGreen && s.green >= 0) assert.ok(s.yellow - s.green <= p.maxGreen + 0.11, `phase ${phase} over max green`);
    }
  }
});

test('nothing conflicting is ever green together', () => {
  // the two sides of the barrier, and the two phases of each ring and side
  const conflicts = [[1, 3], [1, 4], [2, 3], [2, 4], [5, 7], [5, 8], [6, 7], [6, 8],
    [1, 7], [1, 8], [2, 7], [2, 8], [5, 3], [5, 4], [6, 3], [6, 4], [1, 2], [3, 4], [5, 6], [7, 8]];
  const all = {};
  for (let phase = 1; phase <= 8; phase += 1) all[phase] = intervals(phase);
  for (const [a, b] of conflicts) {
    for (const x of all[a]) {
      for (const y of all[b]) {
        const overlap = Math.min(x.end, y.end) - Math.max(x.green, y.green);
        assert.ok(overlap <= 0.05, `phases ${a} and ${b} overlap at ${formatSampleTime(Math.max(x.green, y.green))}`);
      }
    }
  }
});

test('the actuated phases gap out, max out and get forced off; the main street is forced off', () => {
  for (const phase of [1, 3, 4, 5, 7, 8]) {
    assert.ok(of(4, phase).length > 5, `phase ${phase} never gaps out`);
    assert.ok(of(5, phase).length > 5, `phase ${phase} never maxes out`);
  }
  for (const phase of [2, 6]) assert.ok(of(6, phase).length > 20);
});

test('detectors alternate on and off, and the count loop sticks on', () => {
  for (let channel = 1; channel <= 11; channel += 1) {
    const sequence = events.filter((e) => (e.code === 81 || e.code === 82) && e.param === channel);
    assert.ok(sequence.length > 20, `channel ${channel} barely used`);
    for (let i = 1; i < sequence.length; i += 1) {
      assert.notEqual(sequence[i].code, sequence[i - 1].code, `channel ${channel} repeats at ${formatSampleTime(sequence[i].t)}`);
    }
  }
  const stuck = events.filter((e) => e.param === SAMPLE_STUCK.channel && (e.code === 81 || e.code === 82));
  const last = stuck[stuck.length - 1];
  assert.equal(last.code, 82);
  assert.equal(last.t, Math.round(SAMPLE_STUCK.at * 10) / 10);
});

test('some drivers enter on yellow, and a few on red', () => {
  let yellow = 0;
  let red = 0;
  const state = {};
  for (const e of events) {
    if (e.code === 1) state[e.param] = 'green';
    if (e.code === 8) state[e.param] = 'yellow';
    if (e.code === 10) state[e.param] = 'red';
    if (e.code === 81 && e.param <= 8) {
      if (state[e.param] === 'yellow') yellow += 1;
      if (state[e.param] === 'red') red += 1;
    }
  }
  assert.ok(yellow >= 20, `${yellow} yellow entries`);
  assert.ok(red >= 1, 'nobody entered on red');
});

test('pedestrians press, get WALK at the next green, then clearance and DON\'T WALK', () => {
  for (const phase of [2, 4, 6, 8]) {
    const p = T.phases[phase];
    const walks = of(21, phase);
    assert.ok(walks.length >= 2, `phase ${phase} has ${walks.length} walks`);
    for (const walk of walks) {
      assert.ok(of(1, phase).some((g) => g.t === walk.t), `phase ${phase} WALK without green`);
      assert.ok(of(22, phase).some((c) => Math.abs(c.t - walk.t - p.walk) < 0.11));
      // a call from before 7:00 is not in the log, as with any real export
      if (walk.t > T.cycle) {
        assert.ok(of(45, phase).some((call) => call.t <= walk.t), `phase ${phase} WALK nobody asked for`);
      }
    }
  }
});

test('the preempt runs in order and holds the side street off', () => {
  const codes = events.filter((e) => e.code >= 101 && e.code <= 111).map((e) => e.code);
  assert.deepEqual(codes, [102, 105, 107, 104, 111]);
  const from = SAMPLE_PREEMPT.at;
  const to = from + SAMPLE_PREEMPT.holdFor;
  for (const phase of [3, 4, 7, 8]) {
    assert.ok(!of(1, phase).some((g) => g.t >= from && g.t <= to), `phase ${phase} served during the preempt`);
  }
  // the side street waits well over two minutes, which is what the skipped
  // phase finder looks for
  const before = of(1, 4).filter((g) => g.t < from).pop().t;
  const after = of(1, 4).find((g) => g.t > from).t;
  assert.ok(after - before > 150, `side street gap ${after - before}`);
});

test('every bus checks in and out, and two get an adjustment', () => {
  assert.equal(of(112, 1).length, SAMPLE_BUSES.length);
  const outs = of(115, 1);
  assert.equal(outs.length, SAMPLE_BUSES.length);
  of(112, 1).forEach((checkIn, i) => assert.ok(outs[i].t > checkIn.t));
  assert.equal(of(113, 1).length, 1, 'early green');
  assert.equal(of(114, 1).length, 1, 'extended green');
});

test('the neighbouring signal yields 22 s later, with its own traffic', () => {
  const next = sampleNeighbourLog();
  assert.notEqual(next, sampleHighResLog());
  const yields = (text) =>
    text.split('\n').filter((l) => l.endsWith(',151,2')).map((l) => parseTimestamp(l.split(',')[0]));
  const here = yields(sampleHighResLog());
  const there = yields(next);
  assert.equal((there[0] - here[0]) / 1000, 22);
  assert.ok(!/,10[1-9],/.test(next), 'the neighbour has no preempt');
});

test('the detector map comes in each shape the tools ask for', () => {
  assert.equal(sampleDetectorMap('tab', [1, 9]), 'Det 1\t1\nDet 9\t2');
  assert.equal(sampleDetectorMap('space', [2]), 'DET 2 2');
  assert.equal(sampleDetectorMap('comma', [4]), '4, 4');
  // by default every calling and advance loop, not the count loop
  assert.equal(sampleDetectorMap().split('\n').length, 10);
});

test('the offset pair has no preempt, and lines up cycle for cycle', () => {
  const { first, second } = sampleCorridorPair();
  assert.ok(!/,10[1-9],/.test(first) && !/,11[2-9],/.test(first), 'preempt or bus in the pair');
  const yields = (text) => text.split('\n').filter((l) => l.endsWith(',8,2')).map((l) => parseTimestamp(l.split(',')[0]));
  const a = yields(first);
  const b = yields(second);
  assert.equal(a.length, b.length);
  a.forEach((t, i) => assert.equal((b[i] - t) / 1000, 22));
});

test('the week of plans gives each pattern its own cycle length, every day covered', () => {
  const events = samplePatternWeek().split('\n').map((line) => {
    const [stamp, code, param] = line.split(',');
    const ms = parseTimestamp(stamp);
    return { eventCode: Number(code), parameter: Number(param), milliseconds: ms, iso: new Date(ms).toISOString() };
  });
  const cycles = new Map();
  for (const segment of buildPatternSegments(events)) {
    if (!cycles.has(segment.pattern)) cycles.set(segment.pattern, new Set());
    cycles.get(segment.pattern).add(segment.cycleLength);
  }
  assert.deepEqual([...cycles.get(1)], [100], 'pattern 1 is the hour sample\'s plan');
  assert.deepEqual([...cycles.get(6)], [130]);
  for (const set of cycles.values()) assert.equal(set.size, 1);
  const days = new Set(events.map((e) => new Date(e.milliseconds).getDate()));
  assert.deepEqual([...days], [13, 14, 15, 16, 17, 18, 19]);
});

test('the Block Logic rows carry the hour in its own shape', () => {
  const [header, ...rows] = sampleBlockLogicCsv().split('\n');
  assert.equal(header, 'timestamp,eventType,channel,state,value');
  const types = new Set(rows.map((r) => r.split(',')[1]));
  assert.deepEqual([...types].sort(), ['DETECTOR', 'PATTERN', 'PED', 'PHASE']);
  for (const row of rows.slice(0, 50)) assert.ok(Number.isFinite(Date.parse(row.split(',')[0])), row);
});

/** Each pass of the bus over a signal, with the colour it crossed on. */
function crossings(gpx) {
  const pts = [...gpx.matchAll(/lat="([-\d.]+)" lon="([-\d.]+)"><ele>([\d.]+)<\/ele><time>2026-04-14T(\d\d):(\d\d):(\d\d)<\/time>/g)]
    .map((m) => ({ lon: Number(m[2]), ele: Number(m[3]), t: (Number(m[4]) - 7) * 3600 + Number(m[5]) * 60 + Number(m[6]) }));
  const logs = sampleCorridorLogs();
  const colour = (log, phase, t) => {
    let state = 'red';
    for (const line of log.split('\n')) {
      const [stamp, code, param] = line.split(',');
      if (Number(param) !== phase) continue;
      const at = (parseTimestamp(stamp) - new Date(2026, 3, 14, 7).getTime()) / 1000;
      if (at > t) break;
      state = { 1: 'green', 8: 'yellow', 10: 'red' }[Number(code)] || state;
    }
    return state;
  };
  const out = [];
  SAMPLE_CORRIDOR.forEach((signal, i) => {
    for (let k = 1; k < pts.length; k += 1) {
      const [a, b] = [pts[k - 1], pts[k]];
      if ((a.lon - signal.lon) * (b.lon - signal.lon) <= 0 && a.lon !== b.lon) {
        const eastbound = b.lon > a.lon;
        out.push({ signal: signal.name, eastbound, t: b.t, colour: colour(logs[i], eastbound ? 2 : 6, b.t) });
      }
    }
  });
  return { pts, out };
}

test('the bus crosses every signal on green, in time with its priority calls', () => {
  const { pts, out } = crossings(sampleGpx());
  assert.equal(out.length, 9, 'three passes of three signals');
  for (const c of out) assert.notEqual(c.colour, 'red', `${c.signal} at ${formatSampleTime(c.t)}`);
  // it crosses Clarkson St 9.5 s after checking in, as the log's check-out says
  const first = out.find((c) => c.signal.includes('Clarkson') && c.eastbound);
  assert.ok(Math.abs(first.t - (6 * 60 + 41 + 9.5)) <= 1);
  // a smooth climb: the gain is the 16 m of each eastbound run, give or take
  let gain = 0;
  for (let i = 1; i < pts.length; i += 1) gain += Math.max(0, pts[i].ele - pts[i - 1].ele);
  assert.ok(gain > 28 && gain < 40, `gain ${gain} m`);
});

test('the one-way pass is the 7:21 run alone, eastbound', () => {
  const { out } = crossings(sampleGpxPass());
  assert.equal(out.length, 3);
  assert.ok(out.every((c) => c.eastbound));
  assert.ok(out.every((c) => c.t > 21 * 60));
});

test('signal locations are Name,Latitude,Longitude', () => {
  for (const line of sampleSignalLocations().split('\n')) {
    const [name, lat, lon] = line.split(',');
    assert.match(name, /^E Colfax Ave & /);
    assert.ok(Math.abs(Number(lat) - 39.74) < 0.001 && Math.abs(Number(lon) + 104.97) < 0.02);
  }
});
