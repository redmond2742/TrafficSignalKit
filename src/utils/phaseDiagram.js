/**
 * An intersection phase diagram, drawn from nothing but approach bearings and
 * phase movements.
 *
 * The question it answers is the one a plan sheet answers: which movement does
 * each phase serve, and where is it on the ground. A phase number on its own
 * is an abstraction; the same number drawn as an arrow pointing north-east out
 * of Main Street is a thing a person can check against the intersection.
 *
 * This emits a *draw list* rather than SVG. Two things render it -- the screen,
 * as SVG, and the printed sheet, as vector PDF -- and a diagram that is drawn
 * twice by two pieces of code is a diagram that eventually disagrees with
 * itself. One geometry, two back ends, no drift. The op vocabulary is kept
 * small enough (line, polyline, circle, text) that any back end can carry it.
 *
 * Geometry follows the GTSS Signal Builder's renderer so the two agree about
 * what a bearing means, which is the part that is easy to get backwards:
 * `compass_bearing` is the heading traffic holds *arriving* at the stop bar, so
 * the leg it travels down is drawn at bearing + 180.
 *
 * Framework free, so it runs in a view, in a worker, or under `node --test`.
 */

/** The canvas is a square. Everything below is in these units. */
export const DIAGRAM_SIZE = 300;
const CENTER = DIAGRAM_SIZE / 2;

/** Where the legs start, where the box is, where arrows run between. */
const LEG_OUTER = 115;
const LEG_INNER = 44;
const BOX_RADIUS = 42;
const ARROW_OUTER = 105;
const ARROW_INNER = 48;
/** Where a street name sits: mid-leg, and off the centreline. */
const STREET_RADIUS = 82;
const STREET_OFFSET = 21;
/**
 * Crosswalks sit beside the box, spanning its width.
 *
 * One number for both how far out a crossing sits and how far along it runs,
 * because those two are the same distance: four crossings at right angles
 * then meet at their ends and close a square, and the diagonals of a scramble
 * have corners to run between. With an offset of 31 and a half-length of 30 --
 * which is what this was -- every corner stood a unit apart and the box never
 * quite shut.
 *
 * At 30 the corners land at 30*sqrt(2) = 42.4, which is the edge of the
 * intersection box: the crossings draw the kerb line.
 */
const CROSSWALK_REACH = 30;
/** The ID plate stays inside this, whatever the ID is. */
const PLATE_MAX_RADIUS = 21;
const PLATE_MAX_CHARS = 8;

/** Phase colours, matching the GTSS Signal Builder so one reads as the other. */
export const PHASE_COLORS = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#f97316',
  4: '#8b5cf6',
  5: '#ef4444',
  6: '#14b8a6',
  7: '#eab308',
  8: '#ec4899',
  // 9-16 are a second ring on a sixteen-phase controller, and they are real:
  // overlaps and the second barrier land here. Without them every phase above
  // eight came out the same grey, which is the same as not labelling them.
  9: '#15803d',
  10: '#1e40af',
  11: '#c2410c',
  12: '#6d28d9',
  13: '#b91c1c',
  14: '#0f766e',
  15: '#a16207',
  16: '#be185d',
};

/**
 * Palettes. `print` exists because a 30-inch sheet is usually a plotter and
 * often a monochrome one, where eight hues become eight indistinguishable
 * greys; it separates phases by number and arrowhead instead of by colour.
 */
export const PALETTES = {
  signal: { name: 'Signal colours', phase: (n) => PHASE_COLORS[n] || '#6b7280' },
  print: { name: 'Black on white', phase: () => '#111111' },
  ring: {
    name: 'By ring',
    // Ring 1 is phases 1-4, ring 2 is 5-8. Two hues answer "can these run
    // together" at a glance, which eight hues do not.
    phase: (n) => (Number(n) <= 4 ? '#1d4ed8' : '#b91c1c'),
  },
};

const INK = '#111111';
const ROAD = '#e5e7eb';
const ROAD_EDGE = '#d1d5db';
const FAINT = '#9ca3af';

/**
 * Movement codes as GTSS writes them, and the long names the Signal Builder
 * uses in memory. Both are accepted: an export carries the code, a hand-built
 * intersection in the UI carries whichever the author typed.
 */
const MOVEMENT_KINDS = {
  T: 'through',
  THROUGH: 'through',
  L: 'left',
  LEFT: 'left',
  'LEFT TURN': 'left',
  LPP: 'leftProtPerm',
  'LEFT PROTECTED-PERMISSIVE': 'leftProtPerm',
  FYA: 'fya',
  'FLASHING YELLOW ARROW': 'fya',
  LT: 'leftThrough',
  'LEFT THROUGH SHARED': 'leftThrough',
  TL: 'permissive',
  'PERMISSIVE PHASE': 'permissive',
  TR: 'throughRight',
  'THROUGH-RIGHT': 'throughRight',
  R: 'right',
  RIGHT: 'right',
  'RIGHT TURN': 'right',
  U: 'uturn',
  'U-TURN': 'uturn',
  PED: 'pedestrian',
  PEDESTRIAN: 'pedestrian',
};

/** Short label for a movement, for legends and tables. */
export const MOVEMENT_NAMES = {
  through: 'Through',
  left: 'Left',
  leftProtPerm: 'Left prot-perm',
  fya: 'Flashing yellow arrow',
  leftThrough: 'Left + through',
  permissive: 'Permissive',
  throughRight: 'Through + right',
  right: 'Right',
  uturn: 'U-turn',
  pedestrian: 'Pedestrian',
};

/** Normalise a movement_type to one of the kinds this draws. */
export function movementKind(movementType) {
  const key = String(movementType ?? '').trim().toUpperCase();
  return MOVEMENT_KINDS[key] || 'through';
}

/** The lane a movement sits in, as an offset across the approach. */
export function laneOffset(kind) {
  if (kind === 'left' || kind === 'leftProtPerm' || kind === 'fya' || kind === 'uturn') return 7;
  if (kind === 'right') return -18;
  if (kind === 'through') return -7;
  return 0;
}

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * Screen angle for an approach, in radians.
 *
 * Two corrections in one line, and both matter. The +180 turns the heading
 * traffic arrives on into the leg it arrives down -- a 90-degree (eastbound)
 * approach comes *from* the west, so its leg is drawn to the west. The -90
 * turns compass degrees (0 = north, clockwise) into screen degrees (0 = east,
 * clockwise because y grows downward).
 */
export function legAngle(compassBearing) {
  return rad(((Number(compassBearing) + 180) % 360) - 90);
}

/**
 * The approach's own heading as a screen angle -- the leg angle turned around.
 *
 * Crosswalks are placed against this rather than against the leg. A crossing
 * concurrent with a through movement runs *parallel* to that movement, offset
 * to one side: it is the crosswalk over the cross street that a pedestrian
 * walking beside the through traffic uses. Which side it lands on is the
 * difference between ped mode 1 and ped mode 3, so it has to be the same
 * convention GTSS uses or the two modes silently swap.
 */
export function approachAxis(compassBearing) {
  return rad((Number(compassBearing) % 360) - 90);
}

const num = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Pedestrian crossing mode, tolerating the legacy boolean. */
function pedMode(phase) {
  const raw = phase.pedX ?? phase.PedX ?? phase.isPedestrian;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  return num(raw, 0);
}

/* ------------------------------------------------------------------- ops */

const line = (x1, y1, x2, y2, stroke, width, extra = {}) => ({
  op: 'line', x1, y1, x2, y2, stroke, width, ...extra,
});
const circle = (cx, cy, r, extra = {}) => ({ op: 'circle', cx, cy, r, ...extra });
const poly = (points, extra = {}) => ({ op: 'poly', points, ...extra });
const text = (x, y, value, extra = {}) => ({
  op: 'text', x, y, text: value, size: 11, fill: INK, anchor: 'middle', ...extra,
});

/**
 * A filled triangle at the end of a segment.
 *
 * The reference uses SVG `<marker>`, which has no equivalent in a PDF writer.
 * An explicit triangle is the same picture and renders identically in both.
 */
const HEAD_LEN = 12;
const HEAD_HALF = 4.1;
/** How far the trailing edge is swept forward, which is what sharpens it. */
const HEAD_NOTCH = 3.4;

/**
 * A swept arrowhead.
 *
 * It was an isoceles triangle nine long and nine wide -- as broad as it was
 * long, sitting on a three-wide shaft, which reads as a blob stuck on the end
 * rather than as a direction. This is longer than it is wide and notched at
 * the back, so the two barbs carry the eye along the movement.
 *
 * Four points rather than three, so there is no triangle fast path to take in
 * the PDF writer; `lines` fills a closed path just as well.
 */
function arrowHead(tipX, tipY, angle, color, scale = 1) {
  const len = HEAD_LEN * scale;
  const half = HEAD_HALF * scale;
  const notch = HEAD_NOTCH * scale;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const vx = -uy;
  const vy = ux;
  const backX = tipX - len * ux;
  const backY = tipY - len * uy;
  return poly(
    [
      [tipX, tipY],
      [backX + half * vx, backY + half * vy],
      [backX + notch * ux, backY + notch * uy],
      [backX - half * vx, backY - half * vy],
    ],
    // Tagged so a movement's head can be told from any other filled shape on
    // the canvas -- the north arrow is one too. Renderers ignore it.
    { fill: color, close: true, role: 'arrowhead' },
  );
}

/**
 * A shaft that stops where its head begins, plus the head.
 *
 * Running the shaft all the way to the tip left its round cap spilling past
 * the barbs at small sizes. Ending it at the notch means the head is the only
 * thing that draws the point.
 */
function arrowTo(x1, y1, x2, y2, color, width, extra = {}, scale = 1) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const back = (HEAD_LEN - HEAD_NOTCH) * scale;
  return [
    line(x1, y1, x2 - back * Math.cos(angle), y2 - back * Math.sin(angle), color, width, extra),
    arrowHead(x2, y2, angle, color, scale),
  ];
}

/* --------------------------------------------------------------- pieces */

/**
 * The grey legs, the box, and the compass ticks everything else sits on.
 *
 * `spans` is the lateral range the arrows on each approach actually occupy.
 * A fixed-width casing looks right until an approach carries a right turn,
 * which sits far enough toward the kerb that it is drawn off the asphalt
 * altogether -- so the road is widened to whatever it has to carry.
 */
function baseOps(approaches, options, spans = new Map()) {
  const ops = [];
  if (options.showCompass) {
    ops.push(circle(CENTER, CENTER, LEG_OUTER, { stroke: ROAD, width: 1, dash: [4, 4] }));
  }

  for (const approach of approaches) {
    const bearing = num(approach.compassBearing);
    if (bearing === null) continue;
    const a = legAngle(bearing);
    const perp = a + Math.PI / 2;
    const span = spans.get(String(approach.approachId)) || { min: -7, max: 7 };
    // Centre the casing on the movements rather than on the leg's own axis,
    // so a right-turn-only approach is not drawn with all its asphalt on the
    // side nothing uses.
    const mid = (span.min + span.max) / 2;
    const width = Math.max(20, span.max - span.min + 14);
    const cx = CENTER + mid * Math.cos(perp);
    const cy = CENTER + mid * Math.sin(perp);
    ops.push(line(
      cx + LEG_OUTER * Math.cos(a), cy + LEG_OUTER * Math.sin(a),
      cx + LEG_INNER * Math.cos(a), cy + LEG_INNER * Math.sin(a),
      ROAD, width, { cap: 'butt' },
    ));
  }

  ops.push(circle(CENTER, CENTER, BOX_RADIUS, { fill: '#f3f4f6', stroke: ROAD_EDGE, width: 2 }));

  if (options.showCompass) {
    // A north arrow in the corner rather than N/E/S/W on the cardinals: the
    // letters sit exactly where the legs, the street names and the phase
    // numbers all want to be, and they collide at every bearing near a
    // cardinal -- which is most of them.
    const x = 22;
    const y = 30;
    ops.push(poly([[x, y - 11], [x - 4.5, y + 4], [x, y + 1], [x + 4.5, y + 4]], {
      fill: FAINT, close: true,
    }));
    ops.push(text(x, y + 15, 'N', { size: 9, fill: FAINT, weight: 'bold' }));
  }
  return ops;
}

/** Street name along the end of each leg, rotated to lie with the road. */
function streetOps(approaches) {
  const ops = [];
  const seen = new Set();
  for (const approach of approaches) {
    const bearing = num(approach.compassBearing);
    const name = String(approach.streetName || '').trim();
    if (bearing === null || !name) continue;
    // One label per leg, not one per approach: a divided road has two
    // approaches on the same bearing and would otherwise print twice.
    const key = `${Math.round(bearing)}\u0000${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const a = legAngle(bearing);
    const perp = a + Math.PI / 2;
    // Mid-leg, well inside the phase numbers at the leg's end. Sharing a
    // radius with them put the street name straight through the numbers on
    // any approach whose label ran the same way.
    const r = STREET_RADIUS;
    let deg = (a * 180) / Math.PI;
    // Keep text upright: past vertical, flip it rather than print it mirrored.
    const flipped = deg > 90 || deg < -90;
    // Normalised, so the op list reads 0 rather than 360 for the same angle.
    if (flipped) deg = ((deg + 180 + 180) % 360) - 180;
    // Offset clear of the carriageway. The name runs *along* the leg, which is
    // where the phase numbers also are, so it is pushed to one side of the
    // road rather than printed down the middle of it. The side follows the
    // flip so the text always reads away from the arrows.
    const side = (flipped ? -1 : 1) * STREET_OFFSET;
    ops.push(text(
      CENTER + r * Math.cos(a) + side * Math.cos(perp),
      CENTER + r * Math.sin(a) + side * Math.sin(perp),
      // A long name on a leg is unreadable at grid size and overruns the
      // canvas, so it is cut rather than allowed to run off the square.
      name.length > 16 ? `${name.slice(0, 15)}…` : name,
      { size: 10, fill: '#4b5563', rotate: deg, weight: 'bold' },
    ));
  }
  return ops;
}

/** One crosswalk dash across the approach on the given bearing. */
/**
 * Screen coordinates from a point in an approach's own frame.
 *
 * `along` runs down the approach's axis, `across` at right angles to it.
 * Every crossing is placed in this frame, including the diagonals -- which
 * used to be drawn against the screen's axes instead, so on any intersection
 * not aligned to north they cut across the crossing box at an angle of their
 * own instead of joining its corners.
 */
function inApproachFrame(bearing, along, across) {
  const a = approachAxis(bearing);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  return [
    CENTER + along * ux - across * uy,
    CENTER + along * uy + across * ux,
  ];
}

const CROSSING_STYLE = { dash: [4, 3], opacity: 0.75 };

/** One crossing, at the kerb line of the approach on this bearing. */
function crosswalkAt(bearing, color) {
  const R = CROSSWALK_REACH;
  const [x1, y1] = inApproachFrame(bearing, R, R);
  const [x2, y2] = inApproachFrame(bearing, -R, R);
  return line(x1, y1, x2, y2, color, 2, CROSSING_STYLE);
}

/** A diagonal, corner to corner of the square the four crossings make. */
function diagonalCrosswalk(dir, color, bearing) {
  const R = CROSSWALK_REACH;
  const [x1, y1] = inApproachFrame(bearing, -R, -R * dir);
  const [x2, y2] = inApproachFrame(bearing, R, R * dir);
  return line(x1, y1, x2, y2, color, 2, CROSSING_STYLE);
}

/**
 * The crossings a phase's pedestrian mode draws.
 *
 *   0 none · 1 assigned approach · 2 assigned + opposite · 3 opposite only
 *   4 one diagonal · 5 the other · 6 both (scramble) · 7 all four plus both
 */
function pedOps(phase, bearing, color) {
  const mode = pedMode(phase);
  if (!mode || bearing === null) return [];
  if (mode === 1) return [crosswalkAt(bearing, color)];
  if (mode === 2) return [crosswalkAt(bearing, color), crosswalkAt((bearing + 180) % 360, color)];
  if (mode === 3) return [crosswalkAt((bearing + 180) % 360, color)];
  if (mode === 4) return [diagonalCrosswalk(1, color, bearing)];
  if (mode === 5) return [diagonalCrosswalk(-1, color, bearing)];
  if (mode === 6) {
    return [diagonalCrosswalk(1, color, bearing), diagonalCrosswalk(-1, color, bearing)];
  }
  if (mode === 7) {
    return [
      ...[0, 90, 180, 270].map((d) => crosswalkAt((bearing + d) % 360, color)),
      diagonalCrosswalk(1, color, bearing), diagonalCrosswalk(-1, color, bearing),
    ];
  }
  return [];
}

/** The arrow for one vehicle phase, plus the number that labels it. */
function arrowOps(phase, bearing, color, options, lateral) {
  const kind = movementKind(phase.movementType);
  if (kind === 'pedestrian') return [];

  const a = legAngle(bearing);
  const perp = a + Math.PI / 2;
  const turnAcross = a + (options.isLht ? -Math.PI / 2 : Math.PI / 2);
  const turnNear = a + (options.isLht ? Math.PI / 2 : -Math.PI / 2);
  const ox = lateral * Math.cos(perp);
  const oy = lateral * Math.sin(perp);

  const sx = CENTER + ARROW_OUTER * Math.cos(a) + ox;
  const sy = CENTER + ARROW_OUTER * Math.sin(a) + oy;
  const ex = CENTER + ARROW_INNER * Math.cos(a) + ox;
  const ey = CENTER + ARROW_INNER * Math.sin(a) + oy;
  const width = 3;
  const ops = [];

  if (kind === 'left' || kind === 'leftProtPerm' || kind === 'fya') {
    const bx = sx + (ex - sx) * 0.6;
    const by = sy + (ey - sy) * 0.6;
    const tip = 22;
    const tx = bx + tip * Math.cos(turnAcross);
    const ty = by + tip * Math.sin(turnAcross);
    const dashed = kind === 'leftProtPerm' ? [6, 5] : null;
    const headColor = kind === 'fya' ? '#eab308' : color;
    ops.push(line(sx, sy, bx, by, color, width, { dash: dashed, cap: 'round' }));
    ops.push(...arrowTo(bx, by, tx, ty, headColor, width, {
      dash: kind === 'fya' ? [4, 4] : dashed, cap: 'round',
    }));
  } else if (kind === 'right') {
    const bx = sx + (ex - sx) * 0.6;
    const by = sy + (ey - sy) * 0.6;
    const tip = 22;
    const tx = bx + tip * Math.cos(turnNear);
    const ty = by + tip * Math.sin(turnNear);
    ops.push(line(sx, sy, bx, by, color, width, { cap: 'round' }));
    ops.push(...arrowTo(bx, by, tx, ty, color, width, { cap: 'round' }));
  } else if (kind === 'uturn') {
    // In along the approach, round through 180, back out alongside. The loop
    // swings to the side a left turn crosses to, because that is the lane a
    // U-turn is made from.
    const loop = 8;
    const inX = Math.cos(a);
    const inY = Math.sin(a);
    const tX = Math.cos(turnAcross);
    const tY = Math.sin(turnAcross);
    const nx = sx + (ex - sx) * 0.78;
    const ny = sy + (ey - sy) * 0.78;
    ops.push(line(sx, sy, nx, ny, color, width, { cap: 'round' }));
    const arcPts = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = (i / 10) * Math.PI;
      const cx = nx + loop * tX;
      const cy = ny + loop * tY;
      arcPts.push([
        cx - loop * (tX * Math.cos(t) + inX * Math.sin(t)),
        cy - loop * (tY * Math.cos(t) + inY * Math.sin(t)),
      ]);
    }
    ops.push(poly(arcPts, { stroke: color, width, cap: 'round' }));
    const [lastX, lastY] = arcPts[arcPts.length - 1];
    const outX = lastX - 30 * inX;
    const outY = lastY - 30 * inY;
    ops.push(...arrowTo(lastX, lastY, outX, outY, color, width, { cap: 'round' }));
  } else {
    // Through, and the shared movements that read as a through with a stub.
    ops.push(...arrowTo(sx, sy, ex, ey, color, width, {
      cap: 'round', dash: kind === 'permissive' ? [6, 5] : null,
    }));
    if (kind === 'leftThrough' || kind === 'permissive') {
      const bx = sx + (ex - sx) * 0.45;
      const by = sy + (ey - sy) * 0.45;
      const tx = bx + 16 * Math.cos(turnAcross);
      const ty = by + 16 * Math.sin(turnAcross);
      ops.push(...arrowTo(bx, by, tx, ty, color, width - 0.5, { cap: 'round' }, 0.8));
    }
    if (kind === 'throughRight') {
      const bx = sx + (ex - sx) * 0.45;
      const by = sy + (ey - sy) * 0.45;
      const tx = bx + 16 * Math.cos(turnNear);
      const ty = by + 16 * Math.sin(turnNear);
      ops.push(...arrowTo(bx, by, tx, ty, color, width - 0.5, { cap: 'round' }, 0.8));
    }
  }

  if (options.showPhaseNumbers) {
    const r = ARROW_OUTER + 10;
    ops.push(text(
      CENTER + r * Math.cos(a) + ox, CENTER + r * Math.sin(a) + oy + 3.5,
      String(phase.phase), { size: 12, fill: color, weight: 'bold' },
    ));
  }
  return ops;
}

export const DEFAULT_OPTIONS = {
  showCompass: true,
  showStreetNames: true,
  showPhaseNumbers: true,
  showCrosswalks: true,
  centerLabel: '',
  palette: 'signal',
  isLht: false,
};

/**
 * The whole diagram, as a draw list on a DIAGRAM_SIZE square.
 *
 * `phases` may be filtered to a subset by the caller -- one phase per cell is
 * a different sheet from one intersection per cell, and both are worth
 * printing. The legs are always drawn from every approach, so a single-phase
 * diagram still shows the intersection it belongs to rather than one lonely
 * arrow in space.
 */
export function buildPhaseDiagram({ approaches = [], phases = [], options = {} } = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const palette = PALETTES[opts.palette] || PALETTES.signal;

  const bearingFor = new Map(
    approaches.map((a) => [String(a.approachId), num(a.compassBearing)]),
  );

  // Lane position depends on what else shares the approach, so group first.
  const byApproach = new Map();
  for (const phase of phases) {
    const key = String(phase.approachId);
    if (!byApproach.has(key)) byApproach.set(key, []);
    byApproach.get(key).push(phase);
  }

  // Every arrow's lateral position, settled before anything is drawn: the
  // casing underneath has to be sized to them.
  const lateralFor = new Map();
  const spans = new Map();
  for (const phase of phases) {
    const kind = movementKind(phase.movementType);
    if (kind === 'pedestrian') continue;
    const key = String(phase.approachId);
    if (!bearingFor.has(key)) continue;
    const siblings = byApproach.get(key) || [];
    const sameKind = siblings.filter((p) => movementKind(p.movementType) === kind);
    let lateral = laneOffset(kind);
    if (sameKind.length > 1) {
      // Two lefts off one approach would otherwise sit on top of each other.
      const index = sameKind.findIndex((p) => p.phase === phase.phase);
      lateral += (index - (sameKind.length - 1) / 2) * 8;
    }
    if (opts.isLht) lateral = -lateral;
    lateralFor.set(`${key}\u0000${phase.phase}`, lateral);
    const span = spans.get(key) || { min: lateral, max: lateral };
    span.min = Math.min(span.min, lateral);
    span.max = Math.max(span.max, lateral);
    spans.set(key, span);
  }

  const ops = [...baseOps(approaches, opts, spans)];
  if (opts.showStreetNames) ops.push(...streetOps(approaches));

  const crosswalkOps = [];
  const vehicleOps = [];
  const pedBadges = [];
  // phases.txt carries a row per phase *and approach*, so a scramble that
  // serves every corner arrives as several rows of the same phase number --
  // each of which would draw the same four crossings and the same two
  // diagonals on top of each other, and each of which would plant its own
  // badge. Both are deduplicated: one line per line, one badge per phase.
  const drawnCrossings = new Set();
  const badgedPhases = new Set();

  for (const phase of phases) {
    const bearing = bearingFor.get(String(phase.approachId)) ?? null;
    const color = palette.phase(Number(phase.phase));
    if (bearing === null) continue;

    if (opts.showCrosswalks) {
      for (const op of pedOps(phase, bearing, color)) {
        // Ends sorted before they are compared: the same crossing drawn from
        // the opposite approach comes out with its endpoints the other way
        // round, and an order-sensitive key would call that a second line.
        const ends = [
          `${Math.round(op.x1)},${Math.round(op.y1)}`,
          `${Math.round(op.x2)},${Math.round(op.y2)}`,
        ].sort();
        const key = `${ends[0]}|${ends[1]}|${op.stroke}`;
        if (drawnCrossings.has(key)) continue;
        drawnCrossings.add(key);
        crosswalkOps.push(op);
      }
    }

    const kind = movementKind(phase.movementType);
    if (kind === 'pedestrian') {
      // No arrow to hang a number off, so the number rides a badge on the
      // crossing instead -- otherwise a ped-only phase is unlabelled.
      if (opts.showPhaseNumbers && pedMode(phase) && !badgedPhases.has(phase.phase)) {
        badgedPhases.add(phase.phase);
        // Pinned just outside a corner of the crossing square, which is the
        // one place on the box where no crossing is drawn.
        const [bx, by] = inApproachFrame(
          bearing, CROSSWALK_REACH + 7, CROSSWALK_REACH + 7,
        );
        pedBadges.push(circle(bx, by, 8, { fill: '#ffffff', stroke: color, width: 1.5 }));
        pedBadges.push(text(bx, by + 3.5, `P${phase.phase}`, {
          size: 8, fill: color, weight: 'bold',
        }));
      }
      continue;
    }

    const lateral = lateralFor.get(`${String(phase.approachId)}\u0000${phase.phase}`) ?? 0;
    vehicleOps.push(...arrowOps(phase, bearing, color, opts, lateral));
  }

  // Crosswalks under the arrows: a dashed line crossing an arrowhead reads as
  // a broken arrow if it goes on top.
  ops.push(...crosswalkOps, ...vehicleOps, ...pedBadges);

  if (opts.centerLabel) {
    // Last, and on a disc of its own. A scramble puts two diagonals straight
    // through the middle of the box, and a bare number sitting on them is not
    // a number anyone can read.
    // The type shrinks to fit the plate, rather than the plate growing to fit
    // the type. A plate much past half the box radius starts covering the
    // diagonals of a scramble, which then read as four stubs rather than two
    // crossings -- and the diagram loses more than the label gains.
    //
    // Past the length even the smallest readable size can hold, the label is
    // cut: the caption below the diagram carries the ID in full, so the middle
    // can afford to lose the tail.
    const raw = String(opts.centerLabel);
    const label = raw.length > PLATE_MAX_CHARS
      ? `${raw.slice(0, PLATE_MAX_CHARS - 1)}\u2026`
      : raw;
    const size = Math.max(7, Math.min(13, (PLATE_MAX_RADIUS - 4) * 2 / (0.58 * label.length)));
    const r = Math.max(10, (0.58 * size * label.length) / 2 + 4);
    ops.push(circle(CENTER, CENTER, r, {
      fill: '#ffffff', stroke: '#d1d5db', width: 1.5, role: 'idPlate',
    }));
    ops.push(text(CENTER, CENTER + size * 0.35, label, {
      size, fill: '#374151', weight: 'bold',
    }));
  }

  return { size: DIAGRAM_SIZE, ops };
}

/**
 * What a legend needs: one row per phase, already coloured and described.
 */
export function diagramLegend(phases, approaches, paletteName = 'signal') {
  const palette = PALETTES[paletteName] || PALETTES.signal;
  const streetFor = new Map(
    approaches.map((a) => [String(a.approachId), String(a.streetName || '').trim()]),
  );
  return [...phases]
    .sort((a, b) => Number(a.phase) - Number(b.phase))
    .map((phase) => {
      const kind = movementKind(phase.movementType);
      return {
        phase: Number(phase.phase),
        color: palette.phase(Number(phase.phase)),
        movement: MOVEMENT_NAMES[kind] || 'Through',
        street: streetFor.get(String(phase.approachId)) || '',
        ped: pedMode(phase) > 0,
      };
    });
}
