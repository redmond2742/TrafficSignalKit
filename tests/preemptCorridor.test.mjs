import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEET_PER_MILE,
  buildTimeSpacePoints,
  haversineFeet,
  pairAdjacentEvents,
  findProgressions,
  formatDistance,
  projectSignals,
} from '../src/utils/preemptCorridor.js';

/** Signals strung east along one latitude, roughly 1,000 ft apart. */
const EAST_WEST = [
  { id: '1', latitude: 37.0, longitude: -122.0, crossStreets: 'Main & First' },
  { id: '2', latitude: 37.0, longitude: -121.9966, crossStreets: 'Main & Second' },
  { id: '3', latitude: 37.0, longitude: -121.9932, crossStreets: 'Main & Third' },
];

const at = (signal, channel, ms) => ({
  signal, channel, startMs: ms, endMs: ms + 60000, durationMs: 60000, status: 'complete',
});

test('projectSignals lays an east-west corridor out in order', () => {
  const corridor = projectSignals(EAST_WEST);
  assert.equal(corridor.stations.length, 3);
  assert.deepEqual(corridor.stations.map((s) => s.id), ['1', '2', '3']);
  assert.equal(corridor.stations[0].offsetFt, 0);
  // 0.0034 degrees of longitude at 37N is about 1,000 ft.
  assert.ok(Math.abs(corridor.stations[1].offsetFt - 1000) < 40, `${corridor.stations[1].offsetFt}`);
  assert.ok(Math.abs(corridor.spanFt - 2000) < 80, `${corridor.spanFt}`);
});

test('projectSignals handles a north-south corridor the same way', () => {
  const corridor = projectSignals([
    { id: 'a', latitude: 37.0, longitude: -122.0 },
    { id: 'b', latitude: 37.0027, longitude: -122.0 },
    { id: 'c', latitude: 37.0054, longitude: -122.0 },
  ]);
  assert.deepEqual(corridor.stations.map((s) => s.id), ['a', 'b', 'c']);
  assert.ok(Math.abs(corridor.spanFt - 1971) < 60, `${corridor.spanFt}`);
});

test('projectSignals always measures northward along a diagonal corridor', () => {
  // The principal axis of a covariance has no inherent sign: solved raw, this
  // NW-SE corridor comes back with the north end at zero and offsets growing
  // southward, so the diagram reads upside down against every map of it.
  const corridor = projectSignals([
    { id: 'north', latitude: 37.004, longitude: -122.004 },
    { id: 'mid', latitude: 37.002, longitude: -122.002 },
    { id: 'south', latitude: 37.0, longitude: -122.0 },
  ]);
  assert.deepEqual(corridor.stations.map((s) => s.id), ['south', 'mid', 'north']);
  assert.equal(corridor.stations[0].id, 'south', 'zero sits at the south end');
});

test('projectSignals reads east for an east-west corridor', () => {
  // The other branch of the same normalisation: with no north component to
  // go on, the axis has to be pinned to east or the same flip can happen.
  const corridor = projectSignals(EAST_WEST);
  assert.equal(corridor.stations[0].id, '1', 'zero sits at the west end');
  assert.deepEqual(corridor.stations.map((s) => s.id), ['1', '2', '3']);
});

test('projectSignals does not depend on the order it is given', () => {
  const forward = projectSignals(EAST_WEST);
  const reversed = projectSignals([...EAST_WEST].reverse());
  assert.deepEqual(
    forward.stations.map((s) => s.id),
    reversed.stations.map((s) => s.id),
  );
  assert.ok(Math.abs(forward.stations[1].offsetFt - reversed.stations[1].offsetFt) < 1);
});

test('projectSignals refuses what is not a corridor', () => {
  assert.equal(projectSignals([]), null);
  assert.equal(projectSignals([EAST_WEST[0]]), null, 'one signal is a point');
  assert.equal(
    projectSignals([EAST_WEST[0], { ...EAST_WEST[0], id: 'dup' }]),
    null,
    'two signals at one place have no span',
  );
  assert.equal(
    projectSignals([{ id: 'x' }, { id: 'y', latitude: 37, longitude: -122 }]),
    null,
    'coordinates missing from all but one',
  );
});

test('buildTimeSpacePoints drops events with nowhere to go', () => {
  const corridor = projectSignals(EAST_WEST);
  const points = buildTimeSpacePoints(
    [at('1', 3, 1000), at('99', 3, 2000), at('2', 3, 3000)],
    corridor,
  );
  // Signal 99 is not in the export, so there is no honest place to draw it.
  assert.deepEqual(points.map((p) => p.signal), ['1', '2']);
  assert.equal(points[0].offsetFt, 0);
  assert.equal(points[0].station, 'Main & First');
});

test('buildTimeSpacePoints returns points in time order', () => {
  const corridor = projectSignals(EAST_WEST);
  const points = buildTimeSpacePoints([at('3', 1, 9000), at('1', 1, 1000), at('2', 1, 5000)], corridor);
  assert.deepEqual(points.map((p) => p.startMs), [1000, 5000, 9000]);
});

test('findProgressions catches a vehicle running the corridor', () => {
  const corridor = projectSignals(EAST_WEST);
  // 1,000 ft every 30s is about 23 mph: a vehicle, on a street.
  const points = buildTimeSpacePoints(
    [at('1', 3, 0), at('2', 3, 30000), at('3', 3, 60000)],
    corridor,
  );
  const runs = findProgressions(points);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].signals, 3);
  assert.deepEqual(runs[0].points.map((p) => p.signal), ['1', '2', '3']);
  assert.ok(runs[0].speedMph > 18 && runs[0].speedMph < 28, `${runs[0].speedMph} mph`);
});

test('findProgressions ignores one signal called over and over', () => {
  // The stationary pattern draws as a horizontal row: repeated calls sit at
  // one offset, and a step of zero is not travel.
  const corridor = projectSignals(EAST_WEST);
  // The stationary pattern: a horizontal row, not a vehicle going anywhere.
  const points = buildTimeSpacePoints(
    [at('1', 3, 0), at('1', 3, 30000), at('1', 3, 60000), at('1', 3, 90000)],
    corridor,
  );
  assert.deepEqual(findProgressions(points), []);
});

test('findProgressions rejects a chain no vehicle could drive', () => {
  const corridor = projectSignals(EAST_WEST);
  // Three signals inside two seconds: 2,000 ft in 2s is about 680 mph.
  const tooFast = buildTimeSpacePoints(
    [at('1', 3, 0), at('2', 3, 1000), at('3', 3, 2000)],
    corridor,
  );
  assert.deepEqual(findProgressions(tooFast), [], 'faster than traffic');

  // And the other end: 2,000 ft over an hour is a pedestrian at best, and
  // past the gap that separates one trip from the next anyway.
  const tooSlow = buildTimeSpacePoints(
    [at('1', 3, 0), at('2', 3, 1800000), at('3', 3, 3600000)],
    corridor,
  );
  assert.deepEqual(findProgressions(tooSlow), [], 'slower than traffic');
});

test('findProgressions holds one direction', () => {
  const corridor = projectSignals(EAST_WEST);
  // Signal 2, then 3, then back past both to 1. Three distinct signals, every
  // hop at a believable speed -- so only the direction gate stands between
  // this and being reported as one vehicle travelling through.
  const points = buildTimeSpacePoints(
    [at('2', 3, 0), at('3', 3, 30000), at('1', 3, 90000)],
    corridor,
  );
  assert.deepEqual(findProgressions(points), [], 'a turn-around is not a progression');
});

test('findProgressions will not put one event in two runs', () => {
  const corridor = projectSignals(EAST_WEST);
  const points = buildTimeSpacePoints(
    [at('1', 3, 0), at('2', 3, 30000), at('3', 3, 60000), at('1', 1, 61000), at('2', 1, 91000)],
    corridor,
  );
  const runs = findProgressions(points, { minSignals: 2 });
  const all = runs.flatMap((run) => run.points);
  assert.equal(new Set(all).size, all.length, 'an event appears in at most one run');
});

test('a run that covers no distance is not a progression', () => {
  // Three signals projecting to one point on the corridor -- parallel streets
  // crossing the arterial at the same place, or a pair either side of it. At
  // the default speed floor a zero step is already 0 mph and rejected, but
  // minMph is the caller's to set. With it dropped, nothing but the explicit
  // step check stops three calls that went nowhere from being reported as a
  // vehicle travelling through, distance and all.
  const point = (signal, offsetFt, startMs) => ({ signal, channel: 3, offsetFt, startMs });
  const runs = findProgressions(
    [point('a', 2000, 0), point('b', 2000, 30000), point('c', 2000, 60000)],
    { minMph: 0, minSignals: 3 },
  );
  assert.deepEqual(runs, [], 'three calls at one place are not a trip');
});

test('findProgressions respects a raised signal floor', () => {
  const corridor = projectSignals(EAST_WEST);
  const points = buildTimeSpacePoints([at('1', 3, 0), at('2', 3, 30000)], corridor);
  assert.equal(findProgressions(points, { minSignals: 2 }).length, 1);
  // Two signals is a coincidence often enough that three is the default.
  assert.deepEqual(findProgressions(points), []);
});

test('formatDistance switches units where feet stop reading', () => {
  assert.equal(formatDistance(900), '900 ft');
  assert.equal(formatDistance(1000), '1,000 ft');
  assert.equal(formatDistance(FEET_PER_MILE), '1.00 mi');
  assert.equal(formatDistance(FEET_PER_MILE / 2), '0.50 mi');
  assert.equal(formatDistance(NaN), '');
});


/* ------------------------------------------------------------- leg pairing */

const EB = (signal, ms, channel = 1) => ({ signal, channel, startMs: ms, endMs: ms + 60000, durationMs: 60000, status: 'complete' });
/** Every channel 1 is eastbound; channel 2 is westbound. */
const DIRECTION = { direction: (e) => (e.channel === 1 ? 'EB' : 'WB') };

const pointsFor = (events, corridor) => buildTimeSpacePoints(events, corridor, DIRECTION);

test('haversineFeet measures a known separation', () => {
  // 0.0034 degrees of longitude at 37N is about 1,000 ft.
  const d = haversineFeet(
    { latitude: 37.0, longitude: -122.0 },
    { latitude: 37.0, longitude: -121.9966 },
  );
  assert.ok(Math.abs(d - 1000) < 40, `${d} ft`);
  // A degree of latitude is about 364,000 ft, and does not depend on longitude.
  const north = haversineFeet({ latitude: 37, longitude: -122 }, { latitude: 38, longitude: -122 });
  assert.ok(Math.abs(north - 364000) < 2000, `${north} ft`);
  assert.equal(haversineFeet({ latitude: 37, longitude: -122 }, { latitude: 37, longitude: -122 }), 0);
});

test('haversineFeet refuses a point with no coordinates', () => {
  assert.equal(haversineFeet(null, { latitude: 1, longitude: 1 }), null);
  assert.equal(haversineFeet({ latitude: 1 }, { latitude: 1, longitude: 1 }), null);
  assert.equal(haversineFeet({ latitude: 'x', longitude: 1 }, { latitude: 1, longitude: 1 }), null);
});

test('pairAdjacentEvents reports each leg with its own speed', () => {
  const corridor = projectSignals(EAST_WEST);
  // 1,000 ft in 30s, then 1,000 ft in 60s: about 23 mph then about 11 mph.
  const rows = pairAdjacentEvents(pointsFor([EB('1', 0), EB('2', 30000), EB('3', 90000)], corridor), corridor);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => `${r.fromSignal}->${r.toSignal}`), ['1->2', '2->3']);
  assert.ok(Math.abs(rows[0].speedMph - 22.7) < 1.5, `${rows[0].speedMph}`);
  assert.ok(Math.abs(rows[1].speedMph - 11.4) < 1.5, `${rows[1].speedMph}`);
  // The average over the trip hides the slow leg, which is the point of
  // reporting legs rather than only whole runs.
  assert.equal(rows[0].gapMs, 30000);
  assert.equal(rows[1].gapMs, 60000);
  assert.ok(Math.abs(rows[0].distanceFt - 1000) < 40);
});

test('pairAdjacentEvents measures between the signals, not along the fitted line', () => {
  // Signal 2 sits well off the line through 1 and 3, so its projected offset
  // and its real distance from signal 1 are different numbers.
  const corridor = projectSignals([
    { id: '1', latitude: 37.0, longitude: -122.0 },
    { id: '2', latitude: 37.0025, longitude: -121.9966 },
    { id: '3', latitude: 37.0, longitude: -121.9932 },
  ]);
  const [row] = pairAdjacentEvents(pointsFor([EB('1', 0), EB('2', 30000)], corridor), corridor);
  const projected = Math.abs(
    corridor.stations.find((s) => s.id === '2').offsetFt -
      corridor.stations.find((s) => s.id === '1').offsetFt,
  );
  const straight = haversineFeet(
    { latitude: 37.0, longitude: -122.0 },
    { latitude: 37.0025, longitude: -121.9966 },
  );
  assert.ok(Math.abs(row.distanceFt - straight) < 1, 'uses the real separation');
  assert.ok(Math.abs(row.distanceFt - projected) > 50, 'and it differs from the projection');
});

test('pairAdjacentEvents will not pair across a skipped signal', () => {
  const corridor = projectSignals(EAST_WEST);
  // Signal 2 never fires, so 1 and 3 are two blocks apart. Averaging across
  // the gap would report a speed for a leg nobody observed.
  const rows = pairAdjacentEvents(pointsFor([EB('1', 0), EB('3', 60000)], corridor), corridor);
  assert.deepEqual(rows, []);
});

test('pairAdjacentEvents keeps the directions apart', () => {
  const corridor = projectSignals(EAST_WEST);
  // An eastbound call then a westbound one at the next signal is two vehicles.
  const rows = pairAdjacentEvents(
    pointsFor([EB('1', 0, 1), EB('2', 30000, 2)], corridor),
    corridor,
  );
  assert.deepEqual(rows, []);
});

test('pairAdjacentEvents needs a direction to match on', () => {
  const corridor = projectSignals(EAST_WEST);
  // No export lookup, so no direction: there is nothing to pair on, and
  // guessing from the channel number would cross intersections that do not
  // number their channels the same way.
  const bare = buildTimeSpacePoints([EB('1', 0), EB('2', 30000)], corridor);
  assert.deepEqual(pairAdjacentEvents(bare, corridor), []);
});

test('pairAdjacentEvents rejects a leg no vehicle could drive', () => {
  const corridor = projectSignals(EAST_WEST);
  assert.deepEqual(
    pairAdjacentEvents(pointsFor([EB('1', 0), EB('2', 500)], corridor), corridor),
    [],
    '1,000 ft in half a second',
  );
  assert.deepEqual(
    pairAdjacentEvents(pointsFor([EB('1', 0), EB('2', 3600000)], corridor), corridor),
    [],
    '1,000 ft in an hour',
  );
});

test('pairAdjacentEvents pairs a call with the next leg, not with every later call', () => {
  const corridor = projectSignals(EAST_WEST);
  // Signal 2 fires twice after signal 1 fires once. The first is where that
  // vehicle got to; the second is somebody else. Pairing signal 1 with both
  // invents a leg, and reports it at a speed nothing travelled.
  const rows = pairAdjacentEvents(
    pointsFor([EB('1', 0), EB('2', 30000), EB('2', 60000)], corridor),
    corridor,
  );
  assert.equal(rows.length, 1, `paired ${rows.length} legs off one call`);
  assert.equal(rows[0].toMs, 30000, 'the first arrival, not the later one');
});

test('pairAdjacentEvents returns nothing without a corridor', () => {
  assert.deepEqual(pairAdjacentEvents([], null), []);
});
