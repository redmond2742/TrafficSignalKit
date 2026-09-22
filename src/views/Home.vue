<template>
  <div class="home-page">
    <p class="sr-only">
      Traffic Signal Kit homepage with searchable traffic engineering tools and simulators.
    </p>
    <v-card class="intro-card" variant="outlined">
      <h1 class="h1-center-text page-title">Traffic Signal Kit</h1>
      <v-card-text class="intro-text">
        Various experimental free & open source tools for traffic engineers.
        These are rapid-fire, proof-of-concept creations designed to innovate,
        inspire, and provide insights into traffic signal operations. Expect
        raw, early-stage concepts—this is about speed, experimentation, and
        finding what truly makes an impact. Your feedback is my roadmap! ❤️
        Click that heart button to vote on features and shape the future of
        these tools.
      </v-card-text>
      <v-card-actions class="intro-actions">
        <v-btn color="primary" variant="flat" to="/dashboard">
          Go to Dashboard
        </v-btn>
        <v-btn color="secondary" variant="flat" to="/tsp-dashboard">
          Go to TSP Dashboard
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-container class="search-section">
      <v-row justify="center" no-gutters>
        <v-col cols="12" md="8" lg="6">
          <v-text-field
            v-model="searchQuery"
            label="Search tools and topics"
            placeholder="detection, pedestrians, GPX, red light running…"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            autocomplete="off"
          />
        </v-col>
      </v-row>

      <div class="topic-filter">
        <v-chip
          v-for="topic in visibleTopics"
          :key="topic.name"
          class="ma-1"
          size="small"
          role="button"
          :aria-pressed="String(activeTopic === topic.name)"
          :color="activeTopic === topic.name ? 'primary' : undefined"
          :variant="activeTopic === topic.name ? 'flat' : 'outlined'"
          @click="toggleTopic(topic.name)"
        >
          {{ topic.name }} ({{ topic.count }})
        </v-chip>
        <v-chip
          v-if="hiddenTopicCount"
          class="ma-1"
          size="small"
          variant="text"
          role="button"
          :aria-expanded="String(showAllTopics)"
          @click="showAllTopics = !showAllTopics"
        >
          {{ showAllTopics ? "Show fewer" : `+${hiddenTopicCount} more topics` }}
        </v-chip>
      </div>

      <p class="tool-count">{{ resultSummary }}</p>
    </v-container>

    <v-container>
      <v-row v-if="filteredPosts.length" no-gutters>
        <v-col
          v-for="post in filteredPosts"
          :key="post.link"
          cols="12"
          sm="6"
          md="4"
          ><v-sheet class="ma-2 pa-2">
            <DisplayCard
              :image="post.image"
              :image-alt="post.title"
              :title="post.title"
              :description="post.description"
              :link="post.link"
              :topics="post.topics"
          /></v-sheet>
        </v-col>
      </v-row>
      <div v-else class="no-results">
        <p>No tools match that search.</p>
        <v-btn variant="outlined" @click="clearSearch">Clear search</v-btn>
      </div>
    </v-container>
  </div>
</template>

<script>
import DisplayCard from "@/components/foundational/DisplayCard.vue";
export default {
  components: {
    DisplayCard,
  },
  name: "Home",
  data() {
    return {
      panel: ["detailed-explain"],
      searchQuery: "",
      activeTopic: null,
      showAllTopics: false,
      posts: [
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Red+Light+Running.png",
          title: "Yellow & Red Light Running Tool (V2)",
          description:
            "Detect detector-off events during yellow or red intervals",
          link: "/yellow-red-running",
          topics: ["Red Light Running", "Controller Data"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Offset+Calculation.png",
          title: "Coordination Learning Tool",
          description:
            "Interactive sliders and visuals for cycle length, splits, offsets, scheduler plans, and coordinated phases.",
          link: "/coordination-learning-tool",
          topics: ["Coordination", "Education", "Offsets"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Vehicle+and+Pedestrian+Delay.png",
          title: "Delay & Count Estimator",
          description: "Estimate detector call delays to phase service",
          link: "/delay-estimator",
          topics: ["Controller Data", "Delay", "Enumerations"],
        },
        {
          image: "/images/yolo-image-annotator.png",
          title: "YOLO Image Annotator",
          description:
            "Box traffic signal heads in roadway images and export a YOLO training dataset.",
          link: "/yolo-image-annotator",
          topics: ["Machine Learning", "Detection", "Datasets", "Video"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Vehicle+and+Pedestrian+Delay.png",
          title: "Pedestrian Conflict Correlator",
          description:
            "Correlate detector on/off events with pedestrian walk and clearance intervals to see turning conflict exposure.",
          link: "/ped-conflict-correlator",
          topics: ["Controller Data", "Pedestrians", "Safety", "Detection"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Vehicle+and+Pedestrian+Delay.png",
          title: "Pedestrian Investigator",
          description:
            "Summarize pedestrian walk, clearance, and crossing distance estimates.",
          link: "/pedestrian-investigator",
          topics: ["Controller Data", "Pedestrians", "Diagnostics"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Stuck Detector Finder",
          description:
            "Find detectors that appear to stay on in high-resolution data",
          link: "/stuck-detectors",
          topics: ["Controller Data", "Detection", "Diagnostics"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Skipped Phase Finder",
          description:
            "Find detector calls where the phase is not served within two minutes",
          link: "/skipped-phase-finder",
          topics: ["Controller Data", "Detection", "Diagnostics"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Split Failure Checker",
          description:
            "Flag green terminations with stop bar detectors still on",
          link: "/split-failure-checker",
          topics: ["Controller Data", "Detection", "Diagnostics"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+All+Enumerations+Plot.png",
          title: "Timeseries Plot All Enumerations",
          description: "Plot preemption (101-119) enumeration events over time",
          link: "/preemption-plotter",
          topics: ["Controller Data", "Enumerations", "Preemption"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+All+Enumerations+Plot.png",
          title: "Enumeration Matrix",
          description:
            "Plot enumeration events by phase/channel with timestamp tooltips",
          link: "/enumeration-matrix",
          topics: ["Controller Data", "Enumerations", "Diagnostics"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Detection+Events+Graph.png",
          title: "Detection Channel Plotter",
          description:
            "Plot detection enumeration events by channel over time",
          link: "/detection-plotter",
          topics: ["Controller Data", "Enumerations", "Detection"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Detection+Events+Graph.png",
          title: "Detector Bubble Chart",
          description:
            "Bubble chart of detector on-duration and off-to-on gaps by cycle",
          link: "/detector-bubble-chart",
          topics: ["Controller Data", "Detection", "Cycles"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Detection+Events+Graph.png",
          title: "Phase Bubble Scatter",
          description:
            "Bubble scatter of phase split, time since last ON, and detector OFF behavior",
          link: "/phase-bubble-scatter",
          topics: ["Controller Data", "Detection", "Phase"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Detection+Events+Graph.png",
          title: "Detector Event Heat Map",
          description:
            "Heat map detector activity by time of day and phase/channel mappings",
          link: "/detector-event-heat-map",
          topics: ["Controller Data", "Detection", "Heat Map"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Start Up Loss Average",
          description:
            "Estimate start-up loss from green intervals and detector-off events",
          link: "/startup-loss-average",
          topics: ["Controller Data", "Detection", "Performance"],
        },

        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Gap-Out & Gap Reduction Helper",
          description:
            "Estimate min green, passage, and optional gap-reduction settings from high-resolution detector headways.",
          link: "/gap-out-gap-reduction-helper",
          topics: ["Controller Data", "Detection", "Timing"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Offset+Calculation.png",
          title: "Traffic Signal Cabinet PM Scheduler",
          description:
            "Plan preventative maintenance visits by technician and frequency.",
          link: "/cabinet-pm-scheduler",
          topics: ["Maintenance", "Scheduling", "Cabinets"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com+-+split+history+phase+termination+table.png",
          title: "High Resolution Split History",
          description: "Calculate Phase Durations from High Resolution Data",
          link: "/split-history",
          topics: ["Controller Data", "Enumerations", "Split"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Offset+Calculation.png",
          title: "Signal Offset Calculator",
          description: "Calculate coordinated phase offsets cycle by cycle",
          link: "/signal-offsets",
          topics: ["Controller Data", "Coordination", "Offsets"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Offset+Calculation.png",
          title: "Pattern Calendar",
          description:
            "Visualize coordination pattern changes by day and time in a calendar view.",
          link: "/pattern-calendar",
          topics: ["Controller Data", "Coordination", "Calendar"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+GPX+Map+and+Table.png",
          title: "GPX Mapper",
          description: "Plot GPX tracks on a map",
          link: "/gpx-mapper",
          topics: ["GPX", "Map"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+GPX+Map+and+Table.png",
          title: "GeoJSON Mapper",
          description: "Upload and style GeoJSON files with map image export",
          link: "/geojson-mapper",
          topics: ["GeoJSON", "Map", "Visualization"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Yellow+and+Red+Light+Running.png",
          title: "Basic Timing Seeker",
          description:
            "Estimate GTSS timing parameters from high-resolution controller data.",
          link: "/basic-timing-seeker",
          topics: ["Controller Data", "Timing", "GTSS"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-high-resolution-controller-data-explainer-ATSPM.png",
          title: "High Resolution Data Explainer",
          description:
            "Explore traffic signal controller enumerations and high resolution data logs",
          link: "/explainer",
          topics: ["Controller Data", "Enumerations"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-GPX+and+High+Resolution+Signal+Data+for+Transit+Signal+Priority+(TSP).png",
          title: "GPX Time-Space & Phase Plotter (with TSP Events)",
          description:
            "Plot GPX as time space combined with Phase State over Time (with Transit Signal Priority (TSP) events)",
          link: "/gpx-phase-plotter",
          topics: [
            "Controller Data",
            "Enumerations",
            "GPX",
            "Time-Space",
            "Coordination",
          ],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/Trafficsignalkit.com+-+Signal+Phase+Plotter+-+Red-Green-Yellow.png",
          title: "Phase Plotter",
          description: "Plot Phase State over Time",
          link: "/phase-plotter",
          topics: ["Controller Data", "Enumerations"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com+-+intersection+simulator.png",
          title: "Max Out and Gap Out Traffic Simulator",
          description: "Simulate Basic Intersection Functionality",
          link: "/traffic-simulator",
          topics: ["Simulation", "Basic Timing"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/Trafficsignalkit.com+-+Changeable+Message+Sign+Editor.png",
          title: "Message Sign Designer",
          description:
            "Preview changeable message sign text with realistic sizing.",
          link: "/message-sign-designer",
          topics: ["Message Signs", "Visualization", "Field Devices"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-split-calculator.png",
          title: "Split Calculator",
          description: "Verify splits and cycle lengths during adjustments",
          link: "/split-calculator",
          topics: ["Coordination", "Split", "Calculator"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-timespace-diagram-gpx-plot.png",
          title: "Time Space Diagram Visulizer",
          description: "Plot a GPX file in a timespace diagram plot",
          link: "/gpx",
          topics: ["GPX", "Time-Space"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-PracticeExamTE.jpg",
          title: "Practice Exam",
          description: "Practice exam questions and grading",
          link: "/practice-exam",
          topics: ["Exam", "Practice", "TE"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-GPX+Elevation+Plot+and+Location.png",
          title: "GPX Elevation Plotter",
          description: "Plot elevation data from GPX files",
          link: "/gpx-elevation",
          topics: ["GPX", "Elevation", "Chart"],
        },
            {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-Yellow+and+Red+Light+Running+Detection.png",
          title: "Red Light Runner (Original)",
          description: "Table of Yellow and Red light running events",
          link: "/detectorRLR",
          topics: ["Red Light Running", "Controller Data"],
        },
      ],
    };
  },
  computed: {
    /** Every topic with how many tools carry it, busiest first. */
    topicCounts() {
      const counts = new Map();
      for (const post of this.posts) {
        for (const topic of post.topics || []) {
          counts.set(topic, (counts.get(topic) || 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },
    /**
     * Only topics shared by more than one tool earn a chip by default: of the
     * 40-odd topics in use, most appear on a single tool and would bury the
     * ones that actually group things. The rest stay reachable through the
     * text search and the "more topics" toggle.
     */
    visibleTopics() {
      return this.showAllTopics ? this.topicCounts : this.topicCounts.filter((t) => t.count > 1);
    },
    hiddenTopicCount() {
      return this.topicCounts.filter((t) => t.count === 1).length;
    },
    searchTerms() {
      return (this.searchQuery || "")
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);
    },
    filteredPosts() {
      const terms = this.searchTerms;
      return this.posts.filter((post) => {
        if (this.activeTopic && !(post.topics || []).includes(this.activeTopic)) return false;
        if (!terms.length) return true;
        // Title, blurb and topics are all searchable, so "pedestrians" finds a
        // tool whether the word is in its name or only in its topics.
        const haystack = [post.title, post.description, ...(post.topics || [])]
          .join(" ")
          .toLowerCase();
        // Every term has to land somewhere, so extra words narrow the list.
        return terms.every((term) => haystack.includes(term));
      });
    },
    resultSummary() {
      const total = this.posts.length;
      const shown = this.filteredPosts.length;
      if (shown === total) {
        return `Browse ${total} practical tools for traffic signal analysis and operations.`;
      }
      const scope = this.activeTopic ? ` in ${this.activeTopic}` : "";
      return `${shown} of ${total} tools${scope} ${shown === 1 ? "matches" : "match"} your search.`;
    },
  },
  methods: {
    toggleTopic(topic) {
      this.activeTopic = this.activeTopic === topic ? null : topic;
    },
    clearSearch() {
      this.searchQuery = "";
      this.activeTopic = null;
    },
  },
};
</script>

<style scoped>
.home-page {
  padding-bottom: 1.5rem;
}

.page-title {
  margin-top: 1rem;
  margin-bottom: 0.25rem;
}

.search-section {
  padding-top: 8px;
  padding-bottom: 0;
}

.topic-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
}

.no-results {
  text-align: center;
  padding: 40px 16px;
  opacity: 0.8;
}

.no-results p {
  margin-bottom: 12px;
}

.tool-count {
  text-align: center;
  color: #4e5f6c;
  margin: 0.25rem 0 1rem;
  font-size: 0.95rem;
}

</style>

