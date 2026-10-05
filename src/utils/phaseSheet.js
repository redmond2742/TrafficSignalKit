/**
 * Where each diagram lands on a printed sheet.
 *
 * Separated from the drawing and from the PDF writer because this is the part
 * with arithmetic worth testing: a cell that overlaps its neighbour, or a grid
 * that quietly drops the hundredth diagram because the page only had room for
 * ninety-nine, is a mistake nobody sees until the plot comes off the roll at
 * full size.
 *
 * Everything here is in PostScript points (72 to the inch), which is what the
 * PDF writer wants and what paper sizes are conventionally quoted in.
 *
 * Framework free.
 */

export const PT_PER_INCH = 72;

/** Paper sizes in inches, widest use first. */
export const PAPER_SIZES = {
  square30: { name: '30 × 30 in', width: 30, height: 30 },
  square36: { name: '36 × 36 in', width: 36, height: 36 },
  archD: { name: 'ARCH D — 24 × 36 in', width: 24, height: 36 },
  archE: { name: 'ARCH E — 36 × 48 in', width: 36, height: 48 },
  tabloid: { name: 'Tabloid — 11 × 17 in', width: 11, height: 17 },
  letter: { name: 'Letter — 8.5 × 11 in', width: 8.5, height: 11 },
  a3: { name: 'A3 — 11.7 × 16.5 in', width: 11.69, height: 16.54 },
};

export const DEFAULT_SHEET = {
  paper: 'square30',
  columns: 2,
  rows: 2,
  orientation: 'portrait',
  marginInches: 1,
  gutterInches: 0.35,
  captionPt: 22,
  showGridLines: true,
};

const clampInt = (value, lo, hi, fallback) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

/** Paper in points, after orientation. */
export function paperPoints(paperKey, orientation = 'portrait') {
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.square30;
  const w = paper.width * PT_PER_INCH;
  const h = paper.height * PT_PER_INCH;
  // A square sheet is the same either way; swapping it would be a no-op that
  // still has to produce the same numbers, so compare rather than assume.
  const landscape = orientation === 'landscape';
  return {
    width: landscape ? Math.max(w, h) : Math.min(w, h),
    height: landscape ? Math.min(w, h) : Math.max(w, h),
  };
}

/**
 * The grid for one page: every cell's square, and where its caption sits.
 *
 * The diagram is always square, so the cell's spare height (or width) becomes
 * padding rather than stretching the intersection into an ellipse.
 */
export function planGrid(settings = {}) {
  const s = { ...DEFAULT_SHEET, ...settings };
  const columns = clampInt(s.columns, 1, 10, 2);
  const rows = clampInt(s.rows, 1, 10, 2);
  const page = paperPoints(s.paper, s.orientation);
  const margin = Math.max(0, Number(s.marginInches) || 0) * PT_PER_INCH;
  const gutter = Math.max(0, Number(s.gutterInches) || 0) * PT_PER_INCH;
  const caption = Math.max(0, Number(s.captionPt) || 0);

  const usableWidth = page.width - margin * 2;
  // The header strip carries the sheet title; it is part of the page, not of
  // any cell, so it comes off the top before the grid is divided up.
  const headerPt = s.title ? 30 : 0;
  const usableHeight = page.height - margin * 2 - headerPt;

  const cellWidth = (usableWidth - gutter * (columns - 1)) / columns;
  const cellHeight = (usableHeight - gutter * (rows - 1)) / rows;
  const diagram = Math.max(0, Math.min(cellWidth, cellHeight - caption));

  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cellX = margin + column * (cellWidth + gutter);
      const cellY = margin + headerPt + row * (cellHeight + gutter);
      cells.push({
        row,
        column,
        cellX,
        cellY,
        cellWidth,
        cellHeight,
        // Centre the square in whatever the cell actually is.
        x: cellX + (cellWidth - diagram) / 2,
        y: cellY + (cellHeight - caption - diagram) / 2,
        size: diagram,
        captionY: cellY + cellHeight - caption / 2,
      });
    }
  }

  return {
    page,
    columns,
    rows,
    margin,
    gutter,
    caption,
    headerPt,
    perPage: columns * rows,
    cellWidth,
    cellHeight,
    diagramSize: diagram,
    cells,
  };
}

/**
 * Split a list of diagrams across as many pages as the grid needs.
 *
 * Returns pages of `{ item, cell }` pairs. The last page is short rather than
 * padded: a trailing row of empty boxes reads as missing data.
 */
export function paginate(items, settings = {}) {
  const grid = planGrid(settings);
  const list = Array.isArray(items) ? items : [];
  if (!grid.perPage || !list.length) return { grid, pages: [] };

  const pages = [];
  for (let start = 0; start < list.length; start += grid.perPage) {
    const slice = list.slice(start, start + grid.perPage);
    pages.push(slice.map((item, index) => ({ item, cell: grid.cells[index] })));
  }
  return { grid, pages };
}

/**
 * How big diagram text ends up on paper, in points.
 *
 * The diagram is authored on a 300-unit square and scaled to the cell, so a
 * 10-unit label on a 10x10 grid of a 30-inch sheet is about 7pt -- small, but
 * legible. Below about 4pt it stops being readable at arm's length, which is
 * worth saying on the page before someone sends a plot to a 36-inch roll.
 */
export function smallestTextPt(diagramSizePt, authoredSize = 8, canvas = 300) {
  if (!diagramSizePt) return 0;
  return (authoredSize * diagramSizePt) / canvas;
}
