/**
 * Single Loop Speed Estimator
 *
 * One inductive loop cannot measure speed directly -- it only knows that
 * something was over it, and for how long. But the distance a vehicle covers
 * while it holds a loop down is its own length plus the loop's: the detector
 * picks up at the front bumper entering the zone and drops at the rear bumper
 * leaving it. So
 *
 *     speed = (loop length + vehicle length) / occupancy
 *
 * which turns an occupancy time into a speed, given an assumed vehicle
 * length. The assumption is the whole method: it is an estimate for a stream
 * of traffic, not a measurement of any one vehicle, and a fleet of trucks
 * reads slow while motorcycles read fast. Everything here keeps the inputs
 * visible so that assumption can be argued with.
 *
 * Framework free so it runs in a view, in a Web Worker, or under `node --test`.
 *
 * Performance note: a day of high-resolution data for one signal is mostly
 * rows this tool has no use for. The scan rejects a row on its event code
 * before parsing a timestamp or allocating a substring, the same way the
 * preemption scanner does.
 */

import { parseTimestamp } from './highResTimestamp.js';
import { detectLayout } from './preemptionEvaluator.js';

export { detectLayout };

/** Detector channel events. The parameter column carries the channel. */
export const DETECTOR_ON = 82;
export const DETECTOR_OFF = 81;

/**
 * Phase state changes. The parameter column carries the phase number.
 *
 * Only three codes are needed for a three-colour model: green runs from 1
 * until 8, yellow from 8 until 10, and red from 10 until the next 1. Codes 9
 * and 11 (end of yellow, end of red clearance) fall inside those spans and
 * would not move the colour, so they are not collected.
 */
export const PHASE_BEGIN_GREEN = 1;
export const PHASE_BEGIN_YELLOW = 8;
export const PHASE_BEGIN_RED = 10;

export const SIGNAL_STATES = ['green', 'yellow', 'red'];

const STATE_BY_CODE = {
  [PHASE_BEGIN_GREEN]: 'green',
  [PHASE_BEGIN_YELLOW]: 'yellow',
  [PHASE_BEGIN_RED]: 'red',
};

/** A dense lookup, so the hot loop tests an array index rather than a Set. */
const KEEP_CODE = (() => {
  const table = new Array(DETECTOR_ON + 1).fill(false);
  table[DETECTOR_ON] = true;
  table[DETECTOR_OFF] = true;
  table[PHASE_BEGIN_GREEN] = true;
  table[PHASE_BEGIN_YELLOW] = true;
  table[PHASE_BEGIN_RED] = true;
  return table;
})();

const CH_SPACE = 32;
const CH_TAB = 9;
const CH_CR = 13;
const CH_QUOTE = 34;

const FEET_PER_MILE = 5280;
const SECONDS_PER_HOUR = 3600;

/** Beyond this an occupancy is a queued or stopped vehicle, not one at speed. */
export const DEFAULT_MAX_OCCUPANCY_SECONDS = 30;
export const DEFAULT_LOOP_FEET = 6;
export const DEFAULT_VEHICLE_FEET = 17;

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
 * Single pass over the raw text, keeping only detector and phase-colour rows.
 *
 * Returns them already split, because the two are used differently: detector
 * rows pair into occupancies, phase rows build the colour timeline that each
 * occupancy is then looked up against.
 */
export function scanLoopRows(text, layout) {
  const src = String(text || '');
  const len = src.length;
  const { delimiter, tsCol } = layout;
  const codeCol = tsCol + 1;
  const paramCol = tsCol + 2;

  const detector = [];
  const phase = [];
  const channelSet = new Set();
  const phaseSet = new Set();
  let scanned = 0;
  let malformed = 0;
  let badTimestamps = 0;
  let pos = 0;
  let detectorSorted = true;
  let phaseSorted = true;
  let lastDetector = -Infinity;
  let lastPhase = -Infinity;

  while (pos < len) {
    let eol = src.indexOf('\n', pos);
    if (eol === -1) eol = len;
    let end = eol;
    if (end > pos && src.charCodeAt(end - 1) === CH_CR) end -= 1;

    if (end > pos) {
      scanned += 1;
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
        // The filter that makes this cheap: every phase-timing, pedestrian,
        // coordination and preemption row leaves here having allocated
        // nothing at all.
        if (code >= 0 && code <= DETECTOR_ON && KEEP_CODE[code]) {
          const param = parseIntSpan(src, pS, pE);
          const tsMs = parseTimestamp(sliceSpan(src, tsS, tsE));
          if (!Number.isFinite(tsMs) || param < 0) {
            badTimestamps += 1;
          } else if (code === DETECTOR_ON || code === DETECTOR_OFF) {
            if (tsMs < lastDetector) detectorSorted = false;
            lastDetector = tsMs;
            channelSet.add(param);
            detector.push({ tsMs, code, channel: param });
          } else {
            if (tsMs < lastPhase) phaseSorted = false;
            lastPhase = tsMs;
            phaseSet.add(param);
            phase.push({ tsMs, state: STATE_BY_CODE[code], phase: param });
          }
        }
      }
    }
    pos = eol + 1;
  }

  // An ON and an OFF in the same millisecond must not swap: the OFF sorting
  // first would pair with the previous ON and leave this one dangling.
  if (!detectorSorted) detector.sort((a, b) => a.tsMs - b.tsMs || b.code - a.code);
  if (!phaseSorted) phase.sort((a, b) => a.tsMs - b.tsMs);

  return {
    detector,
    phase,
    channels: [...channelSet].sort((a, b) => a - b),
    phases: [...phaseSet].sort((a, b) => a - b),
    stats: {
      scanned,
      kept: detector.length + phase.length,
      malformed,
      badTimestamps,
      keptPercent: scanned ? ((detector.length + phase.length) / scanned) * 100 : 0,
    },
  };
}

/**
 * Detector ON/OFF rows paired into occupancies, per channel.
 *
 * An ON with no OFF is dropped rather than closed at the end of the file: its
 * duration is unknown, and inventing one would put a fabricated speed in the
 * middle of the results. An OFF with no ON is dropped for the same reason. A
 * second ON while one is already open replaces it -- the earlier ON lost its
 * OFF somewhere, and the newer one is the better guess at what is on the loop.
 */
export function buildOccupancies(detectorRows, options = {}) {
  const open = new Map();
  const out = [];
  let unmatchedOn = 0;
  let unmatchedOff = 0;

  for (const row of detectorRows || []) {
    if (row.code === DETECTOR_ON) {
      if (open.has(row.channel)) unmatchedOn += 1;
      open.set(row.channel, row.tsMs);
    } else if (row.code === DETECTOR_OFF) {
      const onMs = open.get(row.channel);
      if (onMs === undefined) {
        unmatchedOff += 1;
        continue;
      }
      open.delete(row.channel);
      const occupancyMs = row.tsMs - onMs;
      // A drop at or before the pick-up is a clock or ordering problem, not a
      // vehicle; there is no speed to be had from it either way.
      if (occupancyMs <= 0) {
        unmatchedOff += 1;
        continue;
      }
      out.push({ channel: row.channel, onMs, offMs: row.tsMs, occupancyMs });
    }
  }

  unmatchedOn += open.size;
  const maxSeconds = Number(options.maxOccupancySeconds);
  if (Number.isFinite(maxSeconds) && maxSeconds > 0) {
    const cap = maxSeconds * 1000;
    const kept = out.filter((row) => row.occupancyMs <= cap);
    return { occupancies: kept, unmatchedOn, unmatchedOff, overlong: out.length - kept.length };
  }
  return { occupancies: out, unmatchedOn, unmatchedOff, overlong: 0 };
}

/**
 * The colour timeline for one phase, as closed intervals.
 *
 * Built only from changes, so a run of repeated codes does not create empty
 * intervals. The last interval is left open-ended, which is what stateAt
 * expects for the tail of the file.
 */
export function buildPhaseIntervals(phaseRows, phaseNumber) {
  const wanted = Number(phaseNumber);
  const intervals = [];
  for (const row of phaseRows || []) {
    if (row.phase !== wanted || !row.state) continue;
    const last = intervals[intervals.length - 1];
    if (last && last.state === row.state) continue;
    if (last) last.endMs = row.tsMs;
    intervals.push({ state: row.state, startMs: row.tsMs, endMs: Infinity });
  }
  return intervals;
}

/**
 * The colour showing at a moment. Binary search, because this is called once
 * per occupancy and a day of data has thousands of each.
 *
 * Returns '' before the first change of the file: the colour then is genuinely
 * unknown, and calling it red would put every early vehicle in the wrong
 * bucket.
 */
export function stateAt(intervals, ms) {
  if (!intervals || !intervals.length || !Number.isFinite(ms)) return '';
  if (ms < intervals[0].startMs) return '';
  let lo = 0;
  let hi = intervals.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (intervals[mid].startMs <= ms) lo = mid;
    else hi = mid - 1;
  }
  const found = intervals[lo];
  return ms < found.endMs ? found.state : '';
}

/**
 * Occupancy to speed, in mph.
 *
 * The distance is loop plus vehicle, because the detector is held down from
 * the moment the front bumper enters the zone until the rear bumper clears
 * it. Null when the occupancy is not a positive time, or the lengths are not
 * positive numbers -- a zero-length assumption would report every vehicle as
 * stationary rather than admit the setting is wrong.
 */
export function estimateSpeedMph(occupancyMs, loopFeet, vehicleFeet) {
  const seconds = Number(occupancyMs) / 1000;
  const loop = Number(loopFeet);
  const vehicle = Number(vehicleFeet);
  if (!(seconds > 0)) return null;
  if (!Number.isFinite(loop) || !Number.isFinite(vehicle)) return null;
  const distance = loop + vehicle;
  if (!(distance > 0)) return null;
  return (distance / seconds) * (SECONDS_PER_HOUR / FEET_PER_MILE);
}

/** The inverse, for drawing a speed reference line on an occupancy axis. */
export function occupancySecondsForSpeed(mph, loopFeet, vehicleFeet) {
  const speed = Number(mph);
  const distance = Number(loopFeet) + Number(vehicleFeet);
  if (!(speed > 0) || !(distance > 0)) return null;
  return distance / (speed * (FEET_PER_MILE / SECONDS_PER_HOUR));
}

/**
 * A pasted detector-to-phase table, as a lookup.
 *
 * Two numbers a line, detector first: the same shape the Detection Channel
 * Plotter accepts, so a table written for one tool works in the other without
 * being retyped. Anything else on the line is ignored, so "Det 5   2" and a
 * header row both behave.
 *
 * Zero means deliberately unassigned, and comes back as null rather than
 * being dropped: the caller can then tell "no phase for this detector" from
 * "this detector was never mentioned", which are different answers to give a
 * reader asking why a channel has no colours.
 */
export function parseDetectorPhaseMap(text) {
  const map = new Map();
  for (const line of String(text || '').split(/\r?\n/)) {
    const numbers = line.match(/\d+/g);
    if (!numbers) continue;
    const detector = Number.parseInt(numbers[0], 10);
    // A line carrying one number has no second to read, and parseInt of
    // nothing is NaN, so the finite check below is what rejects it. There is
    // no separate length test because it could never fire.
    const phase = Number.parseInt(numbers[1], 10);
    if (!Number.isFinite(detector) || !Number.isFinite(phase)) continue;
    // Last one wins: a corrected line pasted under the original should be
    // the one that counts.
    map.set(detector, phase === 0 ? null : phase);
  }
  return map;
}

/** Every state a bucket can carry, plus the one for arrivals with no colour. */
export const UNKNOWN_STATE = 'unknown';

export const TIME_BUCKETS = [
  { value: 'event', title: 'Each event', ms: 0 },
  { value: 'minute', title: 'By minute', ms: 60000 },
  { value: 'hour', title: 'By hour', ms: 3600000 },
  { value: 'day', title: 'By day', ms: 86400000 },
];

const BUCKET_MS = Object.fromEntries(TIME_BUCKETS.map((b) => [b.value, b.ms]));

/**
 * The start of the bucket a moment falls in, in local time.
 *
 * Local rather than UTC, and by calendar parts rather than by dividing the
 * epoch: an hour bucket built by division is an hour of UTC, which lands
 * half-way through the local hour anywhere with a half-hour offset, and a day
 * bucket built that way is never local midnight at all.
 */
export function bucketStart(ms, bucket) {
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  if (bucket === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (bucket === 'hour') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
  }
  if (bucket === 'minute') {
    return new Date(
      date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(),
    ).getTime();
  }
  return ms;
}

function median(sorted) {
  if (!sorted.length) return null;
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Occupancies grouped into time buckets.
 *
 * The bar length is total occupancy: how long the loop was held down during
 * that span, which is the quantity a detector actually reports. Count and
 * median speed ride along for the hover, and the share of the bucket that the
 * loop was occupied is the classic detector occupancy percentage.
 *
 * Median rather than mean speed: one vehicle stopping on the loop drags a
 * mean towards zero hard enough to make an otherwise free-flowing hour look
 * congested.
 */
const EMPTY_BY_STATE = () => ({ green: 0, yellow: 0, red: 0, [UNKNOWN_STATE]: 0 });

export function bucketOccupancies(occupancies, bucket, loopFeet, vehicleFeet) {
  const list = occupancies || [];
  if (bucket === 'event' || !BUCKET_MS[bucket]) {
    return list.map((row) => {
      const state = row.state || UNKNOWN_STATE;
      const byState = EMPTY_BY_STATE();
      const counts = EMPTY_BY_STATE();
      byState[state] = row.occupancyMs;
      counts[state] = 1;
      return {
        key: row.onMs,
        startMs: row.onMs,
        bucket: 'event',
        count: 1,
        totalMs: row.occupancyMs,
        medianMs: row.occupancyMs,
        medianMph: estimateSpeedMph(row.occupancyMs, loopFeet, vehicleFeet),
        occupiedShare: null,
        channel: row.channel,
        phase: row.phase ?? null,
        state: row.state || '',
        byState,
        countByState: counts,
      };
    });
  }

  const span = BUCKET_MS[bucket];
  const groups = new Map();
  for (const row of list) {
    const key = bucketStart(row.onMs, bucket);
    let group = groups.get(key);
    if (!group) {
      group = {
        key, startMs: key, bucket, count: 0, totalMs: 0, durations: [],
        byState: EMPTY_BY_STATE(), countByState: EMPTY_BY_STATE(),
      };
      groups.set(key, group);
    }
    group.count += 1;
    group.totalMs += row.occupancyMs;
    group.durations.push(row.occupancyMs);
    // Split by colour as well as totalled, so a bar can show how much of an
    // hour's occupancy was traffic moving on green and how much was a queue
    // sitting on the loop at red -- on a stop-bar loop those are the two
    // things being told apart, and one total hides the difference.
    const state = row.state || UNKNOWN_STATE;
    group.byState[state] += row.occupancyMs;
    group.countByState[state] += 1;
  }

  return [...groups.values()]
    .sort((a, b) => a.startMs - b.startMs)
    .map((group) => {
      const sorted = group.durations.sort((a, b) => a - b);
      const medianMs = median(sorted);
      return {
        key: group.key,
        startMs: group.startMs,
        bucket,
        count: group.count,
        totalMs: group.totalMs,
        medianMs,
        // Speed from the median occupancy, not the median of the speeds: the
        // two differ, and this one answers "how fast was the typical vehicle".
        medianMph: estimateSpeedMph(medianMs, loopFeet, vehicleFeet),
        occupiedShare: span ? group.totalMs / span : null,
        channel: null,
        phase: null,
        state: '',
        byState: group.byState,
        countByState: group.countByState,
      };
    });
}

/** Headline numbers for the whole filtered set. */
export function summarizeOccupancies(occupancies, loopFeet, vehicleFeet) {
  const list = occupancies || [];
  if (!list.length) {
    return { count: 0, totalMs: 0, medianMs: null, medianMph: null, fastestMph: null, slowestMph: null };
  }
  const durations = list.map((row) => row.occupancyMs).sort((a, b) => a - b);
  const medianMs = median(durations);
  return {
    count: list.length,
    totalMs: durations.reduce((sum, ms) => sum + ms, 0),
    medianMs,
    medianMph: estimateSpeedMph(medianMs, loopFeet, vehicleFeet),
    // The shortest occupancy is the fastest vehicle, and the longest the
    // slowest; naming them the other way round is an easy and invisible bug.
    fastestMph: estimateSpeedMph(durations[0], loopFeet, vehicleFeet),
    slowestMph: estimateSpeedMph(durations[durations.length - 1], loopFeet, vehicleFeet),
  };
}
