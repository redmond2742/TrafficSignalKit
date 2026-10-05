import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGRAM_SIZE,
  PALETTES,
  buildPhaseDiagram,
  diagramLegend,
  laneOffset,
  legAngle,
  movementKind,
} from '../src/utils/phaseDiagram.js';
import { diagramToSvg, escapeXml } from '../src/utils/phaseDiagramSvg.js';

const CENTER = DIAGRAM_SIZE / 2;
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
  const lines = twoLefts.ops.filter((op) => op.op === 'line' && op.width === 3);
  const starts = new Set(lines.map((op) => `${Math.round(op.x1)},${Math.round(op.y1)}`));
  assert.equal(starts.size, lines.length, 'two lefts were drawn from the same point');
});

test('a pedestrian phase draws a crossing and no arrow', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'PED', 1)],
  });
  const dashed = diagram.ops.filter((op) => op.op === 'line' && op.dash);
  assert.ok(dashed.length >= 1, 'no crosswalk was drawn');
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
  const diagonals = diagram.ops.filter(
    (op) => op.op === 'line' && op.dash && op.x1 !== op.x2 && op.y1 !== op.y2,
  );
  assert.equal(diagonals.length, 2);
});

test('crosswalks are drawn under the arrows, not over them', () => {
  // A dashed line crossing an arrowhead reads as a broken arrow.
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)],
    phases: [phase(2, 'A1', 'T', 1)],
  });
  const firstDash = diagram.ops.findIndex((op) => op.op === 'line' && op.dash);
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
      showCompass: false, showStreetNames: false, showPhaseNumbers: false, showCrosswalks: false,
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

test('left-hand traffic mirrors the lanes', () => {
  const rht = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(1, 'A1', 'L')],
  });
  const lht = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(1, 'A1', 'L')], options: { isLht: true },
  });
  const shaft = (d) => d.ops.find((op) => op.op === 'line' && op.width === 3);
  assert.notEqual(shaft(rht).x1, shaft(lht).x1);
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
  const shafts = diagram.ops.filter((op) => op.op === 'line' && op.width === 3);
  assert.ok(shafts.length >= 3);
  for (const shaft of shafts) {
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
  const dash = diagram.ops.find((op) => op.op === 'line' && op.dash);
  const midX = (dash.x1 + dash.x2) / 2;
  const midY = (dash.y1 + dash.y2) / 2;
  const fromCentre = Math.hypot(midX - CENTER, midY - CENTER);
  assert.ok(fromCentre > 25, `the crossing runs through the box (midpoint ${fromCentre.toFixed(1)} out)`);
});

test('ped mode 1 and ped mode 3 land on opposite sides', () => {
  // Mode 1 is the crossing on the assigned approach and mode 3 is the one
  // opposite. If they coincide, one of the two modes does nothing.
  const offsetOf = (mode) => {
    const d = buildPhaseDiagram({
      approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T', mode)],
    });
    const dash = d.ops.find((op) => op.op === 'line' && op.dash);
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
  assert.equal(diagram.ops.filter((op) => op.op === 'line' && op.dash).length, 2);
});

/* ------------------------------------------------ the crossing box */

/** Every dashed crossing in a diagram, as endpoint pairs. */
const crossings = (diagram) =>
  diagram.ops.filter((op) => op.op === 'line' && op.dash && op.width === 2);

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

test('the shaft stops short of the tip, so no cap spills past the barbs', () => {
  const diagram = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [phase(2, 'A1', 'T')],
  });
  const shaft = diagram.ops.find((op) => op.op === 'line' && op.width === 3);
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

test('the plate grows with a longer ID', () => {
  const widthFor = (id) => buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [], options: { centerLabel: id },
  }).ops.find((op) => op.role === 'idPlate').r;
  assert.ok(widthFor('100042') > widthFor('7'));
});

test('no centre label leaves no plate', () => {
  const diagram = buildPhaseDiagram({ approaches: [approach('A1', 0)], phases: [] });
  assert.equal(diagram.ops.filter((op) => op.role === 'idPlate').length, 0);
});

test('the plate never grows big enough to swallow the diagonals', () => {
  // Half of a scramble diagonal is about 42 units. A plate past half that
  // leaves two stubs where a crossing should be.
  for (const id of ['7', '1042', '100042', 'SIG-00412-A']) {
    const plate = buildPhaseDiagram({
      approaches: [approach('A1', 0)], phases: [], options: { centerLabel: id },
    }).ops.find((op) => op.role === 'idPlate');
    assert.ok(plate.r <= 21.01, `"${id}" made a plate of ${plate.r.toFixed(1)}`);
  }
});

/** The label op that sits on the ID plate, whatever it ended up reading. */
const plateLabel = (id) => {
  const ops = buildPhaseDiagram({
    approaches: [approach('A1', 0)], phases: [], options: { centerLabel: id },
  }).ops;
  const plate = ops.findIndex((op) => op.role === 'idPlate');
  return ops[plate + 1];
};

test('a long ID is set smaller rather than widening its plate', () => {
  assert.ok(plateLabel('100042').size < plateLabel('42').size);
});

test('an ID too long for any readable size is cut, not overflowed', () => {
  const label = plateLabel('SIG-00412-A');
  assert.ok(label.text.length <= 8, `kept ${label.text.length} characters`);
  assert.ok(label.text.endsWith('\u2026'), 'cut without saying so');
  // ...and a short one is left exactly as it was.
  assert.equal(plateLabel('1042').text, '1042');
});
