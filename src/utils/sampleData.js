/**
 * Sample data for the "Try with sample data" button in InputBox.
 *
 * Most tools on the site read a high-resolution controller log, and anyone
 * without one could not see what they do. This simulates one: an hour, 7 to 8
 * AM on a Tuesday, at a made-up coordinated intersection, Sample Ave & 1st St.
 *
 * It is a small controller model rather than random lines, so the tools find
 * what they would find in a real log:
 *
 *   - eight phases in two rings, 2 and 6 coordinated on a 100 s cycle, the
 *     side street and left turns actuated: they gap out, max out or are forced
 *     off, are skipped when nobody is waiting, and hand unused time back to
 *     the main street
 *   - queues that build on red and discharge on green, with the first few
 *     vehicles slower away, so start-up loss and headways are there to find
 *   - pedestrian calls on 2, 4, 6 and 8, served with WALK and flashing DON'T
 *     WALK, which can hold the side street past its vehicle demand
 *   - drivers entering on yellow, and a few on red
 *   - an emergency vehicle preempt at 7:38 that holds the main street green
 *     and makes the side street wait well over two minutes
 *   - four buses checking in for transit priority, two of them adjusted
 *   - a count detector on channel 11 that sticks on at 7:24 and stays on
 *
 * Everything comes from a seeded generator, so the same button gives the same
 * data every time, which the tests rely on.
 *
 * Framework free, so it runs under `node --test`.
 */

/** The sample day: Tuesday 14 April 2026, from 07:00:00. */
export const SAMPLE_DAY = { year: 2026, month: 4, day: 14 };
export const SAMPLE_START_HOUR = 7;
const HOUR = 3600;

/**
 * Pattern 1 at the sample intersection. Each ring runs its phases in this
 * order from the barrier after the main street: side-street left, side-street
 * through, main-street left, main-street through. Splits include yellow and
 * red clearance, and each ring's splits add up to the cycle.
 */
export const SAMPLE_TIMING = {
  pattern: 1,
  cycle: 100,
  offset: 30,
  coordinated: [2, 6],
  rings: [
    [3, 4, 1, 2],
    [7, 8, 5, 6],
  ],
  phases: {
    1: { split: 17, yellow: 3.5, red: 1.0, minGreen: 5, maxGreen: 12, passage: 2.0, vph: 120, speed: 30 },
    2: { split: 43, yellow: 4.0, red: 1.5, minGreen: 15, vph: 640, speed: 52, walk: 7, pedClear: 16, pedPerHour: 8 },
    3: { split: 13, yellow: 3.5, red: 1.0, minGreen: 5, maxGreen: 8, passage: 2.0, vph: 55, speed: 30 },
    4: { split: 27, yellow: 4.0, red: 1.5, minGreen: 8, maxGreen: 21, passage: 2.5, vph: 260, speed: 45, walk: 7, pedClear: 13, pedPerHour: 12 },
    5: { split: 17, yellow: 3.5, red: 1.0, minGreen: 5, maxGreen: 12, passage: 2.0, vph: 140, speed: 30 },
    6: { split: 43, yellow: 4.0, red: 1.5, minGreen: 15, vph: 600, speed: 52, walk: 7, pedClear: 16, pedPerHour: 8 },
    7: { split: 13, yellow: 3.5, red: 1.0, minGreen: 5, maxGreen: 8, passage: 2.0, vph: 70, speed: 30 },
    8: { split: 27, yellow: 4.0, red: 1.5, minGreen: 8, maxGreen: 21, passage: 2.5, vph: 230, speed: 45, walk: 7, pedClear: 13, pedPerHour: 12 },
  },
};

/**
 * The detectors. Channels 1 to 8 are 6 ft stop-bar loops, one per phase.
 * 9 and 10 are advance loops 350 ft back on the main street, and 11 a count
 * loop on the side street, which are not wired to call a phase.
 */
export const SAMPLE_DETECTORS = [
  { channel: 1, phase: 1, kind: 'stop bar' },
  { channel: 2, phase: 2, kind: 'stop bar' },
  { channel: 3, phase: 3, kind: 'stop bar' },
  { channel: 4, phase: 4, kind: 'stop bar' },
  { channel: 5, phase: 5, kind: 'stop bar' },
  { channel: 6, phase: 6, kind: 'stop bar' },
  { channel: 7, phase: 7, kind: 'stop bar' },
  { channel: 8, phase: 8, kind: 'stop bar' },
  { channel: 9, phase: 2, kind: 'advance', setbackFt: 350 },
  { channel: 10, phase: 6, kind: 'advance', setbackFt: 350 },
  { channel: 11, phase: 4, kind: 'count', setbackFt: 250 },
];

/** Stop-bar and advance loops are 6 ft long. */
export const SAMPLE_LOOP_FT = 6;

/** When channel 11 sticks on, in seconds after 07:00. */
export const SAMPLE_STUCK = { channel: 11, at: 24 * 60 + 17.4 };

/** The emergency vehicle preempt, in seconds after 07:00, during main-street green. */
export const SAMPLE_PREEMPT = { input: 2, at: 38 * 60 + 17.6, holdFor: 41 };

/**
 * Bus check-ins on TSP channel 1, for the phase 2 route, in seconds after
 * 07:00. The second arrives during the side street and gets an early green,
 * the third just before the main street yields and gets it extended, and the
 * other two find it green already.
 */
export const SAMPLE_BUSES = [6 * 60 + 41, 21 * 60 + 8, 45 * 60 + 25, 53 * 60 + 15];

/** A bus takes this long from checking in to crossing the stop line. */
const BUS_TRAVEL = 9.5;

// ------------------------------------------------------------- randomness

/** mulberry32: small, fast, and the same sequence on every platform. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random, lo, hi) => lo + (hi - lo) * random();

/** Arrival times of a Poisson stream with a rate that varies over time. */
function arrivals(random, perHour, from, to, weight = () => 1, peak = 1) {
  const times = [];
  const rate = (perHour / HOUR) * peak;
  let t = from;
  for (;;) {
    t += -Math.log(1 - random()) / rate;
    if (t >= to) return times;
    if (random() * peak <= weight(t)) times.push(t);
  }
}

// --------------------------------------------------------------- simulator

/**
 * Simulate one intersection and return its events, sorted, as
 * `{ t, code, param }` with `t` in seconds after the start hour.
 *
 * Options: `seed`, `offset` (when the coordinated phases yield, in seconds
 * after the hour, modulo the cycle), `volumeScale`, and `preempt`, `buses`
 * and `stuck` (pass null to leave one out).
 */
export function simulateIntersection({
  seed = 1,
  offset = SAMPLE_TIMING.offset,
  volumeScale = 1,
  preempt = SAMPLE_PREEMPT,
  buses = SAMPLE_BUSES,
  stuck = SAMPLE_STUCK,
  duration = HOUR,
} = {}) {
  const T = SAMPLE_TIMING;
  const random = seeded(seed);
  const events = [];
  const log = (t, code, param) => {
    if (t >= 0 && t < duration) events.push({ t, code, param, n: events.length });
  };

  // Where each phase's split starts and its green must end, within a cycle
  // that starts at the barrier after the main street.
  const segment = {};
  for (const ring of T.rings) {
    let at = 0;
    for (const phase of ring) {
      const p = T.phases[phase];
      segment[phase] = { start: at, forceOff: at + p.split - p.yellow - p.red };
      at += p.split;
    }
  }
  // the coordinated phases yield where the cycle starts, less their clearance
  const coordClear = T.phases[2].yellow + T.phases[2].red;
  const yieldAt = (k) => offset + k * T.cycle;
  const cycleBase = (k) => yieldAt(k) + coordClear;
  // the main street's platoon arrives over the 40 s after its usual green start
  const inPlatoon = (t) => {
    const local = (((t - yieldAt(0)) % T.cycle) + T.cycle) % T.cycle;
    return local >= 60 && local < 100 ? 1.6 : 0.6;
  };

  const warmUp = -3 * T.cycle;
  const end = duration + T.cycle;

  // vehicles, by phase
  const vehicles = {};
  for (const phase of Object.keys(T.phases).map(Number)) {
    const p = T.phases[phase];
    const weight = T.coordinated.includes(phase) ? inPlatoon : () => 1;
    vehicles[phase] = arrivals(random, p.vph * volumeScale, warmUp, end, weight, 1.6).map((a) => {
      const truck = random() < 0.05;
      return {
        a,
        length: truck ? between(random, 35, 45) : between(random, 14, 19),
        speed: p.speed * between(random, 0.85, 1.15),
      };
    });
  }
  const pending = {}; // phase -> index of the first vehicle not yet gone
  const queue = {}; // phase -> vehicles stopped at the line
  for (const phase of Object.keys(vehicles)) {
    pending[phase] = 0;
    queue[phase] = [];
  }

  // pedestrian buttons
  const pedCall = {}; // phase -> time the waiting call was placed, or null
  const pedPresses = [];
  for (const [phase, p] of Object.entries(T.phases)) {
    if (!p.pedPerHour) continue;
    pedCall[phase] = null;
    for (const t of arrivals(random, p.pedPerHour, warmUp, end)) {
      pedPresses.push({ t, phase: Number(phase), release: t + between(random, 0.2, 0.8) });
    }
  }
  pedPresses.sort((x, y) => x.t - y.t);
  let pressIndex = 0;
  const walking = {}; // phase -> end of its current WALK + clearance
  /** Register button presses up to time t. */
  const pressUpTo = (t) => {
    while (pressIndex < pedPresses.length && pedPresses[pressIndex].t <= t) {
      const press = pedPresses[pressIndex++];
      log(press.t, 90, press.phase);
      log(press.release, 89, press.phase);
      const busy = walking[press.phase] && walking[press.phase] > press.t;
      if (pedCall[press.phase] === null && !busy) {
        pedCall[press.phase] = press.t;
        log(press.t, 45, press.phase);
      }
    }
  };

  // stop-bar loop occupancy, per phase, merged into on/off events at the end
  const occupancy = {};
  for (const phase of Object.keys(T.phases)) occupancy[phase] = [];
  const cross = (phase, d, speed, length, onSince = null) => {
    occupancy[phase].push([onSince ?? d - SAMPLE_LOOP_FT / speed, d + length / speed]);
  };

  /** Move vehicles that have reached the line by time t into the queue. */
  const arriveUpTo = (phase, t) => {
    const list = vehicles[phase];
    while (pending[phase] < list.length && list[pending[phase]].a <= t) {
      queue[phase].push(list[pending[phase]++]);
    }
  };
  const hasCall = (phase, t) => {
    arriveUpTo(phase, t);
    pressUpTo(t);
    return queue[phase].length > 0 || (pedCall[phase] ?? null) !== null;
  };

  /**
   * Serve one green. Discharges the queue, lets later arrivals through, and
   * finds when the phase ends: a gap out once the loop has been empty for
   * the passage time after minimum green (and any WALK), else a max out or a
   * force off. Coordinated phases hold until `hardEnd`.
   */
  const serve = (phase, g0, hardEnd, coordinated) => {
    const p = T.phases[phase];
    arriveUpTo(phase, g0);
    pressUpTo(g0);
    log(g0, 1, phase);

    let pedNeed = 0;
    // a button pressed during this green waits for the next one
    if (pedCall[phase] != null && pedCall[phase] <= g0) {
      pedNeed = p.walk + p.pedClear;
      log(g0, 21, phase);
      log(g0 + p.walk, 22, phase);
      log(g0 + pedNeed, 23, phase);
      walking[phase] = g0 + pedNeed;
      pedCall[phase] = null;
    }
    const earliest = g0 + Math.max(p.minGreen, pedNeed);
    const maxEnd = coordinated ? hardEnd : Math.min(hardEnd, g0 + p.maxGreen);

    // Departures if the green ran to maxEnd. Queued vehicles go first, the
    // first few slower away; later arrivals join the tail or pass freely.
    const plan = [];
    let last = null;
    let k = 0;
    const list = vehicles[phase];
    let next = pending[phase];
    const waiting = queue[phase].slice();
    while (true) {
      let car;
      let fromQueue = false;
      if (waiting.length) {
        car = waiting.shift();
        fromQueue = true;
      } else if (next < list.length && list[next].a < maxEnd + p.yellow) {
        car = list[next++];
      } else break;
      let d;
      let speed;
      let onSince = null;
      if (fromQueue || (last !== null && car.a < last + 2.0)) {
        // in the queue: k counts from the head of this discharge
        const headway = k === 0 ? 0 : 1.95 + 0.9 * 0.55 ** (k - 1) + between(random, -0.15, 0.25);
        d = k === 0 ? Math.max(g0 + between(random, 1.4, 2.0), car.a) : Math.max(last + headway, car.a);
        speed = k === 0 ? between(random, 6, 8) : Math.min(car.speed, 8 + 5 * k);
        // The head of the queue has been sitting on the loop since it pulled
        // up to the line, which for a car left over from the last green is
        // when that green ended, not when it first joined the queue.
        const atLine = car.atLine ?? car.a;
        if (k === 0 && atLine <= g0) onSince = atLine - SAMPLE_LOOP_FT / car.speed;
        k += 1;
      } else {
        d = car.a;
        speed = car.speed;
        // a car following this one is not starting from rest
        k = 6;
      }
      plan.push({ car, d, speed, onSince, fromQueue });
      last = d;
      if (d > maxEnd + p.yellow) break;
    }

    // When does the green end?
    let gEnd = null;
    let reason = 6;
    if (coordinated) {
      gEnd = hardEnd;
    } else {
      let gapFrom = g0; // when the loop last went empty
      for (const step of plan) {
        const on = step.onSince ?? step.d - SAMPLE_LOOP_FT / step.speed;
        const expiry = Math.max(gapFrom + p.passage, earliest);
        if (on > expiry && expiry < maxEnd) {
          gEnd = expiry;
          reason = 4;
          break;
        }
        gapFrom = Math.max(gapFrom, step.d + step.car.length / step.speed);
        if (on >= maxEnd) break;
      }
      if (gEnd === null) {
        const expiry = Math.max(gapFrom + p.passage, earliest);
        if (expiry < maxEnd) {
          gEnd = expiry;
          reason = 4;
        } else {
          gEnd = maxEnd;
          reason = maxEnd < hardEnd ? 5 : 6;
        }
      }
    }
    if (gEnd >= earliest - 1e-9 && gEnd >= g0 + p.minGreen) log(g0 + p.minGreen, 3, phase);
    log(gEnd, reason, phase);
    log(gEnd, 7, phase);
    log(gEnd, 8, phase);
    log(gEnd + p.yellow, 9, phase);
    log(gEnd + p.yellow, 10, phase);
    log(gEnd + p.yellow + p.red, 11, phase);
    log(gEnd + p.yellow + p.red, 12, phase);

    // Who actually went: everyone before the end of green, the committed on
    // yellow, and now and then someone on red.
    const gone = new Set();
    let stopped = false;
    for (const step of plan) {
      if (stopped) break;
      const late = step.d - gEnd;
      let go = late <= 0;
      if (!go && late <= p.yellow) {
        // close to the line at the change: most go early in yellow, few late
        go = random() < (late < 1.5 ? 0.85 : 0.2);
      } else if (!go && late <= p.yellow + 1.5) {
        go = random() < 0.1;
      }
      if (!go) {
        stopped = true;
        break;
      }
      cross(phase, step.d, step.speed, step.car.length, step.onSince);
      gone.add(step.car);
    }
    // the rest wait for the next green, in arrival order; the first of them
    // stops at the line, on the loop
    const leftover = plan.filter((step) => !gone.has(step.car)).map((step) => step.car);
    for (const car of leftover) delete car.atLine;
    const head = plan.find((step) => !gone.has(step.car));
    if (head) head.car.atLine = Math.max(head.car.a, Math.min(head.d, gEnd + p.yellow));
    const unplanned = queue[phase].filter((car) => !gone.has(car) && !leftover.includes(car));
    queue[phase] = [...leftover, ...unplanned].sort((x, y) => x.a - y.a);
    // arrivals consumed by the plan are now either gone or queued
    pending[phase] = Math.max(pending[phase], next);
    return gEnd + p.yellow + p.red;
  };

  // ---------------------------------------------------------- the cycles
  const coordGreenSince = {};
  const firstCycle = Math.floor((warmUp - offset) / T.cycle);
  const lastCycle = Math.ceil((end - offset) / T.cycle);
  // the main street is green when the warm-up starts
  for (const phase of T.coordinated) coordGreenSince[phase] = warmUp;

  const preemptEnd = preempt ? preempt.at + preempt.holdFor : null;

  // Transit priority. Where a bus checks in decides what it gets: during the
  // side street, an early return to the main street; too close to the main
  // street's yield to make it through, a few seconds more green; otherwise
  // nothing, since it is green and the bus will clear.
  const tsp = { extend: new Map(), early: new Map() }; // cycle -> seconds / check-in
  const busRuns = [];
  for (const at of [...(buses || [])].sort((x, y) => x - y)) {
    const k = Math.floor((at - offset) / T.cycle);
    const sinceYield = at - yieldAt(k);
    log(at, 112, 1);
    let kind = 'none';
    if (sinceYield < 55) {
      kind = 'early';
      tsp.early.set(k, at);
      log(at + 0.4, 118, 1);
      log(at + 0.4, 113, 1);
    } else if (T.cycle - sinceYield < BUS_TRAVEL + 1) {
      kind = 'extend';
      tsp.extend.set(k + 1, Math.min(10, BUS_TRAVEL + 1 - (T.cycle - sinceYield)));
      log(at + 0.4, 118, 1);
      log(at + 0.4, 114, 1);
    }
    busRuns.push({ at, kind });
  }

  // the pattern in effect, logged as it starts at 7:00
  log(0, 131, T.pattern);
  log(0, 132, T.cycle);
  log(0, 133, T.offset);
  for (let phase = 1; phase <= 8; phase += 1) log(0, 133 + phase, T.phases[phase].split);

  let preemptLogged = false;
  for (let k = firstCycle; k <= lastCycle; k += 1) {
    const extend = tsp.extend.get(k) || 0;
    const yieldTime = yieldAt(k) + extend;
    const base = cycleBase(k);

    for (const phase of T.coordinated) log(yieldAt(k), 151, phase);

    // The emergency vehicle comes down the main street while it is green.
    if (preempt && !preemptLogged && preempt.at < yieldTime) {
      preemptLogged = true;
      log(preempt.at, 102, preempt.input);
      log(preempt.at + 0.1, 105, preempt.input);
      log(preempt.at + 0.1, 107, preempt.input);
      log(preemptEnd, 104, preempt.input);
      log(preemptEnd, 111, preempt.input);
    }
    // Held green: through the preempt, and through a cycle with no calls.
    const held = preempt && yieldTime >= preempt.at && yieldTime < preemptEnd + 8;
    const conflicting = [1, 3, 4, 5, 7, 8].some((phase) => hasCall(phase, yieldTime));
    if (held || !conflicting) continue;

    // The main street yields.
    for (const phase of T.coordinated) {
      serve(phase, coordGreenSince[phase], yieldTime, true);
      coordGreenSince[phase] = null;
    }
    const barrier = yieldTime + coordClear;
    // an early green cuts the side street short, but not before the bus asks
    const busAt = tsp.early.get(k);
    const cut = (forceOff) =>
      busAt === undefined || forceOff <= busAt ? forceOff : Math.max(forceOff - 8, busAt + 0.5);

    // Side street, both rings, then the main-street lefts.
    const ringEnds = [];
    for (const ring of T.rings) {
      let t = barrier;
      for (const phase of ring.slice(0, 2)) {
        const forceOff = cut(base + segment[phase].forceOff);
        if (t < forceOff - T.phases[phase].minGreen && hasCall(phase, t)) {
          t = serve(phase, t, forceOff, false);
        }
      }
      ringEnds.push(t);
    }
    const secondBarrier = Math.max(...ringEnds);
    T.rings.forEach((ring) => {
      let t = secondBarrier;
      const left = ring[2];
      const forceOff = cut(base + segment[left].forceOff);
      if (t < forceOff - T.phases[left].minGreen && hasCall(left, t)) {
        t = serve(left, t, forceOff, false);
      }
      coordGreenSince[ring[3]] = t;
    });
  }

  // Each bus checks out as it crosses the line, a few seconds into phase 2's
  // green: the one it was given, or the one it was already in.
  const phase2Greens = events.filter((e) => e.code === 1 && e.param === 2).map((e) => e.t).sort((x, y) => x - y);
  for (const run of busRuns) {
    const nextGreen = phase2Greens.find((g) => g > run.at);
    const out = run.kind === 'early' && nextGreen !== undefined ? nextGreen + 7.5 : run.at + BUS_TRAVEL;
    log(out, 115, 1);
    if (run.kind !== 'none') log(out, 119, 1);
  }

  // stop-bar loops: union of each vehicle's time over the loop
  const detectorEvents = (channel, intervals) => {
    intervals.sort((x, y) => x[0] - y[0]);
    let on = null;
    let off = null;
    for (const [start, finish] of intervals) {
      if (on === null) {
        on = start;
        off = finish;
      } else if (start <= off + 0.05) {
        off = Math.max(off, finish);
      } else {
        log(on, 82, channel);
        log(off, 81, channel);
        on = start;
        off = finish;
      }
    }
    if (on !== null) {
      log(on, 82, channel);
      log(off, 81, channel);
    }
  };
  for (const det of SAMPLE_DETECTORS.filter((d) => d.kind === 'stop bar')) {
    detectorEvents(det.channel, occupancy[det.phase]);
  }
  // advance and count loops see every vehicle at its free speed
  for (const det of SAMPLE_DETECTORS.filter((d) => d.kind !== 'stop bar')) {
    const pulses = [];
    for (const car of vehicles[det.phase]) {
      const passes = car.a - det.setbackFt / car.speed;
      if (stuck && det.channel === stuck.channel && passes >= stuck.at) break;
      pulses.push([passes, passes + (SAMPLE_LOOP_FT + car.length) / car.speed]);
    }
    detectorEvents(det.channel, pulses);
    if (stuck && det.channel === stuck.channel) log(stuck.at, 82, det.channel);
  }

  // Tenths of a second, as a controller logs them; ties keep the order they
  // happened in, so a green termination still precedes its yellow.
  for (const e of events) e.t = Math.round(e.t * 10) / 10;
  events.sort((x, y) => x.t - y.t || x.n - y.n);
  return events.map(({ t, code, param }) => ({ t, code, param }));
}

// -------------------------------------------------------------- formatting

const pad = (n, width = 2) => String(n).padStart(width, '0');

/** "4/14/2026 07:00:12.3", the export format the older tools parse. */
export function formatSampleTime(t, day = SAMPLE_DAY, hour = SAMPLE_START_HOUR) {
  const tenths = Math.round(t * 10);
  const total = Math.floor(tenths / 10);
  const h = hour + Math.floor(total / HOUR);
  const m = Math.floor((total % HOUR) / 60);
  const s = total % 60;
  return `${day.month}/${day.day}/${day.year} ${pad(h)}:${pad(m)}:${pad(s)}.${tenths % 10}`;
}

/** Events as CSV lines: timestamp, event code, parameter. */
export function formatEvents(events, day = SAMPLE_DAY) {
  return events.map((e) => `${formatSampleTime(e.t, day)},${e.code},${e.param}`).join('\n');
}

// ----------------------------------------------------- what the tools load

let cached = null;
/** The hour at Sample Ave & 1st St, as pasted text. Built once, on demand. */
export function sampleHighResLog() {
  if (!cached) cached = formatEvents(simulateIntersection({ seed: 20260414 }));
  return cached;
}

let cachedPair = null;
/**
 * Sample Ave at 1st St and at 2nd St, for the offset calculator, which pairs
 * the two signals' cycles in order. 1st St is the hour the other tools load
 * without its preempt and buses: the preempt holds the main street through a
 * cycle, and pairing in order would put every cycle after it against the
 * wrong one.
 */
export function sampleCorridorPair() {
  if (!cachedPair) {
    cachedPair = {
      first: formatEvents(simulateIntersection({ seed: 20260414, preempt: null, buses: [] })),
      second: sampleNeighbourLog(),
    };
  }
  return cachedPair;
}

/** What the offset calculator says under its box. */
export const SAMPLE_PAIR_NOTE =
  'Sample data: an hour at two made-up signals on the same street, Sample Ave & 1st St (left) ' +
  'and Sample Ave & 2nd St (right), both on a 100 s cycle with the second yielding 22 s later.';

let cachedNext = null;
/**
 * The next signal along, Sample Ave & 2nd St, for the offset calculator: the
 * same plan with its main street yielding 22 s later, and its own traffic.
 */
export function sampleNeighbourLog() {
  if (!cachedNext) {
    cachedNext = formatEvents(
      simulateIntersection({
        seed: 20260415,
        offset: SAMPLE_TIMING.offset + 22,
        volumeScale: 0.9,
        preempt: null,
        buses: [],
        stuck: null,
      }),
    );
  }
  return cachedNext;
}

/**
 * The detector to phase map in the shape a tool asks for. `style` is one of:
 *   "tab"    Det 1<TAB>1     (Yellow & Red Light Running, Delay Estimator)
 *   "space"  DET 1 1         (Gap-Out Helper, Detector Bubble Chart)
 *   "comma"  1, 1            (phase, detector: Split Failure, Skipped Phase)
 * `channels` limits it to some detectors; by default the ones that call a
 * phase, plus the advance loops.
 */
export function sampleDetectorMap(style = 'tab', channels = null) {
  const wanted = channels || SAMPLE_DETECTORS.filter((d) => d.kind !== 'count').map((d) => d.channel);
  return SAMPLE_DETECTORS.filter((d) => wanted.includes(d.channel))
    .map((d) => {
      if (style === 'space') return `DET ${d.channel} ${d.phase}`;
      if (style === 'comma') return `${d.phase}, ${d.channel}`;
      return `Det ${d.channel}\t${d.phase}`;
    })
    .join('\n');
}

/** One line to show under the box once the sample is in. */
export const SAMPLE_NOTE =
  'Sample data: one simulated hour, 7 to 8 AM, at a made-up coordinated intersection ' +
  '(2 and 6 coordinated on a 100 s cycle; stop-bar detectors 1 to 8 call phases 1 to 8).';

// ------------------------------------------------------- a week of plans

/**
 * Time-of-day plans at the sample intersection: [time, pattern, cycle, offset].
 * Pattern 254 is free (no cycle). Weekdays run pattern 1 from 7:00, the plan
 * the hour sample is in.
 */
const WEEKDAY_PLANS = [
  ['00:00', 254, 0, 0],
  ['05:30', 4, 80, 12],
  ['07:00', 1, 100, 30],
  ['09:00', 2, 90, 20],
  ['15:30', 3, 120, 44],
  ['18:30', 2, 90, 20],
  ['21:00', 4, 80, 12],
  ['23:00', 254, 0, 0],
];
const WEEKEND_PLANS = {
  6: [['00:00', 254, 0, 0], ['07:30', 5, 90, 25], ['22:00', 254, 0, 0]],
  0: [['00:00', 254, 0, 0], ['08:30', 5, 90, 25], ['20:00', 254, 0, 0]],
};
/** Friday evening's stadium plan, a one-off over the usual PM peak. */
const SPECIAL_PLANS = { 5: [['16:45', 6, 130, 60], ['19:30', 2, 90, 20]] };

/**
 * Monday 13 to Sunday 19 April 2026 as plan changes only (131 pattern, 132
 * cycle, 133 offset), for the Pattern Calendar, which needs days where the
 * other tools need an hour. It ends with a cycle length event at the last
 * tenth of Sunday, since the calendar closes the last plan at the final
 * event in the file.
 */
export function samplePatternWeek() {
  const lines = [];
  const stamp = (day, hhmm, tenths = '0') => `4/${day}/2026 ${hhmm}:00.${tenths}`;
  for (let day = 13; day <= 19; day += 1) {
    const weekday = new Date(2026, 3, day).getDay();
    let plans = WEEKEND_PLANS[weekday] || WEEKDAY_PLANS;
    if (SPECIAL_PLANS[weekday]) {
      const [first] = SPECIAL_PLANS[weekday];
      plans = [
        ...plans.filter(([time]) => time < first[0] || time >= SPECIAL_PLANS[weekday][1][0]),
        ...SPECIAL_PLANS[weekday],
      ].sort((a, b) => a[0].localeCompare(b[0]));
    }
    for (const [time, pattern, cycle, offset] of plans) {
      lines.push(`${stamp(day, time)},131,${pattern}`);
      lines.push(`${stamp(day, time)},132,${cycle}`);
      lines.push(`${stamp(day, time)},133,${offset}`);
    }
  }
  lines.push('4/19/2026 23:59:59.9,132,0');
  return lines.join('\n');
}

/** What the Pattern Calendar says under its box. */
export const SAMPLE_WEEK_NOTE =
  'Sample data: a made-up week of time-of-day plans, Monday 13 to Sunday 19 April 2026, ' +
  'with a different weekend schedule and a special event plan on Friday evening.';

// ------------------------------------------------------------ Block Logic

/**
 * The hour again, in the headed form Block Logic reads: one row per change
 * of a phase's colour, a detector, a pedestrian button or the pattern.
 */
export function sampleBlockLogicCsv() {
  const rows = ['timestamp,eventType,channel,state,value'];
  const iso = (t) => {
    const total = Math.round(t * 10);
    const s = Math.floor(total / 10);
    const pad = (n) => String(n).padStart(2, '0');
    const h = SAMPLE_START_HOUR + Math.floor(s / HOUR);
    return `2026-04-14T${pad(h)}:${pad(Math.floor((s % HOUR) / 60))}:${pad(s % 60)}.${total % 10}00`;
  };
  const colour = { 1: 1, 8: 2, 10: 3 }; // green, yellow, red
  for (const e of simulateIntersection({ seed: 20260414 })) {
    if (colour[e.code]) rows.push(`${iso(e.t)},PHASE,${e.param},1,${colour[e.code]}`);
    else if (e.code === 82 || e.code === 81) rows.push(`${iso(e.t)},DETECTOR,${e.param},${e.code === 82 ? 1 : 0},`);
    else if (e.code === 90 || e.code === 89) rows.push(`${iso(e.t)},PED,${e.param},${e.code === 90 ? 1 : 0},`);
    else if (e.code === 131) rows.push(`${iso(e.t)},PATTERN,0,,${e.param}`);
  }
  return rows.join('\n');
}

// ------------------------------------------------------------------- GPX

/**
 * Three signals on East Colfax Avenue in Denver, a street that runs dead
 * straight east to west, for the GPX tools. Locations are where the cross
 * streets meet Colfax in OpenStreetMap; the signal timing is simulated, the
 * first signal's being the hour every other tool loads.
 */
export const SAMPLE_CORRIDOR = [
  { name: 'E Colfax Ave & Clarkson St', lat: 39.74, lon: -104.9776 },
  { name: 'E Colfax Ave & Downing St', lat: 39.74, lon: -104.9732 },
  { name: 'E Colfax Ave & York St', lat: 39.74, lon: -104.95978 },
];

/** The ends of the drive, beyond the first and last signals. */
const ROUTE = { west: -104.9810, east: -104.9568 };
const EB_LAT = 39.73999; // the eastbound carriageway
const WB_LAT = 39.74013;
const M_PER_DEG_LON = 111320 * Math.cos((39.74 * Math.PI) / 180);
const CRUISE = 15.6; // m/s, 35 mph
const BRAKE = 2.5; // m/s²
const PULL_AWAY = 1.8; // m/s²

let cachedThird = null;
/** York St: the same plan, yielding to suit eastbound progression from Downing. */
function sampleThirdLog() {
  if (!cachedThird) {
    cachedThird = formatEvents(
      simulateIntersection({
        seed: 20260416,
        offset: SAMPLE_TIMING.offset + 22 + 74 - SAMPLE_TIMING.cycle,
        volumeScale: 0.85,
        preempt: null,
        buses: [],
        stuck: null,
      }),
    );
  }
  return cachedThird;
}

/** Each corridor signal's log, west to east. */
export function sampleCorridorLogs() {
  return [sampleHighResLog(), sampleNeighbourLog(), sampleThirdLog()];
}

/** When a phase is green, yellow or red, from a formatted log. */
function phaseStates(log, phase) {
  const changes = [];
  for (const line of log.split('\n')) {
    const [stamp, code, param] = line.split(',');
    if (Number(param) !== phase) continue;
    const state = { 1: 'green', 8: 'yellow', 10: 'red' }[Number(code)];
    if (!state) continue;
    const [, clock] = stamp.split(' ');
    const [h, m, s] = clock.split(':').map(Number);
    changes.push({ t: (h - SAMPLE_START_HOUR) * HOUR + m * 60 + s, state });
  }
  return changes;
}
const stateAt = (changes, t) => {
  let state = 'red';
  let since = -Infinity;
  for (const change of changes) {
    if (change.t > t) break;
    state = change.state;
    since = change.t;
  }
  return { state, since, nextGreen: changes.find((c) => c.t > t && c.state === 'green')?.t };
};

/**
 * One pass along the corridor: positions every second from `start` (seconds
 * after 7:00), stopping on red. Returns the samples and when it finished.
 */
function drive(start, eastbound, states, random) {
  const length = (ROUTE.east - ROUTE.west) * M_PER_DEG_LON;
  const lines = SAMPLE_CORRIDOR.map((s) => {
    const x = (s.lon - ROUTE.west) * M_PER_DEG_LON;
    // stop 8 m short of the cross street's centre line
    return eastbound ? x - 8 : length - x - 8;
  });
  const order = eastbound ? [0, 1, 2] : [2, 1, 0];
  const samples = [];
  let t = start;
  let x = 0;
  let v = CRUISE;
  let waitUntil = null;
  let next = 0; // index into order of the next signal
  while (x < length) {
    samples.push({ t, x: eastbound ? x : length - x });
    const dt = 1;
    if (waitUntil !== null) {
      if (t + dt < waitUntil) {
        t += dt;
        continue;
      }
      waitUntil = null;
      v = 0;
      next += 1;
    }
    // look ahead to the next signal: will we reach its line on green?
    if (next < order.length) {
      const line = lines[order[next]];
      const toLine = line - x;
      const arrival = t + toLine / Math.max(v, 1);
      const at = stateAt(states[order[next]], arrival);
      const goes = at.state === 'green' || (at.state === 'yellow' && arrival - at.since < 1.5);
      if (!goes && toLine <= (v * v) / (2 * BRAKE) + v * dt) {
        // brake to a stop at the line, then wait for green and a moment more
        const stopIn = Math.max(toLine, 0.5);
        const stopTime = (2 * stopIn) / Math.max(v, 0.5);
        const waitFrom = t + stopTime;
        const green = stateAt(states[order[next]], waitFrom);
        const departs = (green.state === 'green' ? waitFrom : green.nextGreen ?? waitFrom) + between(random, 1.5, 2.5);
        // the braking, a second at a time
        let s = 0;
        while (s + 1 < stopTime) {
          s += 1;
          const covered = v * s - 0.5 * (v / stopTime) * s * s;
          samples.push({ t: t + s, x: eastbound ? x + covered : length - x - covered });
        }
        x = line;
        t = Math.ceil(waitFrom);
        waitUntil = departs;
        v = 0;
        continue;
      }
      if (toLine < 0) next += 1;
    }
    const vNext = Math.min(CRUISE * between(random, 0.97, 1.03), v + PULL_AWAY * dt);
    x += ((v + vNext) / 2) * dt;
    v = vNext;
    t += dt;
  }
  return { samples, end: t };
}

/**
 * A bus on Colfax: eastbound to check in for priority at Clarkson St at 7:06:41,
 * back westbound, and eastbound again for the 7:21:08 check-in, stopping
 * wherever the simulated signals are red. With `oneWay`, only that last
 * eastbound run: the time-space tools plot distance travelled, which a round
 * trip keeps adding to on the way back. 1 Hz GPS with a metre or two of
 * sideways scatter, and a smooth climb of about 16 m eastward. Times carry no zone, so they read as
 * the same local clock as the controller logs in any browser.
 */
export function sampleGpx({ oneWay = false } = {}) {
  const random = seeded(20260417);
  const logs = sampleCorridorLogs();
  const eastStates = logs.map((log) => phaseStates(log, 2));
  const westStates = logs.map((log) => phaseStates(log, 6));
  // reach the TSP check-in, 148 m before Clarkson's line, at the logged times
  const firstLine = (SAMPLE_CORRIDOR[0].lon - ROUTE.west) * M_PER_DEG_LON - 8;
  const leadIn = (firstLine - CRUISE * BUS_TRAVEL) / CRUISE;
  const runs = [];
  const a = drive(SAMPLE_BUSES[0] - leadIn, true, eastStates, random);
  const b = drive(a.end + 45, false, westStates, random);
  const c = drive(SAMPLE_BUSES[1] - leadIn, true, eastStates, random);
  if (oneWay) runs.push(c);
  else runs.push(a, b, c);

  const length = (ROUTE.east - ROUTE.west) * M_PER_DEG_LON;
  const pts = [];
  runs.forEach((run) => {
    const eastbound = run !== b;
    for (const { t, x } of run.samples) {
      const scatter = () => between(random, -1.5, 1.5);
      const lat = (eastbound ? EB_LAT : WB_LAT) + scatter() / 111320;
      const lon = ROUTE.west + (x + scatter()) / M_PER_DEG_LON;
      // a smooth climb: random scatter here adds up into a gain several
      // times the real one
      const ele = 1612 + (16 * x) / length + 0.8 * Math.sin(x / 160);
      const whole = Math.round(t);
      const pad = (n) => String(n).padStart(2, '0');
      const clock = `${pad(SAMPLE_START_HOUR + Math.floor(whole / HOUR))}:${pad(Math.floor((whole % HOUR) / 60))}:${pad(whole % 60)}`;
      pts.push(
        `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(1)}</ele><time>2026-04-14T${clock}</time></trkpt>`,
      );
    }
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Traffic Signal Kit sample data" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>Sample bus ${oneWay ? 'run' : 'runs'} on E Colfax Ave, Denver (simulated)</name></metadata>`,
    '  <trk>',
    '    <name>Simulated bus, E Colfax Ave</name>',
    '    <trkseg>',
    ...pts,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
  ].join('\n');
}

/** The corridor's signals as "Name, Latitude, Longitude" lines. */
export function sampleSignalLocations() {
  return SAMPLE_CORRIDOR.map((s) => `${s.name},${s.lat},${s.lon}`).join('\n');
}

/** One eastbound pass, for the time-space tools. */
export function sampleGpxPass() {
  return sampleGpx({ oneWay: true });
}

/** What the time-space tools say under their box. */
export const SAMPLE_GPX_PASS_NOTE =
  'Sample data: a simulated bus eastbound on East Colfax Avenue, Denver, at 7:20 on 14 April 2026, ' +
  'past Clarkson, Downing and York streets. It checks in for transit priority at Clarkson and is ' +
  'given an early green; the signal timing is simulated.';

/** What the GPX map and elevation tools say under their box. */
export const SAMPLE_GPX_NOTE =
  'Sample data: a simulated bus on East Colfax Avenue, Denver, on 14 April 2026: eastbound ' +
  'from 7:06, back westbound, and eastbound again from 7:20, past Clarkson, Downing and York ' +
  'streets, stopping where the simulated signals were red.';
