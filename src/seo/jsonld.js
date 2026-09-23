/**
 * Structured data.
 *
 * Every route used to emit the same three blocks, which told Google the whole
 * site was one application. Tools now describe themselves, blog posts are
 * articles, and both carry breadcrumbs.
 */
import { site, absoluteUrl } from "./site.js";

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.baseUrl,
  logo: absoluteUrl(site.defaultOgImage),
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.baseUrl,
  // index.html used to declare a second, competing WebSite entity just to
  // carry this. The ?q= target it advertises is now actually implemented, by
  // Home reading $route.query.q.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${site.baseUrl}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/** The sitewide application entity, for the home page only. */
export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  applicationCategory: "BrowserApplication",
  operatingSystem: "Web",
  url: site.baseUrl,
  description: site.defaultDescription,
  // Google flags a free SoftwareApplication that has no offers node.
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

/** One tool, described as its own application rather than part of a blob. */
export function softwareApplicationFor({ name, description, path, image }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory: "BrowserApplication",
    applicationSubCategory: "Traffic Engineering",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    ...(image ? { image: absoluteUrl(image) } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: site.name, url: site.baseUrl },
  };
}

/** A blog post, with the dates taken from that post's own history. */
export function blogPostingFor({ title, description, path, image, datePublished, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: absoluteUrl(path),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    author: { "@type": "Organization", name: site.name, url: site.baseUrl },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(site.defaultOgImage) },
    },
  };
}

/** Home > [Blog >] This page. */
export function breadcrumbsFor(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
