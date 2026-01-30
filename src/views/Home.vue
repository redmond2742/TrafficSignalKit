<template>
  <div>
    <v-card class="intro-card" variant="outlined">
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
      </v-card-actions>
    </v-card>

    <h1 class="h1-center-text">Traffic Signal Kit</h1>

    <v-container>
      <v-row no-gutters>
        <v-col
          v-for="(post, index) in posts"
          :key="index"
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalkit.com+-+Vehicle+and+Pedestrian+Delay.png",
          title: "Delay & Count Estimator",
          description: "Estimate detector call delays to phase service",
          link: "/delay-estimator",
          topics: ["Controller Data", "Delay", "Enumerations"],
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+Inductance_detectors.jpg",
          title: "Start Up Loss Average",
          description:
            "Estimate start-up loss from green intervals and detector-off events",
          link: "/startup-loss-average",
          topics: ["Controller Data", "Detection", "Performance"],
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
  methods: {
    checkImg() {
      console.log(image);
    },
  },
};
</script>

<style>
.intro-card {
  max-width: 960px;
  margin: 16px auto 24px;
  border-radius: 16px;
  background: rgba(0, 150, 136, 0.08);
}
.intro-text {
  font-size: 1.05rem;
  line-height: 1.6;
  text-align: left;
}
.intro-actions {
  justify-content: center;
  padding-bottom: 20px;
}
.left-justify-text {
  margin: 0;
  padding: 0;
  text-align: left; /* Aligning text to left */
}
p {
  text-align: left;
}
.buffer {
  width: 80%;
  height: 20px;
  float: center;
  padding: 0.25em;
}
li {
  text-align: left;
}

.v-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
