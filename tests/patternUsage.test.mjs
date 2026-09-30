import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPatternSegments,
  dailyPatternUse,
  dayKey,
  formatDuration,
  rankPatterns,
  sortPatternRanking,
  splitSegmentsByDay,
} from '../src/utils/patternUsage.js';

/** A segment in the shape the calendar builds, from local wall-clock parts. */
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const seg = (pattern, cycleLength, start, end) => ({
  pattern, cycleLength, startMillis: start, endMillis: end,
});
const HOUR = 3600000;

/* ------------------------------------------------------------- day splitting */

test('a segment inside one day stays one piece', () => {
  const pieces = splitSegmentsByDay([seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 9))]);
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].dayKey, '2024-03-14');
  assert.equal(pieces[0].durationMs, 3 * HOUR);
});

test('an overnight segment is cut at midnight', () => {
  // 22:00 to 05:00. Left whole it would count seven hours against the 14th and
  // nothing against the 15th, which reads as a long evening plan and no night
  // plan at all.
  const pieces = splitSegmentsByDay([seg(4, 70, at(2024, 3, 14, 22), at(2024, 3, 15, 5))]);
  assert.equal(pieces.length, 2);
  assert.deepEqual(pieces.map((p) => p.dayKey), ['2024-03-14', '2024-03-15']);
  assert.equal(pieces[0].durationMs, 2 * HOUR);
  assert.equal(pieces[1].durationMs, 5 * HOUR);
  // And no time is created or lost in the cutting.
  assert.equal(pieces[0].durationMs + pieces[1].durationMs, 7 * HOUR);
});

test('a multi-day segment yields a piece per day', () => {
  const pieces = splitSegmentsByDay([seg(1, 60, at(2024, 3, 14, 20), at(2024, 3, 17, 4))]);
  assert.deepEqual(
    pieces.map((p) => p.dayKey),
    ['2024-03-14', '2024-03-15', '2024-03-16', '2024-03-17'],
  );
  assert.equal(pieces[1].durationMs, 24 * HOUR, 'the middle days are whole');
  assert.equal(pieces[2].durationMs, 24 * HOUR);
});

test('a segment ending exactly at midnight does not start the next day', () => {
  // The loop steps to the following day, finds the piece has no length, and
  // must drop it. Kept, it would put an empty entry on the 15th -- a day the
  // pattern is then counted as having run on, and a row in the day table for
  // a day the file does not describe.
  const pieces = splitSegmentsByDay([seg(2, 90, at(2024, 3, 14, 18), at(2024, 3, 15, 0))]);
  assert.deepEqual(pieces.map((p) => p.dayKey), ['2024-03-14']);
  assert.equal(pieces[0].durationMs, 6 * HOUR);
  assert.equal(rankPatterns([seg(2, 90, at(2024, 3, 14, 18), at(2024, 3, 15, 0))])[0].dayCount, 1);
  assert.equal(dailyPatternUse([seg(2, 90, at(2024, 3, 14, 18), at(2024, 3, 15, 0))]).length, 1);
});

test('splitSegmentsByDay refuses what is not a span', () => {
  assert.deepEqual(splitSegmentsByDay([]), []);
  assert.deepEqual(splitSegmentsByDay(null), []);
  const zero = splitSegmentsByDay([seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 6))]);
  assert.deepEqual(zero, [], 'a segment that ends when it starts ran for no time');
  const backwards = splitSegmentsByDay([seg(2, 90, at(2024, 3, 14, 9), at(2024, 3, 14, 6))]);
  assert.deepEqual(backwards, [], 'and one that ends before it starts is not a span');
});

test('splitSegmentsByDay accepts ISO strings as well as millis', () => {
  const iso = new Date(at(2024, 3, 14, 6)).toISOString();
  const isoEnd = new Date(at(2024, 3, 14, 9)).toISOString();
  const pieces = splitSegmentsByDay([{ pattern: 2, cycleLength: 90, startIso: iso, endIso: isoEnd }]);
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].durationMs, 3 * HOUR);
});

/* ---------------------------------------------------------------- the ranking */

test('patterns rank by the time they ran', () => {
  const rows = rankPatterns([
    seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 15)),   // 9h
    seg(3, 100, at(2024, 3, 14, 15), at(2024, 3, 14, 19)), // 4h
    seg(2, 90, at(2024, 3, 14, 19), at(2024, 3, 14, 21)),  // 2h more of pattern 2
    seg(4, 70, at(2024, 3, 14, 21), at(2024, 3, 14, 22)),  // 1h
  ]);
  assert.deepEqual(rows.map((r) => r.pattern), [2, 3, 4]);
  assert.equal(rows[0].totalMs, 11 * HOUR);
  assert.equal(rows[0].runCount, 2, 'two separate runs of pattern 2');
  assert.equal(rows[0].longestRunMs, 9 * HOUR);
  assert.ok(Math.abs(rows[0].share - 11 / 16) < 1e-9);
  // The shares have to account for all the observed time.
  assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.share, 0) - 1) < 1e-9);
});

test('an overnight run counts once, across two days', () => {
  const rows = rankPatterns([seg(4, 70, at(2024, 3, 14, 22), at(2024, 3, 15, 5))]);
  assert.equal(rows[0].runCount, 1, 'the controller switched once, not twice');
  assert.equal(rows[0].dayCount, 2, 'but the pattern was seen on two days');
  assert.equal(rows[0].totalMs, 7 * HOUR);
});

test('a segment that is not a span is not counted as a run', () => {
  // The run tally walks the original segments rather than the day pieces, so
  // it has to reject the same rubbish the splitter does -- otherwise a stray
  // backwards or zero-length row inflates how often the controller switched.
  const rows = rankPatterns([
    seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 9)),
    seg(2, 90, at(2024, 3, 14, 12), at(2024, 3, 14, 12)),  // no length
    seg(2, 90, at(2024, 3, 14, 18), at(2024, 3, 14, 15)),  // backwards
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].runCount, 1, 'one real run, not three');
  assert.equal(rows[0].totalMs, 3 * HOUR);
});

test('a pattern carries every cycle length it ran at, and the latest', () => {
  const rows = rankPatterns([
    seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 9)),
    seg(2, 120, at(2024, 3, 15, 6), at(2024, 3, 15, 9)),
    seg(2, 100, at(2024, 3, 16, 6), at(2024, 3, 16, 9)),
  ]);
  assert.deepEqual(rows[0].cycleLengths, [90, 100, 120], 'sorted, not in the order seen');
  assert.equal(rows[0].cycleLength, 100, 'the most recent, not the largest');
  assert.equal(rows[0].dayCount, 3);
});

test('a missing cycle length is not a zero-second one', () => {
  const rows = rankPatterns([
    seg(2, null, at(2024, 3, 14, 6), at(2024, 3, 14, 9)),
    seg(2, 90, at(2024, 3, 14, 9), at(2024, 3, 14, 12)),
  ]);
  assert.deepEqual(rows[0].cycleLengths, [90], 'the unknown one is not collected as 0');
  assert.equal(rows[0].cycleLength, 90);
});

test('rankPatterns survives an empty set', () => {
  assert.deepEqual(rankPatterns([]), []);
  assert.deepEqual(rankPatterns(null), []);
});

/* -------------------------------------------------------------- day by day */

test('each day reports the pattern that ran longest on it', () => {
  const rows = dailyPatternUse([
    seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 15)),
    seg(3, 100, at(2024, 3, 14, 15), at(2024, 3, 14, 19)),
    seg(3, 100, at(2024, 3, 15, 6), at(2024, 3, 15, 18)),
    seg(2, 90, at(2024, 3, 15, 18), at(2024, 3, 15, 20)),
  ]);
  assert.deepEqual(rows.map((r) => r.dayKey), ['2024-03-14', '2024-03-15']);
  assert.equal(rows[0].top.pattern, 2, '9h beats 4h');
  assert.equal(rows[0].top.totalMs, 9 * HOUR);
  assert.equal(rows[0].top.cycleLength, 90);
  assert.equal(rows[1].top.pattern, 3, 'the other way round on the 15th');
  assert.equal(rows[1].patternCount, 2);
});

test('the day total is the time observed, and coverage says how much of the day that is', () => {
  const [row] = dailyPatternUse([seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 12))]);
  assert.equal(row.totalMs, 6 * HOUR);
  assert.ok(Math.abs(row.coverage - 6 / 24) < 1e-9);
  // Six hours of file is not a day where one pattern ran six hours and
  // nothing ran for eighteen, and the share must not pretend otherwise.
  assert.equal(row.top.share, 1);
});

test('a tie goes to the lower pattern number, every time', () => {
  const build = (order) => dailyPatternUse(order)[0].top.pattern;
  const a = seg(7, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 9));
  const b = seg(3, 90, at(2024, 3, 14, 9), at(2024, 3, 14, 12));
  // Same duration each. Whichever order they arrive in, the answer is stable.
  assert.equal(build([a, b]), 3);
  assert.equal(build([b, a]), 3);
});

test('days come back in date order however the segments arrived', () => {
  const rows = dailyPatternUse([
    seg(2, 90, at(2024, 3, 16, 6), at(2024, 3, 16, 9)),
    seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 9)),
    seg(2, 90, at(2024, 3, 15, 6), at(2024, 3, 15, 9)),
  ]);
  assert.deepEqual(rows.map((r) => r.dayKey), ['2024-03-14', '2024-03-15', '2024-03-16']);
});

/* ------------------------------------------------------------------ sorting */

const RANKED = () => rankPatterns([
  seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 16)),
  seg(3, 120, at(2024, 3, 14, 16), at(2024, 3, 14, 20)),
  seg(4, null, at(2024, 3, 14, 20), at(2024, 3, 14, 21)),
  seg(3, 120, at(2024, 3, 15, 6), at(2024, 3, 15, 8)),
]);

test('sortPatternRanking orders by each column', () => {
  const rows = RANKED();
  assert.deepEqual(sortPatternRanking(rows, 'totalMs').map((r) => r.pattern), [2, 3, 4]);
  assert.deepEqual(sortPatternRanking(rows, 'pattern').map((r) => r.pattern), [2, 3, 4]);
  assert.deepEqual(sortPatternRanking(rows, 'runCount').map((r) => r.pattern), [3, 2, 4]);
  assert.deepEqual(sortPatternRanking(rows, 'dayCount').map((r) => r.pattern), [3, 2, 4]);
});

test('a pattern with no cycle length sorts below one recorded as zero', () => {
  // Bad data does contain a 132 carrying zero. An unknown cycle length has to
  // sort below even that, or "we do not know" and "it said zero" land in the
  // same place and the reader cannot tell which they are looking at.
  const rows = sortPatternRanking(
    rankPatterns([
      seg(2, 90, at(2024, 3, 14, 6), at(2024, 3, 14, 16)),
      seg(3, 120, at(2024, 3, 14, 16), at(2024, 3, 14, 20)),
      seg(4, null, at(2024, 3, 14, 20), at(2024, 3, 14, 21)),
      seg(5, 0, at(2024, 3, 14, 21), at(2024, 3, 14, 22)),
    ]),
    'cycleLength',
  );
  assert.deepEqual(rows.map((r) => r.pattern), [3, 2, 5, 4]);
  assert.equal(rows[rows.length - 1].cycleLength, null, 'unknown is last');
  assert.equal(rows[rows.length - 2].cycleLength, 0, 'a recorded zero is above it');
});

test('sortPatternRanking reverses without disturbing the tie-break', () => {
  const rows = sortPatternRanking(RANKED(), 'totalMs', false);
  assert.deepEqual(rows.map((r) => r.pattern), [4, 3, 2]);
});

test('sortPatternRanking leaves the caller array alone', () => {
  const rows = RANKED();
  const before = rows.map((r) => r.pattern);
  // Sorted by a key that gives a genuinely different order, or an in-place
  // sort would leave the array looking untouched and prove nothing.
  const sorted = sortPatternRanking(rows, 'runCount');
  assert.notDeepEqual(sorted.map((r) => r.pattern), before, 'the fixture must reorder');
  assert.deepEqual(rows.map((r) => r.pattern), before, 'and the original is untouched');
});

test('an unknown sort key falls back to duration rather than scrambling', () => {
  assert.deepEqual(sortPatternRanking(RANKED(), 'nonsense').map((r) => r.pattern), [2, 3, 4]);
});

/* --------------------------------------------------------------- formatting */

test('formatDuration picks the unit the magnitude deserves', () => {
  assert.equal(formatDuration(45000), '45s');
  assert.equal(formatDuration(38 * 60000), '38m');
  assert.equal(formatDuration(4 * HOUR), '4h');
  assert.equal(formatDuration(4 * HOUR + 12 * 60000), '4h 12m');
  assert.equal(formatDuration(26 * HOUR), '1d 2h');
  assert.equal(formatDuration(48 * HOUR), '2d');
  assert.equal(formatDuration(-1), '—');
  assert.equal(formatDuration(NaN), '—');
});

test('dayKey names the local day, not the UTC one', () => {
  // 23:30 local on the 14th is already the 15th in UTC east of the meridian
  // and still the 14th west of it. The calendar is read in local time.
  const ms = at(2024, 3, 14, 23, 30);
  assert.equal(dayKey(ms), '2024-03-14');
  assert.equal(dayKey(at(2024, 3, 14, 0, 5)), '2024-03-14');
  assert.equal(dayKey(NaN), '');
});

/* --------------------------------------------------- segments and cycle length */

/** One controller event, in the shape the calendar's reader produces. */
const ev = (ms, eventCode, parameter) => ({
  eventCode, parameter, milliseconds: ms, iso: new Date(ms).toISOString(),
});

test('a cycle change logged just after a pattern change belongs to the new pattern', () => {
  // This is how a controller actually writes it: 131 first, then 132 a moment
  // later. Reading the cycle length in effect at the segment's first
  // millisecond credits each pattern with the one before it.
  const events = [
    ev(at(2024, 3, 14, 6), 131, 1),
    ev(at(2024, 3, 14, 6) + 1000, 132, 90),
    ev(at(2024, 3, 14, 9), 131, 2),
    ev(at(2024, 3, 14, 9) + 1000, 132, 110),
    ev(at(2024, 3, 14, 15), 131, 3),
    ev(at(2024, 3, 14, 15) + 1000, 132, 130),
  ];
  const segments = buildPatternSegments(events);
  assert.deepEqual(
    segments.map((s) => [s.pattern, s.cycleLength]),
    [[1, 90], [2, 110], [3, 130]],
  );
});

test('a pattern that logs no cycle change keeps the length already running', () => {
  // Two patterns at the same cycle length: the controller logs 132 once.
  const events = [
    ev(at(2024, 3, 14, 6), 131, 1),
    ev(at(2024, 3, 14, 6) + 1000, 132, 90),
    ev(at(2024, 3, 14, 9), 131, 2),
  ];
  const segments = buildPatternSegments(events);
  assert.deepEqual(segments.map((s) => s.cycleLength), [90, 90]);
});

test('a cycle change at the same instant as the pattern change still lands', () => {
  const ms = at(2024, 3, 14, 6);
  const segments = buildPatternSegments([ev(ms, 132, 90), ev(ms, 131, 1)]);
  assert.equal(segments[0].cycleLength, 90);
});

test('a pattern before any cycle change has no cycle length', () => {
  // Free operation logs no 132 at all, and inventing one for it would be worse
  // than saying so.
  const segments = buildPatternSegments([
    ev(at(2024, 3, 14, 0), 131, 254),
    ev(at(2024, 3, 14, 6), 131, 1),
    ev(at(2024, 3, 14, 6) + 1000, 132, 90),
  ]);
  assert.equal(segments[0].cycleLength, null);
  assert.equal(segments[1].cycleLength, 90);
});

test('a cycle change in the middle of a pattern is the one reported', () => {
  const segments = buildPatternSegments([
    ev(at(2024, 3, 14, 6), 131, 1),
    ev(at(2024, 3, 14, 6) + 1000, 132, 90),
    ev(at(2024, 3, 14, 7), 132, 100),
    ev(at(2024, 3, 14, 9), 131, 2),
  ]);
  assert.equal(segments[0].cycleLength, 100);
});

test('each segment runs to the start of the next', () => {
  const segments = buildPatternSegments([
    ev(at(2024, 3, 14, 6), 131, 1),
    ev(at(2024, 3, 14, 9), 131, 2),
    ev(at(2024, 3, 14, 15), 131, 3),
  ]);
  assert.equal(segments[0].endMillis, at(2024, 3, 14, 9));
  assert.equal(segments[1].endMillis, at(2024, 3, 14, 15));
  // The last one has nothing after it, so it ends at the last event read.
  assert.equal(segments[2].endMillis, at(2024, 3, 14, 15));
});

test('a file with no pattern or cycle events gives no segments', () => {
  assert.deepEqual(buildPatternSegments([ev(at(2024, 3, 14, 6), 1, 2)]), []);
  assert.deepEqual(buildPatternSegments([]), []);
});
