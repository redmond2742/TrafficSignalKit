/**
 * Generates the social share images in public/og/.
 *
 * Nothing referenced a real og:image before this: site.js pointed at
 * /og/traffic-signal-kit.png, which did not exist, so every share of every
 * page showed a broken card.
 *
 * Renders SVG through rsvg-convert rather than a headless browser, so there is
 * no Chromium dependency. Card art is decoded from WebP with dwebp because
 * librsvg cannot embed WebP directly.
 *
 * Output is JPEG, not WebP: several social crawlers still do not accept WebP.
 * JPEG rather than PNG because these are mostly photographs and screenshots --
 * measured 494KB as PNG against 160KB at the same visible quality.
 * 1200x630 is the floor for X's summary_large_image; below it the card is
 * downgraded to the small variant.
 *
 * Requires: rsvg-convert, dwebp (Homebrew: librsvg, webp) and ffmpeg.
 * Usage: node scripts/generate-og-images.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { TOOLS } from '../src/utils/toolRegistry.js';
import { site } from '../src/seo/site.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'public/og');
const W = 1200;
const H = 630;
const PANEL = 520;
const PAD = 52;

const TEAL = '#00695C';
const TEAL_DEEP = '#004D40';
const MUTED = '#9CCCC6';

const xml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/**
 * Rough text measurement. There is no font metrics API here, so this weights
 * characters by how wide they actually are -- a line of "Ill" and a line of
 * "WMW" are not remotely the same width, and a flat average overflows the
 * panel on the wide ones.
 */
function textWidth(text, size) {
  let units = 0;
  for (const ch of text) {
    if ('WM@'.includes(ch)) units += 0.95;
    else if ('mw'.includes(ch)) units += 0.85;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) units += 0.68;
    else if ('ijlftrI1.,:; '.includes(ch)) units += 0.33;
    else units += 0.55;
  }
  return units * size;
}

/** Greedy wrap, shrinking the size until it fits in maxLines. */
function wrap(text, maxWidth, startSize, maxLines, minSize = 14) {
  for (let size = startSize; size >= minSize; size -= 1) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size) <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every((l) => textWidth(l, size) <= maxWidth)) {
      return { lines, size };
    }
  }
  // Nothing fits: hard-break rather than let a line run off the panel.
  const size = minSize;
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size) <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return { lines: lines.slice(0, maxLines), size };
}

function tspans(lines, size, x, firstY, lineHeight) {
  return lines
    .map((l, i) => `<tspan x="${x}" y="${firstY + i * lineHeight}">${xml(l)}</tspan>`)
    .join('');
}

/** A card with the tool's own art on the right. */
function toolSvg({ title, subtitle, artPngPath }) {
  const usable = PANEL - PAD * 2;
  const t = wrap(title, usable, 46, 4);
  const lineHeight = t.size * 1.18;
  const blockHeight = t.lines.length * lineHeight;
  const firstY = H / 2 - blockHeight / 2 + t.size * 0.35;

  const sub = subtitle ? wrap(subtitle, usable, 21, 3) : null;
  const subY = firstY + blockHeight + 26;

  // The art is 3:2 and the slot is roughly 1:1, so slicing it would crop most
  // of the chart away. Contain it instead, centred on a light plate.
  const slotW = W - PANEL;
  const artW = slotW - 48;
  const artH = Math.round((artW * 2) / 3);
  const artY = Math.round((H - artH) / 2);
  const art = artPngPath
    ? `<rect x="${PANEL}" width="${slotW}" height="${H}" fill="#EEF2F1"/>
  <image x="${PANEL + 24}" y="${artY}" width="${artW}" height="${artH}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${fs.readFileSync(artPngPath).toString('base64')}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${art}
  <rect width="${PANEL}" height="${H}" fill="${TEAL}"/>
  <rect x="${PANEL - 6}" width="6" height="${H}" fill="${TEAL_DEEP}"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
    <text x="${PAD}" y="76" font-size="19" font-weight="bold" letter-spacing="2.4" fill="${MUTED}">TRAFFIC SIGNAL KIT</text>
    <text font-size="${t.size}" font-weight="bold" fill="#ffffff">${tspans(t.lines, t.size, PAD, firstY, lineHeight)}</text>
    ${sub ? `<text font-size="${sub.size}" fill="${MUTED}">${tspans(sub.lines, sub.size, PAD, subY, sub.size * 1.4)}</text>` : ''}
    <text x="${PAD}" y="${H - 44}" font-size="19" fill="${MUTED}">trafficsignalkit.com</text>
  </g>
</svg>`;
}

/** The sitewide fallback, used by any page without its own card. */
function siteSvg() {
  const t = wrap(site.name, W - 200, 96, 2);
  const sub = wrap('Open-source tools for signal timing, ATSPM metrics, and high-resolution controller data.', W - 220, 34, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${TEAL}"/><stop offset="100%" stop-color="${TEAL_DEEP}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" text-anchor="middle">
    <text font-size="${t.size}" font-weight="bold" fill="#ffffff">${tspans(t.lines, t.size, W / 2, 290, t.size * 1.15)}</text>
    <text font-size="${sub.size}" fill="${MUTED}">${tspans(sub.lines, sub.size, W / 2, 380, sub.size * 1.45)}</text>
    <rect x="${W / 2 - 60}" y="452" width="120" height="5" rx="2.5" fill="${MUTED}"/>
    <text x="${W / 2}" y="524" font-size="23" fill="${MUTED}" letter-spacing="1.5">trafficsignalkit.com</text>
  </g>
</svg>`;
}

function render(svg, outPath, tmp) {
  const svgPath = path.join(tmp, 'card.svg');
  const pngPath = path.join(tmp, 'card.png');
  fs.writeFileSync(svgPath, svg);
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), svgPath, '-o', pngPath]);
  execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', pngPath, '-q:v', '2', outPath]);
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  let count = 0;

  render(siteSvg(), path.join(OUT, 'traffic-signal-kit.jpg'), tmp);
  count += 1;

  for (const tool of TOOLS) {
    if (!tool.image) continue;
    const slug = tool.path.replace(/^\//, '').replace(/\//g, '-').toLowerCase();
    const webp = path.join(ROOT, 'public', tool.image);
    if (!fs.existsSync(webp)) { console.warn(`  skip ${slug}: ${tool.image} missing`); continue; }
    const art = path.join(tmp, `${slug}.png`);
    execFileSync('dwebp', ['-quiet', webp, '-o', art]);
    render(toolSvg({ title: tool.title, subtitle: tool.description, artPngPath: art }), path.join(OUT, `${slug}.jpg`), tmp);
    count += 1;
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${count} og images to public/og/`);
}

main();
