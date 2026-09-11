/**
 * Pedestrian Conflict Correlator
 *
 * Pure helpers that correlate detector channel activity (on/off edges) with
 * pedestrian phase intervals from high-resolution controller data. Everything
 * here is framework free so it can run in a Web Worker, in the view, or under
 * `node --test`.
 */

export const DETECTOR_TYPES = {
  vehicle: { key: 'vehicle', label: 'Vehicle detector (82 on / 81 off)', onCode: 82, offCode: 81 },
  pedestrian: { key: 'pedestrian', label: 'Ped push button (90 on / 89 off)', onCode: 90, offCode: 89 },
  tsp: { key: 'tsp', label: 'TSP detector (94 on / 93 off)', onCode: 94, offCode: 93 },
};

export const PED_CODES = {
  BEGIN_WALK: 21,
  BEGIN_CLEARANCE: 22,
  BEGIN_DONT_WALK: 23,
  PED_DARK: 24,
  CALL_REGISTERED: 45,
};

export const PED_WINDOW_MODES = {
  walk: { key: 'walk', label: 'WALK only (21 → 22)' },
  clearance: { key: 'clearance', label: 'Ped clearance / FDW only (22 → 23)' },
  'walk-clearance': { key: 'walk-clearance', label: 'WALK + ped clearance (21 → 23)' },
  'call-to-walk': { key: 'call-to-walk', label: 'Ped call waiting (45 → 21)' },
};

export const TRIGGER_MODES = {
  on: { key: 'on', label: 'Detector turns ON' },
  off: { key: 'off', label: 'Detector turns OFF' },
  either: { key: 'either', label: 'Detector turns ON or OFF' },
  overlap: { key: 'overlap', label: 'Detector occupied (any overlap)' },
  'red-light-run': { key: 'red-light-run', label: 'Red-light run (stop bar → downstream)' },
};

export const SIGNAL_STATE_MODES = {
  yellow: { key: 'yellow', label: 'Yellow only' },
  red: { key: 'red', label: 'Red only' },
  'yellow-red': { key: 'yellow-red', label: 'Yellow or red' },
};

export const PHASE_STATE_CODES = {
  BEGIN_GREEN: 1,
  GREEN_TERMINATION: 7,
  BEGIN_YELLOW: 8,
  END_YELLOW: 9,
  BEGIN_RED_CLEARANCE: 10,
  END_RED_CLEARANCE: 11,
};

const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/;
const NUMERIC_RE = /^-?\d+$/;
const ZONED_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

function fractionToMs(fraction) {
  if (!fraction) return 0;
  return Number.parseInt(`${fraction}000`.slice(0, 3), 10);
}

/**
 * Accepts M/D/YYYY HH:mm:ss.s (tenths), YYYY-MM-DD HH:mm:ss.sss, ISO 8601
 * (with or without a zone), and epoch seconds/milliseconds.
 * Returns milliseconds from epoch, or NaN when the value is not a timestamp.
 */
export function parseTimestamp(value) {
  if (value == null) return Number.NaN;
  const text = String(value).trim();
  if (!text) return Number.NaN;

  const mdy = MDY_RE.exec(text);
  if (mdy) {
    const [, month, day, yearRaw, hour, minute, second, fraction] = mdy;
    const year = Number(yearRaw) < 100 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const date = new Date(
      year,
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0),
      fractionToMs(fraction),
    );
    return date.getTime();
  }

  const ymd = YMD_RE.exec(text);
  if (ymd) {
    const [, year, month, day, hour, minute, second, fraction] = ymd;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0),
      fractionToMs(fraction),
    );
    return date.getTime();
  }

  if (NUMERIC_RE.test(text)) {
    const numeric = Number(text);
    if (numeric >= 1e12) return numeric;
    if (numeric >= 1e9) return numeric * 1000;
    return Number.NaN;
  }

  if (ZONED_RE.test(text) || text.includes('T')) {
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function parseCells(cells) {
  const lastStart = Math.min(cells.length - 3, 2);
  for (let start = 0; start <= lastStart; start += 1) {
    const codeCell = cells[start + 1];
    const paramCell = cells[start + 2];
    if (!NUMERIC_RE.test(codeCell || '') || !NUMERIC_RE.test(paramCell || '')) continue;
    const tsMs = parseTimestamp(cells[start]);
    if (!Number.isFinite(tsMs)) continue;
    return { tsMs, code: Number(codeCell), param: Number(paramCell) };
  }
  return null;
}

/**
 * Parses pasted/uploaded high-resolution CSV text into sorted events.
 * Tolerates header rows, comment lines, comma/semicolon/tab delimiters, and a
 * leading signal ID column.
 */
export function parseHighResEvents(text) {
  const events = [];
  let skipped = 0;
  const lines = String(text || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const cells = line.split(/\s*[,;\t]\s*/);
    if (cells.length < 3) {
      skipped += 1;
      continue;
    }
    const parsed = parseCells(cells);
    if (parsed) events.push(parsed);
    else skipped += 1;
  }
  events.sort((a, b) => a.tsMs - b.tsMs);
  return { events, skipped };
}

/** Inventory of what is available in the data so the UI can populate pickers. */
export function summarizeEvents(events) {
  const channelsByType = { vehicle: new Set(), pedestrian: new Set(), tsp: new Set() };
  const pedPhases = new Set();
  const vehiclePhases = new Set();
  const pedCodes = new Set(Object.values(PED_CODES));
  const phaseStateCodes = new Set(Object.values(PHASE_STATE_CODES));

  for (const evt of events) {
    for (const type of Object.values(DETECTOR_TYPES)) {
      if (evt.code === type.onCode || evt.code === type.offCode) channelsByType[type.key].add(evt.param);
    }
    if (pedCodes.has(evt.code)) pedPhases.add(evt.param);
    if (phaseStateCodes.has(evt.code)) vehiclePhases.add(evt.param);
  }

  const firstTs = events.length ? events[0].tsMs : null;
  const lastTs = events.length ? events[events.length - 1].tsMs : null;

  return {
    eventCount: events.length,
    firstTs,
    lastTs,
    spanSec: firstTs != null && lastTs != null ? (lastTs - firstTs) / 1000 : 0,
    channels: {
      vehicle: [...channelsByType.vehicle].sort((a, b) => a - b),
      pedestrian: [...channelsByType.pedestrian].sort((a, b) => a - b),
      tsp: [...channelsByType.tsp].sort((a, b) => a - b),
    },
    pedPhases: [...pedPhases].sort((a, b) => a - b),
    vehiclePhases: [...vehiclePhases].sort((a, b) => a - b),
  };
}

/**
 * Detector on/off edges collapsed into occupancy pulses. A pulse still open at
 * the end of the data set is closed at the last event and flagged openEnded.
 */
export function buildDetectorPulses(events, channel, typeKey = 'vehicle', datasetEndTs = null) {
  const type = DETECTOR_TYPES[typeKey] || DETECTOR_TYPES.vehicle;
  const pulses = [];
  let openStart = null;

  for (const evt of events) {
    if (evt.param !== channel) continue;
    if (evt.code === type.onCode) {
      if (openStart == null) openStart = evt.tsMs;
      continue;
    }
    if (evt.code !== type.offCode) continue;
    if (openStart == null) continue;
    pulses.push({ start: openStart, end: evt.tsMs, openEnded: false });
    openStart = null;
  }

  if (openStart != null) {
    const end = datasetEndTs ?? (events.length ? events[events.length - 1].tsMs : openStart);
    pulses.push({ start: openStart, end: Math.max(end, openStart), openEnded: true });
  }

  return pulses.map((pulse) => ({ ...pulse, durationSec: (pulse.end - pulse.start) / 1000 }));
}

/**
 * Pedestrian services for one phase, built from walk (21), ped clearance (22),
 * solid don't walk (23), ped dark (24), and ped call registered (45).
 */
export function buildPedServices(events, phase) {
  const services = [];
  let current = null;
  let pendingCall = null;

  const close = (endTs) => {
    if (!current) return;
    current.endTs = Math.max(endTs, current.walkStart);
    services.push(current);
    current = null;
  };

  for (const evt of events) {
    if (evt.param !== phase) continue;
    switch (evt.code) {
      case PED_CODES.CALL_REGISTERED:
        if (!current && pendingCall == null) pendingCall = evt.tsMs;
        break;
      case PED_CODES.BEGIN_WALK:
        close(evt.tsMs);
        current = {
          walkStart: evt.tsMs,
          clearanceStart: null,
          dontWalkStart: null,
          endTs: null,
          callTs: pendingCall,
        };
        pendingCall = null;
        break;
      case PED_CODES.BEGIN_CLEARANCE:
        if (current && current.clearanceStart == null) current.clearanceStart = evt.tsMs;
        break;
      case PED_CODES.BEGIN_DONT_WALK:
        if (current) {
          current.dontWalkStart = evt.tsMs;
          close(evt.tsMs);
        }
        break;
      case PED_CODES.PED_DARK:
        if (current) close(evt.tsMs);
        break;
      default:
        break;
    }
  }

  if (current) close(current.dontWalkStart ?? current.clearanceStart ?? current.walkStart);

  return services.map((service, index) => {
    const walkEnd = service.clearanceStart ?? service.dontWalkStart ?? service.endTs;
    return {
      ...service,
      index: index + 1,
      walkSec: (walkEnd - service.walkStart) / 1000,
      clearanceSec:
        service.clearanceStart != null && service.dontWalkStart != null
          ? (service.dontWalkStart - service.clearanceStart) / 1000
          : null,
      callDelaySec: service.callTs != null ? (service.walkStart - service.callTs) / 1000 : null,
    };
  });
}

/**
 * Green/yellow/red display intervals for one vehicle phase.
 * Green runs 1 → 7|8, yellow runs 8 → 9|10, and red runs from the end of
 * yellow (or the start of red clearance) until the phase's next begin green,
 * which is the full red display a vehicle could be entering against.
 */
export function buildPhaseStateIntervals(events, phase, datasetEndTs = null) {
  const intervals = [];
  let greenStart = null;
  let yellowStart = null;
  let redStart = null;

  const push = (state, start, end) => {
    if (start != null && end > start) intervals.push({ state, start, end });
  };

  for (const evt of events) {
    if (evt.param !== phase) continue;
    switch (evt.code) {
      case PHASE_STATE_CODES.BEGIN_GREEN:
        push('yellow', yellowStart, evt.tsMs);
        push('red', redStart, evt.tsMs);
        yellowStart = null;
        redStart = null;
        if (greenStart == null) greenStart = evt.tsMs;
        break;
      case PHASE_STATE_CODES.GREEN_TERMINATION:
      case PHASE_STATE_CODES.BEGIN_YELLOW:
        push('green', greenStart, evt.tsMs);
        greenStart = null;
        if (evt.code === PHASE_STATE_CODES.BEGIN_YELLOW && yellowStart == null) yellowStart = evt.tsMs;
        break;
      case PHASE_STATE_CODES.END_YELLOW:
      case PHASE_STATE_CODES.BEGIN_RED_CLEARANCE:
        push('yellow', yellowStart, evt.tsMs);
        yellowStart = null;
        if (redStart == null) redStart = evt.tsMs;
        break;
      default:
        break;
    }
  }

  const endTs = datasetEndTs ?? (events.length ? events[events.length - 1].tsMs : null);
  if (endTs != null) {
    push('green', greenStart, endTs);
    push('yellow', yellowStart, endTs);
    push('red', redStart, endTs);
  }

  return intervals.sort((a, b) => a.start - b.start);
}

function findStateInterval(intervals, ts) {
  let lo = 0;
  let hi = intervals.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const interval = intervals[mid];
    if (ts < interval.start) hi = mid - 1;
    else if (ts >= interval.end) lo = mid + 1;
    else return interval;
  }
  return null;
}

/**
 * Confirmed red-light runs: a stop bar detector drops out while the phase is
 * showing yellow or red, and a downstream detector then turns on and back off
 * within the travel time allowed. The downstream pulse is the confirmation that
 * the vehicle actually entered the intersection rather than shuffling in queue,
 * and each downstream pulse is only matched once.
 */
export function findRedLightRuns({
  events,
  stopBarChannel,
  downstreamChannel,
  vehiclePhase,
  detectorType = 'vehicle',
  signalStates = 'yellow-red',
  maxTravelSec = 6,
}) {
  const type = DETECTOR_TYPES[detectorType] || DETECTOR_TYPES.vehicle;
  const datasetEndTs = events.length ? events[events.length - 1].tsMs : null;
  const stopBarPulses = buildDetectorPulses(events, stopBarChannel, type.key, datasetEndTs);
  const downstreamPulses = buildDetectorPulses(events, downstreamChannel, type.key, datasetEndTs);
  const intervals = buildPhaseStateIntervals(events, vehiclePhase, datasetEndTs);
  const wanted = new Set(signalStates === 'yellow-red' ? ['yellow', 'red'] : [signalStates]);
  const maxTravelMs = Math.max(0, Number(maxTravelSec) || 0) * 1000;

  const runs = [];
  let lastMatchedDownstream = -1;

  for (const pulse of stopBarPulses) {
    if (pulse.openEnded) continue;
    const offTs = pulse.end;
    const interval = findStateInterval(intervals, offTs);
    if (!interval || !wanted.has(interval.state)) continue;

    const searchFrom = Math.max(firstPulseIndexAtOrAfter(downstreamPulses, offTs), lastMatchedDownstream + 1);
    for (let i = searchFrom; i < downstreamPulses.length; i += 1) {
      const downstream = downstreamPulses[i];
      if (downstream.start < offTs) continue;
      if (downstream.start > offTs + maxTravelMs) break;
      if (downstream.openEnded) break;
      lastMatchedDownstream = i;
      runs.push({
        stopBarOnTs: pulse.start,
        stopBarOffTs: offTs,
        stopBarOccupancySec: pulse.durationSec,
        state: interval.state,
        secIntoState: (offTs - interval.start) / 1000,
        downstreamOnTs: downstream.start,
        downstreamOffTs: downstream.end,
        downstreamOccupancySec: downstream.durationSec,
        travelSec: (downstream.start - offTs) / 1000,
      });
      break;
    }
  }

  return runs;
}

function firstRunIndexAtOrAfter(runs, ts) {
  let lo = 0;
  let hi = runs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (runs[mid].downstreamOffTs < ts) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The pedestrian interval a rule is watching, before lead/lag padding. */
export function resolvePedWindow(service, mode = 'walk-clearance') {
  const walkEnd = service.clearanceStart ?? service.dontWalkStart ?? service.endTs;
  switch (mode) {
    case 'walk':
      return walkEnd > service.walkStart ? { start: service.walkStart, end: walkEnd } : null;
    case 'clearance': {
      if (service.clearanceStart == null) return null;
      const end = service.dontWalkStart ?? service.endTs;
      return end > service.clearanceStart ? { start: service.clearanceStart, end } : null;
    }
    case 'call-to-walk':
      return service.callTs != null && service.walkStart > service.callTs
        ? { start: service.callTs, end: service.walkStart }
        : null;
    case 'walk-clearance':
    default: {
      const end = service.dontWalkStart ?? service.endTs;
      return end > service.walkStart ? { start: service.walkStart, end } : null;
    }
  }
}

function firstPulseIndexAtOrAfter(pulses, ts) {
  let lo = 0;
  let hi = pulses.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pulses[mid].end < ts) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function intervalLabel(ts, service, window) {
  if (ts < window.start) return 'Lead buffer';
  if (ts > window.end) return 'Lag buffer';
  if (service.clearanceStart != null && ts >= service.clearanceStart) {
    return service.dontWalkStart != null && ts >= service.dontWalkStart ? 'Solid don’t walk' : 'Ped clearance';
  }
  if (ts >= service.walkStart) return 'Walk';
  return 'Ped call waiting';
}

function buildHistogram(samples, binSec) {
  if (!samples.length) return [];
  const size = binSec > 0 ? binSec : 1;
  let min = Infinity;
  let max = -Infinity;
  for (const sample of samples) {
    if (sample.offsetSec < min) min = sample.offsetSec;
    if (sample.offsetSec > max) max = sample.offsetSec;
  }
  const start = Math.floor(min / size) * size;
  const end = Math.ceil((max + Number.EPSILON) / size) * size;
  const binCount = Math.max(1, Math.round((end - start) / size));
  const bins = Array.from({ length: binCount }, (unused, i) => ({
    binStart: Number((start + i * size).toFixed(3)),
    binEnd: Number((start + (i + 1) * size).toFixed(3)),
    conflict: 0,
    clear: 0,
  }));
  for (const sample of samples) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((sample.offsetSec - start) / size)));
    if (sample.conflict) bins[idx].conflict += 1;
    else bins[idx].clear += 1;
  }
  return bins;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Correlate one detector channel against one pedestrian phase.
 *
 * rule: { id, label, detectorChannel, detectorType, pedPhase, pedWindow,
 *         trigger, leadSec, lagSec, minOverlapSec, movement }
 */
export function correlateRule({ events, rule, binSec = 1, contextSec = 10 }) {
  const detectorType = DETECTOR_TYPES[rule.detectorType] || DETECTOR_TYPES.vehicle;
  const datasetEndTs = events.length ? events[events.length - 1].tsMs : null;
  const pulses = buildDetectorPulses(events, rule.detectorChannel, detectorType.key, datasetEndTs);
  const services = buildPedServices(events, rule.pedPhase);

  const leadMs = Math.max(0, Number(rule.leadSec) || 0) * 1000;
  const lagMs = Math.max(0, Number(rule.lagSec) || 0) * 1000;
  const minOverlapSec = Math.max(0, Number(rule.minOverlapSec) || 0);
  const contextMs = Math.max(0, contextSec) * 1000;
  const wantsOn = rule.trigger === 'on' || rule.trigger === 'either';
  const wantsOff = rule.trigger === 'off' || rule.trigger === 'either';
  const overlapMode = rule.trigger === 'overlap';
  const rlrMode = rule.trigger === 'red-light-run';
  const runs = rlrMode
    ? findRedLightRuns({
        events,
        stopBarChannel: rule.detectorChannel,
        downstreamChannel: rule.downstreamChannel,
        vehiclePhase: rule.vehiclePhase,
        detectorType: detectorType.key,
        signalStates: rule.signalStates,
        maxTravelSec: rule.maxTravelSec,
      })
    : [];

  const serviceRows = [];
  const conflicts = [];
  const histogramSamples = [];
  const byHour = new Map();

  let conflictEvents = 0;
  let conflictServices = 0;
  let totalOverlapSec = 0;
  let evaluatedWindowSec = 0;
  let skippedServices = 0;
  let totalTravelSec = 0;
  const stateCounts = { yellow: 0, red: 0 };

  for (const service of services) {
    const window = resolvePedWindow(service, rule.pedWindow);
    if (!window) {
      skippedServices += 1;
      continue;
    }

    const conflictStart = window.start - leadMs;
    const conflictEnd = window.end + lagMs;
    // The raster always covers the whole pedestrian service, even when the rule
    // only evaluates part of it, so the timeline shows the full context.
    const serviceEndTs = service.dontWalkStart ?? service.endTs;
    const rasterStart = Math.min(conflictStart, service.walkStart) - contextMs;
    const rasterEnd = Math.max(conflictEnd, serviceEndTs) + contextMs;
    evaluatedWindowSec += (conflictEnd - conflictStart) / 1000;

    const anchor = service.walkStart;
    const servicePulses = [];
    const serviceTriggers = [];
    const serviceRuns = [];
    let serviceConflicts = 0;
    let serviceOverlapSec = 0;

    for (let i = firstPulseIndexAtOrAfter(pulses, rasterStart); i < pulses.length; i += 1) {
      const pulse = pulses[i];
      if (pulse.start > rasterEnd) break;

      const overlapMs = Math.max(0, Math.min(pulse.end, conflictEnd) - Math.max(pulse.start, conflictStart));
      const overlapSec = overlapMs / 1000;
      // In red-light-run mode the pulses are only context; the confirmed runs
      // below carry the conflict flag.
      const pulseConflict = rlrMode ? false : overlapMode ? overlapSec > minOverlapSec : overlapMs > 0;

      servicePulses.push({
        startSec: round((pulse.start - anchor) / 1000),
        endSec: round((pulse.end - anchor) / 1000),
        durationSec: round(pulse.durationSec),
        overlapSec: round(overlapSec),
        conflict: pulseConflict,
        openEnded: pulse.openEnded,
      });

      // Occupancy time inside the window is accumulated once per pulse so the
      // "either" trigger cannot count the same overlap twice.
      if (overlapMs > 0 && !rlrMode && (!overlapMode || pulseConflict)) serviceOverlapSec += overlapSec;

      if (overlapMode) {
        if (pulse.start >= rasterStart && pulse.start <= rasterEnd) {
          histogramSamples.push({ offsetSec: round((pulse.start - anchor) / 1000), conflict: pulseConflict });
        }
        if (pulseConflict) {
          serviceConflicts += 1;
          conflicts.push({
            ruleId: rule.id,
            ruleLabel: rule.label,
            serviceIndex: service.index,
            walkStartTs: service.walkStart,
            eventTs: Math.max(pulse.start, conflictStart),
            eventType: 'Occupied',
            offsetSec: round((Math.max(pulse.start, conflictStart) - anchor) / 1000),
            overlapSec: round(overlapSec),
            interval: intervalLabel(Math.max(pulse.start, conflictStart), service, window),
            detectorChannel: rule.detectorChannel,
            pedPhase: rule.pedPhase,
            movement: rule.movement,
          });
        }
      }

      const edges = [];
      if (wantsOn) edges.push({ ts: pulse.start, type: 'ON' });
      if (wantsOff && !pulse.openEnded) edges.push({ ts: pulse.end, type: 'OFF' });

      for (const edge of edges) {
        if (edge.ts < rasterStart || edge.ts > rasterEnd) continue;
        const conflict = edge.ts >= conflictStart && edge.ts <= conflictEnd;
        const offsetSec = round((edge.ts - anchor) / 1000);
        serviceTriggers.push({ offsetSec, type: edge.type, conflict });
        histogramSamples.push({ offsetSec, conflict });
        if (!conflict) continue;
        serviceConflicts += 1;
        conflicts.push({
          ruleId: rule.id,
          ruleLabel: rule.label,
          serviceIndex: service.index,
          walkStartTs: service.walkStart,
          eventTs: edge.ts,
          eventType: `Detector ${edge.type}`,
          offsetSec,
          overlapSec: round(overlapSec),
          interval: intervalLabel(edge.ts, service, window),
          detectorChannel: rule.detectorChannel,
          pedPhase: rule.pedPhase,
          movement: rule.movement,
        });
      }
    }

    if (rlrMode) {
      for (let i = firstRunIndexAtOrAfter(runs, rasterStart); i < runs.length; i += 1) {
        const run = runs[i];
        if (run.stopBarOffTs > rasterEnd) break;

        // The vehicle is in the intersection from the stop bar drop-out until
        // it clears the downstream detector, so that whole traversal is what is
        // tested against the pedestrian window.
        const overlapMs = Math.max(
          0,
          Math.min(run.downstreamOffTs, conflictEnd) - Math.max(run.stopBarOffTs, conflictStart),
        );
        const overlapSec = overlapMs / 1000;
        const conflict = overlapMs > 0;
        const offsetSec = round((run.stopBarOffTs - anchor) / 1000);

        serviceRuns.push({
          offsetSec,
          downstreamOnSec: round((run.downstreamOnTs - anchor) / 1000),
          downstreamOffSec: round((run.downstreamOffTs - anchor) / 1000),
          state: run.state,
          travelSec: round(run.travelSec),
          overlapSec: round(overlapSec),
          conflict,
        });
        histogramSamples.push({ offsetSec, conflict });

        if (!conflict) continue;
        serviceConflicts += 1;
        serviceOverlapSec += overlapSec;
        totalTravelSec += run.travelSec;
        stateCounts[run.state] += 1;
        conflicts.push({
          ruleId: rule.id,
          ruleLabel: rule.label,
          serviceIndex: service.index,
          walkStartTs: service.walkStart,
          eventTs: run.stopBarOffTs,
          eventType: `Red-light run (${run.state})`,
          offsetSec,
          overlapSec: round(overlapSec),
          interval: intervalLabel(Math.max(run.stopBarOffTs, conflictStart), service, window),
          detectorChannel: rule.detectorChannel,
          downstreamChannel: rule.downstreamChannel,
          pedPhase: rule.pedPhase,
          movement: rule.movement,
          signalState: run.state,
          secIntoStateSec: round(run.secIntoState),
          travelSec: round(run.travelSec),
          downstreamSec: round(run.downstreamOccupancySec),
        });
      }
    }

    if (serviceConflicts > 0) conflictServices += 1;
    conflictEvents += serviceConflicts;
    totalOverlapSec += serviceOverlapSec;

    const hour = new Date(service.walkStart).getHours();
    const hourRow = byHour.get(hour) || { hour, services: 0, conflicts: 0 };
    hourRow.services += 1;
    hourRow.conflicts += serviceConflicts;
    byHour.set(hour, hourRow);

    serviceRows.push({
      index: service.index,
      walkStartTs: service.walkStart,
      walkSec: round(service.walkSec),
      clearanceSec: round(service.clearanceSec),
      callDelaySec: round(service.callDelaySec),
      serviceEndSec: round((serviceEndTs - anchor) / 1000),
      windowStartSec: round((window.start - anchor) / 1000),
      windowEndSec: round((window.end - anchor) / 1000),
      conflictStartSec: round((conflictStart - anchor) / 1000),
      conflictEndSec: round((conflictEnd - anchor) / 1000),
      rasterStartSec: round((rasterStart - anchor) / 1000),
      rasterEndSec: round((rasterEnd - anchor) / 1000),
      conflictCount: serviceConflicts,
      overlapSec: round(serviceOverlapSec),
      pulses: servicePulses,
      triggers: serviceTriggers,
      runs: serviceRuns,
    });
  }

  // Baseline: how often this detector fires across the whole data set, so an
  // "expected" count can be compared against what lands in the ped window.
  let baselineEvents = runs.length;
  if (!rlrMode) {
    baselineEvents = 0;
    for (const pulse of pulses) {
      if (wantsOn) baselineEvents += 1;
      if (wantsOff && !pulse.openEnded) baselineEvents += 1;
      if (overlapMode) baselineEvents += 1;
    }
  }
  const spanSec = events.length ? (events[events.length - 1].tsMs - events[0].tsMs) / 1000 : 0;
  const baselineRatePerHour = spanSec > 0 ? baselineEvents / (spanSec / 3600) : null;
  const windowRatePerHour = evaluatedWindowSec > 0 ? conflictEvents / (evaluatedWindowSec / 3600) : null;

  return {
    ruleId: rule.id,
    label: rule.label,
    rule: { ...rule },
    detectorTypeLabel: detectorType.label,
    pedWindowLabel: PED_WINDOW_MODES[rule.pedWindow]?.label || rule.pedWindow,
    triggerLabel: TRIGGER_MODES[rule.trigger]?.label || rule.trigger,
    signalStateLabel: rlrMode ? SIGNAL_STATE_MODES[rule.signalStates]?.label || rule.signalStates : null,
    isRedLightRun: rlrMode,
    services: serviceRows,
    conflicts,
    histogram: buildHistogram(histogramSamples, binSec),
    byHour: [...byHour.values()].sort((a, b) => a.hour - b.hour),
    totals: {
      pedServices: serviceRows.length,
      skippedServices,
      detectorPulses: pulses.length,
      conflictEvents,
      conflictServices,
      conflictRatePct: serviceRows.length ? round((conflictServices / serviceRows.length) * 100, 1) : null,
      conflictsPerService: serviceRows.length ? round(conflictEvents / serviceRows.length) : null,
      overlapSec: round(totalOverlapSec),
      overlapPerServiceSec: serviceRows.length ? round(totalOverlapSec / serviceRows.length) : null,
      evaluatedWindowSec: round(evaluatedWindowSec),
      baselineEvents,
      redLightRuns: rlrMode ? runs.length : null,
      avgTravelSec: conflictEvents > 0 && rlrMode ? round(totalTravelSec / conflictEvents) : null,
      conflictRunsYellow: rlrMode ? stateCounts.yellow : null,
      conflictRunsRed: rlrMode ? stateCounts.red : null,
      baselineRatePerHour: round(baselineRatePerHour),
      windowRatePerHour: round(windowRatePerHour),
      exposureIndex:
        baselineRatePerHour > 0 && windowRatePerHour != null ? round(windowRatePerHour / baselineRatePerHour) : null,
    },
  };
}

export function correlateAll({ events, rules, binSec = 1, contextSec = 10 }) {
  return (rules || [])
    .filter((rule) => rule && rule.enabled !== false)
    .map((rule) => correlateRule({ events, rule, binSec, contextSec }));
}

const CSV_HEADER = [
  'rule',
  'movement',
  'detector_channel',
  'downstream_channel',
  'ped_phase',
  'ped_service_index',
  'walk_start',
  'event_time',
  'event_type',
  'ped_interval',
  'offset_from_walk_start_s',
  'overlap_s',
  'signal_state',
  'sec_into_state',
  'travel_to_downstream_s',
  'downstream_occupancy_s',
];

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function conflictsToCsv(results, formatTs = (ts) => new Date(ts).toISOString()) {
  const rows = (results || []).flatMap((result) =>
    result.conflicts.map((row) =>
      [
        row.ruleLabel,
        row.movement,
        row.detectorChannel,
        row.downstreamChannel,
        row.pedPhase,
        row.serviceIndex,
        formatTs(row.walkStartTs),
        formatTs(row.eventTs),
        row.eventType,
        row.interval,
        row.offsetSec,
        row.overlapSec,
        row.signalState,
        row.secIntoStateSec,
        row.travelSec,
        row.downstreamSec,
      ]
        .map(csvCell)
        .join(','),
    ),
  );
  return [CSV_HEADER.join(','), ...rows].join('\n');
}
