/**
 * The tool list, in one place.
 *
 * There used to be five hand-maintained copies of this: the router, the SEO
 * metadata, four arrays in Header.vue, the Home page cards, and sitemap.xml.
 * They had drifted -- five tools were reachable from no menu at all, the GPX
 * Elevation plotter was in the desktop menu but missing from the mobile drawer,
 * and the same path carried different titles in different lists.
 *
 * This module owns navigation and search. The router still owns its own
 * component imports, and seo/routes.js is keyed by route name rather than path,
 * so those two are deliberately left alone for now; tests/toolRegistry.test.mjs
 * guards the registry against the router so the drift cannot come back quietly.
 *
 * Framework free, so it runs under `node --test`.
 *
 * Fields:
 *   path        router path, and the identity of the entry
 *   title       canonical name, used on the home card and in search results
 *   navTitle    shorter label for the nav menus, when it differs from title
 *   description one line, searchable
 *   image       home card art; absent for tools that have no card
 *   topics      searchable tags, also the home page's topic vocabulary
 *   group       which desktop menu it belongs to
 *   home        false for tools that are navigable and searchable but have no card
 */

/**
 * Home page running order, highest priority first. One list decides both the
 * order the cards appear in and which are featured, so the two cannot drift
 * apart: the first FEATURED_COUNT entries go above the divider.
 *
 * A home card missing from this list still renders, appended at the end, but
 * tests/toolRegistry.test.mjs fails so it gets placed deliberately.
 */
export const HOME_ORDER = [
  "/ped-conflict-correlator",
  "/detector-bubble-chart",
  "/yellow-red-running",
  "/preemption-plotter",
  "/pattern-calendar",
  "/yolo-image-annotator",
  "/preemption-evaluator",
  "/detector-event-heat-map",
  "/pedestrian-investigator",
  "/gpx",
  "/enumeration-matrix",
  "/detection-plotter",
  "/phase-bubble-scatter",
  "/delay-estimator",
  "/startup-loss-average",
  "/gap-out-gap-reduction-helper",
  "/cabinet-pm-scheduler",
  "/split-history",
  "/signal-offsets",
  "/gpx-mapper",
  "/basic-timing-seeker",
  "/explainer",
  "/gpx-phase-plotter",
  "/phase-plotter",
  "/stuck-detectors",
  "/skipped-phase-finder",
  "/split-failure-checker",
  "/message-sign-designer",
  "/coordination-learning-tool",
  "/split-calculator",
  "/practice-exam",
  "/traffic-simulator",
  "/gpx-elevation",
  "/detectorRLR",
  "/geojson-mapper",
  "/video-frame-extractor",
];

/** How many of HOME_ORDER sit above the divider. */
export const FEATURED_COUNT = 6;

/** The desktop menus, in bar order. */
export const NAV_GROUPS = [
  { id: "data", label: "Traffic Signal Data" },
  { id: "gpx", label: "Time-Space & GPX" },
  { id: "misc", label: "Misc." },
  { id: "about", label: "About" },
];

export const TOOLS = [
  {
    path: "/yellow-red-running",
    title: "Yellow & Red Light Running Tool (V2)",
    navTitle: "Yellow & Red Light Running Tool",
    description:
      "Detect detector-off events during yellow or red intervals",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Red+Light+Running.png",
    topics: ["Red Light Running", "Controller Data"],
    group: "data",
  },
  {
    path: "/coordination-learning-tool",
    title: "Coordination Learning Tool",
    description:
      "Interactive sliders and visuals for cycle length, splits, offsets, scheduler plans, and coordinated phases.",
    image: "/images/coordination-learning-tool.png",
    topics: ["Coordination", "Education", "Offsets"],
    group: "misc",
  },
  {
    path: "/delay-estimator",
    title: "Delay & Count Estimator",
    description:
      "Estimate detector call delays to phase service",
    image: "/images/delay-estimator.png",
    topics: ["Controller Data", "Delay", "Enumerations"],
    group: "data",
  },
  {
    path: "/yolo-image-annotator",
    title: "YOLO Image Annotator",
    description:
      "Box traffic signal heads in roadway images and export a YOLO training dataset.",
    image: "/images/yolo-image-annotator.png",
    topics: ["Machine Learning", "Detection", "Datasets", "Video"],
    group: "misc",
  },
  {
    path: "/ped-conflict-correlator",
    title: "Pedestrian Conflict Correlator",
    description:
      "Correlate detector on/off events with pedestrian walk and clearance intervals to see turning conflict exposure.",
    image: "/images/ped-conflict-correlator.png",
    topics: ["Controller Data", "Pedestrians", "Safety", "Detection"],
    group: "data",
  },
  {
    path: "/pedestrian-investigator",
    title: "Pedestrian Investigator",
    description:
      "Summarize pedestrian walk, clearance, and crossing distance estimates.",
    image: "/images/pedestrian-investigator.png",
    topics: ["Controller Data", "Pedestrians", "Diagnostics"],
    group: "data",
  },
  {
    path: "/stuck-detectors",
    title: "Stuck Detector Finder",
    description:
      "Find detectors that appear to stay on in high-resolution data",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
    topics: ["Controller Data", "Detection", "Diagnostics"],
    group: "data",
  },
  {
    path: "/skipped-phase-finder",
    title: "Skipped Phase Finder",
    description:
      "Find detector calls where the phase is not served within two minutes",
    image: "/images/skipped-phase-finder.png",
    topics: ["Controller Data", "Detection", "Diagnostics"],
    group: "data",
  },
  {
    path: "/split-failure-checker",
    title: "Split Failure Checker",
    description:
      "Flag green terminations with stop bar detectors still on",
    image: "/images/split-failure-checker.png",
    topics: ["Controller Data", "Detection", "Diagnostics"],
    group: "data",
  },
  {
    path: "/preemption-evaluator",
    title: "Preemption Evaluator",
    description:
      "Find preemption events, their duration and the channel that served them",
    image: "/images/preemption-evaluator.png",
    topics: ["Controller Data", "Enumerations", "Preemption", "Diagnostics"],
    group: "data",
  },
  {
    path: "/preemption-plotter",
    title: "Timeseries Plot All Enumerations",
    description:
      "Plot preemption (101-119) enumeration events over time",
    image: "/images/preemption-plotter.png",
    topics: ["Controller Data", "Enumerations", "Preemption"],
    group: "data",
  },
  {
    path: "/enumeration-matrix",
    title: "Enumeration Matrix",
    description:
      "Plot enumeration events by phase/channel with timestamp tooltips",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+All+Enumerations+Plot.png",
    topics: ["Controller Data", "Enumerations", "Diagnostics"],
    group: "data",
  },
  {
    path: "/detection-plotter",
    title: "Detection Channel Plotter",
    description:
      "Plot detection enumeration events by channel over time",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Detection+Events+Graph.png",
    topics: ["Controller Data", "Enumerations", "Detection"],
    group: "data",
  },
  {
    path: "/detector-bubble-chart",
    title: "Detector Bubble Chart",
    description:
      "Bubble chart of detector on-duration and off-to-on gaps by cycle",
    image: "/images/detector-bubble-chart.png",
    topics: ["Controller Data", "Detection", "Cycles"],
    group: "data",
  },
  {
    path: "/phase-bubble-scatter",
    title: "Phase Bubble Scatter",
    description:
      "Bubble scatter of phase split, time since last ON, and detector OFF behavior",
    image: "/images/phase-bubble-scatter.png",
    topics: ["Controller Data", "Detection", "Phase"],
    group: "data",
  },
  {
    path: "/detector-event-heat-map",
    title: "Detector Event Heat Map",
    description:
      "Heat map detector activity by time of day and phase/channel mappings",
    image: "/images/detector-event-heat-map.png",
    topics: ["Controller Data", "Detection", "Heat Map"],
    group: "data",
  },
  {
    path: "/startup-loss-average",
    title: "Start Up Loss Average",
    description:
      "Estimate start-up loss from green intervals and detector-off events",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
    topics: ["Controller Data", "Detection", "Performance"],
    group: "data",
  },
  {
    path: "/gap-out-gap-reduction-helper",
    title: "Gap-Out & Gap Reduction Helper",
    description:
      "Estimate min green, passage, and optional gap-reduction settings from high-resolution detector headways.",
    image: "/images/gap-out-gap-reduction-helper.png",
    topics: ["Controller Data", "Detection", "Timing"],
    group: "data",
  },
  {
    path: "/cabinet-pm-scheduler",
    title: "Traffic Signal Cabinet PM Scheduler",
    navTitle: "Cabinet PM Scheduler",
    description:
      "Plan preventative maintenance visits by technician and frequency.",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Offset+Calculation.png",
    topics: ["Maintenance", "Scheduling", "Cabinets"],
    group: "misc",
  },
  {
    path: "/split-history",
    title: "High Resolution Split History",
    navTitle: "Split History",
    description:
      "Calculate Phase Durations from High Resolution Data",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com+-+split+history+phase+termination+table.png",
    topics: ["Controller Data", "Enumerations", "Split"],
    group: "data",
  },
  {
    path: "/signal-offsets",
    title: "Signal Offset Calculator",
    description:
      "Calculate coordinated phase offsets cycle by cycle",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Offset+Calculation.png",
    topics: ["Controller Data", "Coordination", "Offsets"],
    group: "data",
  },
  {
    path: "/pattern-calendar",
    title: "Pattern Calendar",
    description:
      "Visualize coordination pattern changes by day and time in a calendar view.",
    image: "/images/pattern-calendar.png",
    topics: ["Controller Data", "Coordination", "Calendar"],
    group: "data",
  },
  {
    path: "/gpx-mapper",
    title: "GPX Mapper",
    description:
      "Plot GPX tracks on a map",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+GPX+Map+and+Table.png",
    topics: ["GPX", "Map"],
    group: "gpx",
  },
  {
    path: "/geojson-mapper",
    title: "GeoJSON Mapper",
    description:
      "Upload and style GeoJSON files with map image export",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+GPX+Map+and+Table.png",
    topics: ["GeoJSON", "Map", "Visualization"],
    group: "gpx",
  },
  {
    path: "/basic-timing-seeker",
    title: "Basic Timing Seeker",
    description:
      "Estimate GTSS timing parameters from high-resolution controller data.",
    image: "/images/basic-timing-seeker.png",
    topics: ["Controller Data", "Timing", "GTSS"],
    group: "data",
  },
  {
    path: "/explainer",
    title: "High Resolution Data Explainer",
    navTitle: "High Resolution Explainer",
    description:
      "Explore traffic signal controller enumerations and high resolution data logs",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-high-resolution-controller-data-explainer-ATSPM.png",
    topics: ["Controller Data", "Enumerations"],
    group: "data",
  },
  {
    path: "/gpx-phase-plotter",
    title: "GPX Time-Space & Phase Plotter (with TSP Events)",
    navTitle: "GPX & Phase Plotter",
    description:
      "Plot GPX as time space combined with Phase State over Time (with Transit Signal Priority (TSP) events)",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-GPX+and+High+Resolution+Signal+Data+for+Transit+Signal+Priority+(TSP).png",
    topics: ["Controller Data", "Enumerations", "GPX", "Time-Space", "Coordination"],
    group: "gpx",
  },
  {
    path: "/phase-plotter",
    title: "Phase Plotter",
    description:
      "Plot Phase State over Time",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/Trafficsignalkit.com+-+Signal+Phase+Plotter+-+Red-Green-Yellow.png",
    topics: ["Controller Data", "Enumerations"],
    group: "data",
  },
  {
    path: "/traffic-simulator",
    title: "Max Out and Gap Out Traffic Simulator",
    navTitle: "Intersection Simulator",
    description:
      "Simulate Basic Intersection Functionality",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com+-+intersection+simulator.png",
    topics: ["Simulation", "Basic Timing"],
    group: "misc",
  },
  {
    path: "/message-sign-designer",
    title: "Message Sign Designer",
    description:
      "Preview changeable message sign text with realistic sizing.",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/Trafficsignalkit.com+-+Changeable+Message+Sign+Editor.png",
    topics: ["Message Signs", "Visualization", "Field Devices"],
    group: "misc",
  },
  {
    path: "/split-calculator",
    title: "Split Calculator",
    description:
      "Verify splits and cycle lengths during adjustments",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-split-calculator.png",
    topics: ["Coordination", "Split", "Calculator"],
    group: "misc",
  },
  {
    path: "/gpx",
    title: "Time Space Diagram Visualizer",
    navTitle: "Time Space Visualizer",
    description:
      "Plot a GPX file in a timespace diagram plot",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-timespace-diagram-gpx-plot.png",
    topics: ["GPX", "Time-Space"],
    group: "gpx",
  },
  {
    path: "/practice-exam",
    title: "Practice Exam",
    description:
      "Practice exam questions and grading",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-PracticeExamTE.jpg",
    topics: ["Exam", "Practice", "TE"],
    group: "misc",
  },
  {
    path: "/gpx-elevation",
    title: "GPX Elevation Plotter",
    navTitle: "GPX Elevation",
    description:
      "Plot elevation data from GPX files",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-GPX+Elevation+Plot+and+Location.png",
    topics: ["GPX", "Elevation", "Chart"],
    group: "gpx",
  },
  {
    path: "/detectorRLR",
    title: "Red Light Runner (Original)",
    navTitle: "Red Light Runners",
    description:
      "Table of Yellow and Red light running events",
    image: "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-Yellow+and+Red+Light+Running+Detection.png",
    topics: ["Red Light Running", "Controller Data"],
    group: "data",
  },
  {
    path: "/dashboard",
    title: "Signal Data Dashboard",
    navTitle: "Dashboard",
    description:
      "Process high-resolution data to review detector status, phase plots, and split history in one dashboard.",
    topics: ["Controller Data", "Diagnostics", "Visualization"],
    group: "data",
    home: false,
  },
  {
    path: "/tsp-dashboard",
    title: "TSP Dashboard",
    description:
      "Upload high-resolution CSV files to analyze transit signal priority channels, event frequencies, and time-series patterns.",
    topics: ["Controller Data", "Diagnostics", "Visualization"],
    group: "data",
    home: false,
  },
  {
    path: "/phase-bubble-plot",
    title: "Phase Bubble Plot",
    description:
      "Combine detector-to-phase mappings with split history so split failure and red-light running metrics can be summarized by phase.",
    topics: ["Controller Data", "Split", "Red Light Running", "Visualization"],
    group: "data",
    home: false,
  },
  {
    path: "/phase-start-table",
    title: "Phase Start Table",
    description:
      "Generate a table of phase start timestamps for green, yellow, and red intervals.",
    topics: ["Controller Data", "Enumerations", "Timing"],
    group: "data",
    home: false,
  },
  {
    path: "/time-to-reduce",
    title: "Time to Reduce",
    description:
      "Combine controller events with detector assignments to see how long phases sit in minimum green, extension, and gap-out time.",
    topics: ["Controller Data", "Detection", "Timing"],
    group: "data",
    home: false,
  },
  {
    path: "/video-frame-extractor",
    title: "Video Frame Extractor",
    description:
      "Extract video frames at a chosen FPS or from timestamp CSVs using a sync reference frame.",
    image: "/images/video-frame-extractor.png",
    topics: ["Video", "Detection", "Datasets"],
    group: "misc",
  },
  {
    path: "/tools/block-logic",
    title: "Block Logic",
    description:
      "Build and step through block-diagram logic rules against high-resolution controller data, with loadable templates.",
    topics: ["Controller Data", "Education"],
    group: "misc",
    home: false,
  },
  {
    path: "/reference",
    title: "Reference",
    description:
      "Quick reference notes and resources for traffic signal timing work.",
    topics: ["Education", "TE"],
    group: "misc",
    home: false,
  },
  {
    path: "/about",
    title: "About Traffic Signal Kit",
    description:
      "How Traffic Signal Kit supports traffic engineers with controller event analysis and signal timing workflows.",
    topics: ["TE"],
    group: "about",
    home: false,
  },
  {
    path: "/blog",
    title: "Traffic Signal Kit Blog",
    navTitle: "Blog",
    description:
      "Updates, experiments, and explainers on ATSPM metrics, high-resolution controller data, and signal operations.",
    topics: ["Education", "TE"],
    group: "about",
    home: false,
  },
];

/** The label a nav menu or drawer should show. */
export function navLabel(tool) {
  return tool.navTitle || tool.title;
}

/**
 * Split a query into search terms. Exported because the empty-query case
 * ("no terms, so everything matches") is easy to get wrong at a call site.
 */
export function searchTerms(query) {
  return String(query == null ? "" : query)
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/**
 * Tools matching a free-text query.
 *
 * Title, description and topics are all searchable, so "pedestrians" finds a
 * tool whether the word is in its name or only in its topics. Every term has to
 * land somewhere, so extra words narrow the list rather than widening it.
 */
export function matchTools(tools, query) {
  const terms = searchTerms(query);
  if (!terms.length) return [...(tools || [])];
  return (tools || []).filter((tool) => {
    const haystack = [tool.title, tool.navTitle, tool.description, ...(tool.topics || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Every topic with how many tools carry it, busiest first. */
export function topicCounts(tools) {
  const counts = new Map();
  for (const tool of tools || []) {
    for (const topic of tool.topics || []) {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * One menu's tools, alphabetically. The Traffic Signal Data menu holds 27
 * entries; in insertion order it is a wall of text to scan.
 */
export function toolsInGroup(tools, group) {
  return (tools || [])
    .filter((tool) => tool.group === group)
    .sort((a, b) => navLabel(a).localeCompare(navLabel(b)));
}

/** The home page cards, in HOME_ORDER. Anything unlisted lands at the end. */
export function homeTools(tools) {
  const cards = (tools || []).filter((tool) => tool.home !== false);
  const rank = new Map(HOME_ORDER.map((path, index) => [path, index]));
  const place = (tool) => (rank.has(tool.path) ? rank.get(tool.path) : HOME_ORDER.length);
  return cards
    .map((tool, index) => ({ tool, index }))
    // index breaks ties so unlisted tools keep their registry order
    .sort((a, b) => place(a.tool) - place(b.tool) || a.index - b.index)
    .map((entry) => entry.tool);
}

/** The cards above the divider. */
export function featuredTools(tools) {
  return homeTools(tools).slice(0, FEATURED_COUNT);
}

/** Everything below the divider. */
export function otherTools(tools) {
  return homeTools(tools).slice(FEATURED_COUNT);
}
