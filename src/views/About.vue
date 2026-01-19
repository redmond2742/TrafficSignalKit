<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">About Traffic Signal Kit</h1>
    <p class="intro-text">
      Traffic Signal Kit is a collection of focused, practical tools for traffic
      engineers and signal timing specialists. Each tool is designed to answer
      a specific operational question, from understanding controller events to
      visualizing GPX data. Use the links below to jump directly into a tool and
      explore the workflows that best fit your project.
    </p>

    <v-container>
      <v-row>
        <v-col
          v-for="section in sections"
          :key="section.title"
          cols="12"
          md="6"
        >
          <v-card class="ma-2 pa-4" elevation="2">
            <v-card-title class="section-title">
              {{ section.title }}
            </v-card-title>
            <v-card-text>
              <p class="section-description">{{ section.description }}</p>
              <v-list density="compact">
                <v-list-item
                  v-for="tool in section.tools"
                  :key="tool.title"
                  :to="tool.path"
                  link
                  class="tool-list-item"
                >
                  <v-list-item-title>{{ tool.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ tool.description }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
export default {
  name: "About",
  data() {
    return {
      sections: [
        {
          title: "Traffic Signal Data Tools",
          description:
            "Analyze controller event logs, splits, and detection events to understand timing performance and operational reliability.",
          tools: [
            {
              title: "High Resolution Split History",
              description:
                "Calculate phase durations from high-resolution controller data.",
              path: "/split-history",
            },
            {
              title: "Red Light Runner",
              description:
                "Review red-light running events using detection and phase data.",
              path: "/detectorRLR",
            },
            {
              title: "Timeseries Plot All Enumerations",
              description:
                "Plot preemption and event enumerations over time for diagnostics.",
              path: "/preemption-plotter",
            },
            {
              title: "Detection Channel Plotter",
              description:
                "Visualize detection events by channel to validate detector health.",
              path: "/detection-plotter",
            },
            {
              title: "Delay & Count Estimator",
              description:
                "Estimate call delay between detector actuations and phase service.",
              path: "/delay-estimator",
            },
            {
              title: "Phase Plotter",
              description:
                "Plot phase state changes across time to troubleshoot timing logic.",
              path: "/phase-plotter",
            },
            {
              title: "High Resolution Data Explainer",
              description:
                "Explore event enumerations and how they map to controller behavior.",
              path: "/explainer",
            },
          ],
        },
        {
          title: "Time-Space & GPX Tools",
          description:
            "Connect GPX traces with signal data to visualize movement, travel time, and time-space relationships.",
          tools: [
            {
              title: "Time Space Diagram Visualizer",
              description: "Plot GPX traces into a time-space diagram.",
              path: "/gpx",
            },
            {
              title: "GPX Time-Space & Phase Plotter",
              description:
                "Compare GPX movement with phase state and TSP events.",
              path: "/gpx-phase-plotter",
            },
            {
              title: "GPX Mapper",
              description: "Map GPX tracks spatially to validate alignment.",
              path: "/gpx-mapper",
            },
            {
              title: "GPX Elevation Plotter",
              description: "Plot elevation changes along a GPX path.",
              path: "/gpx-elevation",
            },
          ],
        },
        {
          title: "Miscellaneous Tools",
          description:
            "Supporting tools for coordination checks, simulations, and exam prep.",
          tools: [
            {
              title: "Split Calculator",
              description:
                "Validate splits and cycle length changes during coordination work.",
              path: "/split-calculator",
            },
            {
              title: "Max Out and Gap Out Traffic Simulator",
              description: "Simulate basic intersection functionality.",
              path: "/traffic-simulator",
            },
            {
              title: "Reference",
              description: "Quick reference notes and resources.",
              path: "/reference",
            },
            {
              title: "Practice Exam",
              description:
                "Practice exam questions and grading support for certification prep.",
              path: "/practice-exam",
            },
          ],
        },
      ],
    };
  },
};
</script>

<style scoped>
.intro-text {
  max-width: 900px;
  margin: 0 auto 24px auto;
  text-align: left;
}
.section-title {
  font-weight: 600;
}
.section-description {
  margin-bottom: 16px;
}
.tool-list-item :deep(.v-list-item-title) {
  font-weight: 500;
}
</style>
