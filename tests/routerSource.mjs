/**
 * Reads src/router/index.js as text and returns its route objects.
 *
 * Deliberately not a *.test.mjs file, so `node --test tests/*.test.mjs` does
 * not try to run it.
 *
 * Parsing source with a regex is crude, but it is a real running check with no
 * new dependencies, and it is what turns "the SEO metadata quietly disagrees
 * with the router" from something you find in production into a failing test.
 *
 * It matches route *objects*, not `path:`/`name:` field pairs. Two routes are
 * redirect stubs with no name at all, and pairing fields across them silently
 * associates the wrong name with the wrong path. Route objects contain no
 * nested braces today (the one pattern that looks like it might,
 * '/:pathMatch(.*)*', uses parentheses), so a non-greedy brace match is enough.
 */
import fs from 'node:fs';

const field = (body, key) => {
  const match = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`).exec(body);
  return match ? match[1] : null;
};

export function parseRouterRoutes() {
  const src = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('routes'));
  const routes = [];
  for (const match of body.matchAll(/\{([^{}]*)\}/g)) {
    const text = match[1];
    const path = field(text, 'path');
    if (!path) continue;
    routes.push({
      path,
      name: field(text, 'name'),
      redirect: field(text, 'redirect'),
      // component is an identifier, not a string, so it needs its own match
      component: /component:\s*([A-Za-z0-9_$]+)/.exec(text)?.[1] ?? null,
      isCatchAll: path.includes(':pathMatch'),
    });
  }
  return routes;
}

/** The routes that should carry their own SEO metadata and appear in a sitemap. */
export function indexableRoutes() {
  return parseRouterRoutes().filter(
    (route) => route.component && route.name && !route.redirect && !route.isCatchAll,
  );
}
