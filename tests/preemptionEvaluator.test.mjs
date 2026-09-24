import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREEMPT_CODES,
  detectLayout,
  scanPreemptionRows,
  buildPreemptionEvents,
  summarizePreemption,
  evaluatePreemption,
  eventsToCsv,
  toSeconds,
  STATUS_LABELS,
} from '../src/utils/preemptionEvaluator.js';

// Epoch seconds keep the fixtures free of any local-timezone dependency.
const T0 = 1710432000;
const at = (offset) => T0 + offset;
const row = (offset, code, channel) => `${at(offset)},${code},${channel}`;

/** A full railroad-style sequence on one channel. */
function sequence(start, channel, offsets = {}) {
  const o = { warn: 0, callOn: 5, entry: 6, track: 8, dwell: 25, callOff: 180, exit: 182, ...offsets };
  return [
    row(start + o.warn, 101, channel),
    row(start + o.callOn, 102, channel),
    row(start + o.entry, 105, channel),
    row(start + o.track, 106, channel),
    row(start + o.dwell, 107, channel),
    row(start + o.callOff, 104, channel),
    row(start + o.exit, 111, channel),
  ];
}

/** Typical non-preemption traffic that should never survive the scan. */
function noise(count, startOffset = 0) {
  const codes = [1, 8, 9, 10, 11, 21, 22, 23, 43, 45, 81, 82, 90, 131];
  const lines = [];
  for (let i = 0; i < count; i += 1) {
    lines.push(row(startOffset + i, codes[i % codes.length], (i % 8) + 1));
  }
  return lines;
}

test('detectLayout finds a plain timestamp,code,param file', () => {
  const layout = detectLayout(sequence(0, 1).join('\n'));
  assert.equal(layout.tsCol, 0);
  assert.equal(layout.delimiter, 44);
  assert.equal(layout.confident, true);
});

test('detectLayout finds the timestamp behind a leading signal ID column', () => {
  const text = sequence(0, 1)
    .map((line) => `1043,${line}`)
    .join('\n');
  const layout = detectLayout(text);
  assert.equal(layout.tsCol, 1);
  const { rows } = scanPreemptionRows(text, layout);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].code, 101);
});

test('detectLayout handles semicolon and tab delimiters', () => {
  for (const [delimiter, charCode] of [[';', 59], ['\t', 9]]) {
    const text = sequence(0, 2).join('\n').replace(/,/g, delimiter);
    const layout = detectLayout(text);
    assert.equal(layout.delimiter, charCode, `delimiter ${JSON.stringify(delimiter)}`);
    assert.equal(scanPreemptionRows(text, layout).rows.length, 7);
  }
});

test('detectLayout reports low confidence on data it cannot read', () => {
  const layout = detectLayout('not,a,signal\nfile,at,all');
  assert.equal(layout.confident, false);
});

test('the scan keeps preemption rows and drops everything else', () => {
  const lines = [...noise(500), ...sequence(600, 1)];
  const text = lines.join('\n');
  const scan = scanPreemptionRows(text, detectLayout(text));
  assert.equal(scan.scanned, 507);
  assert.equal(scan.rows.length, 7);
  assert.ok(scan.rows.every((r) => r.code >= 101 && r.code <= 116));
});

test('every documented preemption code survives the scan, and its neighbours do not', () => {
  const codes = Object.keys(PREEMPT_CODES).map(Number);
  const lines = codes.map((code, i) => row(i, code, 1));
  // 100 and 117 bracket the range; both are real codes that are not preemption.
  lines.push(row(900, 100, 1), row(901, 117, 1), row(902, 112, 1));
  const text = lines.join('\n');
  const scan = scanPreemptionRows(text, detectLayout(text));
  assert.deepEqual(
    scan.rows.map((r) => r.code).sort((a, b) => a - b),
    codes.sort((a, b) => a - b),
  );
});

test('the scan tolerates CRLF, blank lines, quoted cells and a header row', () => {
  const text = ['timestamp,code,param', '', `"${at(0)}","102","3"`, row(5, 105, 3), '', row(9, 111, 3), ''].join('\r\n');
  const scan = scanPreemptionRows(text, detectLayout(text));
  assert.equal(scan.rows.length, 3);
  assert.deepEqual(scan.rows.map((r) => r.channel), [3, 3, 3]);
  assert.equal(scan.rows[0].tsMs, at(0) * 1000);
});

test('out-of-order rows are sorted, and in-order rows are left alone', () => {
  const ordered = sequence(0, 1).join('\n');
  assert.equal(scanPreemptionRows(ordered, detectLayout(ordered)).wasSorted, true);

  const shuffled = sequence(0, 1).reverse().join('\n');
  const scan = scanPreemptionRows(shuffled, detectLayout(shuffled));
  assert.equal(scan.wasSorted, false);
  const stamps = scan.rows.map((r) => r.tsMs);
  assert.deepEqual(stamps, [...stamps].sort((a, b) => a - b));
});

test('a complete sequence becomes one event with the right segments', () => {
  const text = sequence(0, 2).join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 1);
  const [event] = events;
  assert.equal(event.channel, 2);
  assert.equal(event.status, 'complete');
  // First code (101 at +0) through last code (111 at +182).
  assert.equal(toSeconds(event.durationMs), 182);
  assert.equal(toSeconds(event.segments.callToEntry), 1);
  assert.equal(toSeconds(event.segments.callHeld), 175);
  assert.equal(toSeconds(event.segments.trackClearance), 17);
  assert.equal(toSeconds(event.segments.dwell), 157);
  assert.equal(event.codeCount, 7);
});

test('the exit tail is null when nothing is logged after the exit interval', () => {
  const [event] = evaluatePreemption(sequence(0, 1).join('\n')).events;
  assert.equal(event.segments.exitToEnd, null, 'the exit interval end is not a preemption code');

  const withTail = [...sequence(0, 1), row(200, 109, 1)].join('\n');
  const [tailed] = evaluatePreemption(withTail).events;
  assert.equal(toSeconds(tailed.segments.exitToEnd), 18);
});

test('two sequences on one channel split into two events', () => {
  const text = [...sequence(0, 1), ...sequence(400, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2);
  assert.ok(events[1].startMs > events[0].endMs);
  assert.ok(events.every((e) => e.status === 'complete'));
});

test('channels are tracked independently and may overlap in time', () => {
  const text = [...sequence(0, 1), ...sequence(10, 4)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.channel).sort(), [1, 4]);
  // They genuinely overlap, which a per-channel model must allow.
  assert.ok(events[1].startMs < events[0].endMs);
});

test('a call that is never served is reported as such', () => {
  const text = [row(0, 102, 6), row(20, 104, 6)].join('\n');
  const { events, summary } = evaluatePreemption(text);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'callOnly');
  assert.equal(STATUS_LABELS.callOnly, 'Call never served');
  assert.equal(events[0].segments.callToEntry, null);
  assert.equal(toSeconds(events[0].segments.callHeld), 20);
  assert.equal(summary.totals.statuses.callOnly, 1);
});

test('a sequence truncated before its exit is flagged, not silently completed', () => {
  const text = [row(0, 102, 1), row(2, 105, 1), row(6, 107, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'noExit');
});

test('force off closes an event the same way an exit interval does', () => {
  const text = [row(0, 102, 1), row(2, 105, 1), row(30, 116, 1), row(100, 102, 1), row(102, 105, 1), row(130, 111, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2);
  assert.equal(events[0].status, 'complete');
});

test('a repeated start code splits a chattering call into separate events', () => {
  const text = [row(0, 102, 1), row(5, 104, 1), row(40, 102, 1), row(45, 104, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.status === 'callOnly'));
});

test('a mid-sequence code does not split an event, however late it arrives', () => {
  // Dwell can run for minutes with no preemption code logged in between.
  const text = [row(0, 102, 1), row(2, 105, 1), row(4, 107, 1), row(600, 111, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 1, 'a long dwell is one event, not two');
  assert.equal(toSeconds(events[0].segments.dwell), 596);
});

test('maxEventSeconds rescues an event that never terminates', () => {
  // 101 then 102: the second code is a start code that has not been seen yet,
  // so only the time cut-off can split these two.
  const text = [row(0, 101, 1), row(5000, 102, 1), row(5002, 105, 1), row(5100, 111, 1)].join('\n');
  const loose = evaluatePreemption(text, { maxEventSeconds: 900 });
  assert.equal(loose.events.length, 2);
  assert.equal(loose.events[0].status, 'callOnly');

  const generous = evaluatePreemption(text, { maxEventSeconds: 100000 });
  assert.equal(generous.events.length, 1, 'with no cut-off the runaway event stays open');
});

test('a second call input on an event that never exited starts a new event', () => {
  const text = [row(0, 102, 1), row(2, 105, 1), row(5000, 102, 1), row(5002, 105, 1), row(5100, 111, 1)].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2);
  assert.equal(events[0].status, 'noExit');
  assert.equal(events[1].status, 'complete');
});

test('the summary rolls up per channel and overall', () => {
  const text = [
    ...sequence(0, 1),
    ...sequence(400, 1, { callOff: 78, exit: 82 }),
    ...sequence(0, 3),
    row(900, 102, 5),
    row(910, 104, 5),
  ].join('\n');
  const { summary } = evaluatePreemption(text);
  assert.deepEqual(summary.channels.map((c) => c.channel), [1, 3, 5]);

  const ch1 = summary.channels[0];
  assert.equal(ch1.count, 2);
  assert.equal(toSeconds(ch1.maxMs), 182);
  assert.equal(toSeconds(ch1.minMs), 82);
  assert.equal(toSeconds(ch1.medianMs), 132);
  assert.equal(toSeconds(ch1.medianEntryDelayMs), 1);
  assert.equal(ch1.statuses.complete, 2);

  assert.equal(summary.totals.events, 4);
  assert.equal(summary.totals.channels, 3);
  assert.equal(summary.totals.statuses.callOnly, 1);
  assert.equal(toSeconds(summary.totals.maxMs), 182);
});

test('summarizePreemption on no events gives empty totals rather than throwing', () => {
  const summary = summarizePreemption([]);
  assert.deepEqual(summary.channels, []);
  assert.equal(summary.totals.events, 0);
  assert.equal(summary.totals.medianMs, null);
  assert.equal(summary.totals.firstMs, null);
});

test('evaluatePreemption reports how much of the file it discarded', () => {
  const text = [...noise(1000), ...sequence(2000, 1)].join('\n');
  const { stats } = evaluatePreemption(text);
  assert.equal(stats.scanned, 1007);
  assert.equal(stats.kept, 7);
  assert.ok(stats.keptPercent < 1);
  assert.equal(stats.malformed, 0);
});

test('malformed lines are counted, not thrown', () => {
  const text = ['garbage', 'a,b', ...sequence(0, 1), 'x,y,z'].join('\n');
  const result = evaluatePreemption(text);
  assert.equal(result.events.length, 1);
  assert.ok(result.stats.malformed >= 1);
});

test('empty input produces nothing and does not throw', () => {
  for (const input of ['', '   ', null, undefined]) {
    const result = evaluatePreemption(input);
    assert.equal(result.events.length, 0);
    assert.equal(result.stats.kept, 0);
  }
});

test('buildPreemptionEvents is deterministic across repeated runs', () => {
  const rows = scanPreemptionRows(
    [...sequence(0, 1), ...sequence(300, 2)].join('\n'),
    { delimiter: 44, tsCol: 0 },
  ).rows;
  const a = JSON.stringify(buildPreemptionEvents(rows));
  const b = JSON.stringify(buildPreemptionEvents(rows));
  assert.equal(a, b);
});

test('eventsToCsv writes one row per event with a stable header', () => {
  const { events } = evaluatePreemption([...sequence(0, 1), row(900, 102, 7), row(905, 104, 7)].join('\n'));
  const csv = eventsToCsv(events, (ms) => new Date(ms).toISOString());
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^signal,channel,start,end,duration_s,status,/);
  // The signal column leads, so a merged export says which intersection a row came from.
  assert.match(lines[1], /^,1,/);
  assert.ok(lines[1].includes('182'));
  assert.ok(lines[2].includes('Call never served') || lines[2].includes('"Call never served"'));
});

test('eventsToCsv escapes a formatter that emits commas', () => {
  const { events } = evaluatePreemption(sequence(0, 1).join('\n'));
  const csv = eventsToCsv(events, () => 'Mar 14, 2024');
  assert.ok(csv.includes('"Mar 14, 2024"'));
});

test('toSeconds rounds to a tenth and passes null through', () => {
  assert.equal(toSeconds(1234), 1.2);
  assert.equal(toSeconds(1250), 1.3);
  assert.equal(toSeconds(0), 0);
  assert.equal(toSeconds(null), null);
  assert.equal(toSeconds(undefined), null);
  assert.equal(toSeconds(Number.NaN), null);
});

test('a large file stays fast and correct', () => {
  const lines = [...noise(200000)];
  for (let k = 0; k < 25; k += 1) lines.push(...sequence(300000 + k * 1000, (k % 4) + 1));
  const text = lines.join('\n');
  const started = performance.now();
  const result = evaluatePreemption(text);
  const elapsed = performance.now() - started;
  assert.equal(result.stats.scanned, 200175);
  assert.equal(result.events.length, 25);
  assert.ok(result.events.every((e) => e.status === 'complete'));
  // Generous for CI; the point is that it is not quadratic in file size.
  assert.ok(elapsed < 5000, `took ${elapsed.toFixed(0)}ms`);
});

// ---------------------------------------------------------------- multi-signal

import {
  buildScatterPoints,
  evaluateSources,
  seriesKey,
  MINUTES_PER_DAY,
} from '../src/utils/preemptionEvaluator.js';

/** A full call on one channel, at a wall-clock time, as epoch-second rows. */
function callAt(year, month, day, hour, minute, channel, signalId = null) {
  const base = Math.floor(new Date(year, month - 1, day, hour, minute, 0).getTime() / 1000);
  const prefix = signalId === null ? '' : `${signalId},`;
  return [
    `${prefix}${base},102,${channel}`,
    `${prefix}${base + 3},105,${channel}`,
    `${prefix}${base + 40},111,${channel}`,
  ].join('\n');
}

test('a leading signal ID column names the signal', () => {
  const text = [callAt(2026, 3, 2, 7, 30, 1, 'SIG-100'), callAt(2026, 3, 2, 9, 0, 1, 'SIG-200')].join('\n');
  const { events, signals } = evaluatePreemption(text);
  assert.deepEqual(signals, ['SIG-100', 'SIG-200']);
  assert.deepEqual(events.map((e) => e.signal), ['SIG-100', 'SIG-200']);
});

test('without an ID column the caller-supplied label is used', () => {
  const { events } = evaluatePreemption(callAt(2026, 3, 2, 7, 30, 1), { signal: 'Main & 1st' });
  assert.equal(events.length, 1);
  assert.equal(events[0].signal, 'Main & 1st');
});

/**
 * The guard that matters for this feature: two signals routinely both have a
 * preempt channel 1, and they are unrelated inputs. Keying sequences on channel
 * alone would splice them into a single run of events.
 */
test('the same channel at two signals stays two separate sequences', () => {
  const text = [
    `A,${Math.floor(new Date(2026, 2, 2, 7, 0, 0).getTime() / 1000)},102,1`,
    `B,${Math.floor(new Date(2026, 2, 2, 7, 0, 5).getTime() / 1000)},102,1`,
    `A,${Math.floor(new Date(2026, 2, 2, 7, 0, 10).getTime() / 1000)},105,1`,
    `B,${Math.floor(new Date(2026, 2, 2, 7, 0, 15).getTime() / 1000)},105,1`,
    `A,${Math.floor(new Date(2026, 2, 2, 7, 1, 0).getTime() / 1000)},111,1`,
    `B,${Math.floor(new Date(2026, 2, 2, 7, 1, 5).getTime() / 1000)},111,1`,
  ].join('\n');
  const { events } = evaluatePreemption(text);
  assert.equal(events.length, 2, 'interleaved signals were merged into one event');
  assert.deepEqual(events.map((e) => e.signal).sort(), ['A', 'B']);
  for (const event of events) {
    assert.equal(event.status, 'complete');
    assert.equal(event.codes.length, 3, `${event.signal} absorbed the other signal's codes`);
  }
});

test('scatter points carry local date and minute of day', () => {
  const { events } = evaluatePreemption(callAt(2026, 3, 4, 7, 32, 2), { signal: 'S' });
  const [point] = buildScatterPoints(events);
  assert.equal(point.signal, 'S');
  assert.equal(point.channel, 2);
  assert.equal(point.minuteOfDay, 7 * 60 + 32);
  assert.ok(point.minuteOfDay >= 0 && point.minuteOfDay < MINUTES_PER_DAY);
  // Local midnight of the same day, not a UTC boundary.
  const midnight = new Date(point.dateMs);
  assert.equal(midnight.getHours(), 0);
  assert.equal(midnight.getMinutes(), 0);
  assert.equal(midnight.getDate(), 4);
  assert.equal(midnight.getMonth(), 2);
});

test('weekends are flagged, because a commuter pattern is a weekday pattern', () => {
  // 2026-03-07 is a Saturday, 2026-03-09 a Monday.
  const weekend = buildScatterPoints(evaluatePreemption(callAt(2026, 3, 7, 8, 0, 1)).events)[0];
  const weekday = buildScatterPoints(evaluatePreemption(callAt(2026, 3, 9, 8, 0, 1)).events)[0];
  assert.equal(weekend.isWeekend, true);
  assert.equal(weekday.isWeekend, false);
});

test('a recurring same-time call reads as a flat line, a random one does not', () => {
  const commuter = [
    callAt(2026, 3, 2, 7, 32, 2),
    callAt(2026, 3, 3, 7, 34, 2),
    callAt(2026, 3, 4, 7, 31, 2),
    callAt(2026, 3, 5, 7, 33, 2),
  ].join('\n');
  const random = [
    callAt(2026, 3, 2, 3, 12, 1),
    callAt(2026, 3, 5, 14, 48, 1),
    callAt(2026, 3, 9, 21, 7, 1),
    callAt(2026, 3, 12, 9, 55, 1),
  ].join('\n');

  const spread = (text, channel) => {
    const points = buildScatterPoints(evaluatePreemption(text).events).filter((p) => p.channel === channel);
    const minutes = points.map((p) => p.minuteOfDay);
    return Math.max(...minutes) - Math.min(...minutes);
  };

  // The whole screen rests on this separation being large.
  assert.ok(spread(commuter, 2) <= 5, `commuter spread was ${spread(commuter, 2)} minutes`);
  assert.ok(spread(random, 1) > 120, `random spread was only ${spread(random, 1)} minutes`);
});

test('evaluateSources merges several pastes and keeps them apart', () => {
  const result = evaluateSources([
    { label: 'Main & 1st', text: callAt(2026, 3, 2, 7, 30, 1) },
    { label: 'Oak & 2nd', text: callAt(2026, 3, 2, 8, 15, 1) },
    { label: 'ignored', text: '   ' },
  ]);
  assert.equal(result.events.length, 2);
  assert.deepEqual(result.signals, ['Main & 1st', 'Oak & 2nd']);
  assert.equal(result.perSource.length, 2, 'an empty source should not produce an entry');
  assert.equal(result.summary.totals.events, 2);
  assert.ok(result.stats.scanned >= 6);
});

test('evaluateSources totals the scan stats across sources', () => {
  const one = evaluatePreemption(callAt(2026, 3, 2, 7, 30, 1));
  const merged = evaluateSources([
    { label: 'a', text: callAt(2026, 3, 2, 7, 30, 1) },
    { label: 'b', text: callAt(2026, 3, 2, 7, 30, 1) },
  ]);
  assert.equal(merged.stats.scanned, one.stats.scanned * 2);
  assert.equal(merged.stats.kept, one.stats.kept * 2);
});

test('events from all sources come back in one chronological order', () => {
  const result = evaluateSources([
    { label: 'B', text: callAt(2026, 3, 2, 9, 0, 1) },
    { label: 'A', text: callAt(2026, 3, 2, 7, 0, 1) },
  ]);
  assert.deepEqual(result.events.map((e) => e.signal), ['A', 'B']);
});

test('seriesKey names a signal-and-channel series, and copes without a signal', () => {
  assert.equal(seriesKey('Main & 1st', 3), 'Main & 1st · Preempt 3');
  assert.equal(seriesKey('', 3), 'Preempt 3');
});

test('evaluateSources on nothing at all returns empty rather than throwing', () => {
  for (const input of [[], null, undefined, [{ label: 'x', text: '' }]]) {
    const result = evaluateSources(input);
    assert.deepEqual(result.events, []);
    assert.equal(result.stats.scanned, 0);
  }
});

test('the CSV names the signal each event came from', () => {
  const { events } = evaluateSources([
    { label: 'Main & 1st', text: callAt(2026, 3, 2, 7, 30, 1) },
    { label: 'Oak & 2nd', text: callAt(2026, 3, 2, 8, 15, 2) },
  ]);
  const lines = eventsToCsv(events, (ms) => new Date(ms).toISOString()).split('\n');
  assert.match(lines[0], /^signal,channel,/);
  assert.match(lines[1], /^Main & 1st,1,/);
  assert.match(lines[2], /^Oak & 2nd,2,/);
});

test('the summary keeps two signals sharing a channel apart', () => {
  const { summary } = evaluateSources([
    { label: 'A', text: callAt(2026, 3, 2, 7, 30, 1) },
    { label: 'B', text: callAt(2026, 3, 2, 8, 30, 1) },
  ]);
  assert.equal(summary.channels.length, 2, 'both signals reported as one channel row');
  assert.deepEqual(summary.channels.map((c) => c.signal), ['A', 'B']);
  assert.deepEqual(summary.channels.map((c) => c.channel), [1, 1]);
  for (const row of summary.channels) assert.equal(row.count, 1);
});
