import { site, absoluteUrl } from "./site";

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
