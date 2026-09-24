import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTable,
  bearingToCompass,
  bearingToTravel,
  buildPreemptDirectory,
  describeChannel,
} from '../src/utils/gtss.js';

/** A miniature export shaped exactly like the real one. */
const FILES = {
  'preempt.txt': [
    'preempt_channel,signalID,type,phase,maxTime',
    '3,1,EMERGENCY,1,120',
    '3,1,EMERGENCY,6,120',
    '4,1,EMERGENCY,2,120',
    '5,1,EMERGENCY,3,120',
  ].join('\n'),
  'phases.txt': [
    'phase,signal_id,movement_type,num_of_lanes,approach_id,PedX,crosswalk_length',
    '1,1,L,1,1-2,0,',
    '2,1,T,3,1-4,1,80',
    '3,1,L,2,1-1,0,',
    '6,1,T,2,1-2,1,119',
  ].join('\n'),
  'approaches.txt': [
    'approach_id,signal_id,street_name,compass_bearing,posted_speed,free_right',
    '1-1,1,Oakland Blvd,23,30,',
    '1-2,1,Ygnacio Valley Road,120,30,',
    '1-4,1,Ygnacio Valley Road,272,30,',
  ].join('\n'),
  'signals.txt': 'signal_id,agency_id,latitude,longitude\n1,WC-CA,37.9045,-122.0680',
  'agency.txt':
    'agency_id,agency_name,agency_url,agency_timezone,agency_email\nWC-CA,Walnut Creek,http://x,America/Los_Angeles,a@b.c',
};

test('parseTable keys cells by the header row', () => {
  const rows = parseTable('a,b\n1,2\n3,4');
  assert.deepEqual(rows, [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
});

test('parseTable copes with blank lines, CRLF and short rows', () => {
  const rows = parseTable('a,b,c\r\n1,2\r\n\r\n4,5,6\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].c, '', 'a missing trailing cell should be empty, not undefined');
  assert.deepEqual(rows[1], { a: '4', b: '5', c: '6' });
});

test('parseTable on nothing gives nothing', () => {
  for (const input of ['', '   ', null, undefined]) assert.deepEqual(parseTable(input), []);
});

test('bearings map onto the 16-point compass', () => {
  assert.equal(bearingToCompass(0), 'N');
  assert.equal(bearingToCompass(90), 'E');
  assert.equal(bearingToCompass(120), 'ESE');
  assert.equal(bearingToCompass(180), 'S');
  assert.equal(bearingToCompass(272), 'W');
  assert.equal(bearingToCompass(359), 'N', 'should wrap round to north');
  assert.equal(bearingToCompass(-10), 'N', 'negative bearings should still resolve');
  assert.equal(bearingToCompass('not a bearing'), null);
});

/**
 * compass_bearing is the bearing of the leg from the intersection, so traffic
 * on it travels the other way. Getting this backwards would label every
 * approach with the opposite direction, which is worse than labelling none.
 */
test('travel direction is the reciprocal of the approach bearing', () => {
  assert.equal(bearingToTravel(0), 'SB', 'a leg to the north carries southbound traffic');
  assert.equal(bearingToTravel(180), 'NB');
  assert.equal(bearingToTravel(90), 'WB');
  assert.equal(bearingToTravel(270), 'EB');
  assert.equal(bearingToTravel(120), 'WB');
  assert.equal(bearingToTravel('x'), null);
});

test('a channel resolves to the street and direction its phases serve', () => {
  const { signals } = buildPreemptDirectory(FILES);
  assert.equal(signals.length, 1);
  const [signal] = signals;
  assert.equal(signal.id, '1');
  assert.equal(signal.latitude, 37.9045);

  const three = signal.channels.find((c) => c.channel === 3);
  assert.deepEqual(three.phases, [1, 6], 'both phases on the channel');
  assert.deepEqual(three.streets, ['Ygnacio Valley Road']);
  assert.equal(three.compass, 'ESE');
  assert.equal(three.travel, 'WB');
  assert.equal(three.maxTime, 120);
  assert.equal(three.type, 'EMERGENCY');
  assert.equal(describeChannel(three), 'Ygnacio Valley Road from the ESE (WB)');
});

test('opposite legs of one street get opposite directions', () => {
  const { signals } = buildPreemptDirectory(FILES);
  const [signal] = signals;
  const three = signal.channels.find((c) => c.channel === 3);
  const four = signal.channels.find((c) => c.channel === 4);
  assert.equal(three.streets[0], four.streets[0], 'same street');
  assert.notEqual(three.travel, four.travel, 'opposite legs must not share a direction');
  assert.equal(four.travel, 'EB');
});

test('channels come back in channel order', () => {
  const { signals } = buildPreemptDirectory(FILES);
  assert.deepEqual(signals[0].channels.map((c) => c.channel), [3, 4, 5]);
});

/**
 * A gap in the export should be visible rather than silently dropping a
 * channel the data plainly uses.
 */
test('a channel whose phase is missing still appears, without a direction', () => {
  const { signals } = buildPreemptDirectory(FILES);
  const five = signals[0].channels.find((c) => c.channel === 5);
  assert.ok(five, 'channel 5 was dropped');
  assert.deepEqual(five.phases, [3]);
  assert.equal(five.streets[0], 'Oakland Blvd');

  // phase 3 maps to approach 1-1, which exists; now remove the approach.
  const without = buildPreemptDirectory({ ...FILES, 'approaches.txt': 'approach_id,signal_id,street_name,compass_bearing\n' });
  const orphan = without.signals[0].channels.find((c) => c.channel === 5);
  assert.ok(orphan, 'a channel with no resolvable approach was dropped');
  assert.deepEqual(orphan.streets, []);
  assert.equal(describeChannel(orphan), 'phases 3');
});

test('missing files are reported rather than failing silently', () => {
  const { warnings, signals } = buildPreemptDirectory({ 'preempt.txt': FILES['preempt.txt'] });
  assert.ok(warnings.some((w) => w.includes('phases.txt')));
  assert.ok(warnings.some((w) => w.includes('approaches.txt')));
  assert.equal(signals.length, 1, 'preempt.txt alone should still list the channels');
});

test('an empty export gives nothing and does not throw', () => {
  for (const input of [{}, null, undefined]) {
    const result = buildPreemptDirectory(input);
    assert.deepEqual(result.signals, []);
  }
});

test('the agency row is carried through, including its timezone', () => {
  const { agency } = buildPreemptDirectory(FILES);
  assert.equal(agency.agency_name, 'Walnut Creek');
  assert.equal(agency.agency_timezone, 'America/Los_Angeles');
});

test('a channel spanning two approaches does not claim one direction', () => {
  const files = {
    ...FILES,
    'preempt.txt': [
      'preempt_channel,signalID,type,phase,maxTime',
      '9,1,EMERGENCY,1,120',
      '9,1,EMERGENCY,2,120',
    ].join('\n'),
  };
  const nine = buildPreemptDirectory(files).signals[0].channels.find((c) => c.channel === 9);
  assert.equal(nine.sameApproach, false);
  assert.equal(nine.compass, null, 'two approaches cannot share one bearing');
  assert.equal(nine.travel, null);
  assert.equal(nine.streets.length, 1, 'both approaches are the same street here');
});

test('signals sort numerically, not as strings', () => {
  const rows = ['preempt_channel,signalID,type,phase,maxTime'];
  for (const id of [10, 2, 1]) rows.push(`3,${id},EMERGENCY,1,120`);
  const { signals } = buildPreemptDirectory({ 'preempt.txt': rows.join('\n') });
  assert.deepEqual(signals.map((s) => s.id), ['1', '2', '10']);
});
