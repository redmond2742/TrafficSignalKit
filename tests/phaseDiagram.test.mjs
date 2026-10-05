import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGRAM_SIZE,
  MIN_LABEL_SIZE,
  PALETTES,
  buildPhaseDiagram,
  diagramLegend,
  fitCenterLabel,
  laneOffset,
  legAngle,
  movementKind,
  preemptKind,
  textWidth,
} from '../src/utils/phaseDiagram.js';
import { diagramToSvg, escapeXml } from '../src/utils/phaseDiagramSvg.js';

const CENTER = DIAGRAM_SIZE / 2;
/**
 * Named rather than measured. Lane lines, corner sweeps and preempt routes
 * are all dashed too, so "a dashed line" no longer picks out a crossing and a
 * test that asks for one is testing whatever happened to be drawn first.
 */
const withRole = (diagram, role) => diagram.ops.filter((op) => op.role === role);
const shafts = (diagram) => withRole(diagram, 'shaft');
/** The centre disc, which is where the scale of everything else comes from. */
const boxOf = (diagram) => diagram.ops.find((op) => op.role === 'box');
const approach = (id, bearing, street = '') => ({
  approachId: id, compassBearing: bearing, streetName: street,
});
const phase = (n, approachId, movementType = 'T', pedX = 0) => ({
  phase: n, approachId, movementType, pedX,
});

/* --------------------------------------------------------- bearings */

test('a leg is drawn opposite the heading traffic arrives on', () => {
  // compass_bearing is the heading held arriving at the stop bar. Traffic at
  // 90 degrees is eastbound, so it comes FROM the west and its leg points
  // west -- screen angle 180 degrees, which is -x.
  const a = legAngle(90);
  assert.ok(Math.cos(a) < -0.99, `expected the leg to point west, got cos=${Math.cos(a)}`);
  assert.ok(Math.abs(Math.sin(a)) < 0.01);
});

test('a northbound approach puts its leg at the bottom of the diagram', () => {
  // Northbound (bearing 0) arrives from the south. Screen y grows downward,
  // so south is +y.
  const a = legAngle(0);
  assert.ok(Math.sin(a) > 0.99, `expected the leg to point south, got sin=${Math.sin(a)}`);
});

test('the four cardinal approaches land on four different legs', () => {
  const points = [0, 90, 180, 270].map((b) => {
    const a = legAngle(b);
    return [Math.round(Math.cos(a)), Math.round(Math.sin(a))].join(',');
  });
  assert.equal(new Set(points).size, 4);
});

/* -------------------------------------------------------- movements */

test('movement types are read as codes or as long names', () => {
  assert.equal(movementKind('L'), 'left');
  assert.equal(movementKind('Left Turn'), 'left');
  assert.equal(movementKind('TR'), 'throughRight');
  assert.equal(movementKind('PED'), 'pedestrian');
  assert.equal(movementKind('FYA'), 'fya');
  // An unknown code is a through, which is the commonest movement and the
  // least wrong guess -- but it must not throw, because the file decides.
  assert.equal(movementKind('wat'), 'through');
  assert.equal(movementKind(undefined), 'through');
});

test('a left and a right sit on opposite sides of the approach', () => {
  assert.ok(laneOffset('left') > 0);
  assert.ok(laneOffset('right') < 0);
  assert.notEqual(laneOffset('through'), laneOffset('right'));
});

/* ---------------------------------------------------------- drawing */

test('a phase with no matching approach draws no arrow', () => {
  // There is no bearing to draw it on. Inventing one would put a movement on
  // a leg of the intersection that it does not use.
  const withPhase = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'NOPE')],
  });
  const bare = buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [] });
  assert.equal(withPhase.ops.length, bare.ops.length);
});

test('each phase adds its own arrow', () => {
  const one = buildPhaseDiagram({
    approaches: [approach('A1', 0), approach('A2', 180)],
    phases: [phase(2, 'A1')],
  });
  const two = buildPhaseDiagram({
    approaches: [approach('A1', 0), approach('A2', 180)],
    phases: [phase(2, 'A1'), phase(6, 'A2')],
  });
  assert.ok(two.ops.length > one.ops.length);
});

test('two lefts off one approach are pushed apart', () => {
  // Without the spread they would be drawn on exactly the same line and read
  // as one movement.
  const twoLefts = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(1, 'A1', 'L'), phase(5, 'A1', 'L')],
  });
  const lines = shafts(twoLefts);
  assert.ok(lines.length >= 4, 'two lefts should be a stem and a turn each');
  const starts = new Set(lines.map((op) => `${Math.round(op.x1)},${Math.round(op.y1)}`));
  assert.equal(starts.size, lines.length, 'two lefts were drawn from the same point');
});

test('two movements made from the same lane are pushed apart', () => {
  // A protected-permissive left and a U-turn are different movements made
  // from the same lane. Spread by movement rather than by lane, they came out
  // drawn exactly on top of each other, phase numbers and all.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(5, 'A1', 'LPP'), phase(12, 'A1', 'U')],
  });
  const [a, b] = withRole(diagram, 'phaseNumber');
  assert.ok(
    Math.hypot(a.x - b.x, a.y - b.y) > a.size,
    `phases ${a.text} and ${b.text} were numbered in the same place`,
  );
  const starts = shafts(diagram).map((op) => `${Math.round(op.x1)},${Math.round(op.y1)}`);
  assert.equal(new Set(starts).size, starts.length, 'two movements start from one point');
});

test('a pedestrian phase draws a crossing and no arrow', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'PED', 1)],
  });
  assert.ok(withRole(diagram, 'crossing').length >= 1, 'no crosswalk was drawn');
  const heads = diagram.ops.filter((op) => op.role === 'arrowhead');
  assert.equal(heads.length, 0);
});

test('a pedestrian-only phase still gets its number', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(4, 'A1', 'PED', 1)],
  });
  const labels = diagram.ops.filter((op) => op.op === 'text' && op.text === 'P4');
  assert.equal(labels.length, 1);
});

test('a scramble draws both diagonals', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'PED', 6)],
  });
  assert.equal(withRole(diagram, 'crossing').length, 2);
});

test('crosswalks are drawn under the arrows, not over them', () => {
  // A dashed line crossing an arrowhead reads as a broken arrow.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T', 1)],
  });
  const firstDash = diagram.ops.findIndex((op) => op.role === 'crossing');
  const firstHead = diagram.ops.findIndex((op) => op.role === 'arrowhead');
  assert.ok(firstDash >= 0 && firstHead >= 0);
  assert.ok(firstDash < firstHead, 'the crosswalk was drawn on top of the arrow');
});

test('turning off a layer removes it', () => {
  const base = { approaches: [approach('A1', 0, 'Main St')], phases: [phase(2, 'A1', 'T', 1)] };
  const all = buildPhaseDiagram(base);
  const bare = buildPhaseDiagram({
    ...base,
    options: {
      compass: 'off', showStreetNames: false, showPhaseNumbers: false, showCrosswalks: false,
    },
  });
  assert.ok(bare.ops.length < all.ops.length);
  assert.equal(bare.ops.filter((op) => op.op === 'text').length, 0);
});

test('the print palette gives every phase the same ink', () => {
  const colors = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => PALETTES.print.phase(n));
  assert.equal(new Set(colors).size, 1);
  // ...while the signal palette keeps them apart, which is the whole point.
  const signal = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => PALETTES.signal.phase(n));
  assert.equal(new Set(signal).size, 8);
});

test('a flashing yellow arrow is yellow only where there is colour to spend', () => {
  // It is drawn in the colour of the indication it names, which on a
  // monochrome plotter is one more hue that comes out as one more grey.
  const headOf = (palette) => buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(7, 'A1', 'FYA')], options: { palette },
  }).ops.filter((op) => op.role === 'arrowhead').pop();
  assert.equal(headOf('signal').fill, '#eab308');
  assert.equal(headOf('print').fill, PALETTES.print.phase(7));
  assert.equal(headOf('ring').fill, PALETTES.ring.phase(7));
});

test('left-hand traffic mirrors the lanes', () => {
  const rht = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(1, 'A1', 'L')],
  });
  const lht = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(1, 'A1', 'L')], options: { isLht: true },
  });
  assert.notEqual(shafts(rht)[0].x1, shafts(lht)[0].x1);
});

/* ----------------------------------------------------------- legend */

test('the legend names the street each phase runs on', () => {
  const rows = diagramLegend(
    [phase(2, 'A1', 'T'), phase(1, 'A1', 'L')],
    [approach('A1', 0, 'Main St')],
  );
  assert.deepEqual(rows.map((r) => r.phase), [1, 2]);
  assert.equal(rows[0].movement, 'Left');
  assert.equal(rows[0].street, 'Main St');
});

/* -------------------------------------------------------------- svg */

test('a street name with markup in it cannot break the svg', () => {
  const svg = diagramToSvg(buildPhaseDiagram({
    approaches: [approach('A1', 0, '<script>&"bad"')],
    phases: [],
  }));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
});

test('escaping covers every xml metacharacter', () => {
  assert.equal(escapeXml(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
});

test('the svg declares its viewBox and a title for screen readers', () => {
  const svg = diagramToSvg(
    buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [phase(2, 'A1')] }),
    { title: 'Main & 1st' },
  );
  assert.ok(svg.includes(`viewBox="0 0 ${DIAGRAM_SIZE} ${DIAGRAM_SIZE}"`));
  assert.ok(svg.includes('<title>Main &amp; 1st</title>'));
  assert.ok(svg.includes('role="img"'));
});

test('a diagram with no title is hidden from screen readers rather than unlabelled', () => {
  const svg = diagramToSvg(buildPhaseDiagram({ approaches: [], phases: [] }));
  assert.ok(svg.includes('aria-hidden="true"'));
});

test('centre label is drawn when asked for', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [], options: { centerLabel: '1234' },
  });
  const label = diagram.ops.find((op) => op.op === 'text' && op.text === '1234');
  assert.ok(label);
  assert.equal(Math.round(label.x), CENTER);
});

/* ------------------------------------------- the road under the arrows */

const casings = (diagram) => diagram.ops.filter((op) => op.op === 'line' && op.width >= 20);

test('an approach carrying a right turn is given wider asphalt', () => {
  // A right turn sits far toward the kerb. On a fixed-width casing it is drawn
  // beside the road rather than on it.
  const throughOnly = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')],
  });
  const withRight = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T'), phase(12, 'A1', 'R')],
  });
  assert.ok(casings(withRight)[0].width > casings(throughOnly)[0].width);
});

test('every arrow lands on the asphalt of its own approach', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(1, 'A1', 'L'), phase(2, 'A1', 'T'), phase(12, 'A1', 'R')],
  });
  const casing = casings(diagram)[0];
  // Distance from an arrow's start to the casing's centreline, measured
  // across the road, must be inside half its width.
  const ax = casing.x2 - casing.x1;
  const ay = casing.y2 - casing.y1;
  const len = Math.hypot(ax, ay);
  const lines = shafts(diagram);
  assert.ok(lines.length >= 3);
  for (const shaft of lines) {
    const across = Math.abs(
      ((shaft.x1 - casing.x1) * ay - (shaft.y1 - casing.y1) * ax) / len,
    );
    assert.ok(
      across <= casing.width / 2,
      `an arrow starts ${across.toFixed(1)} across a road ${casing.width} wide`,
    );
  }
});

/* ------------------------------------------------- crosswalk placement */

test('a crosswalk is drawn beside the box, not across the middle of it', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T', 1)],
  });
  const box = boxOf(diagram);
  const dash = withRole(diagram, 'crossing')[0];
  const fromCentre = Math.hypot(
    (dash.x1 + dash.x2) / 2 - box.cx, (dash.y1 + dash.y2) / 2 - box.cy,
  );
  // Measured against the disc rather than against a number, so retuning the
  // scale cannot quietly turn this into a test of nothing.
  assert.ok(
    fromCentre > box.r * 0.6,
    `the crossing runs through the box (midpoint ${fromCentre.toFixed(1)} of ${box.r.toFixed(1)})`,
  );
  assert.ok(fromCentre <= box.r + 0.01, 'the crossing is outside the kerb line');
});

test('ped mode 1 and ped mode 3 land on opposite sides', () => {
  // Mode 1 is the crossing on the assigned approach and mode 3 is the one
  // opposite. If they coincide, one of the two modes does nothing.
  const offsetOf = (mode) => {
    const d = buildPhaseDiagram({
      approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T', mode)],
    });
    const dash = withRole(d, 'crossing')[0];
    // Which way the crossing is displaced from the centre, whatever axis that
    // turns out to be for this bearing.
    return [(dash.x1 + dash.x2) / 2 - CENTER, (dash.y1 + dash.y2) / 2 - CENTER];
  };
  const near = offsetOf(1);
  const far = offsetOf(3);
  const dot = near[0] * far[0] + near[1] * far[1];
  assert.ok(dot < 0, `the two crossings are on the same side (dot ${dot.toFixed(1)})`);
  assert.ok(Math.hypot(...near) > 1, 'mode 1 drew the crossing on the centreline');
});

test('ped mode 2 draws both of them', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T', 2)],
  });
  assert.equal(withRole(diagram, 'crossing').length, 2);
});

/* ------------------------------------------------ the crossing box */

/** Every dashed crossing in a diagram, as endpoint pairs. */
const crossings = (diagram) => withRole(diagram, 'crossing');

test('the four crossings of a scramble meet at their corners', () => {
  // Offset and half-length have to be the same distance or the box never
  // shuts, and the diagonals have no corners to run between.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'PED', 7)],
  });
  const lines = crossings(diagram);
  assert.equal(lines.length, 6, 'expected four crossings and two diagonals');

  const ends = [];
  for (const op of lines.slice(0, 4)) {
    ends.push([op.x1, op.y1], [op.x2, op.y2]);
  }
  // Eight endpoints, four corners: each corner is shared by two crossings.
  const keyed = new Map();
  for (const [x, y] of ends) {
    const key = `${Math.round(x)},${Math.round(y)}`;
    keyed.set(key, (keyed.get(key) || 0) + 1);
  }
  assert.equal(keyed.size, 4, `corners did not meet: ${[...keyed.keys()].join(' ')}`);
  for (const [corner, count] of keyed) {
    assert.equal(count, 2, `corner ${corner} is shared by ${count} crossings`);
  }
});

test('a scramble diagonal runs corner to corner of that box', () => {
  for (const bearing of [0, 37, 128, 284]) {
    const diagram = buildPhaseDiagram({
      approaches: [approach('A1', bearing)], phases: [phase(2, 'A1', 'PED', 7)],
    });
    const lines = crossings(diagram);
    const corners = new Set();
    for (const op of lines.slice(0, 4)) {
      corners.add(`${Math.round(op.x1)},${Math.round(op.y1)}`);
      corners.add(`${Math.round(op.x2)},${Math.round(op.y2)}`);
    }
    for (const diagonal of lines.slice(4)) {
      const a = `${Math.round(diagonal.x1)},${Math.round(diagonal.y1)}`;
      const b = `${Math.round(diagonal.x2)},${Math.round(diagonal.y2)}`;
      assert.ok(corners.has(a), `at ${bearing}° a diagonal started at ${a}, off the box`);
      assert.ok(corners.has(b), `at ${bearing}° a diagonal ended at ${b}, off the box`);
    }
  }
});

test('a lone diagonal turns with the intersection', () => {
  // It used to be drawn against the screen's axes, so it was only ever right
  // on an intersection that happened to be square to north.
  const north = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'PED', 4)],
  });
  const skewed = buildPhaseDiagram({
    approaches: [approach('A1', 40)], phases: [phase(2, 'A1', 'PED', 4)],
  });
  const angleOf = (d) => {
    const op = crossings(d)[0];
    return Math.atan2(op.y2 - op.y1, op.x2 - op.x1);
  };
  const turned = Math.abs(angleOf(skewed) - angleOf(north)) * (180 / Math.PI);
  assert.ok(Math.abs(turned - 40) < 0.5, `the diagonal turned ${turned.toFixed(1)}°, not 40°`);
});

test('two phase rows describing one scramble draw it once', () => {
  // phases.txt carries a row per phase and approach, so a scramble arrives as
  // several rows of the same number. Drawn naively that is every line twice.
  const once = buildPhaseDiagram({
    approaches: [approach('A1', 0), approach('A2', 180)],
    phases: [phase(6, 'A1', 'PED', 7)],
  });
  const twice = buildPhaseDiagram({
    approaches: [approach('A1', 0), approach('A2', 180)],
    phases: [phase(6, 'A1', 'PED', 7), phase(6, 'A2', 'PED', 7)],
  });
  assert.equal(crossings(twice).length, crossings(once).length);
  const badges = twice.ops.filter((op) => op.op === 'text' && op.text === 'P6');
  assert.equal(badges.length, 1, 'the same phase planted two badges');
});

/* ------------------------------------------------------- arrowheads */

test('an arrowhead is longer than it is wide', () => {
  // It was as broad as it was long, which reads as a blob on the end of a
  // line rather than as a direction.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')],
  });
  const head = diagram.ops.find((op) => op.role === 'arrowhead');
  assert.ok(head);
  const [tip, left, , right] = head.points;
  const length = Math.hypot(tip[0] - (left[0] + right[0]) / 2, tip[1] - (left[1] + right[1]) / 2);
  const width = Math.hypot(left[0] - right[0], left[1] - right[1]);
  assert.ok(length > width, `head is ${length.toFixed(1)} long and ${width.toFixed(1)} wide`);
});

test('an arrowhead is notched, so its back is swept not flat', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')],
  });
  const head = diagram.ops.find((op) => op.role === 'arrowhead');
  assert.equal(head.points.length, 4);
  const [tip, left, notch, right] = head.points;
  // Measured ALONG the arrow, not as straight-line distance to the tip: the
  // barbs are offset sideways, so a perfectly flat back is already nearer the
  // tip than they are and a distance test proves nothing.
  const back = [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
  const axis = [back[0] - tip[0], back[1] - tip[1]];
  const len = Math.hypot(...axis);
  const along = (p) => ((p[0] - tip[0]) * axis[0] + (p[1] - tip[1]) * axis[1]) / len;
  assert.ok(
    along(notch) < along(left) - 0.5,
    `the back is flat: notch at ${along(notch).toFixed(2)}, barbs at ${along(left).toFixed(2)}`,
  );
  assert.ok(along(notch) > 0, 'the notch is in front of the tip');
});

test('a heavy arrow does not grow barbs wider than the head is long', () => {
  // The barbs are sized from the shaft, so that a 5-wide arrow is not a line
  // with a bump on the end. Taken to the top of the weight slider that would
  // overtake the point and turn the head back into a blob.
  for (const arrowWidth of [2, 4.6, 8]) {
    const head = buildPhaseDiagram({
      approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')], options: { arrowWidth },
    }).ops.find((op) => op.role === 'arrowhead');
    const [tip, left, , right] = head.points;
    const length = Math.hypot(
      tip[0] - (left[0] + right[0]) / 2, tip[1] - (left[1] + right[1]) / 2,
    );
    const width = Math.hypot(left[0] - right[0], left[1] - right[1]);
    assert.ok(
      length > width,
      `at ${arrowWidth} wide the head is ${length.toFixed(1)} long and ${width.toFixed(1)} wide`,
    );
  }
  // ...and it does grow with the shaft, or the cap would be all there is.
  const headFor = (arrowWidth) => buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')], options: { arrowWidth },
  }).ops.find((op) => op.role === 'arrowhead').points;
  const spanOf = (pts) => Math.hypot(pts[1][0] - pts[3][0], pts[1][1] - pts[3][1]);
  assert.ok(spanOf(headFor(8)) > spanOf(headFor(2)));
});

test('nothing lands on the title or off the square, at any size the sliders allow', () => {
  // A leg pointing due north puts its phase number on the same spoke as the
  // title and the compass letter. The title cannot move, so the room has to
  // come from the band reserved for it -- at the top of the size slider as
  // much as at the bottom.
  for (const phaseNumberSize of [8, 16, 24]) {
    const diagram = buildPhaseDiagram({
      approaches: [approach('A1', 180, 'Main St'), approach('A2', 270, '1st Ave')],
      phases: [phase(2, 'A1', 'T'), phase(4, 'A2', 'T')],
      options: { phaseNumberSize, centerLabel: '1042' },
    });
    const title = diagram.ops.find((op) => op.role === 'title');
    // The title itself has to be on the square before anything can clear it.
    assert.ok(title.y - title.size > 0, `the title sits at ${title.y.toFixed(1)}, off the top`);
    for (const op of diagram.ops.filter((o) => o.op === 'text' && o.role !== 'title' && o.role !== 'titleSep')) {
      const half = textWidth(op.text, op.size, true) / 2;
      assert.ok(
        op.y - op.size >= title.y,
        `at ${phaseNumberSize} pt a "${op.text}" overlaps the title`,
      );
      assert.ok(
        op.x - half > 0 && op.x + half < DIAGRAM_SIZE && op.y < DIAGRAM_SIZE,
        `at ${phaseNumberSize} pt a "${op.text}" runs off the square at ${op.x.toFixed(1)}, ${op.y.toFixed(1)}`,
      );
    }
  }
});

test('the shaft stops short of the tip, so no cap spills past the barbs', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')],
  });
  const shaft = shafts(diagram)[0];
  const head = diagram.ops.find((op) => op.role === 'arrowhead');
  const [tip] = head.points;
  const gap = Math.hypot(tip[0] - shaft.x2, tip[1] - shaft.y2);
  assert.ok(gap > 1, 'the shaft ran all the way to the tip');
});

/* -------------------------------------------------- the ID in the middle */

test('the signal ID is drawn on a plate of its own', () => {
  // Over a scramble there are two diagonals through the middle of the box; a
  // bare number sitting on them cannot be read.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'PED', 7)],
    options: { centerLabel: '1042' },
  });
  const plate = diagram.ops.find((op) => op.role === 'idPlate');
  const label = diagram.ops.find((op) => op.op === 'text' && op.text === '1042');
  assert.ok(plate, 'no plate behind the ID');
  assert.ok(label, 'no ID drawn');
  assert.equal(Math.round(plate.cx), CENTER);
  // Both last, so nothing is drawn over them.
  assert.ok(diagram.ops.indexOf(plate) > diagram.ops.findIndex((op) => op.dash));
  assert.ok(diagram.ops.indexOf(label) > diagram.ops.indexOf(plate));
});

/** The op that carries the centre label, whatever it ended up reading. */
const centerLabel = (id, options = {}) => buildPhaseDiagram({
  approaches: [approach('A1', 0)], phases: [], options: { centerLabel: id, ...options },
}).ops.find((op) => op.role === 'centerLabel');

test('a long ID is set smaller rather than widening its plate', () => {
  const sizeOf = (id) => centerLabel(id).size;
  assert.ok(sizeOf('100042') < sizeOf('42'));
});

test('an ID too long for any readable size is cut, not overflowed', () => {
  const label = centerLabel('SIG-00412-A');
  assert.ok(label.text.length <= 10, `kept ${label.text.length} characters`);
  assert.ok(label.text.endsWith('\u2026'), 'cut without saying so');
  // ...and a short one is left exactly as it was.
  assert.equal(centerLabel('1042').text, '1042');
});

test('the ID is set to fit inside the crossing box, at any length', () => {
  // The crossings turn with the intersection while the label stays
  // horizontal, so the only region clear at every bearing is the circle
  // inscribed in the box. A label past it is drawn over the crossings.
  for (const id of ['7', '42', '1042', '100042', '12345678']) {
    const diagram = buildPhaseDiagram({
      approaches: [approach('A1', 0)],
      phases: [phase(2, 'A1', 'PED', 7)],
      options: { centerLabel: id },
    });
    const label = diagram.ops.find((op) => op.role === 'centerLabel');
    const crossing = crossings(diagram)[0];
    const box = boxOf(diagram);
    const reach = Math.hypot(
      (crossing.x1 + crossing.x2) / 2 - box.cx, (crossing.y1 + crossing.y2) / 2 - box.cy,
    );
    const corner = Math.hypot(
      textWidth(label.text, label.size, true) / 2, label.size * 0.72 / 2,
    );
    assert.ok(
      corner <= reach,
      `"${id}" set ${corner.toFixed(1)} wide in a box of ${reach.toFixed(1)}`,
    );
    assert.equal(diagram.notes.centerLabel.fits, true);
  }
});

test('a forced ID size is obeyed, and reported when it does not fit', () => {
  // The size is the caller's to set. What the page must not do is print an ID
  // across the crossings and say nothing about it.
  const big = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T', 1)],
    options: { centerLabel: '1042', centerLabelSize: 40 },
  });
  assert.equal(big.ops.find((op) => op.role === 'centerLabel').size, 40);
  assert.equal(big.notes.centerLabel.fits, false);
  const small = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T', 1)],
    options: { centerLabel: '1042', centerLabelSize: 9 },
  });
  assert.equal(small.notes.centerLabel.fits, true);
});

test('fitCenterLabel shrinks for length and stops at a readable floor', () => {
  const at = (label, radius = 24) => fitCenterLabel(label, { radius });
  assert.ok(at('7').size > at('1042').size);
  assert.ok(at('1042').size > at('10420000').size);
  assert.ok(at('10420000').size >= MIN_LABEL_SIZE, 'set below the readable floor');
  assert.equal(at('').size, 0);
  assert.equal(at('').text, '');
});

test('a forced size gets the same readable floor the automatic one does', () => {
  // The slider runs down to nothing, because nothing has to mean "fit it for
  // me". Without a floor the two steps either side of that sentinel set the
  // ID in one and two point type.
  const tiny = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [], options: { centerLabel: '1042', centerLabelSize: 1 },
  }).ops.find((op) => op.role === 'centerLabel');
  assert.equal(tiny.size, MIN_LABEL_SIZE);
});

/* ------------------------------------------------------- the ID plate */

test('a plate goes under the ID only when something crosses the middle', () => {
  // A scramble puts two diagonals straight through the box and a bare number
  // sitting on them cannot be read. Everywhere else the plate is a white hole
  // punched in the intersection for no reason.
  const scramble = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'PED', 7)],
    options: { centerLabel: '1042' },
  });
  const plain = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T', 1)],
    options: { centerLabel: '1042' },
  });
  assert.equal(withRole(scramble, 'idPlate').length, 1, 'no plate under a scramble');
  assert.equal(withRole(plain, 'idPlate').length, 0, 'a plate where nothing crosses');
});

test('the plate can be forced on or off', () => {
  const base = {
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T', 1)],
  };
  const always = buildPhaseDiagram({
    ...base, options: { centerLabel: '1042', centerPlate: 'always' },
  });
  const never = buildPhaseDiagram({
    ...base,
    phases: [phase(2, 'A1', 'PED', 7)],
    options: { centerLabel: '1042', centerPlate: 'never' },
  });
  assert.equal(withRole(always, 'idPlate').length, 1);
  assert.equal(withRole(never, 'idPlate').length, 0);
});

test('the plate never grows big enough to swallow the crossings', () => {
  for (const id of ['7', '1042', '100042', 'SIG-00412-A']) {
    const diagram = buildPhaseDiagram({
      approaches: [approach('A1', 0)],
      phases: [phase(2, 'A1', 'PED', 7)],
      options: { centerLabel: id },
    });
    const plate = withRole(diagram, 'idPlate')[0];
    const box = boxOf(diagram);
    assert.ok(plate.r < box.r, `"${id}" made a plate of ${plate.r.toFixed(1)} in a box of ${box.r.toFixed(1)}`);
  }
});

test('no centre label leaves no plate', () => {
  const diagram = buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [] });
  assert.equal(withRole(diagram, 'idPlate').length, 0);
  assert.equal(withRole(diagram, 'centerLabel').length, 0);
});

/* ----------------------------------------------------- the asphalt */

test('a corner of asphalt leaves each leg on the leg, not beside it', () => {
  // Tangent to both legs is the whole trick: an arc at a fixed radius about
  // the middle cannot meet a straight leg smoothly, so four of them close
  // into a grey annulus and the intersection reads as a roundabout.
  const diagram = buildPhaseDiagram({
    approaches: [0, 90, 180, 270].map((b, i) => approach(`A${i}`, b)),
    phases: [],
  });
  const corners = withRole(diagram, 'curb');
  assert.equal(corners.length, 4);
  const box = boxOf(diagram);
  const legAngles = [0, 90, 180, 270].map((b) => legAngle(b));
  for (const corner of corners) {
    for (const [x, y] of [corner.points[0], corner.points[corner.points.length - 1]]) {
      const angle = Math.atan2(y - box.cy, x - box.cx);
      const onALeg = legAngles.some(
        (a) => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.02,
      );
      assert.ok(onALeg, `a corner ended at ${angle.toFixed(2)} rad, off every leg`);
    }
  }
});

test('every corner of asphalt stays between the kerb line and the ring', () => {
  // Several layouts, because the thing that goes wrong here goes wrong on one
  // corner at a time. The 225/315 pair matters most: its corner is bisected
  // by due east, which puts the two ends of the arc either side of atan2's
  // branch cut -- and an arc measured across that cut sweeps the long way,
  // out past the ring, instead of rounding the corner.
  for (const bearings of [[0, 90, 180, 270], [225, 315], [28, 118, 208, 298], [10, 100, 190]]) {
    const diagram = buildPhaseDiagram({
      approaches: bearings.map((b, i) => approach(`A${i}`, b)), phases: [],
    });
    checkCorners(diagram, bearings.join('/'));
  }
});

/** Every corner's arc, bounded by the kerb line it must clear and the ring. */
function checkCorners(diagram, label) {
  const box = boxOf(diagram);
  const ring = diagram.ops.find((op) => op.role === 'ring');
  assert.ok(withRole(diagram, 'curb').length > 0, `${label} drew no corners at all`);
  // Per corner, not across all of them: three right corners and one swinging
  // out past the ring averages out to a diagram that looks fine in a test and
  // wrong on the page.
  for (const corner of withRole(diagram, 'curb')) {
    const radii = corner.points.map(([x, y]) => Math.hypot(x - box.cx, y - box.cy));
    // Inner EDGE, not centreline: a stroke this wide bows over the kerb long
    // before its middle does.
    assert.ok(
      Math.min(...radii) - corner.width / 2 >= box.r,
      `${label}: a corner reached ${(Math.min(...radii) - corner.width / 2).toFixed(1)} into a box of ${box.r.toFixed(1)}`,
    );
    assert.ok(
      Math.max(...radii) <= ring.r + 0.01,
      `${label}: a corner swung out to ${Math.max(...radii).toFixed(1)}, past a ring of ${ring.r.toFixed(1)}`,
    );
  }
}

test('a T intersection gets no asphalt where its fourth leg would be', () => {
  const tee = buildPhaseDiagram({
    approaches: [approach('A1', 10), approach('A2', 100), approach('A3', 190)], phases: [],
  });
  assert.equal(withRole(tee, 'curb').length, 2, 'a corner was drawn across the missing leg');
});

test('one leg has no corners to round', () => {
  const lone = buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [] });
  assert.equal(withRole(lone, 'curb').length, 0);
});

test('turning the corners or the lane lines off removes exactly those', () => {
  const base = {
    approaches: [0, 90, 180, 270].map((b, i) => approach(`A${i}`, b)), phases: [],
  };
  const all = buildPhaseDiagram(base);
  const noCurbs = buildPhaseDiagram({ ...base, options: { showCurbReturns: false } });
  const noLanes = buildPhaseDiagram({ ...base, options: { showLaneLines: false } });
  assert.equal(withRole(noCurbs, 'curb').length, 0);
  // The lane line that runs round each corner goes with the corner.
  assert.ok(withRole(noCurbs, 'lane').length < withRole(all, 'lane').length);
  assert.equal(withRole(noLanes, 'lane').length, 0);
  assert.equal(withRole(noLanes, 'curb').length, withRole(all, 'curb').length);
});

/* --------------------------------------------------- the compass */

test('a compass letter and a phase number never land on each other', () => {
  // A leg pointing due north puts its numbers on the same spoke as the N.
  // They are told apart by how far out each sits, and nothing else.
  const layouts = [
    // A left and a through on every leg: the pair straddles the letter.
    [0, 90, 180, 270].flatMap((b, i) => [
      phase(2 * i + 2, `A${i}`, 'T'), phase(2 * i + 1, `A${i}`, 'L'),
    ]),
    // One shared left-and-through per leg. This is the case with nothing to
    // save it: a lone movement in the middle lane is neither staggered along
    // the leg nor offset across it, so it sits on the letter's own spoke and
    // the gap between the two radii is all there is.
    [0, 90, 180, 270].map((b, i) => phase(i + 1, `A${i}`, 'LT')),
  ];
  for (const phases of layouts) {
    const diagram = buildPhaseDiagram({
      approaches: [0, 90, 180, 270].map((b, i) => approach(`A${i}`, b)), phases,
    });
    for (const letter of withRole(diagram, 'compass')) {
      for (const number of withRole(diagram, 'phaseNumber')) {
        const apart = Math.hypot(letter.x - number.x, letter.y - number.y);
        const touching = (letter.size + number.size) * 0.45;
        assert.ok(
          apart > touching,
          `"${letter.text}" and phase ${number.text} are ${apart.toFixed(1)} apart`,
        );
      }
    }
  }
});

test('the compass puts a letter on each cardinal, turned by nothing', () => {
  const diagram = buildPhaseDiagram({ approaches: [approach('A1', 37)], phases: [] });
  const letters = withRole(diagram, 'compass');
  assert.deepEqual(letters.map((op) => op.text), ['N', 'E', 'S', 'W']);
  const box = boxOf(diagram);
  // North is north whatever the intersection is doing.
  const north = letters[0];
  assert.ok(Math.abs(north.x - box.cx) < 0.01);
  assert.ok(north.y < box.cy);
});

test('the north arrow is a different compass, not an extra one', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [], options: { compass: 'arrow' },
  });
  assert.equal(withRole(diagram, 'compass').length, 0);
  assert.equal(withRole(diagram, 'ring').length, 0);
  assert.equal(withRole(diagram, 'north').length, 2);
});

/* ----------------------------------------------------- street names */

test('the title colours each street by the phase that runs through it', () => {
  const diagram = buildPhaseDiagram({
    // Phase 1 is the lower number and phase 6 is the through, so a rule that
    // simply took the lowest phase on the street would pick the left turn.
    approaches: [approach('A1', 0, 'Main St'), approach('A2', 90, '1st Ave')],
    phases: [phase(1, 'A1', 'L'), phase(6, 'A1', 'T'), phase(4, 'A2', 'T')],
  });
  const title = withRole(diagram, 'title');
  assert.deepEqual(title.map((op) => op.text), ['Main St', '1st Ave']);
  assert.equal(
    title[0].fill, PALETTES.signal.phase(6),
    'Main Street took the colour of the left that turns off it',
  );
  assert.equal(title[1].fill, PALETTES.signal.phase(4));
});

test('a title takes its room from the intersection, not from the margin', () => {
  const titled = buildPhaseDiagram({
    approaches: [approach('A1', 0, 'Main St')], phases: [],
  });
  const bare = buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [] });
  assert.ok(boxOf(titled).cy > boxOf(bare).cy, 'the title did not push the diagram down');
  assert.ok(boxOf(titled).r < boxOf(bare).r, 'the title did not take any room');
});

test('a title too wide for the square is cut, not run off the edge', () => {
  const diagram = buildPhaseDiagram({
    approaches: [
      approach('A1', 0, 'Avenue of the Pacific Northwest Expressway'),
      approach('A2', 90, 'Dr Martin Luther King Junior Memorial Boulevard'),
    ],
    phases: [],
  });
  const title = [...withRole(diagram, 'title'), ...withRole(diagram, 'titleSep')]
    .sort((a, b) => a.x - b.x);
  const last = title[title.length - 1];
  const right = last.x + textWidth(last.text, last.size, true);
  assert.ok(title[0].x > 0, `the title starts at ${title[0].x.toFixed(1)}`);
  assert.ok(right < DIAGRAM_SIZE, `the title runs to ${right.toFixed(1)} on a ${DIAGRAM_SIZE} square`);
  assert.ok(title.some((op) => op.text.includes('\u2026')), 'nothing was cut');
});

test('street names can run along the legs instead, or not at all', () => {
  const base = { approaches: [approach('A1', 0, 'Main St')], phases: [] };
  const onLegs = buildPhaseDiagram({ ...base, options: { streetNames: 'legs' } });
  const off = buildPhaseDiagram({ ...base, options: { showStreetNames: false } });
  assert.equal(withRole(onLegs, 'title').length, 0);
  assert.equal(withRole(onLegs, 'legName').length, 1);
  assert.ok(onLegs.ops.find((op) => op.role === 'legName').rotate !== undefined);
  assert.equal(withRole(off, 'title').length + withRole(off, 'legName').length, 0);
});

/* ------------------------------------------------- phase numbers */

test('each vehicle phase gets one number, in its own colour, outside the ring', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0), approach('A2', 90)],
    phases: [phase(2, 'A1', 'T'), phase(5, 'A1', 'L'), phase(4, 'A2', 'T')],
  });
  const numbers = withRole(diagram, 'phaseNumber');
  assert.deepEqual(numbers.map((op) => op.text).sort(), ['2', '4', '5']);
  assert.equal(numbers.find((op) => op.text === '5').fill, PALETTES.signal.phase(5));
  const ring = diagram.ops.find((op) => op.role === 'ring');
  for (const op of numbers) {
    assert.ok(
      Math.hypot(op.x - ring.cx, op.y - ring.cy) > ring.r,
      `phase ${op.text} was drawn inside the ring`,
    );
  }
});

test('numbers on one approach never run into each other', () => {
  // At lane spacing they touch, and a touching 1 and 6 reads as 16. Two
  // digits is the case that bites: "12" is wider than the lane the arrow
  // under it is drawn in.
  for (const phases of [
    [phase(1, 'A1', 'L'), phase(6, 'A1', 'T')],
    [phase(5, 'A1', 'LPP'), phase(12, 'A1', 'U')],
    [phase(2, 'A1', 'T'), phase(11, 'A1', 'L'), phase(16, 'A1', 'R')],
  ]) {
    const numbers = withRole(buildPhaseDiagram({
      approaches: [approach('A1', 0)], phases,
    }), 'phaseNumber');
    for (let i = 0; i < numbers.length; i += 1) {
      for (let j = i + 1; j < numbers.length; j += 1) {
        const [a, b] = [numbers[i], numbers[j]];
        const apart = Math.hypot(a.x - b.x, a.y - b.y);
        const touching = (textWidth(a.text, a.size, true) + textWidth(b.text, b.size, true)) / 2;
        assert.ok(
          apart > touching,
          `"${a.text}" and "${b.text}" are ${apart.toFixed(1)} apart and ${touching.toFixed(1)} wide`,
        );
      }
    }
  }
});

/* ---------------------------------------------------- preempts */

const preempt = (channel, type, approachIds) => ({ channel, type, approachIds });

test('a preempt type is read loosely, because agencies write it loosely', () => {
  assert.equal(preemptKind('RAIL').key, 'rail');
  assert.equal(preemptKind('Railroad crossing').key, 'rail');
  assert.equal(preemptKind('EVP').key, 'fire');
  assert.equal(preemptKind('Fire Station 3').key, 'fire');
  assert.equal(preemptKind('Bus TSP').key, 'transit');
  // Anything else is still a channel, still drawn, still labelled.
  assert.equal(preemptKind('').key, 'other');
  assert.equal(preemptKind(undefined).key, 'other');
  assert.ok(preemptKind('whatever').color);
});

test('a preempt channel is a badge and an arrow, in its own colour', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T')],
    preempts: [preempt(3, 'RAIL', ['A1'])],
  });
  const badge = withRole(diagram, 'preemptBadge');
  const label = withRole(diagram, 'preemptLabel');
  assert.equal(badge.length, 1);
  assert.equal(label[0].text, '3');
  assert.equal(badge[0].stroke, preemptKind('RAIL').color);
  const arrow = withRole(diagram, 'preemptArrow');
  assert.equal(arrow.length, 1);
  assert.ok(arrow[0].dash, 'a preempt was drawn as a solid movement');
});

test('a preempt is drawn clear of every movement on its approach', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(1, 'A1', 'L'), phase(2, 'A1', 'T'), phase(12, 'A1', 'R')],
    preempts: [preempt(1, 'EVP', ['A1'])],
  });
  const casing = diagram.ops.find((op) => op.role === 'casing');
  const badge = withRole(diagram, 'preemptBadge')[0];
  const ax = casing.x2 - casing.x1;
  const ay = casing.y2 - casing.y1;
  const across = Math.abs(
    ((badge.cx - casing.x1) * ay - (badge.cy - casing.y1) * ax) / Math.hypot(ax, ay),
  );
  assert.ok(
    across > casing.width / 2 + badge.r * 0.5,
    `the badge sits ${across.toFixed(1)} across a road ${casing.width.toFixed(1)} wide`,
  );
});

test('two channels on one approach do not stack on top of each other', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T')],
    preempts: [preempt(1, 'RAIL', ['A1']), preempt(2, 'EVP', ['A1'])],
  });
  const [a, b] = withRole(diagram, 'preemptBadge');
  assert.ok(Math.hypot(a.cx - b.cx, a.cy - b.cy) > a.r * 2);
});

test('a channel with no approach to sit on is counted, not invented', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T')],
    preempts: [preempt(4, 'RAIL', ['NOPE'])],
  });
  assert.equal(withRole(diagram, 'preemptBadge').length, 0);
  assert.equal(diagram.notes.unplacedPreempts, 1);
});

test('preempts can be turned off without touching the movements', () => {
  const base = {
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T')],
    preempts: [preempt(1, 'RAIL', ['A1'])],
  };
  const on = buildPhaseDiagram(base);
  const off = buildPhaseDiagram({ ...base, options: { showPreempts: false } });
  assert.equal(withRole(off, 'preemptBadge').length, 0);
  assert.equal(shafts(off).length, shafts(on).length);
});
