/**
 * Draw list -> PDF. The print half of the pair with `phaseDiagramSvg.js`.
 *
 * Vector, not a screenshot. A 10x10 grid of rasterised diagrams on a 30-inch
 * sheet is either a blurry plot or a 200MB file; the same grid as vector lines
 * is a few hundred kilobytes and stays sharp at whatever size the plotter is
 * set to. It also means the text in the PDF is real text, so a reader can
 * search the sheet for a signal number.
 *
 * The jsPDF document is injected rather than imported. That keeps this module
 * loadable under `node --test` without pulling a PDF engine into the test run,
 * and lets the tests hand it a recorder and assert on what was drawn.
 *
 * Framework free.
 */

import { DIAGRAM_SIZE } from './phaseDiagram.js';
import { paginate, smallestTextPt } from './phaseSheet.js';

/** '#rrggbb' -> [r, g, b]. jsPDF takes hex too, but not every op has a hex. */
export function rgb(hex) {
  const value = String(hex || '#000000').replace('#', '');
  const full = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

/**
 * Draw one diagram into `doc`, fitted to a square at (x, y) of side `size`.
 *
 * Line widths and font sizes are authored on the 300-unit canvas and scale
 * with it, so a cell on a 10x10 sheet gets proportionally finer lines rather
 * than the same 3pt stroke that would swallow a three-inch diagram.
 */
export function drawDiagram(doc, diagram, { x = 0, y = 0, size = 216 } = {}) {
  const canvas = diagram.size || DIAGRAM_SIZE;
  const k = size / canvas;
  const px = (v) => x + v * k;
  const py = (v) => y + v * k;
  // Hairlines still have to be visible on a plotter; below about a quarter
  // point a line can drop out entirely on some RIPs.
  const pw = (v) => Math.max(0.25, (v || 1) * k);

  let opacity = 1;
  const setOpacity = (next) => {
    const wanted = next == null ? 1 : next;
    if (wanted === opacity || typeof doc.setGState !== 'function') return;
    opacity = wanted;
    doc.setGState(new doc.GState({ opacity: wanted, 'stroke-opacity': wanted }));
  };

  const setDash = (dash) => {
    if (typeof doc.setLineDashPattern !== 'function') return;
    doc.setLineDashPattern(dash ? dash.map((d) => d * k) : [], 0);
  };

  for (const op of diagram.ops) {
    // Every op states its own dash, so none of them inherits one. Doing this
    // per-branch instead left `poly` -- which has no dash of its own -- at the
    // mercy of whatever was drawn before it.
    setOpacity(op.opacity);
    setDash(op.dash);

    if (op.op === 'line') {
      doc.setDrawColor(...rgb(op.stroke));
      doc.setLineWidth(pw(op.width));
      doc.setLineCap(op.cap === 'butt' ? 'butt' : 'round');
      doc.line(px(op.x1), py(op.y1), px(op.x2), py(op.y2));
      continue;
    }

    if (op.op === 'circle') {
      const hasFill = Boolean(op.fill && op.fill !== 'none');
      const hasStroke = Boolean(op.stroke);
      if (!hasFill && !hasStroke) continue;
      if (hasFill) doc.setFillColor(...rgb(op.fill));
      if (hasStroke) {
        doc.setDrawColor(...rgb(op.stroke));
        doc.setLineWidth(pw(op.width ?? 1));
      }
      doc.circle(px(op.cx), py(op.cy), op.r * k, hasFill && hasStroke ? 'FD' : hasFill ? 'F' : 'S');
      continue;
    }

    if (op.op === 'poly') {
      const points = op.points.map(([ox, oy]) => [px(ox), py(oy)]);
      if (points.length < 2) continue;
      const hasFill = Boolean(op.fill && op.fill !== 'none');
      if (hasFill) doc.setFillColor(...rgb(op.fill));
      if (op.stroke) {
        doc.setDrawColor(...rgb(op.stroke));
        doc.setLineWidth(pw(op.width ?? 1));
        doc.setLineCap('round');
      }
      // Three points and a fill is an arrowhead, which jsPDF draws directly.
      if (hasFill && points.length === 3 && !op.stroke) {
        doc.triangle(
          points[0][0], points[0][1], points[1][0], points[1][1],
          points[2][0], points[2][1], 'F',
        );
        continue;
      }
      const deltas = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]);
      doc.lines(
        deltas, points[0][0], points[0][1], [1, 1],
        hasFill && op.stroke ? 'FD' : hasFill ? 'F' : 'S',
        Boolean(op.close),
      );
      continue;
    }

    if (op.op === 'text') {
      doc.setTextColor(...rgb(op.fill));
      doc.setFontSize(Math.max(1, op.size * k));
      doc.setFont('helvetica', op.weight === 'bold' ? 'bold' : 'normal');
      const align = op.anchor === 'start' ? 'left' : op.anchor === 'end' ? 'right' : 'center';
      const options = { align };
      // SVG rotates clockwise, jsPDF counter-clockwise.
      if (op.rotate) options.angle = -op.rotate;
      doc.text(String(op.text), px(op.x), py(op.y), options);
    }
  }

  setOpacity(1);
  setDash(null);
}

/**
 * The whole sheet: every diagram placed on the grid, paged as needed.
 *
 * `items` are `{ diagram, caption, sublabel }`. The caption is drawn by this
 * module rather than baked into the diagram so that the same diagram can be
 * captioned differently on different sheets.
 */
export function drawSheet(doc, items, settings = {}) {
  const { grid, pages } = paginate(items, settings);
  const title = settings.title || '';
  const footer = settings.footer || '';

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage([grid.page.width, grid.page.height]);

    // An explicit white page. A PDF with no background is transparent, which
    // most viewers paint white and some paint black -- and a sheet that comes
    // out of one viewer inverted is not a sheet anyone trusts.
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, grid.page.width, grid.page.height, 'F');

    if (title) {
      doc.setTextColor(17, 17, 17);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.min(28, Math.max(12, grid.page.width / 60)));
      doc.text(title, grid.page.width / 2, grid.margin + grid.headerPt * 0.6, { align: 'center' });
    }

    for (const { item, cell } of page) {
      if (settings.showGridLines) {
        doc.setDrawColor(222, 226, 230);
        doc.setLineWidth(0.5);
        doc.setLineCap('butt');
        doc.rect(cell.cellX, cell.cellY, cell.cellWidth, cell.cellHeight, 'S');
      }
      drawDiagram(doc, item.diagram, { x: cell.x, y: cell.y, size: cell.size });

      if (item.caption && grid.caption > 0) {
        const captionSize = Math.min(14, Math.max(5, cell.size / 22));
        doc.setTextColor(17, 17, 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(captionSize);
        doc.text(String(item.caption), cell.cellX + cell.cellWidth / 2, cell.captionY, {
          align: 'center',
          maxWidth: cell.cellWidth,
        });
        if (item.sublabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(captionSize * 0.82);
          doc.setTextColor(107, 114, 128);
          doc.text(
            String(item.sublabel),
            cell.cellX + cell.cellWidth / 2,
            cell.captionY + captionSize * 1.05,
            { align: 'center', maxWidth: cell.cellWidth },
          );
        }
      }
    }

    if (footer) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const line = pages.length > 1
        ? `${footer}  ·  page ${pageIndex + 1} of ${pages.length}`
        : footer;
      doc.text(line, grid.page.width / 2, grid.page.height - grid.margin / 2, { align: 'center' });
    }
  });

  return { grid, pageCount: pages.length };
}

/** What the page should warn about before someone sends it to a plotter. */
export function sheetAdvice(settings, itemCount) {
  const grid = paginate(new Array(itemCount).fill(null), settings).grid;
  const textPt = smallestTextPt(grid.diagramSize);
  const pages = grid.perPage ? Math.ceil(itemCount / grid.perPage) : 0;
  return {
    perPage: grid.perPage,
    pages,
    cellInches: grid.diagramSize / 72,
    smallestTextPt: textPt,
    tooSmall: textPt > 0 && textPt < 4,
  };
}
