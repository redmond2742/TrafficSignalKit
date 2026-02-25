const PHASE_SERVICE_START_CODES = new Set([1]);
const PHASE_SERVICE_END_CODES = new Set([7, 8, 9, 10, 11, 12]);
const DETECTOR_ON_CODES = new Set([82, 90, 94]);
const DETECTOR_OFF_CODES = new Set([81, 89, 93]);
const COORD_CYCLE_EVENT_CODE = 150;

export function parseDetectorAssignments(text) {
  const map = new Map();
  const lines = (text || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 3 || tokens[0].toLowerCase() !== 'det') continue;
    const detector = Number.parseInt(tokens[1], 10);
    const phase = Number.parseInt(tokens[2], 10);
    if (!Number.isFinite(detector) || !Number.isFinite(phase)) continue;
    if (!map.has(phase)) map.set(phase, []);
    map.get(phase).push(detector);
  }
  for (const [phase, detectors] of map.entries()) {
    map.set(phase, [...new Set(detectors)].sort((a, b) => a - b));
  }
  return map;
}

export function normalizeTimestamp(value) {
  const asNum = Number(value);
  if (Number.isFinite(asNum)) return asNum > 1e12 ? asNum : asNum * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildServiceWindows(events, phase) {
  const phaseEvents = events
    .filter((evt) => evt.param === phase && (PHASE_SERVICE_START_CODES.has(evt.code) || PHASE_SERVICE_END_CODES.has(evt.code)))
    .sort((a, b) => a.tsMs - b.tsMs);

  const windows = [];
  let current = null;
  for (const evt of phaseEvents) {
    if (PHASE_SERVICE_START_CODES.has(evt.code)) {
      if (!current) current = { startTs: evt.tsMs, endTs: null };
      continue;
    }
    if (PHASE_SERVICE_END_CODES.has(evt.code) && current) {
      if (evt.tsMs > current.startTs) {
        current.endTs = evt.tsMs;
        windows.push(current);
      }
      current = null;
    }
  }
  return windows;
}

export function computeDetectorOffCounts(events, windows, detectors) {
  const detectorSet = new Set(detectors);
  return windows.map((window) => {
    let offCount = 0;
    const detectorStates = new Map();
    for (const evt of events) {
      if (!detectorSet.has(evt.param)) continue;
      if (!DETECTOR_ON_CODES.has(evt.code) && !DETECTOR_OFF_CODES.has(evt.code)) continue;
      if (evt.tsMs < window.startTs || evt.tsMs > window.endTs) continue;
      const prev = detectorStates.get(evt.param);
      const next = DETECTOR_ON_CODES.has(evt.code) ? 'on' : 'off';
      if (prev === 'on' && next === 'off') offCount += 1;
      detectorStates.set(evt.param, next);
    }
    return offCount;
  });
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

export function assignCycles(windows, coordCycleEvents = [], mode = 'keep-first', thresholdFactor = 0.6) {
  const sorted = [...windows].sort((a, b) => a.startTs - b.startTs);
  if (!sorted.length) return [];

  const withIntervals = sorted.map((w, index) => ({ ...w, intervalS: index ? (w.startTs - sorted[index - 1].startTs) / 1000 : null }));

  let cycleAssignments;
  if (coordCycleEvents.length) {
    const boundaries = coordCycleEvents.slice().sort((a, b) => a - b);
    cycleAssignments = withIntervals.map((w) => {
      let cycle = 1;
      for (const boundary of boundaries) {
        if (w.startTs >= boundary) cycle += 1;
      }
      return { ...w, cycleIndex: cycle };
    });
  } else {
    const intervals = withIntervals.map((w) => w.intervalS).filter((v) => Number.isFinite(v));
    const median = percentile(intervals, 0.5) || 0;
    let cycleIndex = 1;
    cycleAssignments = withIntervals.map((w) => {
      if (Number.isFinite(w.intervalS) && median > 0 && w.intervalS > thresholdFactor * median) cycleIndex += 1;
      return { ...w, cycleIndex };
    });
  }

  const grouped = new Map();
  for (const row of cycleAssignments) {
    if (!grouped.has(row.cycleIndex)) grouped.set(row.cycleIndex, []);
    grouped.get(row.cycleIndex).push(row);
  }

  const out = [];
  for (const [cycleIndex, rows] of grouped.entries()) {
    const ordered = rows.sort((a, b) => a.startTs - b.startTs);
    if (mode === 'aggregate') {
      out.push({
        cycleIndex,
        startTs: ordered[0].startTs,
        endTs: ordered[ordered.length - 1].endTs,
        splitS: ordered.reduce((acc, row) => acc + (row.endTs - row.startTs) / 1000, 0),
      });
    } else {
      const first = ordered[0];
      out.push({ cycleIndex, startTs: first.startTs, endTs: first.endTs, splitS: (first.endTs - first.startTs) / 1000 });
    }
  }
  return out.sort((a, b) => a.cycleIndex - b.cycleIndex);
}

export function buildPhaseBubblePoints({ events, selectedPhase, assignedDetectors, cycleHandling = 'keep-first', includeFirst = false, minAlpha = 0.15, maxAlpha = 0.9, startTs = null, endTs = null, ignoreFirstMinutes = 0 }) {
  const windows = buildServiceWindows(events, selectedPhase);
  const offCounts = computeDetectorOffCounts(events, windows, assignedDetectors);
  const merged = windows.map((w, i) => ({ ...w, offCount: offCounts[i] || 0 }));
  const boundaries = events.filter((evt) => evt.code === COORD_CYCLE_EVENT_CODE).map((evt) => evt.tsMs);
  const cycled = assignCycles(merged, boundaries, cycleHandling).map((row) => {
    const matches = merged.filter((src) => src.startTs >= row.startTs && src.endTs <= row.endTs);
    return { ...row, offCount: matches.reduce((acc, item) => acc + item.offCount, 0) };
  });

  const minTs = startTs ?? -Infinity;
  const maxTs = endTs ?? Infinity;
  const ignoreUntil = Number.isFinite(minTs) ? minTs + ignoreFirstMinutes * 60000 : -Infinity;
  const filtered = cycled.filter((row) => row.startTs >= ignoreUntil && row.startTs >= minTs && row.startTs <= maxTs);

  let previousStart = null;
  const maxOff = Math.max(0, ...filtered.map((row) => row.offCount));
  return filtered.map((row) => {
    const since = previousStart == null ? null : (row.startTs - previousStart) / 1000;
    previousStart = row.startTs;
    const fillFactor = maxOff > 0 ? row.offCount / maxOff : 0;
    const alpha = maxOff > 0 ? Math.max(minAlpha, Math.min(maxAlpha, maxAlpha - fillFactor * (maxAlpha - minAlpha))) : maxAlpha;
    return {
      phase: selectedPhase,
      cycle_index: row.cycleIndex,
      service_start_ts: row.startTs,
      service_start_iso: new Date(row.startTs).toISOString(),
      split_s: row.splitS,
      time_since_last_on_s: since,
      off_count: row.offCount,
      assigned_detectors: assignedDetectors,
      alpha,
      fill_factor: fillFactor,
    };
  }).filter((row) => includeFirst || Number.isFinite(row.time_since_last_on_s));
}

export function bubbleRadius(splitS, options) {
  const {
    mode = 'linear',
    scaledMode = 'sqrt',
    capP95 = true,
    splits = [],
    minRadius = 4,
    maxRadius = 20,
  } = options;

  const finiteSplits = splits.filter((value) => Number.isFinite(value) && value >= 0);
  const cap = capP95 ? percentile(finiteSplits, 0.95) : Math.max(...finiteSplits, 0);
  const upper = Number.isFinite(cap) && cap > 0 ? cap : Math.max(...finiteSplits, 0);
  const capped = Math.max(0, Math.min(splitS, upper || splitS || 0));

  const transform = (value) => {
    if (mode === 'linear') return value;
    if (scaledMode === 'log') return Math.log1p(value);
    return Math.sqrt(value);
  };

  const transformedMax = transform(upper || capped || 1);
  const transformedValue = transform(capped);
  const fraction = transformedMax > 0 ? transformedValue / transformedMax : 0;

  return minRadius + fraction * (maxRadius - minRadius);
}

export function parseCsvRows(csvText) {
  return (csvText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split(',').map((cell) => cell.trim())).map((cells) => ({
    tsMs: normalizeTimestamp(cells[0]),
    code: Number.parseInt(cells[1], 10),
    param: Number.parseInt(cells[2], 10),
  })).filter((row) => Number.isFinite(row.tsMs) && Number.isFinite(row.code) && Number.isFinite(row.param)).sort((a, b) => a.tsMs - b.tsMs);
}
