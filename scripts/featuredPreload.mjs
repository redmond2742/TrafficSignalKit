/**
 * Preload hints for the featured cards' art.
 *
 * The home page is client rendered, so without a hint the browser cannot ask
 * for a card image until the JavaScript has downloaded, run and rendered the
 * grid. A preload in the HTML starts the six featured images alongside the
 * script instead of after it.
 *
 * vite.config.mjs adds these to index.html. build-seo-html.mjs strips them
 * from every other route's copy, which would otherwise spend a visitor's
 * bandwidth on art for a page they did not open.
 */
import { TOOLS, featuredTools } from '../src/utils/toolRegistry.js';

/** Marks the tags so they can be found and removed again. */
export const PRELOAD_MARK = 'data-home-preload';

/** Vite HtmlTagDescriptors, one per featured card with art. */
export function featuredPreloadTags(tools = TOOLS) {
  return featuredTools(tools)
    .filter((tool) => tool.image)
    .map((tool) => ({
      tag: 'link',
      attrs: { rel: 'preload', as: 'image', href: tool.image, fetchpriority: 'high', [PRELOAD_MARK]: '' },
      injectTo: 'head',
    }));
}

/** The same HTML with every featured-art preload, and its line, removed. */
export function stripHomePreloads(html) {
  return html.replace(new RegExp(`[ \\t]*<link\\b[^>]*\\b${PRELOAD_MARK}\\b[^>]*>\\n?`, 'g'), '');
}
