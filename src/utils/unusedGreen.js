/**
 * Unused green: time the middle of an intersection is given away to nobody.
 *
 * A phase is green and no vehicle is over its detectors. Nothing is crossing,
 * nothing is waiting, and every second of it is time some other movement
 * could have had. Two shapes of it matter, and the second is the one that
 * usually goes unnoticed:
 *
 *   1. Green with the detectors quiet -- a gap in the platoon, an over-long
 *      minimum, a phase that keeps getting served with no demand behind it.
 *   2. Green held past a pedestrian phase that has already finished. The walk
 *      and clearance are over, the don't-walk is solid, and the green runs on
 *      with nothing on the detectors until yellow.
 *
 * What this cannot know: whether a vehicle was present but undetected, and
 * whether a detector that dropped belongs to a vehicle still in the box. The
 * second is handled by crediting every drop with a clearance allowance; the
 * first is why this estimates rather than measures, and why the settings are
 * on the page rather than buried here.
 *
 * Framework free, so it runs in a view, in a Web Worker, or under `node --test`.
 */

import { parseTimestamp } from './highResTimestamp.js';
import { detectLayout } from './preemptionEvaluator.js';

export { detectLayout };

export const PHASE_BEGIN_GREEN = 1;
export const PHASE_BEGIN_YELLOW = 8;
/** Walk, flashing don't walk, then solid don't walk: the ped phase is over at 23. */
export const PED_BEGIN_WALK = 21;
export const PED_BEGIN_CLEARANCE = 22;
export const PED_BEGIN_SOLID = 23;
export const DETECTOR_ON = 82;
export const DETECTOR_OFF = 81;

/** Seconds credited to a vehicle after its detector drops, to cross the box. */
export const DEFAULT_CLEARANCE_SECONDS = 3;
/** Idle shorter than this is a gap in a platoon, not a reclaimable second. */
export const DEFAULT_MIN_GAP_SECONDS = 3;

const KEEP = (() => {
  const table = new Array(DETECTOR_ON + 1).fill(false);
  for (const code of [
    PHASE_BEGIN_GREEN, PHASE_BEGIN_YELLOW,
    PED_BEGIN_WALK, PED_BEGIN_CLEARANCE, PED_BEGIN_SOLID,
    DETECTOR_ON, DETECTOR_OFF,
  ]) table[code] = true;
  return table;
})();

const CH_SPACE = 32;
const CH_TAB = 9;
const CH_CR = 13;
const CH_QUOTE = 34;

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
 * One pass, keeping only the seven codes this needs.
 *
 * A day of high-resolution data for one signal is mostly rows with no bearing
 * on any of this, so a row is rejected on its event code before a timestamp
 * is parsed or a substring allocated.
 */
export function scanGreenRows(text, layout) {
  const src = String(text || '');
  const len = src.length;
  const { delimiter, tsCol } = layout;
  const codeCol = tsCol + 1;
  const paramCol = tsCol + 2;

  const signal = [];
  const detector = [];
  const channels = new Set();
  const phases = new Set();
  let scanned = 0;
  let malformed = 0;
  let unreadable = 0;
  let pos = 0;
  let sorted = true;
  let last = -Infinity;

  while (pos < len) {
    let eol = src.indexOf('\n', pos);
    if (eol === -1) eol = len;
    let end = eol;
    if (end > pos && src.charCodeAt(end - 1) === CH_CR) end -= 1;

    if (end > pos) {
      scanned += 1;
      let field = 0;
      let fieldStart = pos;
      let tsS = -1; let tsE = -1; let cS = -1; let cE = -1; let pS = -1; let pE = -1;
      for (let i = pos; i <= end; i += 1) {
        if (i === end || src.charCodeAt(i) === delimiter) {
          if (field === tsCol) { tsS = fieldStart; tsE = i; }
          else if (field === codeCol) { cS = fieldStart; cE = i; }
          else if (field === paramCol) { pS = fieldStart; pE = i; break; }
          field += 1;
          fieldStart = i + 1;
        }
      }

      if (pE === -1) {
        malformed += 1;
      } else {
        const code = parseIntSpan(src, cS, cE);
        if (code >= 0 && code <= DETECTOR_ON && KEEP[code]) {
          const param = parseIntSpan(src, pS, pE);
          const tsMs = parseTimestamp(sliceSpan(src, tsS, tsE));
          if (!Number.isFinite(tsMs) || param < 0) {
            unreadable += 1;
          } else {
            if (tsMs < last) sorted = false;
            last = tsMs;
            if (code === DETECTOR_ON || code === DETECTOR_OFF) {
              channels.add(param);
              detector.push({ tsMs, code, channel: param });
            } else {
              phases.add(param);
              signal.push({ tsMs, code, phase: param });
            }
          }
        }
      }
    }
    pos = eol + 1;
  }

  if (!sorted) {
    // An ON must not fall behind an OFF that shares its millisecond, or the
    // pair breaks; the same for a green behind the yellow that ends it.
    detector.sort((a, b) => a.tsMs - b.tsMs || b.code - a.code);
    signal.sort((a, b) => a.tsMs - b.tsMs || a.code - b.code);
  }

  return {
    signal,
    detector,
    channels: [...channels].sort((a, b) => a - b),
    phases: [...phases].sort((a, b) => a - b),
    stats: {
      scanned,
      kept: signal.length + detector.length,
      malformed,
      unreadable,
      keptPercent: scanned ? ((signal.length + detector.length) / scanned) * 100 : 0,
    },
  };
}

/**
 * Green intervals for one phase, from code 1 to the code 8 that ends it.
 *
 * A green still running when the file stops is dropped: its length is
 * unknown, and guessing one would put a made-up cycle in the results.
 */
export function buildGreenIntervals(signalRows, phase) {
  const wanted = Number(phase);
  const out = [];
  let open = null;
  for (const row of signalRows || []) {
    if (row.phase !== wanted) continue;
    if (row.code === PHASE_BEGIN_GREEN) {
      // A second green with no yellow between means the first one's end was
      // never logged; the later start is the one with a known length.
      open = row.tsMs;
    } else if (row.code === PHASE_BEGIN_YELLOW && open !== null) {
      if (row.tsMs > open) out.push({ startMs: open, endMs: row.tsMs });
      open = null;
    }
  }
  return out;
}

/**
 * Overlapping or touching intervals merged into one sorted, disjoint list.
 *
 * An infinite end is allowed through: it is how a detector still down when
 * the file stops is represented, and filtering it out as "not finite" would
 * silently release it and invent idle time at the end of every file.
 */
export function mergeIntervals(intervals) {
  const sorted = [...(intervals || [])]
    .filter((i) => Number.isFinite(i.startMs) && i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  const out = [];
  for (const interval of sorted) {
    const last = out[out.length - 1];
    if (last && interval.startMs <= last.endMs) {
      if (interval.endMs > last.endMs) last.endMs = interval.endMs;
    } else {
      out.push({ startMs: interval.startMs, endMs: interval.endMs });
    }
  }
  return out;
}

/**
 * When at least one of a phase's detectors was occupied, as one merged
 * timeline, with a clearance allowance added to every drop.
 *
 * The allowance is the point: a detector releases as the rear bumper leaves
 * the loop, and the vehicle is still in the intersection for a second or two
 * after that. Without it every platoon reads as a string of tiny idle gaps
 * that nobody could ever reclaim.
 */
export function buildBusyIntervals(detectorRows, channels, options = {}) {
  const wanted = new Set((channels || []).map(Number));
  const clearanceMs = Math.max(0, Number(options.clearanceSeconds ?? DEFAULT_CLEARANCE_SECONDS)) * 1000;
  const open = new Map();
  const spans = [];
  for (const row of detectorRows || []) {
    if (!wanted.has(row.channel)) continue;
    if (row.code === DETECTOR_ON) {
      open.set(row.channel, row.tsMs);
    } else if (row.code === DETECTOR_OFF) {
      const start = open.get(row.channel);
      if (start === undefined) continue;
      open.delete(row.channel);
      if (row.tsMs >= start) spans.push({ startMs: start, endMs: row.tsMs + clearanceMs });
    }
  }
  // A detector still down when the file ends stays down: treating it as
  // released would invent idle time at exactly the point there is no evidence.
  for (const start of open.values()) spans.push({ startMs: start, endMs: Infinity });
  return mergeIntervals(spans);
}

/** The parts of `span` that `busy` does not cover. */
export function subtractIntervals(span, busy) {
  const gaps = [];
  let cursor = span.startMs;
  for (const interval of busy) {
    if (interval.endMs <= cursor) continue;
    // Past the end of the span, so nothing after this one can matter either.
    if (interval.startMs >= span.endMs) break;
    if (interval.startMs > cursor) {
      // No clamp to span.endMs here: the break above has already established
      // that this interval starts inside the span.
      gaps.push({ startMs: cursor, endMs: interval.startMs });
    }
    cursor = Math.max(cursor, interval.endMs);
    if (cursor >= span.endMs) break;
  }
  if (cursor < span.endMs) gaps.push({ startMs: cursor, endMs: span.endMs });
  return gaps.filter((gap) => gap.endMs > gap.startMs);
}

const totalMs = (list) => list.reduce((sum, i) => sum + (i.endMs - i.startMs), 0);

/**
 * One row per green, with the idle inside it.
 *
 * `idleAfterPedMs` is part of `idleMs`, not a separate quantity: it is the
 * share of the same idle that fell after a pedestrian phase had finished,
 * which is the share with an obvious cause and an obvious fix.
 */
export function analyzeGreens(options) {
  const {
    signalRows = [], detectorRows = [], phase, channels = [],
    clearanceSeconds = DEFAULT_CLEARANCE_SECONDS,
    minGapSeconds = DEFAULT_MIN_GAP_SECONDS,
  } = options || {};

  const greens = buildGreenIntervals(signalRows, phase);
  const busy = buildBusyIntervals(detectorRows, channels, { clearanceSeconds });
  const minGapMs = Math.max(0, Number(minGapSeconds)) * 1000;
  const pedEnds = signalRows
    .filter((row) => row.phase === Number(phase) && row.code === PED_BEGIN_SOLID)
    .map((row) => row.tsMs);

  return greens.map((green, index) => {
    const gaps = subtractIntervals(green, busy)
      // Short gaps are the spacing inside a platoon. Counting them would
      // report a saturated approach as mostly idle.
      .filter((gap) => gap.endMs - gap.startMs >= minGapMs);

    // The last ped service to finish inside this green is the one that was
    // holding it; an earlier one was already over before the green began.
    const pedEnd = pedEnds.filter((ms) => ms >= green.startMs && ms < green.endMs).pop() ?? null;
    const afterPed = pedEnd === null
      ? []
      : gaps
        .map((gap) => ({ startMs: Math.max(gap.startMs, pedEnd), endMs: gap.endMs }))
        .filter((gap) => gap.endMs > gap.startMs);

    const idleMs = totalMs(gaps);
    const greenMs = green.endMs - green.startMs;
    return {
      phase: Number(phase),
      cycle: index + 1,
      startMs: green.startMs,
      endMs: green.endMs,
      greenMs,
      idleMs,
      idleShare: greenMs ? idleMs / greenMs : 0,
      gapCount: gaps.length,
      longestIdleMs: gaps.reduce((max, gap) => Math.max(max, gap.endMs - gap.startMs), 0),
      pedServed: pedEnd !== null,
      pedEndMs: pedEnd,
      idleAfterPedMs: totalMs(afterPed),
      gaps,
    };
  });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Per phase, across every green of it. */
export function summarizePhase(rows) {
  const list = rows || [];
  if (!list.length) {
    return {
      cycles: 0, greenMs: 0, idleMs: 0, idleShare: 0, idleAfterPedMs: 0,
      medianIdleMs: null, worstIdleMs: 0, pedCycles: 0,
    };
  }
  const greenMs = list.reduce((sum, row) => sum + row.greenMs, 0);
  const idleMs = list.reduce((sum, row) => sum + row.idleMs, 0);
  return {
    cycles: list.length,
    greenMs,
    idleMs,
    idleShare: greenMs ? idleMs / greenMs : 0,
    idleAfterPedMs: list.reduce((sum, row) => sum + row.idleAfterPedMs, 0),
    medianIdleMs: median(list.map((row) => row.idleMs)),
    worstIdleMs: list.reduce((max, row) => Math.max(max, row.idleMs), 0),
    pedCycles: list.filter((row) => row.pedServed).length,
  };
}

/**
 * Everything for one signal: a row per phase per green, and a summary per
 * phase, ordered with the most idle time first because that is the order the
 * question is asked in.
 */
export function analyzeSignal(options) {
  const {
    signalRows = [], detectorRows = [], phaseChannels = new Map(),
    clearanceSeconds, minGapSeconds, label = '',
  } = options || {};

  const phases = [...phaseChannels.keys()].sort((a, b) => a - b);
  const byPhase = phases.map((phase) => {
    const rows = analyzeGreens({
      signalRows, detectorRows, phase,
      channels: phaseChannels.get(phase) || [],
      clearanceSeconds, minGapSeconds,
    }).map((row) => ({ ...row, signal: label }));
    return { phase, signal: label, rows, summary: summarizePhase(rows) };
  });

  return {
    label,
    phases: byPhase.sort((a, b) => b.summary.idleMs - a.summary.idleMs || a.phase - b.phase),
    rows: byPhase.flatMap((entry) => entry.rows),
    totals: summarizePhase(byPhase.flatMap((entry) => entry.rows)),
  };
}
