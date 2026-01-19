export const site = {
  name: "Traffic Signal Kit",
  baseUrl: "https://trafficsignalkit.com",
  defaultTitle: "Traffic Signal Kit | ATSPM & High-Resolution Signal Tools",
  defaultDescription:
    "Open-source tools for traffic signal timing, ATSPM metrics, high-resolution controller data, and GPX time-space visualization.",
  defaultOgImage: "/og/traffic-signal-kit.png",
  twitterHandle: "@trafficsignalkit",
};

export const absoluteUrl = (path = "/") =>
  new URL(path, site.baseUrl).toString();
