import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHEET,
  PAPER_SIZES,
  PT_PER_INCH,
  paginate,
  paperPoints,
  planGrid,
  smallestTextPt,
} from '../src/utils/phaseSheet.js';
import { drawDiagram, drawSheet, rgb, sheetAdvice } from '../src/utils/phaseDiagramPdf.js';
import { DIAGRAM_SIZE, buildPhaseDiagram } from '../src/utils/phaseDiagram.js';

const sheet = (over = {}) => ({ ...DEFAULT_SHEET, ...over });

/* ------------------------------------------------------------- paper */

test('a thirty inch square is 2160 points each way', () => {
  const page = paperPoints('square30');
  assert.equal(page.width, 30 * PT_PER_INCH);
  assert.equal(page.height, 30 * PT_PER_INCH);
});

test('landscape swaps the long side, and a square is unchanged', () => {
  const portrait = paperPoints('letter', 'portrait');
  const landscape = paperPoints('letter', 'landscape');
  assert.ok(landscape.width > landscape.height);
  assert.equal(landscape.width, portrait.height);
  // A square sheet has no orientation to speak of; it must not come out
  // different depending on which way it was asked for.
  assert.deepEqual(paperPoints('square30', 'landscape'), paperPoints('square30', 'portrait'));
});

test('an unknown paper falls back rather than producing a zero-size page', () => {
  const page = paperPoints('not-a-paper');
  assert.ok(page.width > 0 && page.height > 0);
});

/* -------------------------------------------------------------- grid */

test('a 10 by 10 grid holds a hundred diagrams on one page', () => {
  const grid = planGrid(sheet({ columns: 10, rows: 10 }));
  assert.equal(grid.perPage, 100);
  assert.equal(grid.cells.length, 100);
});

test('the grid is clamped to what the tool offers', () => {
  assert.equal(planGrid(sheet({ columns: 99, rows: 99 })).perPage, 100);
  assert.equal(planGrid(sheet({ columns: 0, rows: 0 })).perPage, 1);
});

test('no cell overlaps its neighbour', () => {
  const grid = planGrid(sheet({ columns: 4, rows: 4 }));
  const overlaps = (a, b) => (
    a.cellX < b.cellX + b.cellWidth && b.cellX < a.cellX + a.cellWidth
    && a.cellY < b.cellY + b.cellHeight && b.cellY < a.cellY + a.cellHeight
  );
  for (let i = 0; i < grid.cells.length; i += 1) {
    for (let j = i + 1; j < grid.cells.length; j += 1) {
      assert.ok(!overlaps(grid.cells[i], grid.cells[j]), `cells ${i} and ${j} overlap`);
    }
  }
});

test('every cell stays inside the margins', () => {
  const grid = planGrid(sheet({ columns: 3, rows: 5, marginInches: 1.5 }));
  for (const cell of grid.cells) {
    assert.ok(cell.cellX >= grid.margin - 0.001, 'a cell ran off the left margin');
    assert.ok(cell.cellY >= grid.margin - 0.001, 'a cell ran above the top margin');
    assert.ok(
      cell.cellX + cell.cellWidth <= grid.page.width - grid.margin + 0.001,
      'a cell ran off the right margin',
    );
    assert.ok(
      cell.cellY + cell.cellHeight <= grid.page.height - grid.margin + 0.001,
      'a cell ran off the bottom margin',
    );
  }
});

test('the diagram stays square and leaves room for its caption', () => {
  const grid = planGrid(sheet({ columns: 3, rows: 7, captionPt: 30 }));
  assert.ok(grid.diagramSize <= grid.cellWidth + 0.001);
  assert.ok(grid.diagramSize <= grid.cellHeight - grid.caption + 0.001);
  for (const cell of grid.cells) {
    assert.ok(cell.y + cell.size <= cell.captionY + 0.001, 'the diagram ran into its caption');
  }
});

test('a title takes its strip off the top before the grid is divided', () => {
  const plain = planGrid(sheet({ columns: 2, rows: 2 }));
  const titled = planGrid(sheet({ columns: 2, rows: 2, title: 'Corridor' }));
  assert.ok(titled.cellHeight < plain.cellHeight);
  assert.ok(titled.cells[0].cellY > plain.cells[0].cellY);
});

test('a 10 by 10 on thirty inches gives each diagram about two and a half inches', () => {
  const grid = planGrid(sheet({ columns: 10, rows: 10 }));
  const inches = grid.diagramSize / PT_PER_INCH;
  assert.ok(inches > 2 && inches < 3, `got ${inches.toFixed(2)} in`);
});

/* -------------------------------------------------------- pagination */

test('more diagrams than cells spill onto another page', () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  const { pages } = paginate(items, sheet({ columns: 2, rows: 2 }));
  assert.equal(pages.length, 3);
  assert.equal(pages[0].length, 4);
  // The last page is short, not padded: a row of empty boxes reads as data
  // that went missing.
  assert.equal(pages[2].length, 2);
});

test('every diagram is placed exactly once', () => {
  const items = Array.from({ length: 37 }, (_, i) => i);
  const { pages } = paginate(items, sheet({ columns: 3, rows: 3 }));
  const placed = pages.flat().map((entry) => entry.item);
  assert.deepEqual(placed, items);
});

test('nothing to draw makes no pages', () => {
  assert.deepEqual(paginate([], sheet()).pages, []);
  assert.deepEqual(paginate(null, sheet()).pages, []);
});

test('text size is reported so a plot that cannot be read says so first', () => {
  const big = sheetAdvice(sheet({ columns: 2, rows: 2 }), 4);
  const dense = sheetAdvice(sheet({ paper: 'letter', columns: 10, rows: 10 }), 100);
  assert.ok(!big.tooSmall);
  assert.ok(dense.tooSmall, 'a hundred diagrams on a letter page should warn');
  assert.ok(dense.smallestTextPt < big.smallestTextPt);
});

test('smallest text scales with the cell', () => {
  assert.equal(smallestTextPt(300, 8, 300), 8);
  assert.equal(smallestTextPt(150, 8, 300), 4);
  assert.equal(smallestTextPt(0), 0);
});

/* ----------------------------------------------------------- the pdf */

/** A jsPDF stand-in that records what it was asked to draw. */
function recorder() {
  const calls = [];
  let dash = [];
  // Draw calls carry the dash pattern that was in force when they ran, which
  // is the only way to see a pattern leaking from one line onto the next.
  const log = (name) => (...args) => { calls.push({ name, args, dash: [...dash] }); };
  return {
    calls,
    find: (name) => calls.filter((c) => c.name === name),
    setDrawColor: log('setDrawColor'),
    setFillColor: log('setFillColor'),
    setTextColor: log('setTextColor'),
    setLineWidth: log('setLineWidth'),
    setLineCap: log('setLineCap'),
    setLineDashPattern: (pattern, phase) => { dash = [...(pattern || [])]; calls.push({ name: 'setLineDashPattern', args: [pattern, phase], dash: [...dash] }); },
    setFontSize: log('setFontSize'),
    setFont: log('setFont'),
    line: log('line'),
    circle: log('circle'),
    lines: log('lines'),
    rect: log('rect'),
    text: log('text'),
    addPage: log('addPage'),
  };
}

const sampleDiagram = () => buildPhaseDiagram({
  approaches: [
    { approachId: 'A1', compassBearing: 0, streetName: 'Main St' },
    { approachId: 'A2', compassBearing: 90, streetName: '1st Ave' },
  ],
  phases: [
    { phase: 2, approachId: 'A1', movementType: 'T', pedX: 1 },
    { phase: 1, approachId: 'A1', movementType: 'L' },
    { phase: 4, approachId: 'A2', movementType: 'TR' },
  ],
});

test('hex colours convert, including the short form', () => {
  assert.deepEqual(rgb('#ff8000'), [255, 128, 0]);
  assert.deepEqual(rgb('#fff'), [255, 255, 255]);
  assert.deepEqual(rgb(undefined), [0, 0, 0]);
});

test('the diagram scales into the square it is given', () => {
  const doc = recorder();
  drawDiagram(doc, sampleDiagram(), { x: 100, y: 200, size: DIAGRAM_SIZE });
  // At 1:1 the centre circle lands at the offset plus the canvas centre.
  const centre = doc.find('circle').find((c) => Math.round(c.args[2]) === 42);
  assert.ok(centre, 'the intersection box was not drawn');
  assert.equal(Math.round(centre.args[0]), 100 + DIAGRAM_SIZE / 2);
  assert.equal(Math.round(centre.args[1]), 200 + DIAGRAM_SIZE / 2);
});

test('halving the square halves every coordinate', () => {
  const full = recorder();
  const half = recorder();
  drawDiagram(full, sampleDiagram(), { x: 0, y: 0, size: DIAGRAM_SIZE });
  drawDiagram(half, sampleDiagram(), { x: 0, y: 0, size: DIAGRAM_SIZE / 2 });
  const firstLine = (doc) => doc.find('line')[0].args;
  const a = firstLine(full);
  const b = firstLine(half);
  assert.ok(Math.abs(a[0] / 2 - b[0]) < 0.001);
  assert.ok(Math.abs(a[1] / 2 - b[1]) < 0.001);
});

test('arrowheads are drawn as closed filled paths', () => {
  const doc = recorder();
  drawDiagram(doc, sampleDiagram(), { size: 300 });
  // Four points, so they go through `lines` with a closed fill rather than
  // jsPDF's three-point triangle.
  const filled = doc.find('lines').filter((c) => c.args[4] === 'F' && c.args[5] === true);
  assert.ok(filled.length >= 3, `expected one head per vehicle phase, got ${filled.length}`);
});

test('a dash pattern cannot leak from a crosswalk onto the next line', () => {
  // The crosswalks are dashed and the arrows are not. If the pattern is left
  // set, every arrow after the first crosswalk comes out dashed too -- which
  // on a plot reads as a protected-permissive movement that is not there.
  const doc = recorder();
  drawDiagram(doc, sampleDiagram(), { size: 300 });

  const dashedLines = doc.find('line').filter((c) => c.dash.length > 0);
  assert.ok(dashedLines.length > 0, 'no crosswalk was drawn, so nothing was proved');

  // Every arrow shaft is solid in the source, so every one must be solid here.
  const solidOps = doc.calls.filter((c) => c.name === 'lines' && c.dash.length > 0);
  assert.equal(solidOps.length, 0, 'an arrow was drawn while a dash pattern was still set');

  const arrowShafts = doc.find('line').filter((c) => c.dash.length === 0);
  assert.ok(arrowShafts.length > 0, 'every line came out dashed');
});

test('rotated text is flipped, because the two libraries wind opposite ways', () => {
  // A skewed approach, so the label genuinely rotates -- a cardinal one
  // normalises to zero and would prove nothing.
  const diagram = buildPhaseDiagram({
    approaches: [{ approachId: 'A1', compassBearing: 35, streetName: 'Main St' }],
    phases: [],
  });
  const source = diagram.ops.find((op) => op.op === 'text' && op.text === 'Main St');
  assert.ok(source && source.rotate, 'the street name was not rotated in the draw list');

  const doc = recorder();
  drawDiagram(doc, diagram, { size: 300 });
  const drawn = doc.find('text').find((c) => c.args[0] === 'Main St');
  assert.ok(drawn, 'the street name was not drawn');
  // SVG rotates clockwise, jsPDF counter-clockwise: same angle, opposite sign.
  assert.equal(drawn.args[3].angle, -source.rotate);
});

test('text that is not rotated is drawn without an angle at all', () => {
  const doc = recorder();
  drawDiagram(doc, buildPhaseDiagram({
    approaches: [{ approachId: 'A1', compassBearing: 0 }],
    phases: [{ phase: 2, approachId: 'A1', movementType: 'T' }],
  }), { size: 300 });
  const label = doc.find('text').find((c) => c.args[0] === '2');
  assert.ok(label);
  assert.equal(label.args[3].angle, undefined);
});

test('a line never comes out thinner than a plotter can print', () => {
  const doc = recorder();
  drawDiagram(doc, sampleDiagram(), { size: 20 });
  for (const call of doc.find('setLineWidth')) {
    assert.ok(call.args[0] >= 0.25, `line width ${call.args[0]} would drop out`);
  }
});

test('a sheet draws every diagram and starts a new page only between pages', () => {
  const doc = recorder();
  const items = Array.from({ length: 5 }, (_, i) => ({
    diagram: sampleDiagram(), caption: `Signal ${i + 1}`,
  }));
  const { pageCount } = drawSheet(doc, items, sheet({ columns: 2, rows: 2 }));
  assert.equal(pageCount, 2);
  // Two pages means exactly one addPage: the first page already exists.
  assert.equal(doc.find('addPage').length, 1);
  const captions = doc.find('text').filter((c) => String(c.args[0]).startsWith('Signal '));
  assert.equal(captions.length, 5);
});

test('the footer counts pages only when there is more than one', () => {
  const one = recorder();
  drawSheet(one, [{ diagram: sampleDiagram(), caption: 'A' }], sheet({ footer: 'TSK' }));
  assert.ok(one.find('text').some((c) => c.args[0] === 'TSK'));

  const many = recorder();
  drawSheet(many, Array.from({ length: 5 }, () => ({ diagram: sampleDiagram(), caption: 'A' })),
    sheet({ columns: 2, rows: 2, footer: 'TSK' }));
  assert.ok(many.find('text').some((c) => String(c.args[0]).includes('page 2 of 2')));
});

test('every paper size is a real rectangle', () => {
  for (const [key, paper] of Object.entries(PAPER_SIZES)) {
    assert.ok(paper.width > 0 && paper.height > 0, `${key} has no size`);
    assert.ok(paper.name, `${key} has no label`);
  }
});

test('a polygon drawn straight after a dashed line is still solid', () => {
  // `poly` carries no dash of its own, so if dash state is handled per-branch
  // it inherits whatever ran before it. Today's op order happens to put an
  // arrow shaft in between, which hides the problem; this feeds the two ops
  // back to back so ordering cannot do the hiding.
  const doc = recorder();
  drawDiagram(doc, {
    size: 300,
    ops: [
      { op: 'line', x1: 0, y1: 0, x2: 10, y2: 10, stroke: '#000', width: 2, dash: [4, 3] },
      { op: 'poly', points: [[0, 0], [5, 5], [10, 0]], fill: '#000', close: true },
    ],
  }, { size: 300 });
  const head = doc.find('lines')[0];
  assert.ok(head, 'the arrowhead was not drawn');
  assert.deepEqual(head.dash, [], 'the arrowhead inherited the crosswalk dash');
});
