/**
 * Preemption events on a time-space diagram.
 *
 * A GTSS export carries each signal's coordinates, which is the one piece
 * that was missing to place events in space as well as time. Once they are
 * placed, a vehicle running a corridor stops being invisible: it calls
 * preemption at one signal, then the next, then the next, and on a plot of
 * distance against time those calls line up as a diagonal. A stationary
 * pattern -- one signal called over and over -- is a horizontal row, and two
 * unrelated calls at the same moment are a vertical pair.
 *
 * Framework free, so it runs under `node --test`.
 */

/** Metres per degree of latitude; close enough over a corridor. */
const METRES_PER_DEGREE = 111320;
export const FEET_PER_METRE = 3.280839895;
export const FEET_PER_MILE = 5280;

/** A chain slower than this is not a vehicle; faster than this is not traffic. */
export const MIN_PROGRESSION_MPH = 4;
export const MAX_PROGRESSION_MPH = 80;
/** However far apart the signals are, calls this far apart are separate trips. */
export const MAX_PROGRESSION_GAP_MS = 10 * 60 * 1000;
/** Two signals is a coincidence often enough to be worth excluding by default. */
export const MIN_PROGRESSION_SIGNALS = 3;

const MPH_PER_FPS = 3600 / FEET_PER_MILE;

/**
 * Signals placed along the corridor they form, in feet from one end.
 *
 * The corridor is found rather than assumed: the principal axis of the
 * coordinates is the line the signals lie closest to, which handles an
 * arterial at any angle without asking anyone to name a direction. Signals
 * off that line are projected onto it, so a grid of signals still plots --
 * it just plots less meaningfully, which is the honest outcome.
 */
export function projectSignals(signals) {
  const placed = (signals || []).filter(
    (signal) => Number.isFinite(signal.latitude) && Number.isFinite(signal.longitude),
  );
  if (placed.length < 2) return null;

  const meanLat = placed.reduce((sum, s) => sum + s.latitude, 0) / placed.length;
  const meanLon = placed.reduce((sum, s) => sum + s.longitude, 0) / placed.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);

  // Equirectangular around the mean: over a corridor the error is far below
  // the precision anyone reads off this chart.
  const local = placed.map((signal) => ({
    signal,
    east: (signal.longitude - meanLon) * cosLat * METRES_PER_DEGREE,
    north: (signal.latitude - meanLat) * METRES_PER_DEGREE,
  }));

  let sEE = 0;
  let sEN = 0;
  let sNN = 0;
  for (const p of local) {
    sEE += p.east * p.east;
    sEN += p.east * p.north;
    sNN += p.north * p.north;
  }
  // Every signal at one point: there is no corridor to draw.
  if (sEE + sNN === 0) return null;

  // The principal axis of a 2x2 covariance, in closed form.
  let angle = 0.5 * Math.atan2(2 * sEN, sEE - sNN);
  let axisEast = Math.cos(angle);
  let axisNorth = Math.sin(angle);
  // Point the axis north, or east for an east-west corridor, so the diagram
  // does not flip end for end when a signal is added.
  if (axisNorth < 0 || (Math.abs(axisNorth) < 1e-9 && axisEast < 0)) {
    axisEast = -axisEast;
    axisNorth = -axisNorth;
    angle += Math.PI;
  }

  const projected = local.map((p) => ({
    ...p,
    along: p.east * axisEast + p.north * axisNorth,
  }));
  const min = Math.min(...projected.map((p) => p.along));

  const stations = projected
    .map((p) => ({
      id: p.signal.id,
      label: p.signal.crossStreets || `Signal ${p.signal.id}`,
      latitude: p.signal.latitude,
      longitude: p.signal.longitude,
      offsetFt: (p.along - min) * FEET_PER_METRE,
    }))
    .sort((a, b) => a.offsetFt - b.offsetFt);

  const spanFt = stations.length ? stations[stations.length - 1].offsetFt : 0;
  // Belt and braces rather than a reachable branch: coincident signals are
  // already caught by the zero-variance check above, and points that all
  // project to one offset would have to lie perpendicular to their own
  // principal axis. Everything downstream divides by this, so it is checked.
  if (!(spanFt > 0)) return null;

  return {
    stations,
    spanFt,
    // Compass bearing of increasing offset, for labelling the axis.
    bearing: (((Math.atan2(axisEast, axisNorth) * 180) / Math.PI) + 360) % 360,
  };
}

/** Offsets keyed by signal id, for a quick lookup while plotting. */
export function offsetsById(corridor) {
  const map = new Map();
  for (const station of corridor ? corridor.stations : []) map.set(station.id, station);
  return map;
}

/**
 * One point per event, at its signal's place on the corridor and the moment
 * it started. Events at a signal the export has no coordinates for are left
 * out: there is nowhere honest to draw them.
 */
export function buildTimeSpacePoints(events, corridor) {
  const stations = offsetsById(corridor);
  const points = [];
  for (const event of events || []) {
    const station = stations.get(event.signal);
    if (!station) continue;
    points.push({
      signal: event.signal,
      station: station.label,
      channel: event.channel,
      offsetFt: station.offsetFt,
      startMs: event.startMs,
      endMs: event.endMs,
      durationMs: event.durationMs,
      status: event.status,
    });
  }
  return points.sort((a, b) => a.startMs - b.startMs);
}

/** Feet per second between two points, unsigned. */
function speedMph(from, to) {
  const seconds = (to.startMs - from.startMs) / 1000;
  if (seconds <= 0) return Infinity;
  return (Math.abs(to.offsetFt - from.offsetFt) / seconds) * MPH_PER_FPS;
}

/**
 * Runs of preemption calls that look like one vehicle moving along the
 * corridor: successive signals, one consistent direction, and an implied
 * speed that a vehicle could actually hold.
 *
 * This is the finding the diagram exists to surface. A single signal called
 * at the same time every weekday says someone is triggering it; the same
 * call walking down three signals in sequence says they are driving through,
 * which is both stronger evidence and a route.
 *
 * Greedy and time-ordered: each event joins at most one run, taking the
 * soonest valid continuation. A neater assignment exists in principle, but
 * every run still has to clear the speed and direction gates to be reported
 * at all, so the cost of the simple choice is a split run, not a false one.
 */
export function findProgressions(points, options) {
  const opts = options || {};
  const minMph = opts.minMph ?? MIN_PROGRESSION_MPH;
  const maxMph = opts.maxMph ?? MAX_PROGRESSION_MPH;
  const maxGapMs = opts.maxGapMs ?? MAX_PROGRESSION_GAP_MS;
  const minSignals = opts.minSignals ?? MIN_PROGRESSION_SIGNALS;

  const ordered = [...(points || [])].sort((a, b) => a.startMs - b.startMs);
  const used = new Array(ordered.length).fill(false);
  const runs = [];

  for (let i = 0; i < ordered.length; i += 1) {
    if (used[i]) continue;
    const run = [ordered[i]];
    const seen = new Set([ordered[i].signal]);
    let direction = 0;
    used[i] = true;

    let from = i;
    for (;;) {
      let next = -1;
      for (let j = from + 1; j < ordered.length; j += 1) {
        const candidate = ordered[j];
        if (used[j]) continue;
        if (candidate.startMs - ordered[from].startMs > maxGapMs) break;
        // A repeat call at a signal already in the run sits at that signal's
        // own offset, so a step of zero excludes it here: the same vehicle
        // waiting is not travel. `seen` below still decides whether the run
        // has reached enough distinct places to be worth reporting.
        const step = candidate.offsetFt - ordered[from].offsetFt;
        if (step === 0) continue;
        if (direction !== 0 && Math.sign(step) !== direction) continue;
        const mph = speedMph(ordered[from], candidate);
        if (!(mph >= minMph && mph <= maxMph)) continue;
        next = j;
        break;
      }
      if (next === -1) break;
      direction = Math.sign(ordered[next].offsetFt - ordered[from].offsetFt);
      used[next] = true;
      seen.add(ordered[next].signal);
      run.push(ordered[next]);
      from = next;
    }

    if (seen.size >= minSignals) {
      const first = run[0];
      const last = run[run.length - 1];
      runs.push({
        points: run,
        signals: seen.size,
        direction: direction > 0 ? 'along' : 'against',
        startMs: first.startMs,
        endMs: last.startMs,
        distanceFt: Math.abs(last.offsetFt - first.offsetFt),
        speedMph: speedMph(first, last),
      });
    }
  }

  return runs;
}

/** "1,240 ft" below a quarter mile, "0.83 mi" above it. */
export function formatDistance(feet) {
  if (!Number.isFinite(feet)) return '';
  if (feet < FEET_PER_MILE / 4) return `${Math.round(feet).toLocaleString()} ft`;
  return `${(feet / FEET_PER_MILE).toFixed(2)} mi`;
}
