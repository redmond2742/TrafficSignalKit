export const site = {
  name: "Traffic Signal Kit",
  // Render serves www and 301s the apex, so canonicals must say www or
  // every one of them points at a redirect.
  baseUrl: "https://www.trafficsignalkit.com",
  defaultTitle: "Traffic Signal Kit | ATSPM & High-Resolution Signal Tools",
  defaultDescription:
    "Open-source tools for traffic signal timing, ATSPM metrics, high-resolution controller data, and GPX time-space visualization.",
  defaultOgImage: "/og/traffic-signal-kit.png",
  twitterHandle: "@trafficsignalkit",
};

export const absoluteUrl = (path = "/") =>
  new URL(path, site.baseUrl).toString();
