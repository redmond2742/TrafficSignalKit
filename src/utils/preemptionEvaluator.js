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
export function scanPreemptionRows(text, layout) {
  const src = String(text || '');
  const len = src.length;
  const { delimiter, tsCol } = layout;
  const codeCol = tsCol + 1;
  const paramCol = tsCol + 2;

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
      for (let i = pos; i <= end; i += 1) {
        if (i === end || src.charCodeAt(i) === delimiter) {
          if (field === tsCol) {
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
            rows.push({ tsMs, code, channel, role: ROLE_BY_CODE[code] });
          }
        }
      }
    }
    pos = eol + 1;
  }

  if (!sorted) rows.sort((a, b) => a.tsMs - b.tsMs || a.code - b.code);
  return { rows, scanned, malformed, badTimestamps, wasSorted: sorted };
}

function newEvent(row) {
  return {
    channel: row.channel,
    startMs: row.tsMs,
    endMs: row.tsMs,
    marks: {},
    codes: [],
  };
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
    const current = open.get(row.channel);
    if (!current) {
      const started = newEvent(row);
      addRow(started, row);
      open.set(row.channel, started);
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
      open.set(row.channel, started);
    } else {
      addRow(current, row);
    }
  }

  for (const event of open.values()) close(event);
  events.sort((a, b) => a.startMs - b.startMs || a.channel - b.channel);
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
    let bucket = byChannel.get(event.channel);
    if (!bucket) {
      bucket = {
        channel: event.channel,
        count: 0,
        durations: [],
        entryDelays: [],
        statuses: { complete: 0, noExit: 0, callOnly: 0, partial: 0 },
        firstMs: event.startMs,
        lastMs: event.endMs,
        totalMs: 0,
      };
      byChannel.set(event.channel, bucket);
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
  channels.sort((a, b) => a.channel - b.channel);

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
  const scan = scanPreemptionRows(text, layout);
  const events = buildPreemptionEvents(scan.rows, options);
  const summary = summarizePreemption(events);
  return {
    layout,
    events,
    summary,
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
  'channel',
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
export function eventsToCsv(events, formatStamp) {
  const stamp = formatStamp || ((ms) => new Date(ms).toISOString());
  const lines = [CSV_COLUMNS.join(',')];
  for (const event of events) {
    lines.push(
      [
        event.channel,
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
