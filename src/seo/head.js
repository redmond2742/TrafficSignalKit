/**
 * The head for a page, as data.
 *
 * One function serves both consumers: HeadManager.vue applies it at runtime,
 * and scripts/build-seo-html.mjs bakes it into the static HTML at build time.
 * They cannot drift because they call the same function.
 *
 * Constraints, so this runs under bare `node` as well as Vite: no "@/" alias,
 * no import.meta.env, no .vue imports, explicit .js extensions.
 */

import { site, absoluteUrl } from "./site.js";
import { routeMeta, metaByPath } from "./routes.js";
import {
  organizationJsonLd,
  websiteJsonLd,
  softwareApplicationJsonLd,
} from "./jsonld.js";

/**
 * Path first, falling back to route name. The catch-all route has a pattern
 * for a path and a real URL at runtime, so only its name resolves.
 */
export function resolveMeta(path, name) {
  return metaByPath[path] || (name ? routeMeta[name] : null) || {};
}

function faqJsonLd(meta) {
  if (!meta.faq) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: meta.faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** Everything the page's <head> needs, for one route. */
export function headFor(path, name) {
  const meta = resolveMeta(path, name);
  const robots = meta.robots || null;
  // A noindex page gets no canonical: pointing it anywhere consolidates junk
  // URLs onto a real page, which is how every 404 used to claim to be home.
  const indexable = !robots || !robots.includes("noindex");
  const title = meta.title || site.defaultTitle;
  const description = meta.description || site.defaultDescription;

  return {
    title,
    description,
    robots,
    canonical: indexable ? absoluteUrl(meta.path || path) : null,
    ogImage: absoluteUrl(meta.ogImage || site.defaultOgImage),
    jsonLd: [
      organizationJsonLd,
      websiteJsonLd,
      softwareApplicationJsonLd,
      faqJsonLd(meta),
    ].filter(Boolean),
  };
}

/** The meta tag list, shared so runtime and build emit the same set. */
export function metaTagsFor(head) {
  return [
    { name: "description", content: head.description },
    ...(head.robots ? [{ name: "robots", content: head.robots }] : []),
    { property: "og:title", content: head.title },
    { property: "og:description", content: head.description },
    ...(head.canonical ? [{ property: "og:url", content: head.canonical }] : []),
    { property: "og:type", content: "website" },
    { property: "og:image", content: head.ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: head.title },
    { name: "twitter:description", content: head.description },
    { name: "twitter:image", content: head.ogImage },
  ];
}
