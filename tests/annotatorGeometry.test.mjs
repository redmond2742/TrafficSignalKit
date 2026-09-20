import test from 'node:test';
import assert from 'node:assert/strict';
import {
  screenToImage,
  imageToScreen,
  rectToScreen,
  fitView,
  zoomAt,
  zoomToScale,
  clampPan,
  normalizeRect,
  clampRectToImage,
  moveBox,
  applyResize,
  handlePositions,
  handleIdsFor,
  hitTestHandles,
  hitTestBoxes,
  CORNER_HANDLE_IDS,
} from '../src/utils/annotatorGeometry.js';

const ORIGIN = { left: 0, top: 0 };

test('screen and image coordinates round-trip at any zoom or pan', () => {
  for (const view of [
    { scale: 1, offsetX: 0, offsetY: 0 },
    { scale: 0.37, offsetX: -420.5, offsetY: 88 },
    { scale: 8, offsetX: 15, offsetY: -1200.25 },
  ]) {
    for (const point of [
      { x: 0, y: 0 },
      { x: 1920, y: 1080 },
      { x: 812.4, y: 301.1 },
    ]) {
      const screen = imageToScreen(view, point.x, point.y);
      const back = screenToImage(view, screen.x, screen.y, ORIGIN);
      assert.ok(Math.abs(back.x - point.x) < 1e-9, `x round-trip at scale ${view.scale}`);
      assert.ok(Math.abs(back.y - point.y) < 1e-9, `y round-trip at scale ${view.scale}`);
    }
  }
});

test('rectToScreen scales size as well as position', () => {
  const screen = rectToScreen({ scale: 2, offsetX: 10, offsetY: 20 }, { x: 5, y: 5, w: 30, h: 40 });
  assert.deepEqual(screen, { x: 20, y: 30, w: 60, h: 80 });
});

test('fitView centers the image and never overflows', () => {
  const view = fitView(1920, 1080, 800, 600, 8);
  assert.ok(1920 * view.scale <= 800 - 16 + 1e-9);
  assert.ok(1080 * view.scale <= 600 - 16 + 1e-9);
  assert.ok(Math.abs(view.offsetX + (1920 * view.scale) / 2 - 400) < 1e-9, 'horizontally centered');
  assert.ok(Math.abs(view.offsetY + (1080 * view.scale) / 2 - 300) < 1e-9, 'vertically centered');
});

test('zoomAt keeps the point under the cursor pinned', () => {
  const view = { scale: 1, offsetX: 40, offsetY: 25 };
  const cursor = { x: 310, y: 190 };
  const before = screenToImage(view, cursor.x, cursor.y, ORIGIN);

  for (const factor of [1.25, 4, 0.5]) {
    const zoomed = zoomAt(view, cursor.x, cursor.y, factor);
    const after = screenToImage(zoomed, cursor.x, cursor.y, ORIGIN);
    assert.ok(Math.abs(after.x - before.x) < 1e-9, `factor ${factor} holds x`);
    assert.ok(Math.abs(after.y - before.y) < 1e-9, `factor ${factor} holds y`);
  }
});

test('zoom respects its bounds', () => {
  const view = { scale: 1, offsetX: 0, offsetY: 0 };
  assert.equal(zoomAt(view, 0, 0, 1000, 0.05, 64).scale, 64);
  assert.equal(zoomAt(view, 0, 0, 0.0001, 0.05, 64).scale, 0.05);
  assert.equal(zoomToScale(view, 4, 100, 100).scale, 4);
});

test('clampPan centers a small image and pins a large one', () => {
  const small = clampPan({ scale: 0.1, offsetX: 900, offsetY: 900 }, 1920, 1080, 800, 600);
  assert.equal(small.offsetX, (800 - 192) / 2, 'centered when it fits');
  assert.equal(small.offsetY, (600 - 108) / 2);

  const dragged = clampPan({ scale: 2, offsetX: 500, offsetY: 500 }, 1920, 1080, 800, 600);
  assert.equal(dragged.offsetX, 0, 'cannot pan past the left edge');
  assert.equal(dragged.offsetY, 0);

  const far = clampPan({ scale: 2, offsetX: -99999, offsetY: -99999 }, 1920, 1080, 800, 600);
  assert.equal(far.offsetX, 800 - 3840, 'cannot pan past the right edge');
  assert.equal(far.offsetY, 600 - 2160);
});

test('normalizeRect handles all four drag directions', () => {
  const expected = { x: 10, y: 20, w: 30, h: 40 };
  assert.deepEqual(normalizeRect(10, 20, 40, 60), expected);
  assert.deepEqual(normalizeRect(40, 60, 10, 20), expected);
  assert.deepEqual(normalizeRect(40, 20, 10, 60), expected);
  assert.deepEqual(normalizeRect(10, 60, 40, 20), expected);
});

test('clampRectToImage trims a box that leaves the frame', () => {
  assert.deepEqual(clampRectToImage({ x: -10, y: -10, w: 50, h: 50 }, 100, 100), {
    x: 0,
    y: 0,
    w: 40,
    h: 40,
  });
  assert.deepEqual(clampRectToImage({ x: 80, y: 80, w: 50, h: 50 }, 100, 100), {
    x: 80,
    y: 80,
    w: 20,
    h: 20,
  });
  const outside = clampRectToImage({ x: 200, y: 200, w: 50, h: 50 }, 100, 100);
  assert.equal(outside.w, 0, 'a fully outside box collapses rather than inverting');
});

test('moveBox slides against an edge without resizing', () => {
  const box = { x: 50, y: 50, w: 30, h: 20 };
  for (const [dx, dy] of [
    [-1000, 0],
    [1000, 0],
    [0, -1000],
    [0, 1000],
  ]) {
    const moved = moveBox(box, dx, dy, 200, 200);
    assert.equal(moved.w, 30, 'width preserved at the edge');
    assert.equal(moved.h, 20, 'height preserved at the edge');
    assert.ok(moved.x >= 0 && moved.x + moved.w <= 200);
    assert.ok(moved.y >= 0 && moved.y + moved.h <= 200);
  }
});

test('applyResize moves the grabbed edge only', () => {
  const box = { x: 100, y: 100, w: 50, h: 50 };

  const east = applyResize(box, 'e', { x: 180, y: 120 }, 500, 500);
  assert.deepEqual(east.rect, { x: 100, y: 100, w: 80, h: 50 });
  assert.equal(east.handle, 'e');

  const northWest = applyResize(box, 'nw', { x: 80, y: 60 }, 500, 500);
  assert.deepEqual(northWest.rect, { x: 80, y: 60, w: 70, h: 90 });
});

test('dragging a handle past the opposite corner flips and remaps it', () => {
  const box = { x: 100, y: 100, w: 50, h: 50 };

  // Drag north-west past south-east: the box normalizes and the grabbed handle
  // becomes south-east, or it would stick and re-invert on the next move.
  const flipped = applyResize(box, 'nw', { x: 200, y: 210 }, 500, 500);
  assert.deepEqual(flipped.rect, { x: 150, y: 150, w: 50, h: 60 });
  assert.equal(flipped.handle, 'se');

  assert.equal(applyResize(box, 'n', { x: 0, y: 300 }, 500, 500).handle, 's');
  assert.equal(applyResize(box, 'w', { x: 300, y: 0 }, 500, 500).handle, 'e');
  assert.equal(applyResize(box, 'ne', { x: 50, y: 300 }, 500, 500).handle, 'sw');
});

test('resize stays inside the image', () => {
  const { rect } = applyResize({ x: 10, y: 10, w: 20, h: 20 }, 'se', { x: 9999, y: 9999 }, 100, 80);
  assert.equal(rect.x + rect.w, 100);
  assert.equal(rect.y + rect.h, 80);
});

test('handle grab radius shrinks with the box so small boxes stay movable', () => {
  const big = { x: 0, y: 0, w: 200, h: 200 };
  assert.equal(hitTestHandles(big, 0, 0), 'nw');
  assert.equal(hitTestHandles(big, 100, 100), null, 'the center is body, not a handle');

  // A 20 px box: a fixed 10 px radius would cover it entirely and make every
  // click a resize. The radius clamps to min(w,h)/3 instead.
  const small = { x: 0, y: 0, w: 20, h: 20 };
  assert.equal(hitTestHandles(small, 10, 10), null, 'center of a small box is still grabbable');
  assert.equal(hitTestHandles(small, 0, 0), 'nw');
});

test('small boxes expose corner handles only', () => {
  assert.deepEqual(handleIdsFor({ x: 0, y: 0, w: 20, h: 20 }), CORNER_HANDLE_IDS);
  assert.equal(handleIdsFor({ x: 0, y: 0, w: 200, h: 200 }).length, 8);
  assert.equal(hitTestHandles({ x: 0, y: 0, w: 20, h: 20 }, 10, 0), null, 'no north handle when tiny');
  assert.equal(hitTestHandles({ x: 0, y: 0, w: 200, h: 200 }, 100, 0), 'n');
});

test('handlePositions puts the eight handles on the box', () => {
  const p = handlePositions({ x: 10, y: 20, w: 100, h: 50 });
  assert.deepEqual(p.nw, [10, 20]);
  assert.deepEqual(p.se, [110, 70]);
  assert.deepEqual(p.n, [60, 20]);
  assert.deepEqual(p.w, [10, 45]);
});

test('the smallest containing box wins selection', () => {
  const boxes = [
    { id: 'big', x: 0, y: 0, w: 200, h: 200 },
    { id: 'small', x: 50, y: 50, w: 20, h: 20 },
  ];
  assert.equal(hitTestBoxes(boxes, { x: 55, y: 55 }).id, 'small', 'a head inside a wrong box stays clickable');
  assert.equal(hitTestBoxes(boxes, { x: 10, y: 10 }).id, 'big');
  assert.equal(hitTestBoxes(boxes, { x: 500, y: 500 }), null);
});

test('an already selected box is never stolen by an overlap', () => {
  const boxes = [
    { id: 'big', x: 0, y: 0, w: 200, h: 200 },
    { id: 'small', x: 50, y: 50, w: 20, h: 20 },
  ];
  assert.equal(hitTestBoxes(boxes, { x: 55, y: 55 }, { selectedId: 'big' }).id, 'big');
});
