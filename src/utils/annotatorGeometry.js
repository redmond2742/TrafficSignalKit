/**
 * Geometry for the image annotator: the pan/zoom view transform, conversions
 * between screen and image coordinates, box editing, and hit testing.
 *
 * Framework free — no DOM, no Vue — so it runs under `node --test`. The view
 * owns the canvas and the events; everything here is arithmetic on plain
 * objects.
 *
 * Two coordinate spaces:
 *   image  — pixels of the source image, what annotations are stored in
 *   screen — CSS pixels relative to the canvas box, what the user points at
 *
 * `view` is { scale, offsetX, offsetY }: scale is image px -> CSS px, and the
 * offsets are where the image origin sits inside the canvas box.
 */

export const HANDLE_IDS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const CORNER_HANDLE_IDS = ['nw', 'ne', 'se', 'sw'];

/** Below this screen size a box only exposes corner handles. */
export const CORNERS_ONLY_BELOW_PX = 24;

/** Smallest box the tool will create, in image pixels. */
export const MIN_BOX_PX = 2;

export function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

export function screenToImage(view, clientX, clientY, rect = { left: 0, top: 0 }) {
  return {
    x: (clientX - rect.left - view.offsetX) / view.scale,
    y: (clientY - rect.top - view.offsetY) / view.scale,
  };
}

export function imageToScreen(view, x, y) {
  return { x: x * view.scale + view.offsetX, y: y * view.scale + view.offsetY };
}

export function rectToScreen(view, rect) {
  const point = imageToScreen(view, rect.x, rect.y);
  return { x: point.x, y: point.y, w: rect.w * view.scale, h: rect.h * view.scale };
}

/** Scale and center the image inside the viewport. */
export function fitView(imgW, imgH, viewW, viewH, padding = 8) {
  const availableW = Math.max(1, viewW - padding * 2);
  const availableH = Math.max(1, viewH - padding * 2);
  const scale = Math.min(availableW / imgW, availableH / imgH);
  return {
    scale,
    offsetX: (viewW - imgW * scale) / 2,
    offsetY: (viewH - imgH * scale) / 2,
  };
}

/**
 * Zooms by `factor` while keeping the image point under (cssX, cssY) pinned to
 * that same screen position — the behavior that makes wheel-zoom feel anchored
 * to the cursor rather than to the middle of the canvas.
 */
export function zoomAt(view, cssX, cssY, factor, minScale = 0.05, maxScale = 64) {
  const imgX = (cssX - view.offsetX) / view.scale;
  const imgY = (cssY - view.offsetY) / view.scale;
  const scale = clamp(view.scale * factor, minScale, maxScale);
  return { scale, offsetX: cssX - imgX * scale, offsetY: cssY - imgY * scale };
}

export function zoomToScale(view, nextScale, cssX, cssY, minScale = 0.05, maxScale = 64) {
  const target = clamp(nextScale, minScale, maxScale);
  return zoomAt(view, cssX, cssY, target / view.scale, minScale, maxScale);
}

/** Keeps the image from being panned out of sight; centers it when it fits. */
export function clampPan(view, imgW, imgH, viewW, viewH) {
  const scaledW = imgW * view.scale;
  const scaledH = imgH * view.scale;
  const offsetX = scaledW <= viewW ? (viewW - scaledW) / 2 : clamp(view.offsetX, viewW - scaledW, 0);
  const offsetY = scaledH <= viewH ? (viewH - scaledH) / 2 : clamp(view.offsetY, viewH - scaledH, 0);
  return { scale: view.scale, offsetX, offsetY };
}

export function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function clampRectToImage(rect, imgW, imgH) {
  const x1 = clamp(rect.x, 0, imgW);
  const y1 = clamp(rect.y, 0, imgH);
  const x2 = clamp(rect.x + rect.w, 0, imgW);
  const y2 = clamp(rect.y + rect.h, 0, imgH);
  return normalizeRect(x1, y1, x2, y2);
}

/**
 * Translates a box, keeping it inside the image. Size is preserved: dragging a
 * box against an edge must slide it, never squash it.
 */
export function moveBox(rect, dx, dy, imgW, imgH) {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, Math.max(0, imgW - rect.w)),
    y: clamp(rect.y + dy, 0, Math.max(0, imgH - rect.h)),
  };
}

const FLIP_H = { w: 'e', e: 'w' };
const FLIP_V = { n: 's', s: 'n' };

/**
 * Drags one handle to a new image point.
 *
 * Returns the new rect AND the handle that should stay active: dragging the
 * north-west handle past the south-east corner flips the box, and the grabbed
 * handle becomes the south-east one. Without that remap the box sticks and
 * re-inverts on every subsequent move.
 */
export function applyResize(rect, handle, imgPt, imgW, imgH) {
  const vertical = handle.includes('n') ? 'n' : handle.includes('s') ? 's' : '';
  const horizontal = handle.includes('w') ? 'w' : handle.includes('e') ? 'e' : '';

  let x1 = rect.x;
  let y1 = rect.y;
  let x2 = rect.x + rect.w;
  let y2 = rect.y + rect.h;

  const px = clamp(imgPt.x, 0, imgW);
  const py = clamp(imgPt.y, 0, imgH);

  if (horizontal === 'w') x1 = px;
  if (horizontal === 'e') x2 = px;
  if (vertical === 'n') y1 = py;
  if (vertical === 's') y2 = py;

  const flippedH = horizontal && x2 < x1;
  const flippedV = vertical && y2 < y1;

  const nextHandle =
    (flippedV ? FLIP_V[vertical] : vertical) + (flippedH ? FLIP_H[horizontal] : horizontal);

  return {
    rect: { ...rect, ...normalizeRect(x1, y1, x2, y2) },
    handle: nextHandle || handle,
  };
}

/** Handle centers, in screen space, for a box already converted to screen. */
export function handlePositions(screenRect) {
  const { x, y, w, h } = screenRect;
  const midX = x + w / 2;
  const midY = y + h / 2;
  return {
    nw: [x, y],
    n: [midX, y],
    ne: [x + w, y],
    e: [x + w, midY],
    se: [x + w, y + h],
    s: [midX, y + h],
    sw: [x, y + h],
    w: [x, midY],
  };
}

export function handleIdsFor(screenRect) {
  return Math.min(screenRect.w, screenRect.h) < CORNERS_ONLY_BELOW_PX ? CORNER_HANDLE_IDS : HANDLE_IDS;
}

/**
 * Which handle, if any, is under a screen point.
 *
 * The grab radius shrinks with the box so a small box stays movable: at a fixed
 * 10 px radius, a 20 px box's eight grab zones cover it completely and every
 * click lands on a handle instead of the body.
 */
export function hitTestHandles(screenRect, px, py, baseRadius = 10) {
  const radius = Math.max(4, Math.min(baseRadius, Math.min(screenRect.w, screenRect.h) / 3));
  const positions = handlePositions(screenRect);
  for (const id of handleIdsFor(screenRect)) {
    const [hx, hy] = positions[id];
    if (Math.abs(px - hx) <= radius && Math.abs(py - hy) <= radius) return id;
  }
  return null;
}

export function rectContains(rect, point, tolerance = 0) {
  return (
    point.x >= rect.x - tolerance &&
    point.x <= rect.x + rect.w + tolerance &&
    point.y >= rect.y - tolerance &&
    point.y <= rect.y + rect.h + tolerance
  );
}

/**
 * The box under an image point.
 *
 * A box that is already selected wins, so an overlap can never steal the
 * selection mid-edit. Otherwise the smallest candidate wins, which is what
 * keeps a small signal head clickable when it sits inside a larger box.
 */
export function hitTestBoxes(boxes, imgPt, { selectedId = null, tolerance = 0 } = {}) {
  let best = null;
  for (const box of boxes) {
    if (!rectContains(box, imgPt, tolerance)) continue;
    if (selectedId != null && box.id === selectedId) return box;
    if (!best || box.w * box.h < best.w * best.h) best = box;
  }
  return best;
}

export function isTinyBox(box, minPx) {
  return box.w < minPx || box.h < minPx;
}
