/**
 * Draw list -> SVG. The screen half of the pair; `phaseDiagramPdf.js` is the
 * other, and both read the same ops so the print cannot drift from the page.
 *
 * Emits a string rather than DOM nodes, so this runs under `node --test` and
 * the view can hand it straight to `v-html` on an element it owns.
 *
 * Framework free.
 */

import { DIAGRAM_SIZE } from './phaseDiagram.js';

/**
 * Escape for an XML attribute or text node.
 *
 * Street names come out of an uploaded file, and a name containing `&` or `<`
 * would otherwise produce markup that does not parse -- or, worse, parses as
 * something the file's author chose.
 */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Trim float noise: 150.00000000000003 is 10 bytes of nothing, times 400 ops. */
const n = (value) => {
  const rounded = Math.round(Number(value) * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

const common = (op) => {
  let out = '';
  if (op.dash) out += ` stroke-dasharray="${op.dash.join(' ')}"`;
  if (op.cap) out += ` stroke-linecap="${op.cap}"`;
  if (op.opacity != null) out += ` opacity="${op.opacity}"`;
  return out;
};

function opToSvg(op) {
  if (op.op === 'line') {
    return `<line x1="${n(op.x1)}" y1="${n(op.y1)}" x2="${n(op.x2)}" y2="${n(op.y2)}"`
      + ` stroke="${op.stroke}" stroke-width="${n(op.width)}"${common(op)} />`;
  }
  if (op.op === 'circle') {
    return `<circle cx="${n(op.cx)}" cy="${n(op.cy)}" r="${n(op.r)}"`
      + ` fill="${op.fill || 'none'}"`
      + (op.stroke ? ` stroke="${op.stroke}" stroke-width="${n(op.width ?? 1)}"` : '')
      + `${common(op)} />`;
  }
  if (op.op === 'poly') {
    const points = op.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    const tag = op.close ? 'polygon' : 'polyline';
    return `<${tag} points="${points}" fill="${op.fill || 'none'}"`
      + (op.stroke ? ` stroke="${op.stroke}" stroke-width="${n(op.width ?? 1)}"` : '')
      + `${common(op)} />`;
  }
  if (op.op === 'text') {
    const transform = op.rotate
      ? ` transform="rotate(${n(op.rotate)} ${n(op.x)} ${n(op.y)})"`
      : '';
    return `<text x="${n(op.x)}" y="${n(op.y)}" font-size="${n(op.size)}"`
      + ` fill="${op.fill}" text-anchor="${op.anchor || 'middle'}"`
      + (op.weight === 'bold' ? ' font-weight="700"' : '')
      + ` font-family="Helvetica, Arial, sans-serif"${transform}>`
      + `${escapeXml(op.text)}</text>`;
  }
  return '';
}

/**
 * A complete `<svg>` for one diagram.
 *
 * `title` becomes the accessible name; a diagram with no text alternative is
 * just a decorative blob to anyone using a screen reader.
 */
export function diagramToSvg(diagram, { title = '', background = '#ffffff' } = {}) {
  const size = diagram.size || DIAGRAM_SIZE;
  const body = diagram.ops.map(opToSvg).join('');
  const label = title
    ? `<title>${escapeXml(title)}</title>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"`
    + ` width="100%" height="100%" role="img"${title ? ' aria-label="' + escapeXml(title) + '"' : ' aria-hidden="true"'}>`
    + label
    + `<rect width="${size}" height="${size}" fill="${background}" />`
    + body
    + '</svg>';
}
