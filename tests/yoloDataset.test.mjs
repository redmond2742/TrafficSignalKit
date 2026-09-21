import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toYoloLine,
  buildLabelFile,
  sanitizeClassName,
  buildDataYaml,
  splitExtension,
  sanitizeBasename,
  dedupeBasenames,
  deriveGroupKey,
  splitFor,
  assignSplits,
  datasetStats,
  selectExportImages,
} from '../src/utils/yoloDataset.js';

test('toYoloLine normalizes to the image size', () => {
  assert.equal(
    toYoloLine({ x: 100, y: 200, w: 50, h: 80 }, 1920, 1080),
    '0 0.065104 0.222222 0.026042 0.074074',
  );
  assert.equal(toYoloLine({ x: 0, y: 0, w: 640, h: 480 }, 640, 480), '0 0.500000 0.500000 1.000000 1.000000');
});

test('a box hanging off the image is clamped before it is normalized', () => {
  // Clamping the four normalized values independently would leave cx - w/2
  // below zero; clamping the rect first cannot.
  const line = toYoloLine({ x: -40, y: -30, w: 100, h: 100 }, 640, 480);
  const [, cx, cy, w, h] = line.split(' ').map(Number);
  assert.ok(cx - w / 2 >= -1e-9 && cx + w / 2 <= 1 + 1e-9, 'x stays inside the image');
  assert.ok(cy - h / 2 >= -1e-9 && cy + h / 2 <= 1 + 1e-9, 'y stays inside the image');
  assert.ok(Math.abs(w - 60 / 640) < 1e-6, 'width is the visible part only');
  assert.ok(Math.abs(h - 70 / 480) < 1e-6, 'height is the visible part only');

  const over = toYoloLine({ x: 600, y: 440, w: 200, h: 200 }, 640, 480);
  const [, ocx, ocy, ow, oh] = over.split(' ').map(Number);
  assert.ok(ocx + ow / 2 <= 1 + 1e-9);
  assert.ok(ocy + oh / 2 <= 1 + 1e-9);
});

test('sub-pixel boxes are dropped rather than emitted as zero-area labels', () => {
  assert.equal(toYoloLine({ x: 10, y: 10, w: 0.4, h: 30 }, 640, 480), null);

  const result = buildLabelFile(
    [
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 50, y: 50, w: 0.2, h: 0.2 },
    ],
    640,
    480,
  );
  assert.equal(result.kept, 1);
  assert.equal(result.dropped, 1);
  assert.equal(result.text.trim().split('\n').length, 1);
});

test('a reviewed image with no boxes produces a zero-byte label file', () => {
  const { text, kept } = buildLabelFile([], 640, 480);
  assert.equal(text, '', 'not even a newline — some tooling rejects whitespace-only labels');
  assert.equal(text.length, 0);
  assert.equal(kept, 0);
});

test('label files end with a trailing newline', () => {
  const { text } = buildLabelFile([{ x: 1, y: 1, w: 10, h: 10 }], 100, 100);
  assert.ok(text.endsWith('\n'));
  assert.equal(text.split('\n').filter(Boolean).length, 1);
});

test('class names are reduced to a safe identifier', () => {
  assert.equal(sanitizeClassName('traffic_signal'), 'traffic_signal');
  assert.equal(sanitizeClassName('my class'), 'my_class');
  assert.equal(sanitizeClassName('  signal head!  '), 'signal_head');
  assert.equal(sanitizeClassName(''), 'traffic_signal');
  assert.equal(sanitizeClassName('***'), 'traffic_signal');
});

test('data.yaml describes a single-class dataset', () => {
  const yaml = buildDataYaml('traffic_signal');
  assert.match(yaml, /^path: \.$/m);
  assert.match(yaml, /^train: images\/train$/m);
  assert.match(yaml, /^val: images\/val$/m);
  assert.match(yaml, /^nc: 1$/m);
  assert.match(yaml, /^ {2}0: traffic_signal$/m);
  assert.ok(!buildDataYaml('my class').includes('my class'), 'the name is sanitized into the file');
});

test('filenames are sanitized and de-duplicated', () => {
  assert.deepEqual(splitExtension('frame-001.JPG'), { base: 'frame-001', ext: '.jpg' });
  assert.deepEqual(splitExtension('noext'), { base: 'noext', ext: '' });

  assert.equal(sanitizeBasename('frame 001.jpg'), 'frame-001');
  assert.equal(sanitizeBasename('../etc/passwd.png'), 'etc-passwd');
  assert.equal(sanitizeBasename('已停止.png'), 'image');

  // Two folders of frame001 would otherwise overwrite inside the zip.
  assert.deepEqual(dedupeBasenames(['a.png', 'a.jpg', 'b.png', 'a.bmp']), ['a', 'a-2', 'b', 'a-3']);
});

test('deriveGroupKey folds sibling video frames together', () => {
  assert.equal(deriveGroupKey('Main-St-1st--Frame-142'), deriveGroupKey('Main-St-1st--Frame-143'));
  assert.equal(deriveGroupKey('clip_0007'), deriveGroupKey('clip_0042'));
  assert.equal(deriveGroupKey('intersection-photo'), 'intersection-photo');
  assert.ok(deriveGroupKey('0001').length > 0, 'an all-digit name keeps a key');
});

test('splitFor is stable and honors the extremes', () => {
  assert.equal(splitFor('frame-001', { valRatio: 0.2 }, 'seed'), splitFor('frame-001', { valRatio: 0.2 }, 'seed'));
  assert.equal(splitFor('anything', { valRatio: 0 }), 'train');
  assert.equal(splitFor('anything', { valRatio: 1 }), 'val');

  const names = Array.from({ length: 400 }, (unused, i) => `img-${i}`);
  const valCount = names.filter((n) => splitFor(n, { valRatio: 0.2 }) === 'val').length;
  assert.ok(valCount > 40 && valCount < 120, `roughly a fifth land in val (got ${valCount})`);
});

test('the requested ratio is actually achieved, for every seed', () => {
  // Regression guard. Keys are always "seed|name", and short strings sharing a
  // prefix are precisely where FNV-1a avalanches badly in its high bits. Before
  // the fmix32 finalizer these fractions clustered in a narrow band and a
  // requested 20% came out at 36%.
  const names = Array.from({ length: 2000 }, (unused, i) => `frame-${i}`);

  for (const seed of ['', 'a', 'run-2026']) {
    for (const ratio of [0.1, 0.2, 0.3]) {
      const share = names.filter((n) => splitFor(n, { valRatio: ratio }, seed) === 'val').length / names.length;
      assert.ok(
        Math.abs(share - ratio) < 0.04,
        `seed ${JSON.stringify(seed)} at ${ratio}: got ${(share * 100).toFixed(1)}%`,
      );
    }
  }
});

test('adding images later never reshuffles the existing split', () => {
  // The regression that matters: a model trained today and one trained next
  // week have to be comparable.
  const first = Array.from({ length: 200 }, (unused, i) => `frame-${i}`);
  const before = assignSplits(first, { valRatio: 0.2, seed: 'x', groupSplit: false });

  const grown = [...first, ...Array.from({ length: 50 }, (unused, i) => `later-${i}`)];
  const after = assignSplits(grown, { valRatio: 0.2, seed: 'x', groupSplit: false });

  for (const name of first) {
    assert.equal(after.assign.get(name), before.assign.get(name), `${name} kept its split`);
  }
  assert.equal(after.counts.train + after.counts.val, 250);
});

test('group splitting keeps burst frames on the same side', () => {
  const frames = Array.from({ length: 30 }, (unused, i) => `Main-St-Frame-${i}`);
  const { assign } = assignSplits(frames, { valRatio: 0.3, seed: 's', groupSplit: true });
  const splits = new Set(frames.map((f) => assign.get(f)));
  assert.equal(splits.size, 1, 'near-duplicate frames must not straddle train and val');

  const ungrouped = assignSplits(frames, { valRatio: 0.3, seed: 's', groupSplit: false });
  assert.ok(new Set(frames.map((f) => ungrouped.assign.get(f))).size >= 1);
});

test('a different seed re-rolls the split', () => {
  const names = Array.from({ length: 100 }, (unused, i) => `img-${i}`);
  const a = assignSplits(names, { valRatio: 0.2, seed: 'a', groupSplit: false });
  const b = assignSplits(names, { valRatio: 0.2, seed: 'b', groupSplit: false });
  const changed = names.filter((n) => a.assign.get(n) !== b.assign.get(n));
  assert.ok(changed.length > 0, 'the seed actually changes assignments');
});

const images = [
  { name: 'a.jpg', reviewed: true, boxes: [{ x: 0, y: 0, w: 20, h: 40 }] },
  { name: 'b.jpg', reviewed: true, boxes: [] },
  { name: 'c.jpg', reviewed: false, boxes: [] },
  { name: 'd.jpg', reviewed: true, boxes: [{ x: 0, y: 0, w: 4, h: 4 }, { x: 5, y: 5, w: 30, h: 30 }] },
];

test('datasetStats separates annotated, negative and pending', () => {
  const stats = datasetStats(images, { warnBelowPx: 8 });
  assert.equal(stats.total, 4);
  assert.equal(stats.annotated, 2);
  assert.equal(stats.negative, 1, 'reviewed with no boxes is a negative sample');
  assert.equal(stats.pending, 1);
  assert.equal(stats.boxes, 3);
  assert.equal(stats.tiny, 1, 'the 4 px box is flagged, not deleted');
});

test('unreviewed images are excluded from export unless asked for', () => {
  assert.equal(selectExportImages(images).length, 3);
  assert.ok(!selectExportImages(images).some((i) => i.name === 'c.jpg'));
  assert.equal(selectExportImages(images, { includeUnreviewed: true }).length, 4);
});

// --- Three-way train / val / test split -------------------------------------
test('a test share carves a third band out of the same hash', () => {
  const names = Array.from({ length: 3000 }, (unused, i) => `frame-${i}`);
  const { counts } = assignSplits(names, {
    valRatio: 0.2,
    testRatio: 0.1,
    seed: 'x',
    groupSplit: false,
  });

  assert.equal(counts.train + counts.val + counts.test, 3000, 'every image lands somewhere');
  assert.ok(Math.abs(counts.val / 3000 - 0.2) < 0.03, `val ~20% (got ${(counts.val / 30).toFixed(1)}%)`);
  assert.ok(Math.abs(counts.test / 3000 - 0.1) < 0.03, `test ~10% (got ${(counts.test / 30).toFixed(1)}%)`);
  assert.ok(Math.abs(counts.train / 3000 - 0.7) < 0.03, `train ~70% (got ${(counts.train / 30).toFixed(1)}%)`);
});

test('testRatio 0 reproduces the old two-way split exactly', () => {
  // Val occupies the first band precisely so that adding test splits to the
  // tool did not silently re-assign anyone's existing dataset.
  const names = Array.from({ length: 500 }, (unused, i) => `img-${i}`);
  const twoWay = assignSplits(names, { valRatio: 0.2, seed: 's', groupSplit: false });
  const explicitZero = assignSplits(names, { valRatio: 0.2, testRatio: 0, seed: 's', groupSplit: false });

  for (const name of names) {
    assert.equal(explicitZero.assign.get(name), twoWay.assign.get(name));
  }
  assert.equal(twoWay.counts.test, 0);
  assert.ok(!names.some((n) => twoWay.assign.get(n) === 'test'));
});

test('adding a test share never moves anything out of val', () => {
  // The bands are ordered val-first, so test is carved out of what was train.
  const names = Array.from({ length: 1000 }, (unused, i) => `shot_${i}`);
  const before = assignSplits(names, { valRatio: 0.2, testRatio: 0, seed: 'k', groupSplit: false });
  const after = assignSplits(names, { valRatio: 0.2, testRatio: 0.15, seed: 'k', groupSplit: false });

  for (const name of names) {
    const was = before.assign.get(name);
    const now = after.assign.get(name);
    if (was === 'val') assert.equal(now, 'val', `${name} stayed in val`);
    if (now === 'test') assert.equal(was, 'train', `${name} came from train, not val`);
  }
  assert.ok(after.counts.test > 0);
  assert.equal(after.counts.val, before.counts.val);
});

test('splitFor bands are contiguous and stable under set growth', () => {
  const first = Array.from({ length: 400 }, (unused, i) => `a-${i}`);
  const opts = { valRatio: 0.25, testRatio: 0.15, seed: 'g', groupSplit: false };
  const before = assignSplits(first, opts);
  const after = assignSplits([...first, ...Array.from({ length: 100 }, (u, i) => `b-${i}`)], opts);

  for (const name of first) {
    assert.equal(after.assign.get(name), before.assign.get(name), `${name} kept its split`);
  }
});

test('an over-subscribed test share cannot starve training', () => {
  const names = Array.from({ length: 600 }, (unused, i) => `n-${i}`);
  // 0.8 val + 0.9 test would exceed 100%; test is capped at what is left.
  const { counts } = assignSplits(names, { valRatio: 0.8, testRatio: 0.9, seed: 'z', groupSplit: false });

  assert.equal(counts.train + counts.val + counts.test, 600);
  assert.ok(counts.val > 0 && counts.test > 0);
  assert.ok(Math.abs(counts.val / 600 - 0.8) < 0.05, 'val keeps its requested share');
  assert.ok(Math.abs(counts.test / 600 - 0.2) < 0.05, 'test gets only the remaining 20%');
});

test('group splitting keeps a video whole across all three splits', () => {
  const frames = Array.from({ length: 40 }, (unused, i) => `Elm-St-Frame-${i}`);
  const { assign } = assignSplits(frames, { valRatio: 0.3, testRatio: 0.2, seed: 'q', groupSplit: true });
  assert.equal(new Set(frames.map((f) => assign.get(f))).size, 1);
});

test('data.yaml only declares a test path when there is a test split', () => {
  assert.ok(!buildDataYaml('traffic_signal').includes('test:'));
  assert.ok(!buildDataYaml('traffic_signal', { hasTest: false }).includes('test:'));

  const withTest = buildDataYaml('traffic_signal', { hasTest: true });
  assert.match(withTest, /^test: images\/test$/m);
  assert.match(withTest, /^val: images\/val$/m);
  assert.match(withTest, /^nc: 1$/m);
  // Order matters to some readers: paths before the class block.
  assert.ok(withTest.indexOf('test: images/test') < withTest.indexOf('nc: 1'));
});
