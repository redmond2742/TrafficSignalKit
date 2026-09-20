import test from 'node:test';
import assert from 'node:assert/strict';
import {
  imageKey,
  encodeRecord,
  decodeRecord,
  readUpdatedAt,
  safeSet,
  pruneOldest,
  loadRecord,
  estimateUsage,
  clearStoredAnnotations,
  storageAvailable,
  buildProject,
  parseProject,
  matchProjectToFiles,
  IMAGE_PREFIX,
  PROJECT_FORMAT,
} from '../src/utils/annotationStore.js';

/** A localStorage stand-in that can be told to refuse writes past a size. */
function fakeStorage({ limit = Infinity } = {}) {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    removeItem(k) {
      map.delete(k);
    },
    setItem(k, v) {
      const projected = [...map.entries()]
        .filter(([key]) => key !== k)
        .reduce((sum, [key, value]) => sum + key.length + value.length, 0);
      if (projected + k.length + v.length > limit) {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      map.set(k, v);
    },
    _map: map,
  };
}

test('imageKey is stable for a file and separates different sizes', () => {
  const a = imageKey({ name: 'frame-001.jpg', size: 1234 });
  assert.equal(a, imageKey({ name: 'frame-001.jpg', size: 1234 }));
  assert.notEqual(a, imageKey({ name: 'frame-001.jpg', size: 1235 }));
  assert.notEqual(a, imageKey({ name: 'frame-002.jpg', size: 1234 }));
  assert.ok(a.startsWith(IMAGE_PREFIX));
});

test('records round-trip through the compact form', () => {
  const image = {
    name: 'frame-001.jpg',
    size: 90210,
    width: 1920,
    height: 1080,
    reviewed: true,
    boxes: [{ x: 812.44, y: 301.16, w: 26.81, h: 61.22 }],
  };
  const decoded = decodeRecord(encodeRecord(image));

  assert.equal(decoded.name, 'frame-001.jpg');
  assert.equal(decoded.reviewed, true);
  assert.equal(decoded.width, 1920);
  assert.deepEqual(decoded.boxes, [{ x: 812.4, y: 301.2, w: 26.8, h: 61.2 }], 'rounded to 0.1 px');
  assert.ok(decoded.updatedAt > 0);
});

test('a corrupt or future record decodes to null instead of throwing', () => {
  assert.equal(decodeRecord(''), null);
  assert.equal(decodeRecord('{not json'), null);
  assert.equal(decodeRecord('{"v":99,"b":[]}'), null);
  assert.equal(decodeRecord('{"v":1}'), null, 'missing boxes array');

  const salvaged = decodeRecord('{"v":1,"n":"a","s":1,"b":[[1,2,3,4],"junk",[1,2,0,4]]}');
  assert.equal(salvaged.boxes.length, 1, 'bad boxes are dropped, the good one survives');
});

test('readUpdatedAt agrees with a full parse but skips it', () => {
  const raw = encodeRecord({ name: 'a', size: 1, boxes: [] });
  assert.equal(readUpdatedAt(raw), JSON.parse(raw).u);
  assert.equal(readUpdatedAt('nonsense'), 0);
});

test('safeSet evicts the oldest records when the quota is hit', () => {
  const storage = fakeStorage({ limit: 400 });
  const keys = [];

  for (let i = 0; i < 4; i += 1) {
    const key = imageKey({ name: `old-${i}.jpg`, size: i });
    keys.push(key);
    storage.setItem(key, JSON.stringify({ v: 1, b: [], u: 1000 + i }));
  }

  const currentKey = imageKey({ name: 'current.jpg', size: 99 });
  const big = JSON.stringify({ v: 1, b: new Array(20).fill([1, 2, 3, 4]), u: 9999 });

  const result = safeSet(storage, currentKey, big, { keepKeys: [currentKey] });

  assert.equal(result.ok, true, 'the write eventually succeeds');
  assert.ok(result.evicted > 0, 'something was evicted to make room');
  assert.equal(storage.getItem(currentKey), big, 'the current image was written');
  assert.equal(storage.getItem(keys[0]), null, 'the oldest went first');
});

test('safeSet never evicts the image being worked on', () => {
  const storage = fakeStorage({ limit: 300 });
  const keep = imageKey({ name: 'keep.jpg', size: 1 });
  storage.setItem(keep, JSON.stringify({ v: 1, b: [], u: 1 })); // oldest by timestamp

  for (let i = 0; i < 3; i += 1) {
    storage.setItem(imageKey({ name: `other-${i}.jpg`, size: i + 10 }), JSON.stringify({ v: 1, b: [], u: 500 + i }));
  }

  safeSet(storage, imageKey({ name: 'new.jpg', size: 77 }), JSON.stringify({ v: 1, b: new Array(8).fill([1, 2, 3, 4]), u: 9 }), {
    keepKeys: [keep],
  });

  assert.ok(storage.getItem(keep), 'the protected key survived even though it was oldest');
});

test('safeSet gives up cleanly rather than throwing at the UI', () => {
  const storage = fakeStorage({ limit: 10 });
  const result = safeSet(storage, imageKey({ name: 'x.jpg', size: 1 }), 'x'.repeat(500));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'quota');

  assert.deepEqual(safeSet(null, 'k', 'v'), { ok: false, reason: 'unavailable', evicted: 0 });
});

test('pruneOldest removes by timestamp, oldest first', () => {
  const storage = fakeStorage();
  storage.setItem(imageKey({ name: 'a', size: 1 }), '{"v":1,"b":[],"u":300}');
  storage.setItem(imageKey({ name: 'b', size: 2 }), '{"v":1,"b":[],"u":100}');
  storage.setItem(imageKey({ name: 'c', size: 3 }), '{"v":1,"b":[],"u":200}');

  assert.equal(pruneOldest(storage, { count: 1 }), 1);
  assert.equal(storage.getItem(imageKey({ name: 'b', size: 2 })), null, 'u=100 went first');
  assert.ok(storage.getItem(imageKey({ name: 'a', size: 1 })));
});

test('usage, load and clear only touch this tool namespace', () => {
  const storage = fakeStorage();
  storage.setItem('unrelated-app-key', 'x'.repeat(100));
  const key = imageKey({ name: 'a.jpg', size: 5 });
  storage.setItem(key, encodeRecord({ name: 'a.jpg', size: 5, boxes: [{ x: 1, y: 2, w: 3, h: 4 }] }));

  assert.ok(estimateUsage(storage) > 0);
  assert.equal(loadRecord(storage, key).boxes.length, 1);
  assert.equal(storageAvailable(storage), true);

  assert.equal(clearStoredAnnotations(storage), 1);
  assert.equal(storage.getItem('unrelated-app-key'), 'x'.repeat(100), 'other keys untouched');
});

test('storageAvailable reports false when writes are refused', () => {
  assert.equal(storageAvailable(fakeStorage({ limit: 0 })), false);
  assert.equal(storageAvailable(null), false);
});

const sampleImages = [
  {
    name: 'frame-001.jpg',
    size: 1000,
    width: 1920,
    height: 1080,
    reviewed: true,
    boxes: [{ x: 10.04, y: 20, w: 30, h: 40 }],
  },
  { name: 'frame-002.jpg', size: 2000, width: 1920, height: 1080, reviewed: false, boxes: [] },
];

test('a project round-trips', () => {
  const project = buildProject({
    className: 'traffic_signal',
    settings: { valRatio: 0.2, groupSplit: true },
    images: sampleImages,
  });
  assert.equal(project.format, PROJECT_FORMAT);
  assert.equal(project.version, 1);

  const { project: parsed, warnings } = parseProject(JSON.stringify(project));
  assert.deepEqual(warnings, []);
  assert.equal(parsed.images.length, 2);
  assert.equal(parsed.images[0].boxes[0].x, 10, 'stored rounded');
  assert.equal(parsed.images[1].reviewed, false);
  assert.equal(parsed.settings.valRatio, 0.2);
});

test('one bad row does not cost the whole project', () => {
  const { project, warnings } = parseProject(
    JSON.stringify({
      format: PROJECT_FORMAT,
      version: 1,
      images: [
        { name: 'good.jpg', size: 1, width: 10, height: 10, boxes: [{ x: 1, y: 1, w: 2, h: 2 }] },
        { name: '', boxes: [] },
        { name: 'partly.jpg', size: 2, boxes: [{ x: 1, y: 1, w: 0, h: 5 }, { x: 2, y: 2, w: 3, h: 3 }] },
      ],
    }),
  );

  assert.equal(project.images.length, 2, 'the nameless entry was skipped');
  assert.equal(project.images[1].boxes.length, 1, 'the zero-width box was skipped');
  assert.equal(warnings.length, 2);
});

test('files that are not annotator projects are refused', () => {
  assert.equal(parseProject('not json').project, null);
  assert.equal(parseProject(JSON.stringify({ format: 'something-else' })).project, null);

  const future = parseProject(JSON.stringify({ format: PROJECT_FORMAT, version: 99, images: [] }));
  assert.equal(future.project, null);
  assert.match(future.warnings[0], /newer version/);
});

test('matchProjectToFiles reports both directions of mismatch', () => {
  const project = { images: sampleImages };
  const files = [
    { name: 'frame-001.jpg', size: 1000 },
    { name: 'frame-999.jpg', size: 5000 },
  ];

  const { matched, unmatchedProject, unmatchedFiles } = matchProjectToFiles(project, files);

  assert.equal(matched.length, 1);
  assert.equal(matched[0].entry.name, 'frame-001.jpg');
  assert.equal(unmatchedFiles.length, 1, 'a picked file with no annotations');
  assert.equal(unmatchedProject.length, 1, 'annotations whose image was not picked');
  assert.equal(
    unmatchedProject[0].name,
    'frame-002.jpg',
    'kept in hand so a later file pick can still match it',
  );
});

test('a file matches only when name and size both agree', () => {
  const { matched, unmatchedFiles } = matchProjectToFiles({ images: sampleImages }, [
    { name: 'frame-001.jpg', size: 9999 },
  ]);
  assert.equal(matched.length, 0);
  assert.equal(unmatchedFiles.length, 1);
});
