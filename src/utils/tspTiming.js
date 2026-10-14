/**
 * Transit signal priority: when the bus will reach the stop bar, and when it
 * will be through the intersection.
 *
 * NTCIP 1211 (v02.24, 5.1.1.1.7 and 5.1.1.1.8) carries both in a priority
 * request:
 *
 *   - Time of Service Desired (TSD): seconds until the bus arrives at the
 *     intersection's stopping point. For a near-side stopping point the
 *     standard treats that as the stop bar.
 *   - Time of Estimated Departure (TED): seconds until it departs.
 *
 * Both are whole seconds, 1 to 65535, counted from when the controller
 * *receives* the request, and the standard leaves it to whatever sends the
 * request to allow for the time the message spent getting there. So
 *
 *     ETA = request distance / (1.4667 x speed) + lost time - latency
 *     TSD = ETA, rounded down
 *     TED = ETA + time to cross the intersection, rounded up
 *
 * Rounded in the direction that favours the bus: asking for green a fraction
 * early and holding it a fraction long costs the side street a second; a bus
 * that arrives on yellow costs it the whole trip's priority.
 *
 * Where the request starts depends on what detects the bus -- see
 * TECHNOLOGIES and `requestDistance`.
 *
 * Framework free, so it runs under `node --test`.
 */

/** Feet per second in one mile per hour: the 1.4667 in the formula. */
export const FPS_PER_MPH = 5280 / 3600;

/** NTCIP 1211 sends TSD and TED as INTEGER (1..65535). */
export const NTCIP_MIN = 1;
export const NTCIP_MAX = 65535;

/** Transit phases offered in the picker. */
export const PHASES = Array.from({ length: 16 }, (unused, i) => i + 1);

/** Names a new approach takes, in order, until they are used up. */
export const DIRECTIONS = ['Northbound', 'Southbound', 'Eastbound', 'Westbound'];

/** More approaches than any intersection has; a cap so a bad file stays small. */
export const MAX_APPROACHES = 16;

/**
 * The ways a bus can ask for priority.
 *
 * `latency` is the default delay between the bus reaching the request point
 * and the controller receiving the request. They are typical figures, not
 * anybody's specification: the page says to use the vendor's.
 */
export const TECHNOLOGIES = {
  emitter: {
    label: 'Emitter',
    title: 'Emitter (optical, infrared or GPS radio)',
    latency: 0,
    blurb: 'An emitter on the bus is picked up by a detector at the intersection. '
      + 'The request starts when the bus comes into the detector\'s range.',
  },
  cloud: {
    label: 'Cloud',
    title: 'Cloud (GPS / AVL over cellular)',
    latency: 2,
    blurb: 'The bus reports where it is, and a server sends the request when it passes a check-in '
      + 'point or its predicted arrival drops below a threshold. The message takes time to arrive.',
  },
  video: {
    label: 'Video',
    title: 'Video (camera detection zone)',
    latency: 0.5,
    blurb: 'A camera at the intersection recognises the bus as it enters a detection zone. '
      + 'Recognising it takes a moment.',
  },
};

/**
 * Where a bus with no near-side stop loses its lost time in the animation:
 * this far upstream of the stop bar, about two cars back in the queue.
 * Drawing only; it does not change TSD or TED.
 */
export const QUEUE_HOLD_FT = 50;

/** A fresh approach with every setting at its default. */
export function defaultApproach(overrides = {}) {
  return {
    id: 'ap1',
    name: DIRECTIONS[0],
    phase: 2,
    technology: 'emitter',
    speed: 35,
    // Emitter: the detector's range, and where the detector is.
    emitterDistance: 1000,
    detectorToStopBar: 100,
    detectorPosition: 'past',
    // Cloud: a check-in point, or a time-to-arrival threshold.
    cloudTrigger: 'distance',
    checkInDistance: 1000,
    checkInEta: 30,
    // Video: the detection zone's upstream edge, and its length.
    zoneSetback: 250,
    zoneLength: 40,
    // Kept per technology, so switching between them loses nothing.
    latency: Object.fromEntries(Object.entries(TECHNOLOGIES).map(([key, t]) => [key, t.latency])),
    lostTime: 0,
    nearSideStop: false,
    stopDistance: 75,
    intersectionLength: 80,
    includeBusLength: false,
    busLength: 40,
    // null: the bus crosses at the approach speed.
    crossingSpeed: null,
    helper: { stops: true, braking: 4, accel: 4, dwell: 15, queue: 0 },
    ...overrides,
  };
}

const num = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
};

/** Float noise off before rounding: 27.999999999999996 is 28. */
const snap = (value) => Math.round(value * 1e6) / 1e6;

const ft = (value) => `${Math.round(value).toLocaleString('en-US')} ft`;
const sec = (value) => `${value.toFixed(2)} s`;

/** The technology an approach uses, falling back to emitter for anything unknown. */
export const technologyOf = (approach) => (TECHNOLOGIES[approach?.technology] ? approach.technology : 'emitter');

/** The approach's latency for its own technology, in seconds. */
export function latencyOf(approach) {
  const tech = technologyOf(approach);
  const value = num(approach?.latency?.[tech]);
  return Number.isFinite(value) ? Math.max(0, value) : TECHNOLOGIES[tech].latency;
}

/**
 * How far upstream of the stop bar the request starts, in feet, and that
 * worked out in words.
 *
 * `v` is the approach speed in ft/s and `lostTime` the lost time in seconds;
 * only the cloud ETA trigger needs them.
 */
export function requestDistance(approach, { v, lostTime }) {
  const a = approach || {};
  const tech = technologyOf(a);
  if (tech === 'emitter') {
    const range = num(a.emitterDistance) || 0;
    const offset = num(a.detectorToStopBar) || 0;
    const before = a.detectorPosition === 'before';
    // The detector's range is measured from the detector. On a far-side mast
    // arm the detector is past the stop bar, so part of that range is spent
    // inside the intersection.
    const d = before ? range + offset : range - offset;
    return {
      d,
      text: before
        ? `${ft(range)} emitter range + ${ft(offset)} detector before the stop bar = ${ft(d)}`
        : `${ft(range)} emitter range − ${ft(offset)} detector past the stop bar = ${ft(d)}`,
      problem: `The emitter range (${ft(range)}) does not reach back past the stop bar, `
        + `so the request would start inside the intersection.`,
    };
  }
  if (tech === 'cloud' && a.cloudTrigger === 'eta') {
    const threshold = num(a.checkInEta) || 0;
    // The request fires when the predicted arrival is `threshold` away; that
    // prediction includes the lost time, so the bus is (threshold - lost)
    // seconds of driving out.
    const d = (threshold - lostTime) * v;
    return {
      d,
      text: `Fires ${sec(threshold)} before arrival: (${sec(threshold)} − ${sec(lostTime)} lost) × ${v.toFixed(2)} ft/s = ${ft(d)}`,
      problem: 'The ETA threshold is no longer than the lost time, so the request would start at the stop bar.',
    };
  }
  if (tech === 'cloud') {
    const d = num(a.checkInDistance) || 0;
    return {
      d,
      text: `Check-in point ${ft(d)} before the stop bar`,
      problem: 'Put the check-in point upstream of the stop bar.',
    };
  }
  const d = num(a.zoneSetback) || 0;
  return {
    d,
    text: `Detection zone starts ${ft(d)} before the stop bar`,
    problem: 'Put the detection zone upstream of the stop bar.',
  };
}

/**
 * TSD and TED for one approach, with the working.
 *
 * Every number the page shows comes from here. `steps` is the same arithmetic
 * in words with the numbers filled in, so a reviewer can check it by hand.
 * `errors` mean the request cannot work as set; `warnings` mean it works but
 * something is probably not what was meant.
 */
export function computeTiming(approach) {
  const a = approach || {};
  const errors = [];
  const warnings = [];
  const steps = [];

  const speed = num(a.speed);
  const v = speed * FPS_PER_MPH;
  const lostTime = Math.max(0, num(a.lostTime) || 0);
  const latency = latencyOf(a);
  const empty = {
    d: null, v, speed, lostTime, latency, travel: null, eta: null, tsdExact: null, tsd: null,
    crossDistance: null, crossTime: null, tedExact: null, ted: null, steps, warnings, errors,
  };

  if (!(speed > 0)) {
    errors.push('Enter an approach speed above 0 mph.');
    return empty;
  }
  const request = requestDistance(a, { v, lostTime });
  if (!(request.d > 0)) {
    errors.push(request.problem);
    return { ...empty, d: request.d };
  }
  const { d } = request;
  steps.push({ label: 'Request distance', text: request.text });
  steps.push({ label: 'Speed', text: `${speed} mph × 1.4667 = ${v.toFixed(2)} ft/s` });

  const travel = d / v;
  steps.push({ label: 'Travel time', text: `${ft(d)} ÷ ${v.toFixed(2)} ft/s = ${sec(travel)}` });

  const eta = travel + lostTime - latency;
  steps.push({
    label: 'ETA',
    text: `${sec(travel)} travel + ${sec(lostTime)} lost − ${sec(latency)} latency = ${sec(eta)}`,
  });
  const tsd = Math.floor(snap(eta));
  steps.push({ label: 'TSD', text: `${sec(eta)}, rounded down = ${tsd} s` });

  const busLength = a.includeBusLength ? Math.max(0, num(a.busLength) || 0) : 0;
  const intersection = Math.max(0, num(a.intersectionLength) || 0);
  const crossDistance = intersection + busLength;
  const crossSpeedMph = num(a.crossingSpeed);
  const hasCrossSpeed = Number.isFinite(crossSpeedMph);
  if (hasCrossSpeed && !(crossSpeedMph > 0)) {
    errors.push('Enter a speed through the intersection above 0 mph, or leave it blank to use the approach speed.');
  }
  const vCross = hasCrossSpeed && crossSpeedMph > 0 ? crossSpeedMph * FPS_PER_MPH : v;
  const crossTime = crossDistance / vCross;
  steps.push({
    label: 'Time to cross',
    text: `${busLength ? `${ft(intersection)} intersection + ${ft(busLength)} bus = ` : ''}${ft(crossDistance)}`
      + ` ÷ ${vCross.toFixed(2)} ft/s = ${sec(crossTime)}`,
  });
  const tedExact = eta + crossTime;
  const ted = Math.ceil(snap(tedExact));
  steps.push({ label: 'TED', text: `${sec(eta)} + ${sec(crossTime)} = ${sec(tedExact)}, rounded up = ${ted} s` });

  if (snap(eta) < NTCIP_MIN) {
    errors.push(`TSD works out at ${sec(eta)}. NTCIP 1211 needs at least 1 s: move the request point upstream`
      + `${latency > 0 ? ' or cut the latency' : ''}.`);
  }
  if (ted > NTCIP_MAX) {
    warnings.push(`TED is over ${NTCIP_MAX.toLocaleString('en-US')} s, the most NTCIP 1211 can carry.`);
  }
  if (a.nearSideStop) {
    const stop = num(a.stopDistance) || 0;
    if (stop >= d) {
      warnings.push(`The near-side stop (${ft(stop)} out) is upstream of where the request starts (${ft(d)}). `
        + 'Its dwell happens before the request, so it should not be in the lost time.');
    } else if (lostTime === 0) {
      warnings.push('There is a near-side stop but no lost time, so the dwell is not counted. '
        + 'Add it, or use Build up lost time.');
    }
  }

  return {
    d, v, speed, lostTime, latency, travel, eta, tsdExact: eta, tsd,
    crossDistance, crossTime, vCross, tedExact, ted, steps, warnings, errors,
  };
}

/**
 * Lost time built up from its parts.
 *
 * A bus that brakes from v to a stop at a constant rate b covers v^2/2b feet
 * in v/b seconds, where at speed it would have taken v/2b: it loses v/2b.
 * Pulling away again loses v/2a the same way. Then the dwell, then any queue.
 *
 * The rates default to 4 ft/s^2 each, about what city bus drivers use, but
 * they are assumptions: a fleet's own figures belong here.
 */
export function lostTimeEstimate({ speed, stops = true, braking = 4, accel = 4, dwell = 0, queue = 0 } = {}) {
  const v = Math.max(0, Number(speed) || 0) * FPS_PER_MPH;
  const brake = stops && braking > 0 ? v / (2 * braking) : 0;
  const pullAway = stops && accel > 0 ? v / (2 * accel) : 0;
  const dwellTime = Math.max(0, Number(dwell) || 0);
  const queueTime = Math.max(0, Number(queue) || 0);
  return {
    braking: brake,
    accel: pullAway,
    dwell: dwellTime,
    queue: queueTime,
    total: brake + pullAway + dwellTime + queueTime,
  };
}

/**
 * The bus's trip, on the same clock as TSD: t = 0 is when the controller
 * receives the request.
 *
 * The bus reaches the request point at t = -latency, drives at the approach
 * speed, stops for the lost time -- at the near-side stop if there is one,
 * otherwise in the queue -- and reaches the stop bar at exactly ETA. It then
 * crosses at the crossing speed and is clear at exactly TED. A constant-speed
 * model, like the formula: it shows what the numbers assume, not how a bus
 * really pulls away.
 *
 * `x` is the front of the bus in feet, 0 at the stop bar and negative
 * upstream.
 */
export function busMotion(approach, timing, { preRoll = 2, postRoll = 2 } = {}) {
  if (!timing || !(timing.d > 0) || !(timing.v > 0)) return null;
  const { d, v, latency, lostTime, eta, tedExact, crossDistance } = timing;
  const vCross = timing.vCross || v;
  const nearSide = Boolean(approach?.nearSideStop);
  const stop = Number(approach?.stopDistance) || 0;
  // How far upstream the hold is. A stop beyond the request point is held at
  // the request point; computeTiming has already warned about it.
  const hold = nearSide ? Math.min(Math.max(stop, 0), d) : Math.min(QUEUE_HOLD_FT, d);

  const tTrigger = -latency;
  const tHold = tTrigger + (d - hold) / v;
  const tGo = tHold + lostTime;
  const segments = [
    { kind: 'lead', t0: tTrigger - preRoll, t1: tTrigger, x0: -d - v * preRoll, x1: -d },
    { kind: 'travel', t0: tTrigger, t1: tHold, x0: -d, x1: -hold },
    { kind: 'hold', t0: tHold, t1: tGo, x0: -hold, x1: -hold },
    { kind: 'travel', t0: tGo, t1: eta, x0: -hold, x1: 0 },
    { kind: 'crossing', t0: eta, t1: tedExact, x0: 0, x1: crossDistance },
    { kind: 'trail', t0: tedExact, t1: tedExact + postRoll, x0: crossDistance, x1: crossDistance + vCross * postRoll },
  ].filter((s) => s.t1 > s.t0);

  return {
    start: segments[0].t0,
    end: segments[segments.length - 1].t1,
    segments,
    hold,
    holdKind: nearSide ? 'stop' : 'queue',
    events: [
      { key: 'trigger', t: tTrigger, label: 'Request starts' },
      { key: 'received', t: 0, label: 'Controller receives request' },
      { key: 'tsd', t: eta, label: 'Arrives at stop bar (TSD)' },
      { key: 'ted', t: tedExact, label: 'Clears the intersection (TED)' },
    ],
    latency,
    eta,
    tedExact,
  };
}

/**
 * Where the bus is at time `t`, and what it is doing.
 *
 * Before the start or after the end, it stays at the first or last position.
 */
export function busAt(motion, t) {
  if (!motion) return null;
  const { segments } = motion;
  let seg = segments.find((s) => t >= s.t0 && t < s.t1);
  if (!seg) seg = t < motion.start ? segments[0] : segments[segments.length - 1];
  const f = Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)));
  const x = seg.x0 + (seg.x1 - seg.x0) * f;
  const inTransit = t >= -motion.latency && t < 0;
  const active = t >= 0 && t < motion.tedExact;

  let state;
  let label;
  if (seg.kind === 'hold' && t < seg.t1) {
    state = 'holding';
    const left = Math.max(0, Math.ceil(seg.t1 - t - 1e-9));
    label = `${motion.holdKind === 'stop' ? 'Dwell at stop' : 'Queued'} · ${left} s left`;
  } else if (t < -motion.latency) {
    state = 'approaching';
    label = 'Approaching';
  } else if (inTransit) {
    state = 'sending';
    label = 'Request in transit';
  } else if (t < motion.eta) {
    state = 'requested';
    label = 'Priority requested';
  } else if (t < motion.tedExact) {
    state = 'crossing';
    label = 'In the intersection';
  } else {
    state = 'cleared';
    label = 'Cleared';
  }
  return { x, state, label, inTransit, active, kind: seg.kind };
}

/* -------------------------------------------------- approaches and files */

/** An id not already used by any of `approaches`. */
function nextId(approaches) {
  let max = 0;
  for (const a of approaches) {
    const m = /^ap(\d+)$/.exec(String(a?.id || ''));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `ap${max + 1}`;
}

/** The first direction no approach is named yet, then "Approach N". */
function nextName(approaches) {
  const used = new Set(approaches.map((a) => a?.name));
  return DIRECTIONS.find((name) => !used.has(name)) || `Approach ${approaches.length + 1}`;
}

/**
 * A new approach for an intersection that has `approaches` already, copied
 * from `from` when given -- the next approach usually shares the speed and
 * the equipment -- with a fresh id and the next free name.
 */
export function newApproach(approaches = [], from = null) {
  const base = from ? JSON.parse(JSON.stringify(from)) : defaultApproach();
  return { ...base, id: nextId(approaches), name: nextName(approaches) };
}

const clampNum = (value, min, max, fallback) => {
  const n = num(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const NUMBER_FIELDS = {
  speed: [1, 80],
  emitterDistance: [0, 10000],
  detectorToStopBar: [0, 1000],
  checkInDistance: [0, 10000],
  checkInEta: [0, 600],
  zoneSetback: [0, 2000],
  zoneLength: [5, 500],
  lostTime: [0, 600],
  stopDistance: [0, 2000],
  intersectionLength: [0, 1000],
  busLength: [10, 120],
};

const HELPER_FIELDS = {
  braking: [0.5, 20],
  accel: [0.5, 20],
  dwell: [0, 600],
  queue: [0, 600],
};

/**
 * One approach from untrusted input, every field present and in range.
 *
 * Anything missing or unreadable takes its default, so a file saved by an
 * older version, or edited by hand, still opens.
 */
export function normalizeApproach(raw, others = []) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = defaultApproach();

  const ids = new Set(others.map((a) => a.id));
  const id = typeof src.id === 'string' ? src.id.trim().slice(0, 40) : '';
  out.id = id && !ids.has(id) ? id : nextId(others);
  const name = typeof src.name === 'string' ? src.name.trim().slice(0, 40) : '';
  out.name = name || nextName(others);

  out.phase = PHASES.includes(Number(src.phase)) ? Number(src.phase) : out.phase;
  out.technology = TECHNOLOGIES[src.technology] ? src.technology : 'emitter';
  out.detectorPosition = src.detectorPosition === 'before' ? 'before' : 'past';
  out.cloudTrigger = src.cloudTrigger === 'eta' ? 'eta' : 'distance';
  for (const [key, [min, max]] of Object.entries(NUMBER_FIELDS)) {
    out[key] = clampNum(src[key], min, max, out[key]);
  }
  for (const key of Object.keys(TECHNOLOGIES)) {
    out.latency[key] = clampNum(src.latency?.[key], 0, 60, out.latency[key]);
  }
  out.nearSideStop = src.nearSideStop === true;
  out.includeBusLength = src.includeBusLength === true;
  out.crossingSpeed = clampNum(src.crossingSpeed, 1, 80, null);

  const helper = src.helper && typeof src.helper === 'object' ? src.helper : {};
  out.helper.stops = helper.stops !== false;
  for (const [key, [min, max]] of Object.entries(HELPER_FIELDS)) {
    out.helper[key] = clampNum(helper[key], min, max, out.helper[key]);
  }
  return out;
}

/** A whole configuration -- an intersection and its approaches -- from untrusted input. */
export function normalizeConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const list = Array.isArray(src.approaches) ? src.approaches.slice(0, MAX_APPROACHES) : [];
  const approaches = [];
  for (const item of list) approaches.push(normalizeApproach(item, approaches));
  if (!approaches.length) approaches.push(normalizeApproach({}, []));
  const intersection = typeof src.intersection === 'string' ? src.intersection.trim().slice(0, 120) : '';
  const activeId = approaches.some((a) => a.id === src.activeId) ? src.activeId : approaches[0].id;
  return { intersection, approaches, activeId };
}

/** What Save file writes. */
export const FILE_TAG = 'tsp-timing';
export const FILE_VERSION = 1;

export function toSaveFile(config) {
  const { intersection, approaches, activeId } = normalizeConfig(config);
  return { tool: FILE_TAG, version: FILE_VERSION, intersection, activeId, approaches };
}

/**
 * A configuration from the text of a saved file.
 *
 * Throws, with a message fit to show, on anything that is not one of this
 * tool's files -- opening a traffic control plan here should say so rather
 * than quietly produce one default approach.
 */
export function fromSaveFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not JSON.');
  }
  if (!data || data.tool !== FILE_TAG) {
    throw new Error('That is not a TSP timing file.');
  }
  return normalizeConfig(data);
}
