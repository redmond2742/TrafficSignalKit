/**
 * Writes one static HTML file per route into dist/, with that route's head
 * baked in.
 *
 * Without this, the raw HTML for every route is the SPA shell carrying the
 * homepage's title and description, and only crawlers that execute JavaScript
 * ever see anything else. Google may recover on its render pass; Bing, Slack,
 * LinkedIn, X and most AI crawlers do not run JS at all.
 *
 * The body stays client-rendered. This is about the head, which is what
 * decides how a page is titled, described and shared.
 *
 * Each route is written twice, as <path>/index.html and as <path>.html, so it
 * resolves whichever convention the host follows. See the note in main().
 *
 * dist/index.html is deliberately left without a canonical. It serves both /
 * and the catch-all for unknown URLs, so a canonical there would make every
 * junk URL claim to be the homepage -- which is the exact defect this whole
 * effort removed. Google self-canonicalizes a page that has no tag.
 *
 * Usage: node scripts/build-seo-html.mjs   (runs as part of `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { headFor, metaTagsFor } from '../src/seo/head.js';
import { indexableRoutes } from './routerSource.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TEMPLATE = path.join(DIST, 'index.html');

const escapeAttr = (value) =>
  String(value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

const escapeText = (value) =>
  String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Replaces a meta tag's content in place, or appends it if absent. */
function setMeta(html, attr, key, content) {
  const pattern = new RegExp(
    `<meta[^>]*\\s${attr}=["']${key.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')}["'][^>]*>`,
    'i',
  );
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

/**
 * Where a route's HTML is written. Both forms, because Render resolves
 * <path>/index.html only for a trailing-slash URL; see the note in main().
 */
export function outputPathsFor(routePath) {
  const relative = routePath.replace(/^\//, '');
  return [path.join(relative, 'index.html'), `${relative}.html`];
}

export function renderRoute(template, route) {
  const head = headFor(route.path, route.name);
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeText(head.title)}</title>`);

  for (const tag of metaTagsFor(head)) {
    html = setMeta(html, tag.name ? 'name' : 'property', tag.name || tag.property, tag.content);
  }

  // The canonical was removed from index.html precisely so it could be
  // injected here, correct per route, rather than pointing everything at /.
  if (head.canonical) {
    html = html.replace(
      '</head>',
      `  <link rel="canonical" href="${escapeAttr(head.canonical)}">\n</head>`,
    );
  }

  // data-seo-prerender so main.js can strip these before mounting. @vueuse/head
  // dedupes <meta> and <link rel=canonical> against pre-existing tags, but it
  // does not dedupe ld+json, so without this every page ends up with two
  // copies of every block after hydration.
  const blocks = head.jsonLd
    .map((block) => {
      // </script> inside JSON would close the tag early.
      const json = JSON.stringify(block).replace(/</g, '\\u003c');
      return `  <script type="application/ld+json" data-seo-prerender>${json}</script>`;
    })
    .join('\n');
  html = html.replace('</head>', `${blocks}\n</head>`);

  return { html, head };
}

function main() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error('dist/index.html not found; run vite build first');
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const homepageTitle = (/<title>([\s\S]*?)<\/title>/i.exec(template) || [])[1];

  const written = [];
  const problems = [];

  for (const route of indexableRoutes()) {
    // "/" is the template itself and stays as the shell; see the note above.
    if (route.path === '/') continue;

    const { html, head } = renderRoute(template, route);

    if (head.title === homepageTitle) {
      problems.push(`${route.path} still carries the homepage title`);
    }
    if (!html.includes(`<link rel="canonical" href="${escapeAttr(head.canonical)}">`)) {
      problems.push(`${route.path} did not get its canonical`);
    }

    // Two forms, because which one a static host resolves is its own choice.
    //
    // Render serves dist/<path>/index.html only for a URL that already ends in
    // a slash -- probed on the live site: /_seoprobe returned the SPA shell
    // while /_seoprobe/ returned the file, with no redirect between them. So
    // the directory form alone never reaches /split-history.
    //
    // dist/<path>.html is the other convention ("clean URLs"). Writing both
    // costs a few hundred KB of small files and means the canonical URLs work
    // under either behaviour, without a host-side rewrite rule.
    for (const relative of outputPathsFor(route.path)) {
      const target = path.join(DIST, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html);
    }

    written.push(route.path);
  }

  // A silent partial success here is the worst outcome: the site would look
  // fixed while most routes still served the homepage head.
  if (problems.length) {
    console.error('SEO HTML generation failed:\n  ' + problems.join('\n  '));
    process.exit(1);
  }

  console.log(
    `wrote ${written.length} routes into dist/, as both <path>/index.html and <path>.html`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
