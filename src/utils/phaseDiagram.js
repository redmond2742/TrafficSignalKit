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

/** Breathing room at the edge of the square, and the strip a title takes. */
const MARGIN = 3;
const TITLE_BAND = 26;

/**
 * Every radius as a fraction of the ring, so one number sets the scale.
 *
 * These were twenty independent constants, which meant that reserving a strip
 * at the top for a title -- or widening the roads -- required re-tuning all of
 * them by hand and getting one wrong. The ring is now derived from whatever
 * room the options leave, and the rest follows.
 */
const F = {
  box: 0.28,
  /** Where the asphalt stops: the stop bar, not the middle of the box. */
  legInner: 0.33,
  /** The corner sweep between adjacent legs, well outside the box. */
  curb: 0.72,
  arrowOuter: 0.84,
  street: 0.66,
  streetOffset: 0.2,
  preempt: 0.92,
  /**
   * Phase numbers and compass letters both live outside the ring, and on a
   * leg pointing due north they land on the same spoke. The gap between
   * these two is the only thing keeping a bold "6" off a grey "N".
   */
  numbers: 1.03,
  /** The outermost thing drawn, so this is what sets the scale. */
  letters: 1.18,
};

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
  signal: {
    name: 'Signal colours',
    phase: (n) => PHASE_COLORS[n] || '#6b7280',
    // A flashing yellow arrow is drawn in the colour of the indication it
    // names, not the colour of its phase -- except where the palette has no
    // colours to spend, which is the whole point of the other two.
    fya: () => '#eab308',
  },
  print: { name: 'Black on white', phase: () => '#111111', fya: () => '#111111' },
  ring: {
    name: 'By ring',
    // Ring 1 is phases 1-4, ring 2 is 5-8. Two hues answer "can these run
    // together" at a glance, which eight hues do not.
    phase: (n) => (Number(n) <= 4 ? '#1d4ed8' : '#b91c1c'),
    fya: (n) => (Number(n) <= 4 ? '#1d4ed8' : '#b91c1c'),
  },
};

const INK = '#111111';
const ROAD = '#e5e7eb';
const ROAD_EDGE = '#d1d5db';
const LANE = '#9ca3af';
const FAINT = '#9ca3af';
const BOX_FILL = '#f3f4f6';

/**
 * Preempt channels, coloured by what calls them.
 *
 * preempt.txt's `type` is free text, so this matches rather than looks up: an
 * agency writes "RAIL", "Railroad", "RR" and "LRT" for the same thing, and a
 * channel that falls through to grey is still drawn.
 */
export const PREEMPT_KINDS = [
  { key: 'rail', label: 'Rail', color: '#b45309', test: /rail|train|\brr\b|lrt|crossing/i },
  { key: 'fire', label: 'Emergency vehicle', color: '#dc2626', test: /fire|emerg|evp|ems|ambul|police/i },
  { key: 'transit', label: 'Transit', color: '#0d9488', test: /bus|transit|\btsp\b|priorit/i },
];
const PREEMPT_OTHER = { key: 'other', label: 'Preempt', color: '#4b5563' };

/** Which kind of preempt a `type` string names. Never throws, never empty. */
export function preemptKind(type) {
  const text = String(type ?? '').trim();
  return PREEMPT_KINDS.find((kind) => kind.test.test(text)) || PREEMPT_OTHER;
}

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

/** The movements that run straight across the intersection. */
const THROUGH_KINDS = new Set(['through', 'leftThrough', 'permissive', 'throughRight']);

/** Normalise a movement_type to one of the kinds this draws. */
export function movementKind(movementType) {
  const key = String(movementType ?? '').trim().toUpperCase();
  return MOVEMENT_KINDS[key] || 'through';
}

/**
 * The lane a movement sits in, as an offset across the approach.
 *
 * In lane widths rather than units: a diagram with wider roads spreads its
 * lanes to match, or the arrows bunch along the centreline of a band drawn
 * three times as wide as they need.
 */
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
 * How wide a string sets, near enough to centre it.
 *
 * Both back ends draw Helvetica, so one approximation serves both. It is used
 * only to lay a title out and to decide whether an ID fits its box, where a
 * few percent either way costs nothing and measuring properly would cost a
 * font metrics table in two renderers.
 */
export function textWidth(value, size, bold = false) {
  return String(value ?? '').length * size * (bold ? 0.57 : 0.52);
}

/**
 * A filled arrowhead at the end of a segment.
 *
 * The reference uses SVG `<marker>`, which has no equivalent in a PDF writer.
 * An explicit polygon is the same picture and renders identically in both.
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
function arrowHead(tipX, tipY, angle, color, scale = 1, shaft = 0) {
  const len = HEAD_LEN * scale;
  // Wide enough to read against the shaft it sits on -- a 5-wide arrow with a
  // 8-wide head is a line with a bump -- but never wider than it is long,
  // which is the whole difference between a direction and a blob. The cap is
  // an invariant rather than a hope: raise the shaft weight far enough and
  // the barbs stop growing instead of overtaking the point.
  const half = Math.min(len * 0.46, Math.max(HEAD_HALF * scale, shaft * 1.6));
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
    line(x1, y1, x2 - back * Math.cos(angle), y2 - back * Math.sin(angle), color, width, {
      role: 'shaft', ...extra,
    }),
    arrowHead(x2, y2, angle, color, scale, width),
  ];
}

/* -------------------------------------------------------------- geometry */

/**
 * Every radius this diagram uses, settled before anything is drawn.
 *
 * `hasTitle` moves the whole intersection down and shrinks it, because a
 * title strip has to come out of somewhere and taking it out of the margin
 * would push the compass letters off the square.
 */
function geometry(hasTitle) {
  const top = hasTitle ? TITLE_BAND : MARGIN;
  const cx = DIAGRAM_SIZE / 2;
  const cy = (top + (DIAGRAM_SIZE - MARGIN)) / 2;
  // Room for the outermost thing drawn, less half a glyph so a compass letter
  // or a phase number is not clipped by the edge of the square.
  const outer = Math.min(DIAGRAM_SIZE / 2 - MARGIN, (DIAGRAM_SIZE - MARGIN - top) / 2) - 9;
  const ring = outer / F.letters;
  const box = ring * F.box;
  return {
    cx,
    cy,
    ring,
    box,
    legInner: ring * F.legInner,
    curb: ring * F.curb,
    arrowOuter: ring * F.arrowOuter,
    // The head lands just outside the kerb line rather than inside the box,
    // where it would be drawn over by the centre disc.
    arrowInner: box * 1.08,
    // The crossing box is inscribed in the disc: its corners land on the kerb
    // line, so the four crossings draw the kerb.
    reach: box / Math.SQRT2,
    street: ring * F.street,
    streetOffset: ring * F.streetOffset,
    preempt: ring * F.preempt,
    numbers: ring * F.numbers,
    letters: ring * F.letters,
    titleY: top - 9,
  };
}

/** A point on a circle about the centre. */
const at = (geo, r, angle, ox = 0, oy = 0) => [
  geo.cx + r * Math.cos(angle) + ox,
  geo.cy + r * Math.sin(angle) + oy,
];

/** A circular arc as a polyline, for a back end with no arc op. */
function arcPoints(cx, cy, r, a0, a1, steps = 14) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = a0 + (a1 - a0) * (i / steps);
    points.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return points;
}

/**
 * The asphalt rounding the corner between two legs.
 *
 * Tangent to both legs, which is the whole trick. An arc at a fixed radius
 * about the middle of the diagram cannot meet a straight leg smoothly, so
 * four of them close into a grey annulus and the intersection reads as a
 * roundabout. A tangent arc runs out of one leg and into the next, which is
 * what a corner of asphalt does.
 *
 * It leaves each leg at `F.curb` of the way out and bows in toward the box,
 * so the inside of the corner grazes the kerb line rather than cutting the
 * intersection in half.
 */
function cornerArc(geo, a0, a1, width = 0) {
  const half = (a1 - a0) / 2;
  const mid = a0 + half;
  // How far out the corner has to leave the legs for its inside to clear the
  // box. Without this the sweep bows in over the kerb line, the four of them
  // run together behind the centre disc, and the white notches that tell a
  // four-way intersection from a roundabout close up.
  const clearance = ((geo.box + width / 2 + 4) * Math.cos(half)) / (1 - Math.sin(half));
  // Tangent to each leg's centreline: the perpendicular from the arc's centre
  // meets the leg at exactly `reach`. Never past the end of the leg, which is
  // the one place a corner cannot start from.
  const reach = Math.min(geo.ring, Math.max(geo.curb, clearance));
  const d = reach / Math.cos(half);
  const r = d * Math.sin(half);
  const cx = geo.cx + d * Math.cos(mid);
  const cy = geo.cy + d * Math.sin(mid);
  const t0 = at(geo, reach, a0);
  const t1 = at(geo, reach, a1);
  const from = Math.atan2(t0[1] - cy, t0[0] - cx);
  const to = Math.atan2(t1[1] - cy, t1[0] - cx);
  // The short way round. atan2 wraps at pi, so two tangent points either side
  // of it come back as a sweep of nearly a full turn -- which draws the far
  // side of the arc, out past the ring, instead of the corner.
  const sweep = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return arcPoints(cx, cy, r, from, from + sweep);
}

/**
 * Screen coordinates from a point in an approach's own frame.
 *
 * `along` runs down the approach's axis, `across` at right angles to it.
 * Every crossing is placed in this frame, including the diagonals -- which
 * used to be drawn against the screen's axes instead, so on any intersection
 * not aligned to north they cut across the crossing box at an angle of their
 * own instead of joining its corners.
 */
function inApproachFrame(geo, bearing, along, across) {
  const a = approachAxis(bearing);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  return [
    geo.cx + along * ux - across * uy,
    geo.cy + along * uy + across * ux,
  ];
}

/* --------------------------------------------------------------- pieces */

/**
 * The asphalt: a band down each leg, a fillet round each corner, and the
 * centre disc over the top of both.
 *
 * `spans` is the lateral range the arrows on each approach actually occupy.
 * A fixed-width casing looks right until an approach carries a right turn,
 * which sits far enough toward the kerb that it is drawn off the asphalt
 * altogether -- so the road is widened to whatever it has to carry.
 */
function roadOps(geo, approaches, opts, spans) {
  const ops = [];
  const roadWidth = opts.roadWidth;
  const bands = [];

  for (const approach of approaches) {
    const bearing = num(approach.compassBearing);
    if (bearing === null) continue;
    const a = legAngle(bearing);
    const perp = a + Math.PI / 2;
    const span = spans.get(String(approach.approachId)) || { min: 0, max: 0 };
    // Centre the casing on the movements rather than on the leg's own axis,
    // so a right-turn-only approach is not drawn with all its asphalt on the
    // side nothing uses.
    const mid = (span.min + span.max) / 2;
    const width = Math.max(roadWidth, span.max - span.min + roadWidth * 0.55);
    const cx = geo.cx + mid * Math.cos(perp);
    const cy = geo.cy + mid * Math.sin(perp);
    bands.push({ a, cx, cy, width, mid });
    ops.push(line(
      cx + geo.ring * Math.cos(a), cy + geo.ring * Math.sin(a),
      cx + geo.legInner * Math.cos(a), cy + geo.legInner * Math.sin(a),
      ROAD, width, { cap: 'butt', role: 'casing' },
    ));
  }

  // The corners. Adjacent legs are joined by a sector of asphalt hugging the
  // kerb line, which is what turns four spokes into an intersection. Only
  // between legs that are actually adjacent: at a T, the 180-degree gap where
  // the fourth leg would be has no asphalt in it and drawing some invents a
  // leg that is not there.
  // A turning path, not a kerb line: it sweeps wide between the two legs and
  // merges into each of them partway along, the way a corner of asphalt
  // actually does. Hugging the box instead closes the four of them into one
  // grey annulus, and the whole diagram reads as a roundabout.
  const corners = [];
  if (opts.showCurbReturns && bands.length > 1) {
    const angles = [...new Set(bands.map((b) => Math.round(b.a * 1000) / 1000))]
      .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
      .sort((x, y) => x - y);
    for (let i = 0; i < angles.length; i += 1) {
      const a0 = angles[i];
      const a1 = i === angles.length - 1 ? angles[0] + 2 * Math.PI : angles[i + 1];
      const gap = a1 - a0;
      if (gap < rad(5) || gap > rad(150)) continue;
      corners.push([a0, a1]);
    }
    for (const [a0, a1] of corners) {
      ops.push(poly(cornerArc(geo, a0, a1, roadWidth * 0.86), {
        stroke: ROAD, width: roadWidth * 0.86, cap: 'butt', role: 'curb',
      }));
    }
  }

  // Lane lines, down the middle of every band and round every corner. They
  // are what makes the grey read as road rather than as a grey spoke.
  if (opts.showLaneLines) {
    for (const band of bands) {
      ops.push(line(
        band.cx + geo.ring * 0.96 * Math.cos(band.a), band.cy + geo.ring * 0.96 * Math.sin(band.a),
        band.cx + geo.legInner * Math.cos(band.a), band.cy + geo.legInner * Math.sin(band.a),
        LANE, 1.3, { dash: [5, 5], opacity: 0.6, role: 'lane' },
      ));
    }
    for (const [a0, a1] of corners) {
      ops.push(poly(cornerArc(geo, a0, a1, roadWidth * 0.86), {
        stroke: LANE, width: 1.3, dash: [5, 5], opacity: 0.6, cap: 'butt', role: 'lane',
      }));
    }
  }

  ops.push(circle(geo.cx, geo.cy, geo.box, {
    fill: BOX_FILL, stroke: ROAD_EDGE, width: 2, role: 'box',
  }));
  return ops;
}

/** The dashed ring, and either compass letters on it or a north arrow. */
function compassOps(geo, opts) {
  const ops = [];
  if (opts.compass === 'off') return ops;
  if (opts.compass === 'arrow') {
    // The old corner marker. It never collides with anything, which is the
    // reason to keep it: letters sit exactly where the legs, the street names
    // and the phase numbers all want to be.
    const x = 22;
    const y = geo.cy - geo.letters + 8;
    ops.push(poly([[x, y - 11], [x - 4.5, y + 4], [x, y + 1], [x + 4.5, y + 4]], {
      fill: FAINT, close: true, role: 'north',
    }));
    ops.push(text(x, y + 15, 'N', { size: 9, fill: FAINT, weight: 'bold', role: 'north' }));
    return ops;
  }

  ops.push(circle(geo.cx, geo.cy, geo.ring, {
    stroke: ROAD, width: 1, dash: [4, 4], role: 'ring',
  }));
  const letters = [['N', -90], ['E', 0], ['S', 90], ['W', 180]];
  for (const [letter, deg] of letters) {
    const a = rad(deg);
    const [tx, ty] = at(geo, geo.ring + 4, a);
    const [ex, ey] = at(geo, geo.ring - 4, a);
    ops.push(line(tx, ty, ex, ey, ROAD_EDGE, 1, { role: 'tick' }));
    const [lx, ly] = at(geo, geo.letters, a);
    ops.push(text(lx, ly + 3.8, letter, {
      size: 11, fill: FAINT, weight: 'bold', role: 'compass',
    }));
  }
  return ops;
}

/**
 * The street names as a title across the top, each in its own phase's colour.
 *
 * Set along the legs they have to be rotated, cut short, and kept clear of
 * the phase numbers, which is three compromises for a label nobody reads at
 * grid size anyway. Across the top they are horizontal, full length, and the
 * colour ties each street to the phases that serve it.
 */
function titleOps(geo, parts) {
  const shown = parts.map((part) => ({ ...part }));
  if (!shown.length) return [];
  const sep = ' · ';
  const maxWidth = DIAGRAM_SIZE - 12;
  const widthOf = (size) => shown.reduce((w, p) => w + textWidth(p.text, size, true), 0)
    + (shown.length - 1) * textWidth(sep, size, true);

  let size = 11.5;
  while (size > 7.5 && widthOf(size) > maxWidth) size -= 0.5;
  // Still too wide at the smallest readable size: cut the longest name back a
  // character at a time, so two streets of unequal length both survive.
  for (let guard = 0; guard < 80 && widthOf(size) > maxWidth; guard += 1) {
    const longest = shown.reduce((a, b) => (b.text.length > a.text.length ? b : a));
    if (longest.text.length <= 4) break;
    longest.text = `${longest.text.slice(0, longest.text.length - 2)}…`;
  }

  const ops = [];
  let x = geo.cx - widthOf(size) / 2;
  shown.forEach((part, index) => {
    if (index > 0) {
      ops.push(text(x, geo.titleY, sep, {
        size, fill: FAINT, anchor: 'start', weight: 'bold', role: 'titleSep',
      }));
      x += textWidth(sep, size, true);
    }
    ops.push(text(x, geo.titleY, part.text, {
      size, fill: part.color, anchor: 'start', weight: 'bold', role: 'title',
    }));
    x += textWidth(part.text, size, true);
  });
  return ops;
}

/** Street name along the end of each leg, rotated to lie with the road. */
function legNameOps(geo, approaches) {
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
    let deg = (a * 180) / Math.PI;
    // Keep text upright: past vertical, flip it rather than print it mirrored.
    const flipped = deg > 90 || deg < -90;
    // Normalised, so the op list reads 0 rather than 360 for the same angle.
    if (flipped) deg = ((deg + 180 + 180) % 360) - 180;
    // Offset clear of the carriageway. The name runs *along* the leg, which is
    // where the phase numbers also are, so it is pushed to one side of the
    // road rather than printed down the middle of it. The side follows the
    // flip so the text always reads away from the arrows.
    const side = (flipped ? -1 : 1) * geo.streetOffset;
    ops.push(text(
      geo.cx + geo.street * Math.cos(a) + side * Math.cos(perp),
      geo.cy + geo.street * Math.sin(a) + side * Math.sin(perp),
      // A long name on a leg is unreadable at grid size and overruns the
      // canvas, so it is cut rather than allowed to run off the square.
      name.length > 16 ? `${name.slice(0, 15)}…` : name,
      { size: 10, fill: '#4b5563', rotate: deg, weight: 'bold', role: 'legName' },
    ));
  }
  return ops;
}

const CROSSING_STYLE = { dash: [5, 4], opacity: 0.9, role: 'crossing' };

/** One crossing, at the kerb line of the approach on this bearing. */
function crosswalkAt(geo, bearing, color, width) {
  const R = geo.reach;
  const [x1, y1] = inApproachFrame(geo, bearing, R, R);
  const [x2, y2] = inApproachFrame(geo, bearing, -R, R);
  return line(x1, y1, x2, y2, color, width, CROSSING_STYLE);
}

/** A diagonal, corner to corner of the square the four crossings make. */
function diagonalCrosswalk(geo, dir, color, bearing, width) {
  const R = geo.reach;
  const [x1, y1] = inApproachFrame(geo, bearing, -R, -R * dir);
  const [x2, y2] = inApproachFrame(geo, bearing, R, R * dir);
  return line(x1, y1, x2, y2, color, width, CROSSING_STYLE);
}

/**
 * The crossings a phase's pedestrian mode draws.
 *
 *   0 none · 1 assigned approach · 2 assigned + opposite · 3 opposite only
 *   4 one diagonal · 5 the other · 6 both (scramble) · 7 all four plus both
 */
function pedOps(geo, phase, bearing, color, width) {
  const mode = pedMode(phase);
  if (!mode || bearing === null) return [];
  const across = (b) => crosswalkAt(geo, b, color, width);
  const diag = (dir) => diagonalCrosswalk(geo, dir, color, bearing, width);
  if (mode === 1) return [across(bearing)];
  if (mode === 2) return [across(bearing), across((bearing + 180) % 360)];
  if (mode === 3) return [across((bearing + 180) % 360)];
  if (mode === 4) return [diag(1)];
  if (mode === 5) return [diag(-1)];
  if (mode === 6) return [diag(1), diag(-1)];
  if (mode === 7) {
    return [...[0, 90, 180, 270].map((d) => across((bearing + d) % 360)), diag(1), diag(-1)];
  }
  return [];
}

/** The arrow for one vehicle phase, plus the number that labels it. */
function arrowOps(geo, phase, bearing, color, opts, lateral, palette) {
  const kind = movementKind(phase.movementType);
  if (kind === 'pedestrian') return [];

  const a = legAngle(bearing);
  const perp = a + Math.PI / 2;
  const turnAcross = a + (opts.isLht ? -Math.PI / 2 : Math.PI / 2);
  const turnNear = a + (opts.isLht ? Math.PI / 2 : -Math.PI / 2);
  const ox = lateral * Math.cos(perp);
  const oy = lateral * Math.sin(perp);

  const [sx, sy] = at(geo, geo.arrowOuter, a, ox, oy);
  const [ex, ey] = at(geo, geo.arrowInner, a, ox, oy);
  const width = opts.arrowWidth;
  const scale = opts.headScale;
  // A turn stub has to outrun its own head or the head is all there is.
  const stub = HEAD_LEN * scale + 8;
  const ops = [];

  if (kind === 'left' || kind === 'leftProtPerm' || kind === 'fya') {
    const bx = sx + (ex - sx) * 0.72;
    const by = sy + (ey - sy) * 0.72;
    const tx = bx + stub * Math.cos(turnAcross);
    const ty = by + stub * Math.sin(turnAcross);
    const dashed = kind === 'leftProtPerm' ? [6, 5] : null;
    const headColor = kind === 'fya' ? palette.fya(Number(phase.phase)) : color;
    ops.push(line(sx, sy, bx, by, color, width, { dash: dashed, cap: 'round', role: 'shaft' }));
    ops.push(...arrowTo(bx, by, tx, ty, headColor, width, {
      dash: kind === 'fya' ? [4, 4] : dashed, cap: 'round',
    }, scale));
  } else if (kind === 'right') {
    const bx = sx + (ex - sx) * 0.72;
    const by = sy + (ey - sy) * 0.72;
    const tx = bx + stub * Math.cos(turnNear);
    const ty = by + stub * Math.sin(turnNear);
    ops.push(line(sx, sy, bx, by, color, width, { cap: 'round', role: 'shaft' }));
    ops.push(...arrowTo(bx, by, tx, ty, color, width, { cap: 'round' }, scale));
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
    ops.push(line(sx, sy, nx, ny, color, width, { cap: 'round', role: 'shaft' }));
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
    ops.push(...arrowTo(lastX, lastY, outX, outY, color, width, { cap: 'round' }, scale));
  } else {
    // Through, and the shared movements that read as a through with a stub.
    ops.push(...arrowTo(sx, sy, ex, ey, color, width, {
      cap: 'round', dash: kind === 'permissive' ? [6, 5] : null,
    }, scale));
    if (kind === 'leftThrough' || kind === 'permissive' || kind === 'throughRight') {
      const towards = kind === 'throughRight' ? turnNear : turnAcross;
      const bx = sx + (ex - sx) * 0.45;
      const by = sy + (ey - sy) * 0.45;
      const short = HEAD_LEN * scale * 0.8 + 6;
      ops.push(...arrowTo(
        bx, by, bx + short * Math.cos(towards), by + short * Math.sin(towards),
        color, width - 0.5, { cap: 'round' }, scale * 0.8,
      ));
    }
  }
  return ops;
}

/**
 * The phase number outside the leg, in the phase's own colour.
 *
 * Staggered in two directions, not one. Sideways alone is not enough: an
 * approach carrying a left and a through puts its two numbers about a lane
 * apart, which at any readable size is less than the width of "12" -- so a
 * touching "1" and "6" reads as "16". `rank` steps them along the leg as
 * well, so a pair sits diagonally and never runs together.
 */
function numberOps(geo, phase, bearing, color, opts, lateral, rank = 0, count = 1) {
  const a = legAngle(bearing);
  const perp = a + Math.PI / 2;
  const size = opts.phaseNumberSize;
  const spread = lateral * 1.8;
  const step = (rank - (count - 1) / 2) * size * 0.85;
  const [x, y] = at(geo, geo.numbers + step, a, spread * Math.cos(perp), spread * Math.sin(perp));
  return [text(x, y + size * 0.35, String(phase.phase), {
    size, fill: color, weight: 'bold', role: 'phaseNumber',
  })];
}

/**
 * One preempt channel: a badge on the verge and a dashed arrow inbound.
 *
 * Dashed, and thinner than a movement, because a preempt is not a movement --
 * it is a call that rearranges them. Drawing it as a solid arrow in the
 * travel lane would put a ninth phase on an eight-phase intersection.
 */
function preemptOps(geo, entry, bearing, opts, lateral, rank) {
  const kind = preemptKind(entry.type);
  const a = legAngle(bearing);
  const perp = a + Math.PI / 2;
  const ox = lateral * Math.cos(perp);
  const oy = lateral * Math.sin(perp);
  // Several channels on one approach step down the leg rather than stack on
  // top of each other.
  const r = geo.preempt - rank * 20;
  const [bx, by] = at(geo, r, a, ox, oy);
  const [ax, ay] = at(geo, r - 12, a, ox, oy);
  const [tx, ty] = at(geo, Math.max(geo.box + 6, r - 40), a, ox, oy);
  return [
    ...arrowTo(ax, ay, tx, ty, kind.color, 2.2, {
      dash: [4, 3], cap: 'butt', role: 'preemptArrow',
    }, 0.9),
    circle(bx, by, 8.5, {
      fill: '#ffffff', stroke: kind.color, width: 1.6, role: 'preemptBadge',
    }),
    text(bx, by + 3.2, String(entry.channel), {
      size: 9, fill: kind.color, weight: 'bold', role: 'preemptLabel',
    }),
  ];
}

/**
 * How big the centre label can be set, and whether it had to be cut.
 *
 * The type shrinks to fit the space rather than the space growing to fit the
 * type: a label much past the crossing box starts covering the diagonals of a
 * scramble, which then read as four stubs rather than two crossings, and the
 * diagram loses more than the label gains.
 *
 * Fitted into a *circle*, not a box, because the crossing box turns with the
 * intersection while the label stays horizontal. The inscribed circle is the
 * only region that is clear at every bearing.
 */
export const MIN_LABEL_SIZE = 7;

export function fitCenterLabel(label, { radius, maxSize = 48, maxChars = 10, size = 0 } = {}) {
  const raw = String(label ?? '');
  if (!raw) return { text: '', size: 0, truncated: false, fits: true };
  const room = Math.max(6, radius - 3);
  // Cap height is about 0.72 of the point size for Helvetica digits.
  const widest = (chars) => Math.hypot(textWidth('0'.repeat(chars), 1, true) / 2, 0.72 / 2);
  const sizeFor = (chars) => room / widest(chars);

  let text = raw;
  let truncated = false;
  // Past the length even the smallest readable size can hold, the label is
  // cut: the caption below the diagram carries the ID in full, so the middle
  // can afford to lose the tail.
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars - 1)}…`;
    truncated = true;
  }
  const auto = Math.max(MIN_LABEL_SIZE, Math.min(maxSize, sizeFor(text.length)));
  // A forced size gets the same readable floor the automatic one does. The
  // slider runs down to nothing so that nothing can mean "fit it for me", and
  // without a floor the two steps either side of that sentinel set an ID in
  // one and two point type.
  const chosen = size > 0 ? Math.max(MIN_LABEL_SIZE, size) : auto;
  return {
    text,
    size: chosen,
    truncated,
    // A forced size can overflow; the page says so rather than silently
    // printing an ID over the crossings.
    fits: chosen <= sizeFor(text.length) + 0.01,
  };
}

export const DEFAULT_OPTIONS = {
  /* layers */
  showStreetNames: true,
  showPhaseNumbers: true,
  showCrosswalks: true,
  showLaneLines: true,
  showCurbReturns: true,
  showPreempts: true,
  /* style */
  compass: 'letters',
  streetNames: 'title',
  centerPlate: 'auto',
  roadWidth: 22,
  arrowWidth: 4.6,
  headScale: 1.7,
  phaseNumberSize: 16,
  crosswalkWidth: 2.6,
  centerLabelSize: 0,
  /* content */
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
export function buildPhaseDiagram({
  approaches = [], phases = [], preempts = [], options = {},
} = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const palette = PALETTES[opts.palette] || PALETTES.signal;
  const lane = opts.roadWidth / 20;

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
    // Grouped by the lane they are made from, not by the movement they are.
    // A protected-permissive left and a U-turn are different movements that
    // are both made from the inside lane, so grouping by movement left them
    // drawn exactly on top of each other -- two arrows and two phase numbers
    // in one place.
    const base = laneOffset(kind);
    const sameLane = siblings.filter((p) => {
      const sibling = movementKind(p.movementType);
      return sibling !== 'pedestrian' && laneOffset(sibling) === base;
    });
    let lateral = base * lane;
    if (sameLane.length > 1) {
      const index = sameLane.findIndex((p) => p.phase === phase.phase);
      lateral += (index - (sameLane.length - 1) / 2) * 8 * lane;
    }
    if (opts.isLht) lateral = -lateral;
    lateralFor.set(`${key}\u0000${phase.phase}`, lateral);
    const span = spans.get(key) || { min: lateral, max: lateral };
    span.min = Math.min(span.min, lateral);
    span.max = Math.max(span.max, lateral);
    spans.set(key, span);
  }

  // The title decides how much room the intersection gets, so it is settled
  // before any geometry.
  const titleParts = opts.showStreetNames && opts.streetNames === 'title'
    ? streetTitleParts(approaches, phases, palette)
    : [];
  const hasTitle = titleParts.length > 0;
  const geo = geometry(hasTitle);

  // Where each phase's number sits along its leg. Settled per approach, from
  // the lane order, so the stagger reads the same way on every approach.
  const rankFor = new Map();
  const countFor = new Map();
  for (const [key, entries] of byApproach) {
    const drawn = entries
      .filter((p) => lateralFor.has(`${key}\u0000${p.phase}`))
      .sort((a, b) => lateralFor.get(`${key}\u0000${a.phase}`)
        - lateralFor.get(`${key}\u0000${b.phase}`));
    countFor.set(key, drawn.length);
    drawn.forEach((p, index) => rankFor.set(`${key}\u0000${p.phase}`, index));
  }

  const ops = [...roadOps(geo, approaches, opts, spans), ...compassOps(geo, opts)];
  if (hasTitle) ops.push(...titleOps(geo, titleParts));
  if (opts.showStreetNames && opts.streetNames === 'legs') {
    ops.push(...legNameOps(geo, approaches));
  }

  const crosswalkOps = [];
  const vehicleOps = [];
  const labelOps = [];
  // phases.txt carries a row per phase *and approach*, so a scramble that
  // serves every corner arrives as several rows of the same phase number --
  // each of which would draw the same four crossings and the same two
  // diagonals on top of each other, and each of which would plant its own
  // badge. Both are deduplicated: one line per line, one badge per phase.
  const drawnCrossings = new Set();
  const badgedPhases = new Set();
  let diagonalDrawn = false;

  for (const phase of phases) {
    const bearing = bearingFor.get(String(phase.approachId)) ?? null;
    const color = palette.phase(Number(phase.phase));
    if (bearing === null) continue;

    if (opts.showCrosswalks) {
      for (const op of pedOps(geo, phase, bearing, color, opts.crosswalkWidth)) {
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
        // A diagonal passes through the middle, which is where the ID goes.
        if (Math.hypot(
          (op.x1 + op.x2) / 2 - geo.cx, (op.y1 + op.y2) / 2 - geo.cy,
        ) < 1) diagonalDrawn = true;
      }
    }

    const kind = movementKind(phase.movementType);
    const lateral = lateralFor.get(`${String(phase.approachId)}\u0000${phase.phase}`) ?? 0;

    if (kind === 'pedestrian') {
      // No arrow to hang a number off, so the number rides a badge on the
      // crossing instead -- otherwise a ped-only phase is unlabelled.
      if (opts.showPhaseNumbers && pedMode(phase) && !badgedPhases.has(phase.phase)) {
        badgedPhases.add(phase.phase);
        // Pinned just outside a corner of the crossing square, which is the
        // one place on the box where no crossing is drawn.
        const [bx, by] = inApproachFrame(geo, bearing, geo.reach + 7, geo.reach + 7);
        labelOps.push(circle(bx, by, 8, { fill: '#ffffff', stroke: color, width: 1.5 }));
        labelOps.push(text(bx, by + 3.5, `P${phase.phase}`, {
          size: 8, fill: color, weight: 'bold', role: 'pedBadge',
        }));
      }
      continue;
    }

    vehicleOps.push(...arrowOps(geo, phase, bearing, color, opts, lateral, palette));
    if (opts.showPhaseNumbers) {
      const key = `${String(phase.approachId)}\u0000${phase.phase}`;
      labelOps.push(...numberOps(
        geo, phase, bearing, color, opts, lateral,
        rankFor.get(key) ?? 0, countFor.get(String(phase.approachId)) ?? 1,
      ));
    }
  }

  // Crosswalks under the arrows: a dashed line crossing an arrowhead reads as
  // a broken arrow if it goes on top.
  ops.push(...crosswalkOps, ...vehicleOps, ...labelOps);

  let unplacedPreempts = 0;
  if (opts.showPreempts && preempts.length) {
    const rankFor = new Map();
    for (const entry of preempts) {
      const bearing = preemptBearing(entry, bearingFor);
      if (bearing === null) {
        unplacedPreempts += 1;
        continue;
      }
      const key = String(bearing);
      const rank = rankFor.get(key) || 0;
      rankFor.set(key, rank + 1);
      // On the verge, past the lane a left turn uses -- the one side of the
      // road that carries no movement at any bearing.
      const span = spanForBearing(approaches, bearingFor, spans, bearing);
      const side = opts.isLht ? -1 : 1;
      const lateral = (span.min + span.max) / 2
        + side * ((span.max - span.min) / 2 + opts.roadWidth * 0.5 + 10);
      ops.push(...preemptOps(geo, entry, bearing, opts, lateral, rank));
    }
  }

  const fitted = fitCenterLabel(opts.centerLabel, {
    radius: opts.showCrosswalks ? geo.reach : geo.box - 4,
    maxSize: geo.box * 1.15,
    size: opts.centerLabelSize,
  });
  if (fitted.text) {
    // Last, so nothing is drawn over it. A plate goes underneath only when
    // something would otherwise cross the label: a scramble puts two diagonals
    // straight through the middle of the box, and a bare number sitting on
    // them is not a number anyone can read. Everywhere else the plate is a
    // white hole punched in the intersection for no reason.
    const wantsPlate = opts.centerPlate === 'always'
      || (opts.centerPlate !== 'never' && diagonalDrawn);
    if (wantsPlate) {
      ops.push(circle(geo.cx, geo.cy, Math.min(
        geo.box - 2,
        Math.max(10, Math.hypot(textWidth(fitted.text, fitted.size, true), fitted.size * 0.72) / 2 + 3),
      ), { fill: '#ffffff', stroke: ROAD_EDGE, width: 1.5, role: 'idPlate' }));
    }
    ops.push(text(geo.cx, geo.cy + fitted.size * 0.35, fitted.text, {
      size: fitted.size, fill: '#374151', weight: 'bold', role: 'centerLabel',
    }));
  }

  return {
    size: DIAGRAM_SIZE,
    ops,
    notes: { centerLabel: fitted, unplacedPreempts },
  };
}

/** The bearing a preempt channel should be drawn on, or null if unknowable. */
function preemptBearing(entry, bearingFor) {
  if (entry.bearing != null && Number.isFinite(Number(entry.bearing))) {
    return Number(entry.bearing);
  }
  for (const id of entry.approachIds || []) {
    const bearing = bearingFor.get(String(id));
    if (bearing != null) return bearing;
  }
  return null;
}

/** The lateral span the movements on a given bearing occupy. */
function spanForBearing(approaches, bearingFor, spans, bearing) {
  let found = null;
  for (const approach of approaches) {
    if (bearingFor.get(String(approach.approachId)) !== bearing) continue;
    const span = spans.get(String(approach.approachId));
    if (!span) continue;
    found = found
      ? { min: Math.min(found.min, span.min), max: Math.max(found.max, span.max) }
      : { ...span };
  }
  return found || { min: 0, max: 0 };
}

/**
 * The streets to put in the title, each with the colour of the phase that
 * best represents it.
 *
 * The through phase, where there is one: it is the movement the street is
 * named for, and a street coloured by its left turn ties the name to the one
 * phase on it that most people would not have guessed.
 */
function streetTitleParts(approaches, phases, palette) {
  const byApproach = new Map(approaches.map((a) => [String(a.approachId), a]));
  const order = [];
  const best = new Map();

  for (const approach of approaches) {
    const name = String(approach.streetName || '').trim();
    if (name && !best.has(name)) {
      best.set(name, null);
      order.push(name);
    }
  }
  for (const phase of phases) {
    const approach = byApproach.get(String(phase.approachId));
    const name = String(approach?.streetName || '').trim();
    if (!name || !best.has(name)) continue;
    const kind = movementKind(phase.movementType);
    if (kind === 'pedestrian') continue;
    const rank = THROUGH_KINDS.has(kind) ? 0 : 1;
    const current = best.get(name);
    if (!current || rank < current.rank
      || (rank === current.rank && Number(phase.phase) < current.phase)) {
      best.set(name, { rank, phase: Number(phase.phase) });
    }
  }

  return order.slice(0, 3).map((name) => ({
    text: name,
    color: best.get(name) ? palette.phase(best.get(name).phase) : '#4b5563',
  }));
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
