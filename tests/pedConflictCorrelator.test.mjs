import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimestamp,
  parseHighResEvents,
  summarizeEvents,
  buildDetectorPulses,
  buildPedServices,
  resolvePedWindow,
  correlateRule,
  conflictsToCsv,
  buildPhaseStateIntervals,
  findRedLightRuns,
} from '../src/utils/pedConflictCorrelator.js';

const base = new Date(2024, 0, 6, 15, 0, 0, 0).getTime();
const at = (seconds) => base + seconds * 1000;

function evt(seconds, code, param) {
  return { tsMs: at(seconds), code, param };
}

test('parseTimestamp handles controller, ISO, and epoch formats', () => {
  assert.equal(parseTimestamp('1/6/2024 15:00:03.3'), new Date(2024, 0, 6, 15, 0, 3, 300).getTime());
  assert.equal(parseTimestamp('2024-01-06 15:00:03.250'), new Date(2024, 0, 6, 15, 0, 3, 250).getTime());
  assert.equal(parseTimestamp('1704574803000'), 1704574803000);
  assert.equal(parseTimestamp('1704574803'), 1704574803000);
  assert.ok(Number.isNaN(parseTimestamp('not a time')));
  assert.ok(Number.isNaN(parseTimestamp('42')), 'small integers are not epoch timestamps');
});

test('parseHighResEvents skips headers and accepts a leading signal ID column', () => {
  const { events, skipped } = parseHighResEvents(
    [
      'Timestamp,EventCode,EventParam',
      '1/6/2024 15:00:02.0, 82, 5',
      '',
      '# comment line',
      '1/6/2024 15:00:01.0,21,4',
      'garbage row',
    ].join('\n'),
  );

  assert.equal(events.length, 2);
  assert.equal(skipped, 2, 'header and garbage rows are reported');
  assert.deepEqual(
    events.map((e) => e.code),
    [21, 82],
    'events are sorted by timestamp',
  );

  const withSignalId = parseHighResEvents('1001, 1/6/2024 15:00:02.0, 82, 5');
  assert.equal(withSignalId.events.length, 1);
  assert.equal(withSignalId.events[0].param, 5);
});

test('buildDetectorPulses collapses on/off edges and closes an open pulse', () => {
  const events = [
    evt(1, 82, 5),
    evt(4, 81, 5),
    evt(10, 82, 5),
    evt(12, 82, 5),
    evt(20, 81, 6),
    evt(22, 81, 5),
    evt(30, 82, 5),
  ];
  const pulses = buildDetectorPulses(events, 5, 'vehicle', at(40));

  assert.equal(pulses.length, 3);
  assert.deepEqual(pulses[0], { start: at(1), end: at(4), openEnded: false, durationSec: 3 });
  assert.equal(pulses[1].start, at(10), 'a repeated ON does not restart the pulse');
  assert.equal(pulses[1].end, at(22), 'an OFF on another channel does not close this pulse');
  assert.equal(pulses[2].start, at(30));
  assert.equal(pulses[2].end, at(40), 'trailing open pulse is closed at the end of the data');
  assert.equal(pulses[2].openEnded, true);
});

test('buildPedServices derives walk, clearance, and call delay', () => {
  const services = buildPedServices(
    [evt(0, 45, 4), evt(5, 21, 4), evt(12, 22, 4), evt(25, 23, 4), evt(60, 21, 4), evt(67, 22, 4), evt(80, 23, 4)],
    4,
  );

  assert.equal(services.length, 2);
  assert.equal(services[0].walkSec, 7);
  assert.equal(services[0].clearanceSec, 13);
  assert.equal(services[0].callDelaySec, 5);
  assert.equal(services[1].callTs, null);
  assert.equal(services[1].index, 2);
});

test('resolvePedWindow returns the interval each mode watches', () => {
  const [service] = buildPedServices([evt(0, 45, 4), evt(5, 21, 4), evt(12, 22, 4), evt(25, 23, 4)], 4);

  assert.deepEqual(resolvePedWindow(service, 'walk'), { start: at(5), end: at(12) });
  assert.deepEqual(resolvePedWindow(service, 'clearance'), { start: at(12), end: at(25) });
  assert.deepEqual(resolvePedWindow(service, 'walk-clearance'), { start: at(5), end: at(25) });
  assert.deepEqual(resolvePedWindow(service, 'call-to-walk'), { start: at(0), end: at(5) });
});

const conflictRule = {
  id: 'r1',
  label: 'Det 5 × Ped 4',
  detectorChannel: 5,
  detectorType: 'vehicle',
  pedPhase: 4,
  pedWindow: 'walk-clearance',
  trigger: 'on',
  leadSec: 0,
  lagSec: 0,
  minOverlapSec: 0,
  movement: 'Permissive left turn',
};

// One ped service (walk 5s-12s, clearance 12s-25s) with a detector call inside
// the walk interval, plus a detector call well outside it.
const scenario = [
  evt(1, 82, 5),
  evt(3, 81, 5),
  evt(5, 21, 4),
  evt(8, 82, 5),
  evt(10, 81, 5),
  evt(12, 22, 4),
  evt(25, 23, 4),
  evt(200, 82, 5),
  evt(202, 81, 5),
];

test('correlateRule flags detector ON events inside the pedestrian window', () => {
  const result = correlateRule({ events: scenario, rule: conflictRule, binSec: 1, contextSec: 10 });

  assert.equal(result.totals.pedServices, 1);
  assert.equal(result.totals.conflictEvents, 1);
  assert.equal(result.totals.conflictServices, 1);
  assert.equal(result.totals.conflictRatePct, 100);
  assert.equal(result.conflicts[0].offsetSec, 3, 'offset is measured from the start of walk');
  assert.equal(result.conflicts[0].interval, 'Walk');
  assert.equal(result.conflicts[0].eventType, 'Detector ON');

  const [service] = result.services;
  assert.equal(service.windowStartSec, 0);
  assert.equal(service.windowEndSec, 20);
  assert.equal(service.pulses.length, 2, 'context window keeps the nearby non-conflicting pulse');
  assert.deepEqual(
    service.pulses.map((p) => p.conflict),
    [false, true],
  );
});

test('lead and lag padding pull nearby detector events into the window', () => {
  const padded = correlateRule({
    events: scenario,
    rule: { ...conflictRule, leadSec: 5, lagSec: 0 },
    binSec: 1,
    contextSec: 10,
  });

  assert.equal(padded.totals.conflictEvents, 2, 'the ON four seconds before walk now counts');
  assert.equal(padded.conflicts[0].interval, 'Lead buffer');
  assert.equal(padded.services[0].conflictStartSec, -5);
});

test('trigger modes select the detector edge that matters', () => {
  const offOnly = correlateRule({ events: scenario, rule: { ...conflictRule, trigger: 'off' }, contextSec: 10 });
  assert.equal(offOnly.totals.conflictEvents, 1);
  assert.equal(offOnly.conflicts[0].eventType, 'Detector OFF');
  assert.equal(offOnly.conflicts[0].offsetSec, 5);

  const either = correlateRule({ events: scenario, rule: { ...conflictRule, trigger: 'either' }, contextSec: 10 });
  assert.equal(either.totals.conflictEvents, 2);
  assert.equal(either.totals.overlapSec, 2, 'occupancy is counted once per pulse, not once per edge');
});

test('overlap trigger honors the minimum overlap threshold', () => {
  const overlap = correlateRule({
    events: scenario,
    rule: { ...conflictRule, trigger: 'overlap', minOverlapSec: 0 },
    contextSec: 10,
  });
  assert.equal(overlap.totals.conflictEvents, 1);
  assert.equal(overlap.totals.overlapSec, 2);
  assert.equal(overlap.conflicts[0].eventType, 'Occupied');

  const filtered = correlateRule({
    events: scenario,
    rule: { ...conflictRule, trigger: 'overlap', minOverlapSec: 5 },
    contextSec: 10,
  });
  assert.equal(filtered.totals.conflictEvents, 0, 'a 2 second overlap is below the 5 second threshold');
});

test('exposure index compares in-window rate against the whole data set', () => {
  const result = correlateRule({ events: scenario, rule: conflictRule, contextSec: 10 });

  assert.equal(result.totals.baselineEvents, 3);
  assert.equal(result.totals.evaluatedWindowSec, 20);
  assert.ok(result.totals.exposureIndex > 1, 'detector activity is concentrated in the ped window');
});

test('histogram bins trigger offsets and separates conflicting samples', () => {
  const result = correlateRule({ events: scenario, rule: conflictRule, binSec: 2, contextSec: 10 });
  const totals = result.histogram.reduce(
    (acc, bin) => ({ conflict: acc.conflict + bin.conflict, clear: acc.clear + bin.clear }),
    { conflict: 0, clear: 0 },
  );

  assert.equal(totals.conflict, 1);
  assert.equal(totals.clear, 1);
  assert.ok(result.histogram.every((bin) => Number((bin.binEnd - bin.binStart).toFixed(3)) === 2));
});

test('services without the requested interval are reported, not counted', () => {
  const noClearance = [evt(5, 21, 4), evt(25, 23, 4), evt(8, 82, 5), evt(10, 81, 5)].sort((a, b) => a.tsMs - b.tsMs);
  const result = correlateRule({ events: noClearance, rule: { ...conflictRule, pedWindow: 'clearance' }, contextSec: 10 });

  assert.equal(result.totals.pedServices, 0);
  assert.equal(result.totals.skippedServices, 1);
  assert.equal(result.totals.conflictRatePct, null);
});

test('summarizeEvents inventories channels and ped phases', () => {
  const summary = summarizeEvents(scenario);

  assert.deepEqual(summary.channels.vehicle, [5]);
  assert.deepEqual(summary.pedPhases, [4]);
  assert.equal(summary.spanSec, 201);
});

test('conflictsToCsv emits a header and one row per conflict', () => {
  const result = correlateRule({ events: scenario, rule: conflictRule, contextSec: 10 });
  const lines = conflictsToCsv([result], (ts) => String(ts)).split('\n');

  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('rule,movement,detector_channel,downstream_channel,ped_phase'));
  assert.ok(lines[1].includes('Detector ON'));
});

// --- Red-light run chain ----------------------------------------------------
// Phase 2 green at 0s, yellow 40s-44s, red 44s until the next green at 100s.
// Ped phase 4 walks 50s-57s with clearance to 75s.
const rlrEvents = [
  evt(0, 1, 2),
  evt(40, 8, 2),
  evt(44, 10, 2),
  evt(100, 1, 2),
  evt(50, 21, 4),
  evt(57, 22, 4),
  evt(75, 23, 4),
];

function withStopBarRun(onSec, offSec, downstreamOnSec, downstreamOffSec) {
  return [
    ...rlrEvents,
    evt(onSec, 82, 2),
    evt(offSec, 81, 2),
    evt(downstreamOnSec, 82, 21),
    evt(downstreamOffSec, 81, 21),
  ].sort((a, b) => a.tsMs - b.tsMs);
}

const runOpts = {
  stopBarChannel: 2,
  downstreamChannel: 21,
  vehiclePhase: 2,
  detectorType: 'vehicle',
  signalStates: 'yellow-red',
  maxTravelSec: 6,
};

const rlrRule = {
  id: 'rlr',
  label: 'RLR ch2 → ch21 × Ped 4',
  detectorChannel: 2,
  downstreamChannel: 21,
  vehiclePhase: 2,
  detectorType: 'vehicle',
  pedPhase: 4,
  pedWindow: 'walk-clearance',
  trigger: 'red-light-run',
  signalStates: 'yellow-red',
  maxTravelSec: 6,
  leadSec: 0,
  lagSec: 0,
  movement: 'Through',
};

test('buildPhaseStateIntervals derives green, yellow, and full red', () => {
  const intervals = buildPhaseStateIntervals(rlrEvents, 2, at(120));

  assert.deepEqual(
    intervals.map((i) => [i.state, (i.start - base) / 1000, (i.end - base) / 1000]),
    [
      ['green', 0, 40],
      ['yellow', 40, 44],
      ['red', 44, 100],
      ['green', 100, 120],
    ],
  );
});

test('findRedLightRuns requires a stop bar drop-out in yellow or red', () => {
  const inRed = findRedLightRuns({ events: withStopBarRun(50, 52, 53.5, 54.5), ...runOpts });
  assert.equal(inRed.length, 1);
  assert.equal(inRed[0].state, 'red');
  assert.equal(inRed[0].secIntoState, 8);
  assert.equal(inRed[0].travelSec, 1.5);
  assert.equal(inRed[0].downstreamOccupancySec, 1);

  const inYellow = findRedLightRuns({ events: withStopBarRun(38, 42, 44, 45), ...runOpts });
  assert.equal(inYellow.length, 1);
  assert.equal(inYellow[0].state, 'yellow');

  const onGreen = findRedLightRuns({ events: withStopBarRun(10, 12, 13, 14), ...runOpts });
  assert.equal(onGreen.length, 0, 'a departure on green is not a red-light run');
});

test('findRedLightRuns needs a completed downstream pulse in the travel window', () => {
  const tooLate = findRedLightRuns({ events: withStopBarRun(50, 52, 60, 61), ...runOpts });
  assert.equal(tooLate.length, 0, 'downstream arrival beyond the travel time is not a match');

  const noDownstream = findRedLightRuns({
    events: [...rlrEvents, evt(50, 82, 2), evt(52, 81, 2)].sort((a, b) => a.tsMs - b.tsMs),
    ...runOpts,
  });
  assert.equal(noDownstream.length, 0, 'a queue shuffle with no downstream call is filtered out');

  const noOffEdge = findRedLightRuns({
    events: [...rlrEvents, evt(50, 82, 2), evt(52, 81, 2), evt(53, 82, 21)].sort((a, b) => a.tsMs - b.tsMs),
    ...runOpts,
  });
  assert.equal(noOffEdge.length, 0, 'the downstream detector must turn on and back off');
});

test('findRedLightRuns honors the signal state filter', () => {
  const events = withStopBarRun(50, 52, 53.5, 54.5);
  assert.equal(findRedLightRuns({ events, ...runOpts, signalStates: 'red' }).length, 1);
  assert.equal(findRedLightRuns({ events, ...runOpts, signalStates: 'yellow' }).length, 0);
});

test('a downstream pulse is only matched to one stop bar departure', () => {
  const events = [
    ...rlrEvents,
    evt(50, 82, 2),
    evt(51, 81, 2),
    evt(51.5, 82, 2),
    evt(52, 81, 2),
    evt(53, 82, 21),
    evt(54, 81, 21),
  ].sort((a, b) => a.tsMs - b.tsMs);

  assert.equal(findRedLightRuns({ events, ...runOpts }).length, 1);
});

test('correlateRule flags a red-light run that traverses a pedestrian crossing', () => {
  const result = correlateRule({ events: withStopBarRun(50, 52, 53.5, 54.5), rule: rlrRule, contextSec: 10 });

  assert.equal(result.isRedLightRun, true);
  assert.equal(result.totals.redLightRuns, 1);
  assert.equal(result.totals.conflictEvents, 1);
  assert.equal(result.totals.conflictRunsRed, 1);
  assert.equal(result.totals.conflictRunsYellow, 0);
  assert.equal(result.totals.avgTravelSec, 1.5);

  const [conflict] = result.conflicts;
  assert.equal(conflict.eventType, 'Red-light run (red)');
  assert.equal(conflict.offsetSec, 2, 'stop bar drop-out is 2s after WALK begins');
  assert.equal(conflict.interval, 'Walk');
  assert.equal(conflict.travelSec, 1.5);
  assert.equal(conflict.overlapSec, 2.5, 'the whole traversal falls inside the ped window');
  assert.equal(result.services[0].runs.length, 1);
  assert.equal(result.services[0].pulses[0].conflict, false, 'stop bar pulses are context only');
});

test('a red-light run outside the pedestrian window is found but not flagged', () => {
  // Stop bar drops out at 45s, before WALK begins at 50s.
  const result = correlateRule({ events: withStopBarRun(43, 45, 46, 47), rule: rlrRule, contextSec: 10 });

  assert.equal(result.totals.redLightRuns, 1);
  assert.equal(result.totals.conflictEvents, 0);
  assert.equal(result.services[0].runs.length, 1, 'it still appears on the timeline as context');
  assert.equal(result.services[0].runs[0].conflict, false);

  const padded = correlateRule({ events: withStopBarRun(43, 45, 46, 47), rule: { ...rlrRule, leadSec: 5 }, contextSec: 10 });
  assert.equal(padded.totals.conflictEvents, 1, 'a lead buffer pulls it into the window');
});

test('summarizeEvents lists vehicle phases for red-light-run rules', () => {
  assert.deepEqual(summarizeEvents(rlrEvents).vehiclePhases, [2]);
});

test('conflictsToCsv carries the red-light-run chain details', () => {
  const result = correlateRule({ events: withStopBarRun(50, 52, 53.5, 54.5), rule: rlrRule, contextSec: 10 });
  const [header, row] = conflictsToCsv([result], (ts) => String(ts)).split('\n');
  const columns = header.split(',');
  const values = row.split(',');
  const valueFor = (name) => values[columns.indexOf(name)];

  assert.equal(valueFor('downstream_channel'), '21');
  assert.equal(valueFor('signal_state'), 'red');
  assert.equal(valueFor('sec_into_state'), '8');
  assert.equal(valueFor('travel_to_downstream_s'), '1.5');
  assert.equal(valueFor('downstream_occupancy_s'), '1');
});
