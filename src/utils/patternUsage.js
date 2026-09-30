/**
 * Which coordination patterns actually run, and for how long.
 *
 * A pattern calendar shows what ran when. It does not answer the question
 * that decides where to spend an afternoon: which patterns carry the day.
 * A signal can have a dozen patterns in its table while three of them cover
 * ninety per cent of the week, and those three are the ones worth studying.
 *
 * Everything here works from the segments the calendar already builds -- a
 * pattern, a cycle length, and a start and end -- so there is no second pass
 * over the raw file.
 *
 * Framework free, so it runs under `node --test`.
 */

const DAY_MS = 86400000;

/** Start of the local calendar day a moment falls in. */
export function dayStart(ms) {
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "2024-03-14" for a moment, in local time. */
export function dayKey(ms) {
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const startOf = (segment) =>
  Number.isFinite(segment.startMillis) ? segment.startMillis : Date.parse(segment.startIso);
const endOf = (segment) =>
  Number.isFinite(segment.endMillis) ? segment.endMillis : Date.parse(segment.endIso);

/**
 * Segments cut at midnight, so each piece belongs to exactly one day.
 *
 * An overnight pattern is one segment in the data and two entries here. Left
 * whole it would be counted against whichever day it started on, which is how
 * a pattern that runs 22:00 to 05:00 ends up looking like a seven-hour
 * evening plan and no night plan at all.
 */
export function splitSegmentsByDay(segments) {
  const out = [];
  for (const segment of segments || []) {
    const start = startOf(segment);
    const end = endOf(segment);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    let cursor = dayStart(start);
    while (cursor <= end) {
      const next = dayStart(cursor + DAY_MS + 3600000);
      const pieceStart = Math.max(start, cursor);
      const pieceEnd = Math.min(end, next);
      if (pieceEnd > pieceStart) {
        out.push({
          dayKey: dayKey(pieceStart),
          dayStartMs: cursor,
          pattern: segment.pattern,
          cycleLength: segment.cycleLength ?? null,
          startMs: pieceStart,
          endMs: pieceEnd,
          durationMs: pieceEnd - pieceStart,
        });
      }
      // Advanced through noon of the following day rather than by adding
      // 24 hours, so the two days a year that are 23 or 25 hours long do not
      // drift the boundary an hour into the wrong day.
      cursor = next;
    }
  }
  return out;
}

function summarise(list) {
  const cycleLengths = new Set();
  let latest = null;
  let latestAt = -Infinity;
  let totalMs = 0;
  let longestRunMs = 0;
  let firstMs = Infinity;
  let lastMs = -Infinity;
  for (const row of list) {
    totalMs += row.durationMs;
    if (row.durationMs > longestRunMs) longestRunMs = row.durationMs;
    if (row.startMs < firstMs) firstMs = row.startMs;
    if (row.endMs > lastMs) lastMs = row.endMs;
    if (row.cycleLength !== null && row.cycleLength !== undefined) {
      cycleLengths.add(row.cycleLength);
      if (row.startMs >= latestAt) {
        latestAt = row.startMs;
        latest = row.cycleLength;
      }
    }
  }
  return { cycleLengths, latest, totalMs, longestRunMs, firstMs, lastMs };
}

/**
 * One row per pattern, ranked by the time it ran.
 *
 * Runs are counted on the original segments rather than the per-day pieces:
 * an overnight pattern is one run that crossed midnight, not two, and
 * reporting two would overstate how often the controller switched.
 */
export function rankPatterns(segments) {
  const pieces = splitSegmentsByDay(segments);
  if (!pieces.length) return [];

  const byPattern = new Map();
  for (const piece of pieces) {
    if (!byPattern.has(piece.pattern)) byPattern.set(piece.pattern, []);
    byPattern.get(piece.pattern).push(piece);
  }

  const runCounts = new Map();
  for (const segment of segments || []) {
    const start = startOf(segment);
    const end = endOf(segment);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    runCounts.set(segment.pattern, (runCounts.get(segment.pattern) || 0) + 1);
  }

  const observedMs = pieces.reduce((sum, piece) => sum + piece.durationMs, 0);

  const rows = [...byPattern.entries()].map(([pattern, list]) => {
    const stats = summarise(list);
    return {
      pattern,
      totalMs: stats.totalMs,
      // Share of the time the data actually covers, not of a calendar week:
      // a file holding three weekdays would otherwise report every pattern at
      // a fraction of its real prominence.
      share: observedMs ? stats.totalMs / observedMs : 0,
      dayCount: new Set(list.map((piece) => piece.dayKey)).size,
      runCount: runCounts.get(pattern) || 0,
      longestRunMs: stats.longestRunMs,
      cycleLengths: [...stats.cycleLengths].sort((a, b) => a - b),
      cycleLength: stats.latest,
      firstMs: stats.firstMs,
      lastMs: stats.lastMs,
    };
  });

  // Longest-running first, because that is the order the question is asked in.
  return rows.sort((a, b) => b.totalMs - a.totalMs || a.pattern - b.pattern);
}

/**
 * One row per day, with the pattern that ran longest on it.
 *
 * Ties go to the lower pattern number rather than to whichever happened to be
 * seen first, so the same data always reports the same winner.
 */
export function dailyPatternUse(segments) {
  const pieces = splitSegmentsByDay(segments);
  const byDay = new Map();
  for (const piece of pieces) {
    if (!byDay.has(piece.dayKey)) {
      byDay.set(piece.dayKey, { dayKey: piece.dayKey, dayStartMs: piece.dayStartMs, pieces: [] });
    }
    byDay.get(piece.dayKey).pieces.push(piece);
  }

  return [...byDay.values()]
    .sort((a, b) => a.dayStartMs - b.dayStartMs)
    .map((day) => {
      const byPattern = new Map();
      for (const piece of day.pieces) {
        if (!byPattern.has(piece.pattern)) byPattern.set(piece.pattern, []);
        byPattern.get(piece.pattern).push(piece);
      }
      const totalMs = day.pieces.reduce((sum, piece) => sum + piece.durationMs, 0);
      const patterns = [...byPattern.entries()]
        .map(([pattern, list]) => {
          const stats = summarise(list);
          return {
            pattern,
            totalMs: stats.totalMs,
            share: totalMs ? stats.totalMs / totalMs : 0,
            cycleLength: stats.latest,
          };
        })
        .sort((a, b) => b.totalMs - a.totalMs || a.pattern - b.pattern);

      return {
        dayKey: day.dayKey,
        dayStartMs: day.dayStartMs,
        totalMs,
        // Share of the whole day, which says how much of it the data covers:
        // a day with four hours of file is not a day where one pattern ran
        // for four hours and nothing ran for twenty.
        coverage: totalMs / DAY_MS,
        patternCount: patterns.length,
        patterns,
        top: patterns[0] || null,
      };
    });
}

/** Columns the ranking table can be ordered by, and how each one sorts. */
export const PATTERN_SORTS = {
  pattern: (a, b) => a.pattern - b.pattern,
  totalMs: (a, b) => b.totalMs - a.totalMs,
  share: (a, b) => b.share - a.share,
  dayCount: (a, b) => b.dayCount - a.dayCount,
  runCount: (a, b) => b.runCount - a.runCount,
  longestRunMs: (a, b) => b.longestRunMs - a.longestRunMs,
  // A pattern with no cycle length recorded sorts last either way rather than
  // reading as a zero-second cycle.
  cycleLength: (a, b) => (b.cycleLength ?? -Infinity) - (a.cycleLength ?? -Infinity),
};

export function sortPatternRanking(rows, key, descending = true) {
  const compare = PATTERN_SORTS[key] || PATTERN_SORTS.totalMs;
  const sorted = [...(rows || [])].sort((a, b) => compare(a, b) || a.pattern - b.pattern);
  return descending ? sorted : sorted.reverse();
}

/** "4h 12m", or "38m", or "45s" -- whatever the magnitude deserves. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes - hours * 60;
  if (hours < 24) return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours - days * 24;
  return restHours ? `${days}d ${restHours}h` : `${days}d`;
}

/**
 * Pattern segments, each carrying the cycle length that ran during it.
 *
 * A controller logs the cycle-length change (132) a moment *after* the
 * pattern change (131) that caused it, not at the same instant. Stamping a
 * new segment with whatever cycle length happens to be in effect at its first
 * millisecond therefore credits it with the *previous* pattern's cycle, and
 * every pattern in the file ends up one step behind. So a 132 arriving while
 * a segment is open is written back onto that segment.
 *
 * A pattern that reuses the cycle length of the one before it logs no 132 at
 * all, which is why the value carried in is still the starting point rather
 * than leaving it unknown.
 *
 * Events must carry `eventCode`, `parameter`, `milliseconds` and `iso`.
 */
export function buildPatternSegments(rawEvents) {
  const filtered = (rawEvents || []).filter(
    (event) => event.eventCode === 131 || event.eventCode === 132,
  );
  if (!filtered.length) return [];

  const grouped = new Map();
  for (const event of filtered) {
    const key = event.milliseconds;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => a - b);
  let currentCycle = null;
  const segments = [];

  for (const timestamp of sortedKeys) {
    const events = grouped.get(timestamp) || [];

    let cycleHere = null;
    for (const event of events) {
      if (event.eventCode === 132) cycleHere = event.parameter;
    }
    if (cycleHere !== null) {
      currentCycle = cycleHere;
      const open = segments[segments.length - 1];
      if (open) open.cycleLength = cycleHere;
    }

    for (const event of events) {
      if (event.eventCode !== 131) continue;
      const previous = segments[segments.length - 1];
      if (previous) {
        previous.endIso = event.iso;
        previous.endMillis = event.milliseconds;
      }
      segments.push({
        pattern: event.parameter,
        cycleLength: currentCycle,
        startIso: event.iso,
        startMillis: event.milliseconds,
        endIso: event.iso,
        endMillis: event.milliseconds,
      });
    }
  }

  const lastEvent = (rawEvents || [])[rawEvents.length - 1];
  if (segments.length && lastEvent) {
    segments[segments.length - 1].endIso = lastEvent.iso;
    segments[segments.length - 1].endMillis = lastEvent.milliseconds;
  }

  return segments.filter((segment) => segment.pattern !== null);
}
