/**
 * Unused green, measured two ways: one for heavy traffic, one for light.
 *
 *   Heavy volume -- wasted green. With traffic waiting everywhere, a phase
 *   should end the moment it has nothing left to serve. Green that runs on
 *   past its last vehicle (plus a clearance allowance) and past its finished
 *   pedestrian phase is green some other movement was queued for. This counts
 *   that tail, from the later of the two to yellow.
 *
 *   Light volume -- the wait for green. With the roads nearly empty, a lone
 *   vehicle should get green almost as soon as it arrives. This measures, for
 *   every green, how long the first vehicle to arrive on red waited for it.
 *   It should be short; coordination holding the main street, or a detector
 *   stuck on somewhere else and calling a phase nobody is at, makes it long.
 *
 * Both are kept per green and grouped into cycles, so a cycle can be drawn as
 * one bar with every phase stacked in it.
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
/** How a green ended: logged just before the yellow that follows it. */
export const PHASE_GAP_OUT = 4;
export const PHASE_MAX_OUT = 5;
export const PHASE_FORCE_OFF = 6;
export const PHASE_BEGIN_YELLOW = 8;
/** Red starts for the phase here: a vehicle arriving after it stops and waits. */
export const PHASE_END_YELLOW = 9;
/** Walk, flashing don't walk, then solid don't walk: the ped phase is over at 23. */
export const PED_BEGIN_WALK = 21;
export const PED_BEGIN_CLEARANCE = 22;
export const PED_BEGIN_SOLID = 23;
export const DETECTOR_ON = 82;
export const DETECTOR_OFF = 81;

/** Seconds credited to a vehicle after its detector drops, to cross the box. */
export const DEFAULT_CLEARANCE_SECONDS = 3;
/**
 * A tail of green shorter than this is the passage timer running out after
 * the last vehicle -- how an actuated phase ends -- not a reclaimable second.
 */
export const DEFAULT_MIN_GAP_SECONDS = 3;

export const TERMINATIONS = {
  [PHASE_GAP_OUT]: 'Gap out',
  [PHASE_MAX_OUT]: 'Max out',
  [PHASE_FORCE_OFF]: 'Force off',
};

const KEEP = (() => {
  const table = new Array(DETECTOR_ON + 1).fill(false);
  for (const code of [
    PHASE_BEGIN_GREEN, PHASE_GAP_OUT, PHASE_MAX_OUT, PHASE_FORCE_OFF,
    PHASE_BEGIN_YELLOW, PHASE_END_YELLOW,
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
 * One pass, keeping only the eleven codes this needs.
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
 * Each carries how it ended (gap out, max out or force off, when logged) and
 * `redFromMs`: when this phase's previous yellow ended, which is when a
 * vehicle arriving for it would first have had to stop. It is null for the
 * first green in the file, whose red began before the file did.
 *
 * A green still running when the file stops is dropped: its length is
 * unknown, and guessing one would put a made-up cycle in the results.
 */
export function buildGreenIntervals(signalRows, phase) {
  const wanted = Number(phase);
  const out = [];
  let open = null;
  let termination = null;
  let yellowStart = null;
  let yellowEnd = null;
  for (const row of signalRows || []) {
    if (row.phase !== wanted) continue;
    if (row.code === PHASE_BEGIN_GREEN) {
      // A second green with no yellow between means the first one's end was
      // never logged; the later start is the one with a known length.
      open = { startMs: row.tsMs, redFromMs: yellowEnd ?? yellowStart };
      termination = null;
    } else if (TERMINATIONS[row.code]) {
      // One logged outside a green is cleared by the next green's start.
      termination = row.code;
    } else if (row.code === PHASE_BEGIN_YELLOW) {
      if (open !== null && row.tsMs > open.startMs) {
        out.push({ startMs: open.startMs, endMs: row.tsMs, termination, redFromMs: open.redFromMs });
      }
      open = null;
      yellowStart = row.tsMs;
      yellowEnd = null;
    } else if (row.code === PHASE_END_YELLOW && yellowStart !== null && row.tsMs >= yellowStart) {
      yellowEnd = row.tsMs;
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
 * after that. Pass 0 for the bare occupancy, as the wait for green does.
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

/**
 * When a phase's pedestrian service was running: walk (21) to solid don't
 * walk (23). One still running when the file ends runs on; a 23 with no walk
 * before it (the file began mid-service) still marks when service ended.
 */
export function buildPedIntervals(signalRows, phase) {
  const wanted = Number(phase);
  const spans = [];
  let walk = null;
  for (const row of signalRows || []) {
    if (row.phase !== wanted) continue;
    if (row.code === PED_BEGIN_WALK) {
      if (walk === null) walk = row.tsMs;
    } else if (row.code === PED_BEGIN_SOLID) {
      spans.push({ startMs: walk ?? row.tsMs - 1, endMs: row.tsMs });
      walk = null;
    }
  }
  if (walk !== null) spans.push({ startMs: walk, endMs: Infinity });
  return mergeIntervals(spans);
}

/** Index of the last interval starting before `ms` (strictly, or at it when `inclusive`). */
function lastStartingBefore(intervals, ms, inclusive = false) {
  let lo = 0;
  let hi = intervals.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (intervals[mid].startMs < ms || (inclusive && intervals[mid].startMs === ms)) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

/**
 * Where a merged timeline last covers the span [fromMs, toMs), or null if it
 * never touches it. Disjoint and sorted, so the last interval to start before
 * the span ends is also the one that ends latest.
 */
export function coveredUntil(intervals, fromMs, toMs) {
  const i = lastStartingBefore(intervals, toMs);
  if (i < 0 || intervals[i].endMs <= fromMs) return null;
  return Math.min(intervals[i].endMs, toMs);
}

/**
 * Heavy volume: the green left over at the end, once the last vehicle and the
 * pedestrian phase were done with it.
 *
 * `endedBy` says which of them was last: 'vehicle', 'ped', or 'nothing' for a
 * green neither used at all -- a recall, or a phase served for its minimum.
 * A tail shorter than `minGapMs` is how an actuated phase gaps out, and is
 * not counted.
 */
export function greenTail(green, busy, ped, minGapMs = 0) {
  const vehicle = coveredUntil(busy, green.startMs, green.endMs);
  const walk = coveredUntil(ped, green.startMs, green.endMs);
  let usedUntil = green.startMs;
  let endedBy = 'nothing';
  // Covering any of the green means ending after its start.
  if (vehicle !== null) {
    usedUntil = vehicle;
    endedBy = 'vehicle';
  }
  if (walk !== null && walk > usedUntil) {
    usedUntil = walk;
    endedBy = 'ped';
  }
  const tail = green.endMs - usedUntil;
  return { usedUntilMs: usedUntil, endedBy, wasteMs: tail >= minGapMs ? tail : 0 };
}

/**
 * Light volume: when the first vehicle to arrive on red called for the green
 * starting at `greenMs`, and whether it found a call already waiting.
 *
 * `occupancy` is the bare detector timeline (no clearance allowance). If a
 * detector was already occupied when red began, the call dates from then:
 * a vehicle that stopped on yellow, or a detector stuck on. Either way that
 * phase waited the whole red. Null when nothing called during the red --
 * the phase came back on a recall, a ped call, or coordination.
 */
export function firstCall(occupancy, redFromMs, greenMs) {
  if (redFromMs === null || redFromMs === undefined || !(greenMs > redFromMs)) return null;
  const i = lastStartingBefore(occupancy, redFromMs, true);
  if (i >= 0 && occupancy[i].endMs > redFromMs) return { callMs: redFromMs, standing: true };
  const next = occupancy[i + 1];
  if (next && next.startMs < greenMs) return { callMs: next.startMs, standing: false };
  return null;
}

/**
 * Cycles, the way the Delay & Count Estimator draws them: a cycle begins with
 * a green, and the next begins when a phase already served in it goes green
 * again. That needs no knowledge of the coordination plan, so it works the
 * same on a free-running signal.
 *
 * The last cycle runs to the last signal event in the file.
 */
export function buildCycles(signalRows) {
  const rows = signalRows || [];
  const greens = rows.filter((row) => row.code === PHASE_BEGIN_GREEN);
  if (!greens.length) return [];
  const cycles = [];
  let start = greens[0].tsMs;
  let served = new Set([greens[0].phase]);
  for (const row of greens.slice(1)) {
    if (served.has(row.phase)) {
      if (row.tsMs > start) {
        cycles.push({ startMs: start, endMs: row.tsMs });
        start = row.tsMs;
        served = new Set([row.phase]);
      }
    } else {
      served.add(row.phase);
    }
  }
  const lastMs = rows.reduce((max, row) => Math.max(max, row.tsMs), start);
  cycles.push({ startMs: start, endMs: lastMs });
  return cycles.map((cycle, i) => ({ index: i + 1, ...cycle }));
}

/** The cycle a moment falls in, by number; 0 before the first. */
function cycleAt(cycles, ms) {
  const i = lastStartingBefore(cycles, ms, true);
  return i < 0 ? 0 : cycles[i].index;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  return sorted[lo] + (sorted[Math.ceil(rank)] - sorted[lo]) * (rank - lo);
}

/**
 * One row per green of one phase, with both measures on it.
 */
export function analyzeGreens(options) {
  const {
    signalRows = [], detectorRows = [], phase, channels = [], cycles = [],
    clearanceSeconds = DEFAULT_CLEARANCE_SECONDS,
    minGapSeconds = DEFAULT_MIN_GAP_SECONDS,
  } = options || {};

  const greens = buildGreenIntervals(signalRows, phase);
  const busy = buildBusyIntervals(detectorRows, channels, { clearanceSeconds });
  const occupancy = buildBusyIntervals(detectorRows, channels, { clearanceSeconds: 0 });
  const ped = buildPedIntervals(signalRows, phase);
  const minGapMs = Math.max(0, Number(minGapSeconds) || 0) * 1000;

  return greens.map((green) => {
    const tail = greenTail(green, busy, ped, minGapMs);
    const call = firstCall(occupancy, green.redFromMs, green.startMs);
    return {
      phase: Number(phase),
      cycle: cycleAt(cycles, green.startMs),
      startMs: green.startMs,
      endMs: green.endMs,
      greenMs: green.endMs - green.startMs,
      termination: green.termination,
      // Heavy volume
      wasteMs: tail.wasteMs,
      usedUntilMs: tail.usedUntilMs,
      endedBy: tail.endedBy,
      // Light volume
      redFromMs: green.redFromMs,
      callMs: call ? call.callMs : null,
      delayMs: call ? green.startMs - call.callMs : null,
      standingCall: Boolean(call && call.standing),
      noCall: green.redFromMs !== null && call === null,
    };
  });
}

/** Per phase (or for any set of greens): both measures, summed and spread. */
export function summarizeGreens(rows) {
  const list = rows || [];
  const greenMs = list.reduce((sum, row) => sum + row.greenMs, 0);
  const wasteMs = list.reduce((sum, row) => sum + row.wasteMs, 0);
  const delays = list.filter((row) => row.delayMs !== null).map((row) => row.delayMs);
  const terminations = {};
  for (const row of list) {
    if (row.termination !== null) terminations[row.termination] = (terminations[row.termination] || 0) + 1;
  }
  return {
    greens: list.length,
    greenMs,
    wasteMs,
    wasteShare: greenMs ? wasteMs / greenMs : 0,
    wastePerGreenMs: list.length ? wasteMs / list.length : 0,
    worstWasteMs: list.reduce((max, row) => Math.max(max, row.wasteMs), 0),
    wastedGreens: list.filter((row) => row.wasteMs > 0).length,
    terminations,
    calls: delays.length,
    meanDelayMs: delays.length ? delays.reduce((sum, d) => sum + d, 0) / delays.length : null,
    medianDelayMs: percentile(delays, 0.5),
    p85DelayMs: percentile(delays, 0.85),
    worstDelayMs: delays.length ? Math.max(...delays) : null,
    standingCalls: list.filter((row) => row.standingCall).length,
    noCalls: list.filter((row) => row.noCall).length,
  };
}

/**
 * Everything for one signal: a row per phase per green, a summary per phase,
 * and the cycles with each phase's share of both measures, ready to stack.
 *
 * Phases with no channels are not analysed at all -- a phase nothing is known
 * about is not a phase with no traffic -- but their greens still mark the
 * cycle boundaries, because the controller served them.
 */
export function analyzeSignal(options) {
  const {
    signalRows = [], detectorRows = [], phaseChannels = new Map(),
    clearanceSeconds, minGapSeconds, label = '',
  } = options || {};

  const cycles = buildCycles(signalRows);
  const phases = [...phaseChannels.keys()].sort((a, b) => a - b);
  const byPhase = phases.map((phase) => {
    const rows = analyzeGreens({
      signalRows, detectorRows, phase, cycles,
      channels: phaseChannels.get(phase) || [],
      clearanceSeconds, minGapSeconds,
    }).map((row) => ({ ...row, signal: label }));
    return { phase, signal: label, rows, summary: summarizeGreens(rows) };
  });
  const rows = byPhase.flatMap((entry) => entry.rows);

  const cycleRows = cycles.map((cycle) => ({
    ...cycle, signal: label, waste: {}, delay: {}, greens: {}, wasteMs: 0, delayMs: 0,
  }));
  for (const row of rows) {
    // Every green is in a cycle: the first cycle starts at the first green.
    const cycle = cycleRows[row.cycle - 1];
    cycle.greens[row.phase] = row;
    cycle.waste[row.phase] = (cycle.waste[row.phase] || 0) + row.wasteMs;
    cycle.wasteMs += row.wasteMs;
    if (row.delayMs !== null) {
      cycle.delay[row.phase] = (cycle.delay[row.phase] || 0) + row.delayMs;
      cycle.delayMs += row.delayMs;
    }
  }

  return {
    label,
    phases: byPhase,
    rows,
    cycles: cycleRows,
    totals: summarizeGreens(rows),
  };
}
