/**
 * Generates public/sitemap.xml from the router and the SEO metadata.
 *
 * The sitemap used to be hand-maintained and had fallen 22 routes behind,
 * including every blog post. Generating it means a new route cannot be
 * forgotten, and tests/sitemap.test.mjs fails if the committed file goes stale.
 *
 * The output is committed rather than written straight to dist/ so the diff is
 * reviewable and a stale sitemap is visible rather than silent.
 *
 * No <lastmod>: Google discourages values that do not track real content
 * changes, and a build-date stamp on every URL is exactly the pattern it
 * ignores. Omitting is better than faking.
 *
 * Usage: node scripts/generate-sitemap.mjs [--check]
 */
import fs from 'node:fs';
import { metaByPath } from '../src/seo/routes.js';
import { indexableRoutes } from './routerSource.mjs';

const OUT = new URL('../public/sitemap.xml', import.meta.url);

const escapeXml = (value) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/** Every indexable route, minus anything explicitly marked noindex. */
export function sitemapUrls() {
  return indexableRoutes()
    .filter((route) => !((metaByPath[route.path]?.robots) || '').includes('noindex'))
    .map((route) => `https://www.trafficsignalkit.com${route.path}`)
    .sort();
}

export function buildSitemap() {
  const urls = sitemapUrls()
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Only write when run directly, so the test can import the builder.
if (import.meta.url === `file://${process.argv[1]}`) {
  const xml = buildSitemap();
  const check = process.argv.includes('--check');
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (check) {
    if (current !== xml) {
      console.error('sitemap.xml is stale; run: node scripts/generate-sitemap.mjs');
      process.exit(1);
    }
    console.log('sitemap.xml is up to date');
  } else {
    fs.writeFileSync(OUT, xml);
    console.log(`wrote ${sitemapUrls().length} urls to public/sitemap.xml`);
  }
}
