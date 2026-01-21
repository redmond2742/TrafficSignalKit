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
  TermsOfService: {
    title: "Terms of Service | Traffic Signal Kit",
    description:
      "Terms and conditions for using the Traffic Signal Kit tools and services.",
    path: "/terms-of-service",
  },
  SplitCalculator: {
    title: "Traffic Signal Split Calculator | Coordination & Timing Checks",
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
  detectionPlotter: {
    title: "Detection Channel Plotter | Detector Health & Events",
    description:
      "Visualize detection events by channel to validate detector performance.",
    path: "/detection-plotter",
  },
  delayEstimator: {
    title: "Detector Call Delay Estimator | Phase Service Timing",
    description:
      "Estimate call delays between detector actuations and phase service.",
    path: "/delay-estimator",
  },
  stuckDetectors: {
    title: "Stuck Detector Diagnostics | Signal Health Checks",
    description:
      "Identify detector channels that appear stuck on or off in high-resolution data.",
    path: "/stuck-detectors",
  },
  practiceExam: {
    title: "Traffic Signal Practice Exam | Certification Prep",
    description:
      "Practice multiple-choice questions for traffic engineering and signal timing.",
    path: "/practice-exam",
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
  "not-found": {
    title: "Page Not Found | Traffic Signal Kit",
    description: "The requested page could not be found.",
    path: "/",
  },
};
