import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crossStreetName,
  parseTable,
  bearingToCompass,
  bearingToOrigin,
  bearingToTravel,
  buildDetectorDirectory,
  buildPhaseDirectory,
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


/* ------------------------------------------------- detectors.txt -> phases */

const DETECTORS = {
  'detectors.txt': [
    'channel,signal_id,phase,description,purpose',
    '5,11,2,NB stop bar,stop bar',
    '6,11,2,NB stop bar lane 2,stop bar',
    '9,11,6,SB stop bar,stop bar',
    '14,11,6,SB advance,advanced',
    '20,11,0,mainline count,count',
    '5,12,4,EB stop bar,stop bar',
  ].join('\n'),
};

test('detectors group by signal and phase', () => {
  const directory = buildDetectorDirectory(DETECTORS);
  assert.deepEqual(directory.signals, ['11', '12']);
  assert.deepEqual([...directory.bySignal.get('11').get(2)], [5, 6], 'two lanes on one phase');
  assert.deepEqual([...directory.bySignal.get('11').get(6)], [9, 14]);
  assert.deepEqual([...directory.bySignal.get('12').get(4)], [5]);
});

test('a channel on the same number at two signals stays separate', () => {
  // Channel 5 exists at both signals and serves different phases. Flattening
  // them would put one signal's traffic on the other signal's movement.
  const directory = buildDetectorDirectory(DETECTORS);
  assert.deepEqual([...directory.bySignal.get('11').get(2)], [5, 6]);
  assert.equal(directory.bySignal.get('12').has(2), false);
  assert.deepEqual([...directory.bySignal.get('12').get(4)], [5]);
});

test('a detector with no phase is counted, not assigned', () => {
  const directory = buildDetectorDirectory(DETECTORS);
  assert.equal(directory.unassigned, 1, 'the count station');
  // Phase 0 means it serves no movement, so it must not land on phase 0.
  assert.equal(directory.bySignal.get('11').has(0), false);
});

test('the purpose of each channel is kept', () => {
  const directory = buildDetectorDirectory(DETECTORS);
  assert.equal(directory.purposes.get('11\u00005'), 'stop bar');
  assert.equal(directory.purposes.get('11\u000014'), 'advanced');
});

test('channels come back in numeric order', () => {
  const directory = buildDetectorDirectory({
    'detectors.txt': 'channel,signal_id,phase\n12,1,2\n5,1,2\n9,1,2',
  });
  assert.deepEqual([...directory.bySignal.get('1').get(2)], [5, 9, 12], '12 after 9, not before');
});

test('buildDetectorDirectory says so when it has nothing to work with', () => {
  const none = buildDetectorDirectory({});
  assert.equal(none.signals.length, 0);
  assert.match(none.warnings[0], /no detectors\.txt/);
  const empty = buildDetectorDirectory({ 'detectors.txt': 'channel,signal_id,phase\n20,1,0' });
  assert.match(empty.warnings[0], /no channel with a phase/);
  assert.deepEqual(buildDetectorDirectory(null).signals, [], 'null is not a crash');
});

/* ------------------------------------- approaches + phases -> a drawing */

const SIGNAL = {
  'agency.txt': 'agency_id,agency_name,agency_islht\nA,Test City,false',
  'signals.txt': 'signal_id,agency_id,latitude,longitude\n1,A,37.9,-122.06\n2,A,37.91,-122.07',
  'approaches.txt': [
    'approach_id,signal_id,street_name,compass_bearing,posted_speed,free_right',
    '1-1,1,Main St,0,35,0',
    '1-2,1,1st Ave,90,30,1',
    '1-3,1,Main St,180,35,0',
    '2-1,2,River Rd,45,45,0',
  ].join('\n'),
  'phases.txt': [
    'phase,signal_id,movement_type,num_of_lanes,approach_id,PedX,crosswalk_length',
    '2,1,T,2,1-1,1,60',
    '5,1,L,1,1-1,0,0',
    '6,1,T,2,1-3,1,60',
    '4,1,T,1,1-2,2,55',
    '8,1,T,1,GONE,0,0',
    '2,2,T,1,2-1,0,0',
  ].join('\n'),
  'preempt.txt': [
    'preempt_channel,signalID,type,phase,maxTime',
    '1,1,RAIL,2,180',
    '1,1,RAIL,6,180',
    '3,1,EVP,4,120',
    '2,9,RAIL,2,90',
  ].join('\n'),
};

test('a signal comes back with its approaches, its phases and its name', () => {
  const directory = buildPhaseDirectory(SIGNAL);
  assert.deepEqual(directory.signals, ['1', '2']);
  const one = directory.bySignal.get('1');
  assert.equal(one.name, 'Main St & 1st Ave');
  assert.equal(one.approaches.length, 3);
  assert.equal(one.latitude, 37.9);
  // Phases come back in order whatever order the file listed them in.
  assert.deepEqual(one.phases.map((p) => p.phase), [2, 4, 5, 6, 8]);
  assert.equal(one.approaches.find((a) => a.approachId === '1-2').freeRight, 1);
  assert.equal(one.phases.find((p) => p.phase === 4).pedX, 2);
});

test('a phase naming an approach the export does not describe is reported', () => {
  const directory = buildPhaseDirectory(SIGNAL);
  // It is kept, because it is real and it is in the file. A diagram quietly
  // missing phase 8 is worse than one that says phase 8 could not be placed.
  assert.ok(directory.bySignal.get('1').phases.some((p) => p.phase === 8));
  assert.ok(directory.warnings.some((w) => w.includes('no bearing')), directory.warnings.join(' '));
});

test('handedness is read from the export rather than assumed', () => {
  assert.equal(buildPhaseDirectory(SIGNAL).isLht, false);
  const lht = buildPhaseDirectory({
    ...SIGNAL,
    'agency.txt': 'agency_id,agency_name,agency_islht\nA,Test City,true',
  });
  assert.equal(lht.isLht, true);
  // Some exports write it as a flag rather than a word.
  assert.equal(buildPhaseDirectory({
    ...SIGNAL, 'agency.txt': 'agency_id,agency_islht\nA,1',
  }).isLht, true);
});

test('a preempt channel is joined to the approach its phases run on', () => {
  const one = buildPhaseDirectory(SIGNAL).bySignal.get('1');
  assert.deepEqual(one.preempts.map((p) => p.channel), [1, 3]);
  const rail = one.preempts[0];
  // Two rows, one channel: the second row adds its phase rather than a
  // second channel of the same number.
  assert.deepEqual(rail.phases, [2, 6]);
  assert.equal(rail.type, 'RAIL');
  assert.equal(rail.maxTime, 180);
  // Phases 2 and 6 are on opposite legs of Main Street, so the channel
  // genuinely serves two approaches and both are kept.
  assert.deepEqual(rail.approachIds, ['1-1', '1-3']);
  assert.deepEqual(one.preempts[1].approachIds, ['1-2']);
});

test('a preempt row for a signal the export does not describe is dropped', () => {
  const directory = buildPhaseDirectory(SIGNAL);
  assert.equal(directory.bySignal.has('9'), false);
  assert.equal(directory.preemptCount, 2, 'the orphan channel was counted');
  assert.deepEqual(directory.bySignal.get('2').preempts, []);
});

test('an export with no preempt.txt is not an export with a problem', () => {
  const { 'preempt.txt': gone, ...rest } = SIGNAL;
  const directory = buildPhaseDirectory(rest);
  assert.equal(directory.preemptCount, 0);
  assert.deepEqual(directory.bySignal.get('1').preempts, []);
  assert.equal(
    directory.warnings.some((w) => w.includes('preempt')), false,
    'a missing preempt.txt was reported as a fault',
  );
});

test('buildPhaseDirectory says so when it has nothing to work with', () => {
  const none = buildPhaseDirectory({});
  assert.deepEqual(none.signals, []);
  assert.match(none.warnings.join(' '), /no approaches\.txt/);
  assert.deepEqual(buildPhaseDirectory(null).signals, [], 'null is not a crash');
});
