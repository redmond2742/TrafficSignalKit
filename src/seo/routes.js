export const routeMeta = {
  home: {
    title: "Traffic Signal Kit | ATSPM & High-Resolution Signal Tools",
    description:
      "Analyze traffic signal performance with ATSPM metrics, high-resolution data visualizers, GPX time-space tools, and split calculators.",
    path: "/",
  },
  About: {
    title: "About Traffic Signal Kit | Traffic Signal Engineering Tools",
    description:
      "Learn how Traffic Signal Kit supports traffic engineers with controller event analysis, split history, and GPX visualization tools.",
    path: "/about",
  },
  Blog: {
    title: "Traffic Signal Kit Blog | ATSPM & Traffic Signal Insights",
    description:
      "Updates, experiments, and explainers on ATSPM metrics, high-resolution controller data, and signal timing workflows.",
    path: "/blog",
  },
  HighResDataExplainerPost: {
    title:
      "High-Resolution Data Explainer | Indiana Enumerations",
    description:
      "Learn how to load high-resolution controller CSVs, decode Indiana enumerations, and follow event timestamps using the explainer tool.",
    path: "/blog/high-resolution-data-explainer",
  },
  GPXMapperKnowledgeHubPost: {
    title: "GPX Mapper Guide | Map Tracks with Street View Checks",
    description:
      "Learn GPX input guidance, map workflow steps, and coordinate validation using the GPX Mapper tool.",
    path: "/blog/gpx-mapper-guide",
  },
  TermsOfService: {
    title: "Terms of Service | Traffic Signal Kit",
    description:
      "Terms and conditions for using the Traffic Signal Kit tools and services.",
    path: "/terms-of-service",
  },
  SplitCalculator: {
    title: "Traffic Signal Split Calculator | Coordination Checks",
    description:
      "Verify split allocations and cycle lengths during coordination and timing plan adjustments.",
    path: "/split-calculator",
  },
  HighResDataExplainer: {
    title: "High-Resolution Controller Data Explainer | ATSPM Events",
    description:
      "Understand ATSPM event enumerations and how high-resolution controller logs map to signal behavior.",
    path: "/explainer",
    faq: [
      {
        question: "What does high-resolution controller data capture?",
        answer:
          "It records controller events, signal states, and timing changes at 100 millisecond resolution for analysis.",
      },
      {
        question: "What format should I paste into the explainer?",
        answer:
          "Paste CSV rows that include a timestamp, event enumeration, and parameter such as phase or channel number.",
      },
    ],
  },
  gpxPlotter: {
    title: "GPX Time-Space Diagram Visualizer | Traffic Signal Analysis",
    description:
      "Plot GPX traces in time-space diagrams to evaluate progression and travel time.",
    path: "/gpx",
  },
  splitHistory: {
    title: "High-Resolution Split History | Phase Termination Analysis",
    description:
      "Calculate phase durations from high-resolution controller events to evaluate split performance.",
    path: "/split-history",
    faq: [
      {
        question: "What does the split history report show?",
        answer:
          "It summarizes each phase run time and indicates whether phases gapped out, maxed out, or were forced off.",
      },
      {
        question: "How is split history calculated?",
        answer:
          "The tool derives phase durations from high-resolution event logs between the start of green and end of red.",
      },
    ],
  },
  trafficSim: {
    title: "Traffic Signal Timing Simulator | Gap Out & Max Out",
    description:
      "Simulate basic intersection operations to understand gap-out/max-out behavior.",
    path: "/traffic-simulator",
  },

  gapOutGapReductionHelper: {
    title: "Gap-Out & Gap Reduction Helper | Traffic Signal Kit",
    description:
      "Upload high-resolution controller CSV data and detector mappings to estimate min green, passage time, and optional gap-reduction parameters.",
    path: "/gap-out-gap-reduction-helper",
  },
  cabinetPMScheduler: {
    title: "Signal Cabinet PM Scheduler | Preventative Maintenance",
    description:
      "Schedule preventative maintenance visits for signal cabinets with technician assignments and adjustable frequencies.",
    path: "/cabinet-pm-scheduler",
  },
  phasePlotter: {
    title: "Signal Phase Plotter | Red-Green-Yellow Visualization",
    description:
      "Plot phase states over time to troubleshoot timing logic and controller behavior.",
    path: "/phase-plotter",
    faq: [
      {
        question: "What does the phase plotter visualize?",
        answer:
          "It charts the state of each phase over time using high-resolution controller event data.",
      },
      {
        question: "How can I use the phase plotter results?",
        answer:
          "Use the plot to troubleshoot timing logic, verify phase sequences, and spot unexpected transitions.",
      },
    ],
  },
  gpxPhasePlotter: {
    title: "GPX + Phase Plotter | Time-Space & TSP Events",
    description:
      "Compare GPX movement with phase states and transit signal priority events.",
    path: "/gpx-phase-plotter",
  },
  gpxMapper: {
    title: "GPX Mapper | Map-Based Trace Visualization",
    description:
      "Map GPX tracks spatially to validate alignment and routes.",
    path: "/gpx-mapper",
  },
  gpxElevation: {
    title: "GPX Elevation Plotter | Grade & Profile Insights",
    description:
      "Plot elevation data from GPX files to analyze grade and profiles.",
    path: "/gpx-elevation",
  },
  detectorRLR: {
    title: "Red Light Running Detection | High-Resolution Events",
    description:
      "Analyze yellow/red light running events from controller and detection data.",
    path: "/detectorRLR",
  },
  yellowRedRunning: {
    title: "Yellow & Red Light Running Tool | Detector Off Events",
    description:
      "Identify detector-off events that occur during yellow or red intervals for mapped phases.",
    path: "/yellow-red-running",
  },
  preemptionPlotter: {
    title: "Preemption Timeseries Plotter | Enumeration Diagnostics",
    description:
      "Plot preemption enumerations (101-119) over time for diagnostics.",
    path: "/preemption-plotter",
  },
  preemptionEvaluator: {
    title: "Preemption Evaluator | Event Duration & Channel Analysis",
    description:
      "Find preemption events in high-resolution controller data, with durations, channels and a Gantt chart of every sequence.",
    path: "/preemption-evaluator",
  },
  enumerationMatrix: {
    title: "Enumeration Matrix | Phase/Channel Event Diagnostics",
    description:
      "Compare enumeration events against phase/channel values with hoverable timestamps.",
    path: "/enumeration-matrix",
  },
  detectionPlotter: {
    title: "Detection Channel Plotter | Detector Health & Events",
    description:
      "Visualize detection events by channel to validate detector performance.",
    path: "/detection-plotter",
  },
  detectorBubbleChart: {
    title: "Detector Bubble Chart | Gap and Duration by Cycle",
    description:
      "Plot detector off-to-on gaps by cycle with bubble size scaled to detector on duration and phase color coding.",
    path: "/detector-bubble-chart",
  },
  phaseBubbleScatter: {
    title: "Phase Bubble Scatter | Phase Service by Unique Cycle",
    description:
      "Analyze phase service splits with bubble size, transparency, and fill intensity tied to detector OFF transitions.",
    path: "/phase-bubble-scatter",
  },
  delayEstimator: {
    title: "Detector Call Delay Estimator | Phase Service Timing",
    description:
      "Estimate call delays between detector actuations and phase service.",
    path: "/delay-estimator",
  },
  skippedPhaseFinder: {
    title: "Skipped Phase Finder | Detector Calls Without Service",
    description:
      "Identify detector on events where the assigned phase is not served within two minutes.",
    path: "/skipped-phase-finder",
  },
  coordinationLearningTool: {
    title: "Signal Coordination Learning Tool | Cycle & Offsets",
    description:
      "Use interactive sliders and visuals to learn cycle length, split times, offsets, scheduler plans, and coordinated green phases across multiple signals.",
    path: "/coordination-learning-tool",
  },
  signalOffsets: {
    title: "Signal Offset Calculator | Coordinated Phase Alignment",
    description:
      "Compare high-resolution controller logs to compute coordinated phase offsets by timing events.",
    path: "/signal-offsets",
  },
  stuckDetectors: {
    title: "Stuck Detector Diagnostics | Signal Health Checks",
    description:
      "Identify detector channels that appear stuck on or off in high-resolution data.",
    path: "/stuck-detectors",
  },
  pedestrianInvestigator: {
    title: "Pedestrian Investigator | Walk & Clearance Analysis",
    description:
      "Analyze pedestrian walk, clearance, and don't-walk intervals from high-resolution controller logs.",
    path: "/pedestrian-investigator",
  },
  pedConflictCorrelator: {
    title: "Pedestrian Conflict Correlator | Ped Phase Overlap",
    description:
      "Correlate detector channel on/off events with pedestrian walk and clearance intervals to visualize turning vehicle and pedestrian conflict exposure.",
    path: "/ped-conflict-correlator",
    faq: [
      {
        question: "How does the tool identify a pedestrian conflict?",
        answer:
          "It builds a window from the pedestrian interval you choose, pads it by your lead and lag seconds, and flags detector on, off, or occupancy events that fall inside that window.",
      },
      {
        question: "Which enumerations does the correlator use?",
        answer:
          "Pedestrian intervals come from events 21, 22, 23, 24, and 45, and detector activity comes from 82/81 for vehicles, 90/89 for ped detectors, or 94/93 for TSP detectors.",
      },
      {
        question: "Is my high-resolution data uploaded anywhere?",
        answer:
          "No. Pasted text and selected files are parsed and analyzed in your browser using a local web worker.",
      },
    ],
  },
  dashboard: {
    title: "Signal Data Dashboard | Detector Status & Phase Insights",
    description:
      "Process high-resolution data to review detector status, phase plots, and split history in one dashboard.",
    path: "/dashboard",
  },
  tspDashboard: {
    title: "TSP Dashboard | Transit Signal Priority Event Analytics",
    description:
      "Upload high-resolution CSV files to analyze TSP channels, event frequencies, time-series patterns, and check-in/check-out performance metrics.",
    path: "/tsp-dashboard",
  },
  practiceExam: {
    title: "Traffic Signal Practice Exam | Certification Prep",
    description:
      "Practice multiple-choice questions for traffic engineering and signal timing.",
    path: "/practice-exam",
  },
  imageAnnotator: {
    title: "YOLO Image Annotator | Signal Training Dataset Builder",
    description:
      "Draw bounding boxes around traffic signal heads in roadway images and export a YOLO training dataset with train/val splits, entirely in your browser.",
    path: "/yolo-image-annotator",
    faq: [
      {
        question: "Does my image data leave my computer?",
        answer:
          "No. Images are decoded, annotated, and packed into the export zip entirely in your browser. There is no server, no account, and no upload.",
      },
      {
        question: "What format does the export use?",
        answer:
          "A zip containing images/train, images/val, matching labels folders of normalized class cx cy w h text files, and a data.yaml. Images are copied byte for byte, never re-encoded.",
      },
      {
        question: "How are train and validation images split?",
        answer:
          "By hashing each filename, so adding more images later never reshuffles the existing split. Frames sharing a trailing number can be grouped so near-duplicate video frames stay on the same side.",
      },
    ],
  },
  videoFrameExtractor: {
    title: "Video Frame Extractor | Sync Frames to Timestamps",
    description:
      "Extract video frames at a chosen FPS or from timestamp CSVs using a sync reference frame.",
    path: "/video-frame-extractor",
  },
  phaseStartTable: {
    title: "Phase Start Table | High-Resolution Interval Starts",
    description:
      "Generate a table of phase start timestamps for green, yellow, and red intervals.",
    path: "/phase-start-table",
  },
  messageSignDesigner: {
    title: "Changeable Message Sign Designer | CMS Preview",
    description:
      "Preview changeable message sign text with realistic sizing.",
    path: "/message-sign-designer",
  },
  Reference: {
    title: "Traffic Signal Reference | Quick Notes & Resources",
    description:
      "Quick reference notes and resources for traffic signal timing work.",
    path: "/reference",
  },
  OffsetsAreThePoint: {
    title: "Offsets Are the Point | Coordination & the Green Wave",
    description:
      "Why cycle length, splits, and time-of-day schedules exist only to serve the green wave, and how to reason about signal offsets.",
    path: "/blog/offsets-are-the-point",
  },
  HighResSplitHistoryPost: {
    title: "Split History Guide | Turn Cycle Data into Splits",
    description:
      "A walkthrough of the inputs, workflow, and filtering that make high-resolution split history reports fast to interpret.",
    path: "/blog/high-resolution-split-history",
  },
  TimeseriesAllEnumerationsPost: {
    title: "Enumeration Timeline Guide | Every Event on One Plot",
    description:
      "Turn high-resolution controller logs into a visual map of preemption, TSP, and phase activity on a single event timeline.",
    path: "/blog/timeseries-plot-all-enumerations",
  },
  geoJsonMapper: {
    title: "GeoJSON Mapper | Style & Export GeoJSON Maps",
    description:
      "Upload GeoJSON files, style the features on an interactive map, and export the result as an image for reports and exhibits.",
    path: "/geojson-mapper",
  },
  phaseBubblePlot: {
    title: "Phase Bubble Plot | Split Failure & Red Light Metrics",
    description:
      "Combine detector-to-phase mappings with split history to summarize split failure and red-light running metrics by phase.",
    path: "/phase-bubble-plot",
  },
  patternCalendar: {
    title: "Pattern Calendar | Coordination Patterns by Day",
    description:
      "Visualize coordination pattern changes by day and time of day in a calendar view, so schedule gaps and overrides stand out.",
    path: "/pattern-calendar",
  },
  basicTimingSeeker: {
    title: "Basic Timing Seeker | Estimate GTSS Timing Values",
    description:
      "Estimate basic signal timing parameters such as minimum green, passage, and clearance directly from high-resolution data.",
    path: "/basic-timing-seeker",
  },
  startUpLossAverage: {
    title: "Start Up Loss Average | Queue Start-Up Loss Time",
    description:
      "Estimate start-up loss time from green intervals and detector-off events across many cycles, averaged by phase.",
    path: "/startup-loss-average",
  },
  timeToReduce: {
    title: "Time to Reduce | Min Green, Extension & Gap-Out",
    description:
      "Combine controller events with detector assignments to see how long each phase sits in minimum green, extension, and gap-out.",
    path: "/time-to-reduce",
  },
  splitFailureChecker: {
    title: "Split Failure Checker | Green Ends with Demand Waiting",
    description:
      "Flag green terminations where stop bar detectors are still occupied, a direct indicator of split failure on that phase.",
    path: "/split-failure-checker",
  },
  detectorEventHeatMap: {
    title: "Detector Event Heat Map | Occupancy by Time of Day",
    description:
      "Heat map detector occupancy duration by time of day and phase or channel mapping to spot stuck, noisy, or idle detection.",
    path: "/detector-event-heat-map",
  },
  blockLogic: {
    title: "Block Logic Builder | Test Rules on Controller Data",
    description:
      "Build block-diagram logic rules, load templates, and step through them against high-resolution controller data event by event.",
    path: "/tools/block-logic",
  },
  "not-found": {
    title: "Page Not Found | Traffic Signal Kit",
    description: "The requested page could not be found.",
    // No path: a canonical here would point every 404 at the homepage.
    robots: "noindex, follow",
  },
};

/**
 * The same entries keyed by path instead of route name.
 *
 * routeMeta is keyed by route name; toolRegistry.js is keyed by path. Rather
 * than rekey either one -- their titles are deliberately different, short UI
 * labels versus keyword-loaded search titles -- this derives the second
 * keyspace so build scripts and tests, which only know paths, can look meta up
 * without the router.
 */
export const metaByPath = Object.fromEntries(
  Object.entries(routeMeta)
    .filter(([, meta]) => meta.path)
    .map(([name, meta]) => [meta.path, { ...meta, name }])
);
