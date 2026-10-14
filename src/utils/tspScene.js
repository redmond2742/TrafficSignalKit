/**
 * Where everything goes in the TSP approach drawing.
 *
 * The drawing is a plan view of one approach, the bus driving left to right
 * toward the intersection. Along the road it is to scale -- the request point,
 * the detector, the stop and the stop bar sit at their true distances -- so a
 * reader can see how much of the approach the request covers. Across the road
 * it is not: the lanes are drawn wide enough to read.
 *
 * This works out the positions; the view draws them. Pure arithmetic, so it
 * runs under `node --test`.
 *
 * Framework free.
 */

import { technologyOf } from './tspTiming.js';

/** Pixel rows of the drawing, top to bottom. */
export const SCENE = {
  height: 300,
  pad: 16,
  sidewalkTop: 56,
  laneTop: 70,
  centerLine: 110,
  laneBottom: 150,
  curb: 166,
  crossTop: 36,
  crossBottom: 190,
  dimTop: 206,
  dimRow: 18,
  axis: 270,
};

/** The bus is never drawn shorter than this, however long the approach. */
export const MIN_BUS_PX = 26;

/** Lane centres. */
export const APPROACH_Y = (SCENE.centerLine + SCENE.laneBottom) / 2;
export const OPPOSING_Y = (SCENE.laneTop + SCENE.centerLine) / 2;

/**
 * Rough label width, for when nothing better is passed in. On the generous
 * side -- Helvetica averages nearer 0.45 em a character -- so a label judged
 * to fit does. The page measures real text instead.
 */
export const labelWidth = (text, size = 11) => String(text).length * size * 0.56;

const ftLabel = (feet) => `${Math.round(feet).toLocaleString('en-US')} ft`;

/** The roundest tick spacing giving no more than about `count` ticks over `span` feet. */
export function tickStep(span, count = 8) {
  const raw = span / count;
  for (const step of [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000]) {
    if (step >= raw) return step;
  }
  return 10000;
}

/**
 * Dimension lines, packed into as few rows as will keep them readable.
 *
 * Lines may meet end to end in one row, as a chain of dimensions does on a
 * drawing, but may not overlap, and no label may sit on another label or on
 * another dimension's line. A label goes over the middle of its line if it
 * fits there, otherwise just after the line's end or just before its start --
 * whichever lets it share a row.
 *
 * In the order given, which is the order of importance: the first dimension
 * gets the top row.
 *
 * A dimension may carry a `short` label too, used only when the full one fits
 * nowhere -- on a phone, "250 ft" beside a line beats "Request starts 250 ft
 * out" printed across it. `measure` gives a label's width in pixels.
 */
export function packDimensions(list, width, measure = labelWidth) {
  const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.5;
  const clash = (p, q) => overlap(p.x0, p.x1, q.x0, q.x1)
    || overlap(p.labL - 6, p.labR + 6, q.labL, q.labR)
    || overlap(p.labL, p.labR, q.x0, q.x1)
    || overlap(q.labL, q.labR, p.x0, p.x1);
  const placements = (dim, text) => {
    const w = measure(text);
    const mid = (dim.x0 + dim.x1) / 2;
    const out = [];
    if (dim.x1 - dim.x0 >= w + 8) out.push({ anchor: 'middle', tx: mid, labL: mid - w / 2, labR: mid + w / 2 });
    if (dim.x1 + 4 + w <= width - 2) out.push({ anchor: 'start', tx: dim.x1 + 4, labL: dim.x1 + 4, labR: dim.x1 + 4 + w });
    if (dim.x0 - 4 - w >= 2) out.push({ anchor: 'end', tx: dim.x0 - 4, labL: dim.x0 - 4 - w, labR: dim.x0 - 4 });
    return out.map((p) => ({ ...p, text }));
  };
  const options = (dim) => {
    const full = placements(dim, dim.label);
    if (full.length) return full;
    const short = dim.short ? placements(dim, dim.short) : [];
    if (short.length) return short;
    // Room nowhere: centred on its line, in the shortest form there is.
    const text = dim.short || dim.label;
    const w = measure(text);
    const mid = (dim.x0 + dim.x1) / 2;
    return [{ anchor: 'middle', tx: mid, labL: mid - w / 2, labR: mid + w / 2, text }];
  };

  const rows = [];
  const placed = [];
  for (const dim of list) {
    const choices = options(dim);
    let chosen = null;
    // Fewest rows first: any placement in an existing row beats a new row.
    for (let row = 0; !chosen; row += 1) {
      const members = rows[row] || [];
      const fit = choices.map((opt) => ({ ...dim, ...opt })).find((trial) => members.every((m) => !clash(m, trial)));
      if (fit) chosen = { ...fit, row };
    }
    (rows[chosen.row] ||= []).push(chosen);
    placed.push({
      ...chosen,
      left: Math.min(chosen.x0, chosen.labL),
      right: Math.max(chosen.x1, chosen.labR),
      y: SCENE.dimTop + chosen.row * SCENE.dimRow,
    });
  }
  return { dims: placed, rows: rows.length };
}

/**
 * The drawing's geometry for one approach.
 *
 * `motion` (from busMotion) is optional; with it, the extents also cover
 * where the bus starts and ends its trip, so it never drives off the page.
 */
export function sceneGeometry(approach, timing, { width = 1000, motion = null, measure = labelWidth } = {}) {
  const a = approach || {};
  const tech = technologyOf(a);
  const d = timing?.d > 0 ? timing.d : null;
  const intersection = Math.max(0, Number(a.intersectionLength) || 0);
  const busLength = Math.max(0, Number(a.busLength) || 40);
  const clear = timing?.crossDistance ?? intersection;

  // Every feature along the road, in feet from the stop bar.
  const along = [0, intersection, clear];
  let detector = null;
  if (tech === 'emitter') {
    const offset = Number(a.detectorToStopBar) || 0;
    const at = a.detectorPosition === 'before' ? -offset : offset;
    detector = { ft: at, rangeEndFt: at - (Number(a.emitterDistance) || 0) };
    along.push(detector.ft, detector.rangeEndFt);
  }
  if (d !== null) along.push(-d);
  // A zone longer than its setback stops at the stop bar.
  const zone = tech === 'video' && d !== null
    ? { ft0: -d, ft1: Math.min(0, -d + Math.max(5, Number(a.zoneLength) || 40)) }
    : null;
  const stop = a.nearSideStop ? Math.max(0, Number(a.stopDistance) || 0) : null;
  if (stop !== null) along.push(-stop);
  if (motion) {
    along.push(motion.segments[0].x0 - busLength, motion.segments[motion.segments.length - 1].x1);
  } else {
    along.push(-busLength - 60);
  }

  const lo = Math.min(...along);
  const hi = Math.max(...along);
  // A little road beyond each end, so nothing sits on the border.
  const margin = Math.max(20, (hi - lo) * 0.03);
  const minFt = lo - margin;
  const maxFt = hi + margin;
  // Road past the end of the trip, to the right, for the far-side labels.
  const gutter = Math.min(100, width * 0.15);
  const scale = (width - 2 * SCENE.pad - gutter) / (maxFt - minFt);
  const X = (feet) => SCENE.pad + (feet - minFt) * scale;

  const busPx = Math.max(MIN_BUS_PX, busLength * scale);

  // Signals and detector hang from a mast arm. An emitter detector says where
  // the arm is; otherwise it stands on the far side.
  const mastFt = detector ? detector.ft : intersection;

  const step = tickStep(maxFt - minFt);
  const ticks = [];
  for (let f = Math.ceil(minFt / step) * step; f <= maxFt; f += step) {
    ticks.push({ x: X(f), ft: f, label: f === 0 ? '0' : ftLabel(Math.abs(f)) });
  }

  const dims = [];
  if (d !== null) {
    dims.push({ key: 'request', x0: X(-d), x1: X(0), label: `Request starts ${ftLabel(d)} out`, short: ftLabel(d) });
  }
  // What the bus covers between TSD and TED. The emitter's range is labelled
  // on its detection cone instead: as a dimension it only restates the
  // request and detector dimensions added together.
  dims.push({
    key: 'crossing',
    x0: X(0),
    x1: X(clear),
    label: clear > intersection
      ? `${ftLabel(clear)} to clear (${ftLabel(intersection)} + ${ftLabel(clear - intersection)} bus)`
      : `${ftLabel(intersection)} intersection`,
    short: ftLabel(clear),
  });
  if (detector && detector.ft !== 0) {
    dims.push({
      key: 'detector',
      x0: X(Math.min(0, detector.ft)),
      x1: X(Math.max(0, detector.ft)),
      label: `Detector ${ftLabel(Math.abs(detector.ft))} ${detector.ft > 0 ? 'past' : 'before'}`,
      short: ftLabel(Math.abs(detector.ft)),
    });
  }
  if (stop !== null) {
    dims.push({ key: 'stop', x0: X(-stop), x1: X(0), label: `Stop ${ftLabel(stop)} out`, short: ftLabel(stop) });
  }

  const packed = packDimensions(dims, width, measure);
  // The distance axis goes under the last row of dimensions.
  const axis = Math.max(SCENE.axis, SCENE.dimTop + packed.rows * SCENE.dimRow + 10);

  return {
    width,
    height: axis + (SCENE.height - SCENE.axis),
    axis,
    technology: tech,
    minFt,
    maxFt,
    scale,
    X,
    stopBar: X(0),
    farSide: X(intersection),
    clear: X(clear),
    request: d !== null ? X(-d) : null,
    mast: X(mastFt),
    detector: detector
      ? { x: X(detector.ft), rangeEnd: X(detector.rangeEndFt), label: `Emitter range ${ftLabel(detector.ft - detector.rangeEndFt)}` }
      : null,
    checkIn: tech === 'cloud' && d !== null ? { x: X(-d) } : null,
    cloud: tech === 'cloud' && d !== null ? { x: (X(-d) + X(0)) / 2, y: 20 } : null,
    zone: zone ? { x0: X(zone.ft0), x1: X(zone.ft1) } : null,
    camera: tech === 'video' ? { x: X(mastFt) } : null,
    stop: stop !== null ? { x: X(-stop) } : null,
    // On the far-side corner, clear of a near-side stop. `x` is its left edge.
    cabinet: { x: X(intersection) + 10, y: SCENE.curb + 3 },
    busPx,
    busToScale: busPx === busLength * scale,
    ticks,
    dims: packed.dims,
  };
}

/** Pixel rows of the timeline under the drawing. */
export const TIMELINE = {
  height: 78,
  pad: 16,
  latencyTop: 8,
  latencyHeight: 8,
  barTop: 20,
  barHeight: 14,
  labelY: 48,
  axisY: 58,
};

/** The roundest tick spacing in seconds giving no more than about `count` ticks. */
export function secondsStep(span, count = 10) {
  for (const step of [1, 2, 5, 10, 15, 30, 60, 120]) {
    if (step >= span / count) return step;
  }
  return 300;
}

/**
 * The timeline: the bus's trip as coloured spans on a seconds axis, with the
 * latency above it and markers where the request arrives and at TSD and TED.
 *
 * TSD and TED each get two marks: the exact time, and the whole second sent
 * to the controller. The labels go outward from the programmed marks -- TSD's
 * to the left, TED's to the right -- so they never overlap each other.
 */
export function timelineGeometry(motion, timing, { width = 1000 } = {}) {
  if (!motion || !timing || timing.tsd === null) return null;
  const span = motion.end - motion.start;
  const T = (t) => TIMELINE.pad + ((t - motion.start) / span) * (width - 2 * TIMELINE.pad);
  const step = secondsStep(span);
  const ticks = [];
  for (let s = Math.ceil(motion.start / step) * step; s <= motion.end; s += step) {
    ticks.push({ x: T(s), label: `${s} s` });
  }
  // Labels point outward from their marks, but stay on the timeline: near an
  // end, one is pulled back in.
  const tsdLabel = `TSD ${timing.tsd} s`;
  const tedLabel = `TED ${timing.ted} s`;
  const bold = (text) => labelWidth(text) * 1.1;
  const tsdX = Math.max(T(timing.tsd) - 3, 2 + bold(tsdLabel));
  const tedX = Math.min(T(timing.ted) + 3, width - 2 - bold(tedLabel));
  return {
    width,
    height: TIMELINE.height,
    T,
    spans: motion.segments.map((s) => ({ kind: s.kind, x0: T(s.t0), x1: T(s.t1) })),
    latency: motion.latency > 0 ? { x0: T(-motion.latency), x1: T(0) } : null,
    received: T(0),
    tsd: { exact: T(timing.tsdExact), programmed: T(timing.tsd), label: tsdLabel, tx: tsdX },
    ted: { exact: T(timing.tedExact), programmed: T(timing.ted), label: tedLabel, tx: tedX },
    ticks,
  };
}
