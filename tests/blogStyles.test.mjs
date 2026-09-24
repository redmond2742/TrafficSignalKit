import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseRouterRoutes } from '../scripts/routerSource.mjs';

const SRC = new URL('../src/', import.meta.url).pathname;
const GLOBAL_CSS = path.join(SRC, 'styles/global.css');

/**
 * The six posts used to carry a near-copy of the same stylesheet each, and the
 * copies had drifted: one had no serif face and no #111, one had lost the drop
 * cap, only one styled inline <code>, and five flipped to white-on-black under
 * `prefers-color-scheme: dark` while the rest of the app stayed light. The
 * rules now live once in global.css. These tests are what keep them there.
 */

/** Every /blog/* post view, discovered from the router so a new post is covered. */
function blogPostFiles() {
  return parseRouterRoutes()
    .filter((r) => r.path.startsWith('/blog/') && r.component)
    .map((r) => ({ route: r.path, file: path.join(SRC, 'views', `${r.component}.vue`) }));
}

const styleBlock = (source) => /<style[^>]*>([\s\S]*)<\/style>/.exec(source)?.[1] ?? '';

/** Class selectors defined in the blog section of global.css. */
function sharedSelectors() {
  const css = fs.readFileSync(GLOBAL_CSS, 'utf8');
  const section = css.slice(css.indexOf('------- blog'));
  assert.ok(section, 'global.css has no blog section');
  return new Set([...section.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]));
}

test('every blog route resolves to a view file', () => {
  const posts = blogPostFiles();
  assert.ok(posts.length >= 5, `expected the blog posts, found ${posts.length}`);
  for (const { route, file } of posts) {
    assert.ok(fs.existsSync(file), `${route} points at a missing view: ${file}`);
  }
});

test('blog posts do not redeclare the shared article styles', () => {
  const shared = sharedSelectors();
  for (const { route, file } of blogPostFiles()) {
    const own = styleBlock(fs.readFileSync(file, 'utf8'));
    for (const match of own.matchAll(/\.([a-z][a-z0-9-]*)[^{}]*\{/g)) {
      assert.ok(
        !shared.has(match[1]),
        `${route} redeclares .${match[1]}, which global.css already owns — `
          + 'change it there so all the posts move together',
      );
    }
  }
});

test('every article class a post uses is styled somewhere', () => {
  const shared = sharedSelectors();
  for (const { route, file } of blogPostFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const template = source.slice(0, source.indexOf('</template>'));
    const own = styleBlock(source);
    for (const match of template.matchAll(/class="([^"]+)"/g)) {
      for (const name of match[1].split(/\s+/)) {
        if (!/^(blog|article|coordinate)-/.test(name)) continue;
        assert.ok(
          shared.has(name) || own.includes(`.${name}`),
          `${route} uses .${name}, which nothing styles`,
        );
      }
    }
  }
});

test('the blog renders black on white, with no dark-scheme override', () => {
  const css = fs.readFileSync(GLOBAL_CSS, 'utf8');
  const base = /\.blog-article \{([^}]*)\}/.exec(css);
  assert.ok(base, 'global.css does not define .blog-article');
  assert.match(base[1], /background: #fff/, '.blog-article must declare a white background');
  assert.match(base[1], /color: #111/, '.blog-article must declare black text');

  // Vuetify is pinned to the light theme (src/plugins/vuetify.js), so a dark
  // block anywhere paints one element dark inside an otherwise light app.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(vue|css)$/.test(entry.name)) continue;
      // The at-rule, not the bare string: global.css documents in prose why
      // these were removed, and that comment is not an override.
      if (/@media[^{]*prefers-color-scheme/.test(fs.readFileSync(full, 'utf8'))) {
        offenders.push(path.relative(SRC, full));
      }
    }
  };
  walk(SRC);
  assert.deepEqual(offenders, [], 'the app is light-only; these follow the OS instead');
});
