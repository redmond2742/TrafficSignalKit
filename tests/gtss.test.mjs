import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crossStreetName,
  parseTable,
  bearingToCompass,
  bearingToOrigin,
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
    '1-1,1,1st Street,23,30,',
    '1-2,1,Main Street,120,30,',
    '1-4,1,Main Street,272,30,',
  ].join('\n'),
  'signals.txt': 'signal_id,agency_id,latitude,longitude\n1,EX-CA,37.9045,-122.0680',
  'agency.txt':
    'agency_id,agency_name,agency_url,agency_timezone,agency_email\nEX-CA,Example City,http://x,America/Los_Angeles,a@b.c',
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
 * compass_bearing is the heading of the approach *to* the intersection -- the
 * way vehicles are pointed as they arrive -- so the travel direction is the
 * bearing itself, not its reciprocal.
 *
 * This ran the other way round until a WSW approach carrying phases 2 and 5
 * came back labelled eastbound. Getting it backwards puts the wrong direction
 * on every approach in the export, which is worse than labelling none.
 *
 * Note what these assertions do NOT rest on: that opposing legs of a street
 * disagree. They disagree under either reading of the field, so that property
 * cannot tell the two apart and is no evidence for either. These are pinned
 * to the specification instead, which says the bearing is "of the approach to
 * the intersection", and to the builder that writes the files, which stores
 * the bearing measured from where traffic comes from back toward the signal.
 */
test('travel direction follows the approach bearing, not its reciprocal', () => {
  assert.equal(bearingToTravel(0), 'NB', 'pointed north is northbound');
  assert.equal(bearingToTravel(180), 'SB');
  assert.equal(bearingToTravel(90), 'EB');
  assert.equal(bearingToTravel(270), 'WB');
  // The case that was reported wrong: a WSW approach is westbound.
  assert.equal(bearingToTravel(240), 'WB');
  assert.equal(bearingToTravel(120), 'EB');
  assert.equal(bearingToTravel('x'), null);
});

test('the origin compass is the reciprocal of the travel bearing', () => {
  // A vehicle heading WSW into the signal entered from the ENE.
  assert.equal(bearingToOrigin(240), 'ENE');
  assert.equal(bearingToOrigin(0), 'S');
  assert.equal(bearingToOrigin(90), 'W');
  assert.equal(bearingToOrigin(270), 'E');
  assert.equal(bearingToOrigin('x'), null);
});

test('a channel is never labelled with the direction opposite its bearing', () => {
  // The whole failure mode in one assertion: whatever the compass point a
  // bearing resolves to, the travel direction must agree with it rather than
  // oppose it. A reciprocal anywhere in the chain trips this for every value.
  const opposite = { NB: 'SB', SB: 'NB', EB: 'WB', WB: 'EB', NEB: 'SWB', SWB: 'NEB', SEB: 'NWB', NWB: 'SEB' };
  for (let bearing = 0; bearing < 360; bearing += 5) {
    const travel = bearingToTravel(bearing);
    const straightOn = bearingToTravel(bearing + 180);
    assert.equal(straightOn, opposite[travel], `bearing ${bearing} reversed to ${straightOn}`);
  }
});

test('a channel resolves to the street and direction its phases serve', () => {
  const { signals } = buildPreemptDirectory(FILES);
  assert.equal(signals.length, 1);
  const [signal] = signals;
  assert.equal(signal.id, '1');
  assert.equal(signal.latitude, 37.9045);

  const three = signal.channels.find((c) => c.channel === 3);
  assert.deepEqual(three.phases, [1, 6], 'both phases on the channel');
  assert.deepEqual(three.streets, ['Main Street']);
  // approach 1-2 has compass_bearing 120: pointed ESE, so eastbound, and it
  // was entered from the WNW.
  assert.equal(three.compass, 'WNW');
  assert.equal(three.travel, 'EB');
  assert.equal(three.maxTime, 120);
  assert.equal(three.type, 'EMERGENCY');
  assert.equal(describeChannel(three), 'Main Street from the WNW (EB)');
});

test('opposite legs of one street get opposite directions', () => {
  const { signals } = buildPreemptDirectory(FILES);
  const [signal] = signals;
  const three = signal.channels.find((c) => c.channel === 3);
  const four = signal.channels.find((c) => c.channel === 4);
  assert.equal(three.streets[0], four.streets[0], 'same street');
  assert.notEqual(three.travel, four.travel, 'opposite legs must not share a direction');
  // approach 1-4 is bearing 272: pointed west, so westbound.
  assert.equal(four.travel, 'WB');
  assert.equal(four.compass, 'E');
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
  assert.equal(five.streets[0], '1st Street');

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
  assert.equal(agency.agency_name, 'Example City');
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

// ------------------------------------------------------- cross-street naming

test('a signal is named by the two streets with the most legs', () => {
  const name = crossStreetName([
    'Main Street', '1st Street', 'Main Street', 'Transit Center',
  ]);
  assert.equal(name, 'Main Street & 1st Street');
});

/**
 * signals.txt carries only an ID and coordinates, so the name has to come from
 * the approaches, and at a four-leg signal the two cross streets often have one
 * leg each. Breaking that tie on the export's own ordering beats the alphabet,
 * which on real data named an intersection after a parking driveway.
 */
test('a tie breaks on approach order, not alphabetically', () => {
  // Willow sorts after Ash, so alphabetical ordering would pick Ash in both
  // calls; only appearance order makes the answer follow the input.
  assert.equal(
    crossStreetName(['Main Street', 'Main Street', 'Willow Ave', 'Ash Street']),
    'Main Street & Willow Ave',
  );
  assert.equal(
    crossStreetName(['Main Street', 'Main Street', 'Ash Street', 'Willow Ave']),
    'Main Street & Ash Street',
    'reversing the input should reverse the tie',
  );
});

test('cross-street naming copes with gaps and one-street signals', () => {
  assert.equal(crossStreetName(['Main St', '', null, 'Main St']), 'Main St');
  assert.equal(crossStreetName([]), '');
  assert.equal(crossStreetName(null), '');
  assert.equal(crossStreetName(undefined), '');
});

test('each signal carries its cross streets', () => {
  const { signals } = buildPreemptDirectory(FILES);
  assert.equal(signals[0].crossStreets, 'Main Street & 1st Street');
});


/* ------------------------------------------------- how many signals, exactly */

test('signalCount counts the whole export, not just the preempted signals', () => {
  // Four signals described, one of which has preempt channels. Reporting only
  // the one would read as a thin export when it is a complete one.
  const files = {
    ...FILES,
    'signals.txt': [
      'signal_id,agency_id,latitude,longitude',
      '1,EX-CA,37.9045,-122.0680',
      '2,EX-CA,37.9050,-122.0690',
      '3,EX-CA,37.9055,-122.0700',
      '4,EX-CA,37.9060,-122.0710',
    ].join('\n'),
  };
  const directory = buildPreemptDirectory(files);
  assert.equal(directory.signals.length, 1, 'only signal 1 has preempt channels');
  assert.equal(directory.signalCount, 4, 'but the export describes four');
});

test('signalCount is null when signals.txt is missing, not zero', () => {
  const { 'signals.txt': _omitted, ...withoutSignals } = FILES;
  const directory = buildPreemptDirectory(withoutSignals);
  // Unknown is not none. A caller printing "1 of 0" would be stating
  // something false; null lets it print the one number it actually has.
  assert.equal(directory.signalCount, null);
  assert.equal(directory.signals.length, 1, 'preempt channels still resolve');
});

test('signalCount is zero for an empty signals.txt', () => {
  const directory = buildPreemptDirectory({
    ...FILES,
    'signals.txt': 'signal_id,agency_id,latitude,longitude',
  });
  // Present but empty is a real answer, and distinct from missing.
  assert.equal(directory.signalCount, 0);
});
