import { site, absoluteUrl } from "./site.js";

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.baseUrl,
  logo: absoluteUrl("/og/traffic-signal-kit.png"),
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

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Traffic Signal Kit",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: site.baseUrl,
  description: site.defaultDescription,
};
