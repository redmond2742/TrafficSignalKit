/**
 * Preemption Evaluator
 *
 * Turns raw high-resolution controller data into discrete preemption events:
 * when each one ran, how long it lasted, which preempt channel served it, and
 * how the time split across entry, track clearance, dwell and exit.
 *
 * Framework free so it runs in a view, in a Web Worker, or under `node --test`.
 *
 * Performance note: high-resolution files are dominated by phase and detector
 * rows, and preemption is typically well under 1% of them. The scan therefore
 * rejects a row on its event code before it does any timestamp work, and it
 * reads that code straight out of the source string without allocating a
 * per-line array or substring. See scanPreemptionRows.
 */

import { parseTimestamp } from './highResTimestamp.js';

/** Event codes that belong to a preemption sequence, with their role. */
export const PREEMPT_CODES = {
  101: { label: 'Advance warning', role: 'warning', short: 'AW' },
  102: { label: 'Call input on', role: 'callOn', short: 'Call on' },
  103: { label: 'Gate down received', role: 'gateDown', short: 'Gate' },
  104: { label: 'Call input off', role: 'callOff', short: 'Call off' },
  105: { label: 'Entry started', role: 'entry', short: 'Entry' },
  106: { label: 'Begin track clearance', role: 'trackClear', short: 'Track' },
  107: { label: 'Begin dwell service', role: 'dwell', short: 'Dwell' },
  108: { label: 'Link active on', role: 'linkOn', short: 'Link on' },
  109: { label: 'Link active off', role: 'linkOff', short: 'Link off' },
  110: { label: 'Max presence exceeded', role: 'maxPresence', short: 'Max pres' },
  111: { label: 'Begin exit interval', role: 'exit', short: 'Exit' },
  116: { label: 'Preemption force off', role: 'forceOff', short: 'Force off' },
};

export const PREEMPT_MIN = 101;
export const PREEMPT_MAX = 116;

/**
 * Code -> role lookup as a dense array indexed by event code. A bare array
 * index is the cheapest test available in the hot loop; codes outside the
 * range never reach it.
 */
const ROLE_BY_CODE = (() => {
  const table = new Array(PREEMPT_MAX + 1).fill(null);
  for (const [code, meta] of Object.entries(PREEMPT_CODES)) table[Number(code)] = meta.role;
  return table;
})();

/** Codes that can begin a new preemption event. */
const START_ROLES = new Set(['warning', 'callOn', 'entry']);
/** Codes that mean the current event has reached its end. */
const TERMINAL_ROLES = new Set(['exit', 'forceOff']);

const DELIMITERS = [44, 59, 9]; // , ; tab
const CH_SPACE = 32;
const CH_TAB = 9;
const CH_CR = 13;
const CH_QUOTE = 34;

/** Default cut-off before an un-terminated event is abandoned as incomplete. */
export const DEFAULT_MAX_EVENT_SECONDS = 900;

/**
 * Reads a base-10 integer straight out of `src` between two offsets, ignoring
 * surrounding spaces, tabs and quotes. Returns -1 for anything that is not a
 * plain non-negative integer. Avoids the substring + parseInt pair that would
 * otherwise allocate twice for every row in the file.
 */
function parseIntSpan(src, start, end) {
  let i = start;
  let j = end;
  while (i < j) {
    const c = src.charCodeAt(i);
    if (c === CH_SPACE || c === CH_TAB || c === CH_QUOTE) i += 1;
    else break;
  }
  while (j > i) {
    const c = src.charCodeAt(j - 1);
    if (c === CH_SPACE || c === CH_TAB || c === CH_CR || c === CH_QUOTE) j -= 1;
    else break;
  }
  if (i >= j) return -1;
  let value = 0;
  for (let k = i; k < j; k += 1) {
    const c = src.charCodeAt(k);
    if (c < 48 || c > 57) return -1;
    value = value * 10 + (c - 48);
    if (value > 9999999) return -1;
  }
  return value;
}

/** Trims spaces, tabs and quotes off a span before slicing it out. */
function sliceSpan(src, start, end) {
  let i = start;
  let j = end;
  while (i < j) {
    const c = src.charCodeAt(i);
    if (c === CH_SPACE || c === CH_TAB || c === CH_QUOTE) i += 1;
    else break;
  }
  while (j > i) {
    const c = src.charCodeAt(j - 1);
    if (c === CH_SPACE || c === CH_TAB || c === CH_CR || c === CH_QUOTE) j -= 1;
    else break;
  }
  return src.slice(i, j);
}

/**
 * Works out the delimiter and which column holds the timestamp, by trying the
 * candidates against a sample of real lines. Exporters vary: some write
 * `timestamp, code, param`, others lead with a signal ID column.
 *
 * Done once per file so the scan itself can use fixed offsets.
 */
export function detectLayout(text, sampleLines = 60) {
  const src = String(text || '');
  const candidates = [];
  for (const delimiter of DELIMITERS) {
    for (const tsCol of [0, 1]) candidates.push({ delimiter, tsCol, score: 0 });
  }

  let pos = 0;
  let seen = 0;
  const len = src.length;
  while (pos < len && seen < sampleLines) {
    let eol = src.indexOf('\n', pos);
    if (eol === -1) eol = len;
    let end = eol;
    if (end > pos && src.charCodeAt(end - 1) === CH_CR) end -= 1;
    const line = src.slice(pos, end).trim();
    pos = eol + 1;
    if (!line || line.startsWith('#')) continue;
    seen += 1;
    for (const candidate of candidates) {
      const cells = line.split(String.fromCharCode(candidate.delimiter));
      if (cells.length < candidate.tsCol + 3) continue;
      const code = Number(String(cells[candidate.tsCol + 1]).trim());
      const param = Number(String(cells[candidate.tsCol + 2]).trim());
      if (!Number.isInteger(code) || !Number.isInteger(param)) continue;
      if (!Number.isFinite(parseTimestamp(cells[candidate.tsCol]))) continue;
      candidate.score += 1;
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.tsCol - b.tsCol);
  const best = candidates[0];
  return {
    delimiter: best.score > 0 ? best.delimiter : DELIMITERS[0],
    tsCol: best.score > 0 ? best.tsCol : 0,
    confident: best.score > 0,
    sampled: seen,
  };
}

/**
 * Single pass over the raw text keeping only preemption rows.
 *
 * The input is walked with indexOf rather than split('\n') so a large paste
 * never has to materialise one string per line, and each row is rejected on
 * its event code before the timestamp is parsed or sliced.
 */
export function scanPreemptionRows(text, layout, options = {}) {
  const src = String(text || '');
  const len = src.length;
  const { delimiter, tsCol } = layout;
  const codeCol = tsCol + 1;
  const paramCol = tsCol + 2;
  // When the export leads with a signal ID column, that column names the
  // signal; otherwise every row belongs to whatever the caller labelled it.
  const idCol = tsCol > 0 ? tsCol - 1 : -1;
  const fallbackSignal = options.signal || '';

  const rows = [];
  let scanned = 0;
  let malformed = 0;
  let badTimestamps = 0;
  let pos = 0;
  let sorted = true;
  let lastTs = -Infinity;

  while (pos < len) {
    let eol = src.indexOf('\n', pos);
    if (eol === -1) eol = len;
    let end = eol;
    if (end > pos && src.charCodeAt(end - 1) === CH_CR) end -= 1;

    if (end > pos) {
      scanned += 1;
      // Locate only the three fields we need, then stop walking the line.
      let field = 0;
      let fieldStart = pos;
      let tsS = -1;
      let tsE = -1;
      let cS = -1;
      let cE = -1;
      let pS = -1;
      let pE = -1;
      let iS = -1;
      let iE = -1;
      for (let i = pos; i <= end; i += 1) {
        if (i === end || src.charCodeAt(i) === delimiter) {
          if (field === idCol) {
            iS = fieldStart;
            iE = i;
          } else if (field === tsCol) {
            tsS = fieldStart;
            tsE = i;
          } else if (field === codeCol) {
            cS = fieldStart;
            cE = i;
          } else if (field === paramCol) {
            pS = fieldStart;
            pE = i;
            break;
          }
          field += 1;
          fieldStart = i + 1;
        }
      }

      if (pE === -1) {
        malformed += 1;
      } else {
        const code = parseIntSpan(src, cS, cE);
        // The filter that makes this cheap: everything that is not preemption
        // leaves here, having allocated nothing at all.
        if (code >= PREEMPT_MIN && code <= PREEMPT_MAX && ROLE_BY_CODE[code]) {
          const channel = parseIntSpan(src, pS, pE);
          const tsMs = parseTimestamp(sliceSpan(src, tsS, tsE));
          if (!Number.isFinite(tsMs) || channel < 0) {
            badTimestamps += 1;
          } else {
            if (tsMs < lastTs) sorted = false;
            lastTs = tsMs;
            const signal = iE > iS ? sliceSpan(src, iS, iE) || fallbackSignal : fallbackSignal;
            rows.push({ tsMs, code, channel, signal, role: ROLE_BY_CODE[code] });
          }
        }
      }
    }
    pos = eol + 1;
  }

  if (!sorted) rows.sort((a, b) => a.tsMs - b.tsMs || a.code - b.code);
  const signals = [...new Set(rows.map((row) => row.signal))].filter(Boolean).sort();
  return { rows, scanned, malformed, badTimestamps, wasSorted: sorted, signals };
}

function newEvent(row) {
  return {
    signal: row.signal || '',
    channel: row.channel,
    startMs: row.tsMs,
    endMs: row.tsMs,
    marks: {},
    codes: [],
  };
}

/**
 * Two signals can both have a preempt channel 1, and they are different
 * inputs. Grouping on channel alone would interleave them into one sequence.
 */
function sequenceKey(row) {
  return `${row.signal || ''}\u0000${row.channel}`;
}

/** Records the first timestamp seen for each role inside an event. */
function addRow(event, row) {
  if (event.marks[row.role] === undefined) event.marks[row.role] = row.tsMs;
  event.codes.push({ tsMs: row.tsMs, code: row.code, role: row.role });
  if (row.tsMs > event.endMs) event.endMs = row.tsMs;
}

function hasTerminal(event) {
  for (const role of TERMINAL_ROLES) {
    if (event.marks[role] !== undefined) return true;
  }
  return false;
}

function span(marks, from, to) {
  const a = marks[from];
  const b = marks[to];
  if (a === undefined || b === undefined || b < a) return null;
  return b - a;
}

/**
 * Classifies an event. `callOnly` is the one worth looking for: a preempt
 * call that the controller registered but never entered.
 */
function classify(marks) {
  const entered = marks.entry !== undefined;
  const exited = marks.exit !== undefined || marks.forceOff !== undefined;
  if (entered && exited) return 'complete';
  if (entered) return 'noExit';
  if (marks.callOn !== undefined || marks.warning !== undefined) return 'callOnly';
  return 'partial';
}

export const STATUS_LABELS = {
  complete: 'Complete',
  noExit: 'No exit logged',
  callOnly: 'Call never served',
  partial: 'Partial',
};

/**
 * Groups scanned rows into discrete events, one sequence at a time per channel.
 *
 * A new event begins when a start code arrives and the open event on that
 * channel has already reached its exit, has repeated a start code, or has run
 * past maxEventSeconds without terminating (truncated data).
 */
export function buildPreemptionEvents(rows, options = {}) {
  const maxEventMs = Math.max(1, options.maxEventSeconds || DEFAULT_MAX_EVENT_SECONDS) * 1000;
  const open = new Map();
  const events = [];

  const close = (event) => {
    const marks = event.marks;
    const status = classify(marks);
    // The event spans every code logged for it, so an advance warning ahead of
    // the call is inside the bar rather than dangling before its own event.
    const startMs = event.startMs;
    const serviceStart = marks.entry ?? startMs;
    const serviceEnd = marks.exit ?? marks.forceOff ?? event.endMs;
    events.push({
      signal: event.signal,
      channel: event.channel,
      startMs,
      endMs: event.endMs,
      durationMs: Math.max(0, event.endMs - startMs),
      serviceStartMs: serviceStart,
      serviceEndMs: serviceEnd,
      serviceMs: Math.max(0, serviceEnd - serviceStart),
      status,
      marks,
      codes: event.codes,
      segments: {
        callToEntry: span(marks, 'callOn', 'entry'),
        callHeld: span(marks, 'callOn', 'callOff'),
        entryToTrack: span(marks, 'entry', 'trackClear'),
        trackClearance: span(marks, 'trackClear', 'dwell'),
        dwell: span(marks, 'dwell', 'exit') ?? span(marks, 'dwell', 'forceOff'),
        // Null, not zero, when the exit interval is the last thing logged: its
        // end is not a preemption code, so the data does not say how long it ran.
        exitToEnd:
          marks.exit !== undefined && event.endMs > marks.exit ? event.endMs - marks.exit : null,
      },
      codeCount: event.codes.length,
    });
  };

  for (const row of rows) {
    const key = sequenceKey(row);
    const current = open.get(key);
    if (!current) {
      const started = newEvent(row);
      addRow(started, row);
      open.set(key, started);
      continue;
    }

    const isStart = START_ROLES.has(row.role);
    const repeated = current.marks[row.role] !== undefined;
    const tooLong = row.tsMs - current.startMs > maxEventMs;
    // Mid-sequence codes always join the open event; only a start code, or an
    // event that has clearly run away, can split one.
    const shouldSplit = (isStart && (hasTerminal(current) || repeated)) || tooLong;

    if (shouldSplit) {
      close(current);
      const started = newEvent(row);
      addRow(started, row);
      open.set(key, started);
    } else {
      addRow(current, row);
    }
  }

  for (const event of open.values()) close(event);
  events.sort(
    (a, b) =>
      a.startMs - b.startMs ||
      (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0) ||
      a.channel - b.channel,
  );
  return events;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Per-channel rollup plus an overall row, for the summary table. */
export function summarizePreemption(events) {
  const byChannel = new Map();
  for (const event of events) {
    // Keyed by signal as well as channel: two signals both having a preempt 1
    // is normal, and rolling them together would report one intersection's
    // numbers as the other's.
    const key = `${event.signal || ''}\u0000${event.channel}`;
    let bucket = byChannel.get(key);
    if (!bucket) {
      bucket = {
        signal: event.signal || '',
        channel: event.channel,
        count: 0,
        durations: [],
        entryDelays: [],
        statuses: { complete: 0, noExit: 0, callOnly: 0, partial: 0 },
        firstMs: event.startMs,
        lastMs: event.endMs,
        totalMs: 0,
      };
      byChannel.set(key, bucket);
    }
    bucket.count += 1;
    bucket.statuses[event.status] += 1;
    bucket.totalMs += event.durationMs;
    if (event.durationMs > 0) bucket.durations.push(event.durationMs);
    if (event.segments.callToEntry !== null) bucket.entryDelays.push(event.segments.callToEntry);
    if (event.startMs < bucket.firstMs) bucket.firstMs = event.startMs;
    if (event.endMs > bucket.lastMs) bucket.lastMs = event.endMs;
  }

  const channels = [...byChannel.values()].map((bucket) => {
    const durations = bucket.durations.slice().sort((a, b) => a - b);
    const delays = bucket.entryDelays.slice().sort((a, b) => a - b);
    return {
      signal: bucket.signal,
      channel: bucket.channel,
      count: bucket.count,
      statuses: bucket.statuses,
      totalMs: bucket.totalMs,
      minMs: durations.length ? durations[0] : null,
      medianMs: quantile(durations, 0.5),
      maxMs: durations.length ? durations[durations.length - 1] : null,
      meanMs: durations.length ? bucket.totalMs / bucket.count : null,
      medianEntryDelayMs: quantile(delays, 0.5),
      firstMs: bucket.firstMs,
      lastMs: bucket.lastMs,
    };
  });
  channels.sort(
    (a, b) => (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0) || a.channel - b.channel,
  );

  const allDurations = events.filter((e) => e.durationMs > 0).map((e) => e.durationMs).sort((a, b) => a - b);
  return {
    channels,
    totals: {
      events: events.length,
      channels: channels.length,
      totalMs: events.reduce((sum, e) => sum + e.durationMs, 0),
      medianMs: quantile(allDurations, 0.5),
      maxMs: allDurations.length ? allDurations[allDurations.length - 1] : null,
      firstMs: events.length ? Math.min(...events.map((e) => e.startMs)) : null,
      lastMs: events.length ? Math.max(...events.map((e) => e.endMs)) : null,
      statuses: events.reduce(
        (acc, e) => {
          acc[e.status] += 1;
          return acc;
        },
        { complete: 0, noExit: 0, callOnly: 0, partial: 0 },
      ),
    },
  };
}

/** Whole pipeline: raw text in, events and stats out. */
export function evaluatePreemption(text, options = {}) {
  const layout = options.layout || detectLayout(text);
  const scan = scanPreemptionRows(text, layout, { signal: options.signal });
  const events = buildPreemptionEvents(scan.rows, options);
  const summary = summarizePreemption(events);
  return {
    layout,
    events,
    summary,
    signals: scan.signals,
    stats: {
      scanned: scan.scanned,
      kept: scan.rows.length,
      malformed: scan.malformed,
      badTimestamps: scan.badTimestamps,
      wasSorted: scan.wasSorted,
      keptPercent: scan.scanned ? (scan.rows.length / scan.scanned) * 100 : 0,
    },
  };
}

/** Seconds, to one decimal, for display. Null stays null so the UI can dash it. */
export function toSeconds(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null;
  return Math.round(ms / 100) / 10;
}

const CSV_COLUMNS = [
  'signal',
  'channel',
  'date',
  'start',
  'end',
  'duration_s',
  'status',
  'call_to_entry_s',
  'call_held_s',
  'track_clearance_s',
  'dwell_s',
  'exit_to_end_s',
  'codes',
];

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Exports the event table, using the same formatter the UI shows. */
export function eventsToCsv(events, formatStamp, options) {
  const stamp = formatStamp || ((ms) => new Date(ms).toISOString());
  // The calendar day in its own column. It is derivable from the timestamp,
  // but a spreadsheet cannot group by "the date part of a string" without
  // being told how the string is laid out, and that is the grouping this
  // export exists for.
  const dayOf = (options && options.date) || ((ms) => stamp(ms).slice(0, 10));
  // Direction and phases come from a GTSS export, which the util has no
  // business loading; the caller that has one passes a lookup.
  const describe = (options && options.channel) || (() => null);
  const named = events.some((event) => describe(event));
  const columns = named
    ? [...CSV_COLUMNS.slice(0, 2), 'direction', 'phases', ...CSV_COLUMNS.slice(2)]
    : CSV_COLUMNS;

  const lines = [columns.join(',')];
  for (const event of events) {
    const info = named ? describe(event) || {} : null;
    lines.push(
      [
        event.signal,
        event.channel,
        ...(named ? [info.direction || '', info.phases || ''] : []),
        dayOf(event.startMs),
        stamp(event.startMs),
        stamp(event.endMs),
        toSeconds(event.durationMs),
        STATUS_LABELS[event.status],
        toSeconds(event.segments.callToEntry),
        toSeconds(event.segments.callHeld),
        toSeconds(event.segments.trackClearance),
        toSeconds(event.segments.dwell),
        toSeconds(event.segments.exitToEnd),
        event.codes.map((c) => c.code).join(' '),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

/** Minutes in a day, for the scatter's y axis. */
export const MINUTES_PER_DAY = 1440;

/**
 * One point per event, positioned by date and time of day.
 *
 * This is the screen for unauthorised preemption emitters. A vehicle carrying
 * one calls the signal on its own commute, so its events land at close to the
 * same minute of the day, on weekdays, again and again -- a near-horizontal
 * row of dots. Genuine emergency calls have no such structure and scatter.
 *
 * Both axes are local time: an emitter's signature is tied to a human
 * schedule, so shifting it into UTC would smear the pattern across two rows
 * for anyone east or west of the meridian.
 */
export function buildScatterPoints(events) {
  return (events || []).map((event) => {
    const at = new Date(event.startMs);
    const midnight = new Date(
      at.getFullYear(),
      at.getMonth(),
      at.getDate(),
    ).getTime();
    const day = at.getDay();
    return {
      signal: event.signal || '',
      channel: event.channel,
      dateMs: midnight,
      minuteOfDay: at.getHours() * 60 + at.getMinutes() + at.getSeconds() / 60,
      weekday: day,
      isWeekend: day === 0 || day === 6,
      startMs: event.startMs,
      durationMs: event.durationMs,
      status: event.status,
    };
  });
}

/** How a scatter series is identified: one signal's one channel. */
export function seriesKey(signal, channel) {
  return signal ? `${signal} · Preempt ${channel}` : `Preempt ${channel}`;
}

/**
 * Evaluates several pasted or uploaded sources as one dataset.
 *
 * Each source carries its own label, which becomes the signal name unless the
 * data itself leads with a signal ID column -- in which case that wins, since
 * a single export can hold several signals.
 */
export function evaluateSources(sources, options = {}) {
  const events = [];
  const stats = { scanned: 0, kept: 0, malformed: 0, badTimestamps: 0 };
  const perSource = [];
  const signals = new Set();

  for (const source of sources || []) {
    const text = source && source.text;
    if (!text || !String(text).trim()) continue;
    const result = evaluatePreemption(text, { ...options, signal: source.label || '' });
    events.push(...result.events);
    stats.scanned += result.stats.scanned;
    stats.kept += result.stats.kept;
    stats.malformed += result.stats.malformed;
    stats.badTimestamps += result.stats.badTimestamps;
    for (const signal of result.signals) signals.add(signal);
    perSource.push({
      label: source.label || '',
      events: result.events.length,
      signals: result.signals,
      stats: result.stats,
    });
  }

  events.sort(
    (a, b) =>
      a.startMs - b.startMs ||
      (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0) ||
      a.channel - b.channel,
  );

  return {
    events,
    perSource,
    signals: [...signals].sort(),
    summary: summarizePreemption(events),
    stats: {
      ...stats,
      keptPercent: stats.scanned ? (stats.kept / stats.scanned) * 100 : 0,
    },
  };
}

/** Heatmap rows, Monday first so the working week is contiguous. */
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Date#getDay is Sunday-first; this maps it onto the row order above. */
const ROW_BY_DAY = [6, 0, 1, 2, 3, 4, 5];

export const HOURS_PER_DAY = 24;

/**
 * An hour-by-weekday grid of event counts, one per signal and channel.
 *
 * The scatter answers "is this the same time every day"; this answers "is it
 * only on working days". An emitter riding a commute concentrates into a few
 * cells in the Monday-to-Friday rows. Apparatus responding to real calls is
 * spread across the whole week, because emergencies do not keep office hours.
 *
 * Local time, for the same reason the scatter uses it: the pattern is tied to
 * a human schedule, and a UTC hour would shift it for anyone off the meridian.
 */
export function buildHourWeekdayGrids(events) {
  const bySeries = new Map();

  for (const event of events || []) {
    const key = `${event.signal || ''}\u0000${event.channel}`;
    let grid = bySeries.get(key);
    if (!grid) {
      grid = {
        signal: event.signal || '',
        channel: event.channel,
        counts: Array.from({ length: WEEKDAY_LABELS.length }, () =>
          new Array(HOURS_PER_DAY).fill(0)),
        total: 0,
        weekdayCount: 0,
      };
      bySeries.set(key, grid);
    }
    const at = new Date(event.startMs);
    const row = ROW_BY_DAY[at.getDay()];
    grid.counts[row][at.getHours()] += 1;
    grid.total += 1;
    // Rows 0-4 are Monday to Friday.
    if (row < 5) grid.weekdayCount += 1;
  }

  const grids = [...bySeries.values()].map((grid) => {
    let max = 0;
    let peak = null;
    for (let row = 0; row < grid.counts.length; row += 1) {
      for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
        const count = grid.counts[row][hour];
        if (count > max) {
          max = count;
          peak = { weekday: WEEKDAY_LABELS[row], hour, count };
        }
      }
    }
    return {
      ...grid,
      max,
      peak,
      // Reported as a plain share, not a score: what it means is the
      // engineer's call, and scheduled transit looks much the same.
      weekdayShare: grid.total ? grid.weekdayCount / grid.total : 0,
    };
  });

  grids.sort(
    (a, b) => (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0) || a.channel - b.channel,
  );
  return grids;
}
