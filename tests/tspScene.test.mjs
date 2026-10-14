import test from 'node:test';
import assert from 'node:assert/strict';
import { busAt, busMotion, computeTiming, defaultApproach } from '../src/utils/tspTiming.js';
import {
  MIN_BUS_PX, SCENE, TIMELINE, labelWidth, packDimensions, sceneGeometry, secondsStep, tickStep, timelineGeometry,
} from '../src/utils/tspScene.js';

const sceneFor = (overrides = {}, width = 1000) => {
  const a = defaultApproach({ lostTime: 4, ...overrides });
  const t = computeTiming(a);
  const m = busMotion(a, t);
  return { a, t, m, g: sceneGeometry(a, t, { width, motion: m }) };
};

const inside = (g, x, what) => assert.ok(x >= SCENE.pad - 1e-9 && x <= g.width - SCENE.pad + 1e-9, `${what} at ${x}`);

test('the stop bar is downstream of the request, and the far side downstream of both', () => {
  const { g } = sceneFor();
  assert.ok(g.request < g.stopBar);
  assert.ok(g.stopBar < g.farSide);
});

test('it is to scale along the road', () => {
  const { g, t } = sceneFor();
  const pxPerFt = (g.stopBar - g.request) / t.d;
  assert.ok(Math.abs((g.farSide - g.stopBar) / 80 - pxPerFt) < 1e-9);
  assert.ok(Math.abs(g.scale - pxPerFt) < 1e-9);
});

test('every feature, and the whole trip, is on the drawing', () => {
  for (const overrides of [
    {},
    { detectorPosition: 'before', detectorToStopBar: 150 },
    { technology: 'cloud', checkInDistance: 2640 },
    { technology: 'video', zoneSetback: 300 },
    { nearSideStop: true, stopDistance: 120, lostTime: 20 },
    { nearSideStop: true, stopDistance: 1500, lostTime: 5 },
    { includeBusLength: true, busLength: 60 },
  ]) {
    const { g, m } = sceneFor(overrides);
    for (const [what, x] of Object.entries({
      request: g.request, stopBar: g.stopBar, farSide: g.farSide, clear: g.clear, mast: g.mast,
      detector: g.detector?.x, rangeEnd: g.detector?.rangeEnd, checkIn: g.checkIn?.x,
      zone0: g.zone?.x0, zone1: g.zone?.x1, stop: g.stop?.x,
    })) {
      if (x !== undefined) inside(g, x, `${JSON.stringify(overrides)} ${what}`);
    }
    // The bus's tail at the start and its nose at the end.
    inside(g, g.X(busAt(m, m.start).x) - g.busPx, 'bus tail at the start');
    inside(g, g.X(busAt(m, m.end).x), 'bus nose at the end');
  }
});

test('each technology draws its own equipment', () => {
  const emitter = sceneFor({ technology: 'emitter' }).g;
  assert.ok(emitter.detector && !emitter.checkIn && !emitter.zone && !emitter.camera);
  // The range reaches back from the detector to exactly where the request starts.
  assert.ok(Math.abs(emitter.detector.rangeEnd - emitter.request) < 1e-9);
  assert.ok(emitter.detector.x > emitter.stopBar, 'on a far-side mast arm');
  assert.ok(Math.abs(emitter.mast - emitter.detector.x) < 1e-9, 'the arm is where the detector is');

  const before = sceneFor({ detectorPosition: 'before', detectorToStopBar: 50 }).g;
  assert.ok(before.detector.x < before.stopBar);

  const cloud = sceneFor({ technology: 'cloud' }).g;
  assert.ok(cloud.checkIn && cloud.cloud && !cloud.detector && !cloud.zone);
  assert.equal(cloud.checkIn.x, cloud.request);

  const video = sceneFor({ technology: 'video', zoneLength: 60 }).g;
  assert.ok(video.zone && video.camera && !video.detector && !video.checkIn);
  assert.equal(video.zone.x0, video.request);
  assert.ok(Math.abs((video.zone.x1 - video.zone.x0) / video.scale - 60) < 1e-9, 'zone length to scale');
  const long = sceneFor({ technology: 'video', zoneSetback: 30, zoneLength: 400 }).g;
  assert.equal(long.zone.x1, long.stopBar, 'a zone never runs past the stop bar');
});

test('the near-side stop is drawn only when there is one', () => {
  assert.equal(sceneFor().g.stop, null);
  const { g } = sceneFor({ nearSideStop: true, stopDistance: 120 });
  assert.ok(Math.abs((g.stopBar - g.stop.x) / g.scale - 120) < 1e-9);
});

test('the bus is to scale when it can be, and never shorter than readable', () => {
  const short = sceneFor({ emitterDistance: 300, detectorToStopBar: 0 }).g;
  assert.equal(short.busToScale, true);
  assert.ok(Math.abs(short.busPx - 40 * short.scale) < 1e-9);
  const long = sceneFor({ technology: 'cloud', checkInDistance: 10000 }).g;
  assert.equal(long.busPx, MIN_BUS_PX);
  assert.equal(long.busToScale, false);
});

test('dimension labels in one row never overlap', () => {
  for (const overrides of [
    {},
    { nearSideStop: true, stopDistance: 75, lostTime: 20 },
    { includeBusLength: true },
    { detectorPosition: 'before', detectorToStopBar: 40 },
    { nearSideStop: true, stopDistance: 300, lostTime: 20, includeBusLength: true },
  ]) {
    for (const width of [360, 700, 1000]) {
      const { g } = sceneFor(overrides, width);
      const byRow = new Map();
      const apart = (a0, a1, b0, b1) => a1 <= b0 + 0.5 || b1 <= a0 + 0.5;
      for (const dim of g.dims) {
        const list = byRow.get(dim.row) || [];
        for (const other of list) {
          const what = `${width}px: "${dim.label}" and "${other.label}"`;
          assert.ok(apart(dim.x0, dim.x1, other.x0, other.x1), `${what}: lines overlap`);
          assert.ok(apart(dim.labL - 6, dim.labR + 6, other.labL, other.labR), `${what}: labels touch`);
          assert.ok(apart(dim.labL, dim.labR, other.x0, other.x1), `${what}: label on a line`);
          assert.ok(apart(other.labL, other.labR, dim.x0, dim.x1), `${what}: label on a line`);
        }
        byRow.set(dim.row, [...list, dim]);
      }
      // And the distance axis is below every row.
      for (const dim of g.dims) assert.ok(dim.y + 8 <= g.axis, `${width}px: "${dim.label}" runs into the axis`);
      assert.ok(g.height > g.axis);
      // A label beside its line stays on the drawing.
      for (const dim of g.dims) assert.ok(dim.left >= 0 && dim.right <= width, `${width}px: "${dim.label}"`);
    }
  }
});

test('a chain of dimensions shares a row, so the drawing stays short', () => {
  const { g } = sceneFor({}, 1000);
  const rowOf = (key) => g.dims.find((d) => d.key === key).row;
  assert.equal(rowOf('request'), rowOf('crossing'), 'request, then the crossing');
  assert.equal(new Set(g.dims.map((d) => d.row)).size, 2);
  // On a phone the labels crowd more, but three rows still fit above the axis.
  for (const width of [360, 1000]) assert.equal(sceneFor({}, width).g.axis, SCENE.axis);
  const busy = sceneFor({ nearSideStop: true, stopDistance: 75, lostTime: 20, includeBusLength: true }).g;
  assert.ok(new Set(busy.dims.map((d) => d.row)).size <= 3);
});

test('on a narrow screen the drawing grows to fit every row', () => {
  const { g } = sceneFor({
    emitterDistance: 440, detectorToStopBar: 40, nearSideStop: true, stopDistance: 30, lostTime: 10, intersectionLength: 40,
  }, 300);
  const rows = new Set(g.dims.map((d) => d.row)).size;
  assert.equal(rows, 4);
  assert.ok(g.axis > SCENE.axis);
  for (const dim of g.dims) assert.ok(dim.y + 8 <= g.axis, `"${dim.label}" runs into the axis`);
});

/* Packing, on made-up dimensions: labels here are 6.16 px a character. */
const pack = (dims, width = 1000) => packDimensions(dims.map((d, i) => ({ key: String(i), ...d })), width).dims;

test('dimensions that only touch share a row', () => {
  const [a, b] = pack([{ x0: 100, x1: 400, label: 'AAAA' }, { x0: 400, x1: 700, label: 'BBBB' }]);
  assert.equal(a.row, 0);
  assert.equal(b.row, 0);
});

test('labels that would collide go to separate rows, though the lines do not overlap', () => {
  // Each label is about 160 px, wider than its 40 px line, and the lines are 60 px apart.
  const long = 'X'.repeat(26);
  const [a, b] = pack([{ x0: 400, x1: 440, label: long }, { x0: 500, x1: 540, label: long }]);
  assert.notEqual(a.row, b.row);
  // Labels pointing at each other across a gap, each clear of the other's line.
  const [c, d] = pack([{ x0: 400, x1: 440, label: long }, { x0: 700, x1: 710, label: long }], 800);
  assert.equal(c.anchor, 'start');
  assert.equal(d.anchor, 'end');
  assert.ok(c.labR > d.labL, 'the labels would overlap in one row');
  assert.notEqual(c.row, d.row);
});

test('a label is never put over another dimension\'s line', () => {
  // The first label must go after its line, which is where the second line is.
  const [a, b] = pack([{ x0: 100, x1: 110, label: 'X'.repeat(12) }, { x0: 120, x1: 300, label: 'Y' }]);
  assert.equal(a.anchor, 'start');
  assert.notEqual(a.row, b.row);
  // And the other way round: the second label must go before its line, over the first.
  const [c, d] = pack([{ x0: 100, x1: 880, label: 'Y' }, { x0: 880, x1: 890, label: 'X'.repeat(30) }], 900);
  assert.equal(d.anchor, 'end');
  assert.notEqual(c.row, d.row);
});

test('a label with no room after its line goes before it', () => {
  const [a] = pack([{ x0: 880, x1: 890, label: 'X'.repeat(20) }], 900);
  assert.equal(a.anchor, 'end');
  assert.ok(a.labR <= a.x0);
});

test('a label with no room anywhere is centred rather than lost', () => {
  const [a] = pack([{ x0: 40, x1: 60, label: 'X'.repeat(40) }], 100);
  assert.equal(a.anchor, 'middle');
  assert.equal(a.tx, 50);
  assert.equal(a.text, a.label);
});

test('a label that fits nowhere falls back to its short form', () => {
  const [a] = pack([{ x0: 100, x1: 160, label: 'Request starts 250 ft out', short: '250 ft' }], 220);
  assert.equal(a.text, '250 ft');
  assert.equal(a.anchor, 'middle', 'and the short form fits over the line');
  const [b] = pack([{ x0: 100, x1: 160, label: 'Request', short: '250 ft' }], 220);
  assert.equal(b.text, 'Request', 'a full label that fits is kept');
  const [c] = pack([{ x0: 100, x1: 104, label: 'X'.repeat(40), short: 'Y'.repeat(30) }], 120);
  assert.equal(c.text, c.short, 'nothing fits: the shorter of the two, centred');
  // The short form goes beside its line, like any label, when it will not fit over it.
  const [d] = pack([{ x0: 100, x1: 104, label: 'X'.repeat(40), short: '250 ft' }], 220);
  assert.equal(d.text, '250 ft');
  assert.equal(d.anchor, 'start');
});

test('the packer measures with what it is given', () => {
  // Measured narrow, the label fits over its 90 px line; estimated, it does not.
  const dim = { key: 'r', x0: 75, x1: 165, label: 'Request starts 250 ft out', short: '250 ft' };
  assert.equal(packDimensions([dim], 300).dims[0].text, '250 ft');
  const [measured] = packDimensions([dim], 300, (text) => text.length * 3).dims;
  assert.equal(measured.text, dim.label);
  assert.equal(measured.anchor, 'middle');
});

test('the drawing packs with the measure it is given', () => {
  const a = defaultApproach({ technology: 'video', zoneSetback: 250, lostTime: 3 });
  const t = computeTiming(a);
  const estimated = sceneGeometry(a, t, { width: 260 }).dims.find((d) => d.key === 'request');
  const measured = sceneGeometry(a, t, { width: 260, measure: (text) => text.length * 3 }).dims.find((d) => d.key === 'request');
  assert.equal(estimated.text, '250 ft');
  assert.equal(measured.text, 'Request starts 250 ft out');
});

test('on a phone the dimensions fall back to short labels, and still never overlap', () => {
  const { g } = sceneFor({ technology: 'video', zoneSetback: 250, lostTime: 3 }, 260);
  assert.ok(g.dims.some((d) => d.text !== d.label), 'something had to shorten');
  for (const d of g.dims) assert.ok(d.labL >= 0 && d.labR <= 260, `"${d.text}" is off the drawing`);
});

test('a short dimension puts its label beside the line, not across it', () => {
  const { g } = sceneFor({ technology: 'cloud', checkInDistance: 2640, intersectionLength: 60 });
  const dim = g.dims.find((x) => x.key === 'crossing');
  assert.equal(dim.anchor, 'start');
  assert.ok(dim.labL > dim.x1);
});

test('the dimensions say what they measure', () => {
  const { g } = sceneFor({ nearSideStop: true, stopDistance: 75, includeBusLength: true });
  const labels = g.dims.map((d) => d.label);
  assert.ok(labels.includes('Request starts 900 ft out'));
  assert.ok(labels.includes('120 ft to clear (80 ft + 40 ft bus)'));
  assert.ok(labels.includes('Detector 100 ft past'));
  assert.ok(labels.includes('Stop 75 ft out'));
  assert.equal(g.detector.label, 'Emitter range 1,000 ft');
  assert.ok(sceneFor({ detectorPosition: 'before', detectorToStopBar: 40 }).g.dims.some((d) => d.label === 'Detector 40 ft before'));
  // Without the bus it is just the intersection; a detector at the stop bar needs no dimension.
  const plain = sceneFor({ detectorToStopBar: 0 }).g.dims;
  assert.ok(plain.some((d) => d.label === '80 ft intersection'));
  assert.ok(!plain.some((d) => d.key === 'detector'));
});

test('ticks are round distances, a handful of them, labelled from the stop bar', () => {
  assert.equal(tickStep(1100), 200);
  assert.equal(tickStep(3000), 500);
  assert.equal(tickStep(150), 25);
  const { g } = sceneFor();
  assert.ok(g.ticks.length >= 4 && g.ticks.length <= 12);
  assert.ok(g.ticks.some((t) => t.label === '0' && Math.abs(t.x - g.stopBar) < 1e-9));
  assert.ok(g.ticks.some((t) => t.label === '800 ft'));
});

test('with no valid request, the drawing still has a road', () => {
  const a = defaultApproach({ emitterDistance: 50, detectorToStopBar: 100 });
  const g = sceneGeometry(a, computeTiming(a));
  assert.equal(g.request, null);
  assert.ok(g.stopBar < g.farSide);
  assert.ok(g.dims.some((d) => d.key === 'crossing'));
});

/* --------------------------------------------------------------- timeline */

test('the timeline runs the whole trip, with the trip\'s parts in order', () => {
  const { t, m } = sceneFor({ technology: 'cloud', nearSideStop: true, stopDistance: 120, lostTime: 15 });
  const line = timelineGeometry(m, t, { width: 800 });
  assert.equal(line.spans[0].x0, TIMELINE.pad);
  assert.equal(line.spans[line.spans.length - 1].x1, 800 - TIMELINE.pad);
  assert.deepEqual(line.spans.map((s) => s.kind), ['lead', 'travel', 'hold', 'travel', 'crossing', 'trail']);
  for (let i = 1; i < line.spans.length; i += 1) assert.equal(line.spans[i].x0, line.spans[i - 1].x1);
  // Latency ends where the request is received.
  assert.equal(line.latency.x1, line.received);
  assert.ok(line.latency.x0 < line.received);
});

test('TSD and TED each mark the exact time and the second sent, labelled outward', () => {
  const { t, m } = sceneFor();
  const line = timelineGeometry(m, t);
  assert.ok(line.tsd.programmed <= line.tsd.exact, 'TSD rounds down');
  assert.ok(line.ted.programmed >= line.ted.exact, 'TED rounds up');
  assert.equal(line.tsd.label, 'TSD 21 s');
  assert.equal(line.ted.label, 'TED 24 s');
  assert.ok(Math.abs(line.T(21) - line.tsd.programmed) < 1e-9);
});

test('the TSD and TED labels stay on the timeline', () => {
  const bold = (text) => labelWidth(text) * 1.1;
  for (const width of [320, 600, 1000]) {
    for (const overrides of [
      {},
      { emitterDistance: 150, detectorToStopBar: 0 },
      // A short approach and a long crossing put TSD hard against the left.
      { emitterDistance: 30, detectorToStopBar: 0, speed: 5, intersectionLength: 1000, lostTime: 0 },
    ]) {
      const { t, m } = sceneFor(overrides);
      const line = timelineGeometry(m, t, { width });
      // TSD's label ends at its x, TED's starts there.
      assert.ok(line.tsd.tx - bold(line.tsd.label) >= 0, `${width}px: TSD label off the left`);
      assert.ok(line.ted.tx + bold(line.ted.label) <= width, `${width}px: TED label off the right`);
    }
  }
  // With room, each sits just outside its own mark.
  const { t, m } = sceneFor();
  const line = timelineGeometry(m, t, { width: 1000 });
  assert.equal(line.tsd.tx, line.tsd.programmed - 3);
});

test('no latency, no latency band', () => {
  const { t, m } = sceneFor();
  assert.equal(timelineGeometry(m, t).latency, null);
  assert.equal(timelineGeometry(null, t), null);
});

test('time ticks are round seconds', () => {
  assert.equal(secondsStep(25), 5);
  assert.equal(secondsStep(9), 1);
  assert.equal(secondsStep(200), 30);
  const { t, m } = sceneFor();
  const line = timelineGeometry(m, t);
  assert.ok(line.ticks.some((k) => k.label === '0 s' && Math.abs(k.x - line.received) < 1e-9));
});
