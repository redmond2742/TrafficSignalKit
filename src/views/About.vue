<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Traffic Signal Kit</h1>

    <h3>
      Every month this year, I’m rolling out free & open source tools for
      traffic engineers. These are rapid-fire, proof-of-concept creations
      designed to innovate, inspire, and provide insights into traffic signal
      operations. I’m building these tools in public, with assistance from
      ChatGPT and my journey into mastering Vue.js. Expect raw, early-stage
      concepts—this is about speed, experimentation, and finding what truly
      makes an impact. Your feedback is my roadmap! ❤️ Click that heart button
      to vote on features and shape the future of these tools.
    </h3>

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
  name: "About",
  data() {
    return {
      panel: ["detailed-explain"],
      posts: [
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com-high-resolution-controller-data-explainer-ATSPM.png",
          title: "High Resolution Data Explainer",
          description:
            "Explore traffic signal controller enumerations and high resolution data logs",
          link: "/explainer",
          topics: ["Controller Data", "Enumerations"],
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/trafficsignalkit.com+-+split+history+phase+termination+table.png",
          title: "High Resolution Split History",
          description: "Calculate Phase Durations from High Resolution Data",
          link: "/split-history",
          topics: ["Controller Data", "Enumerations", "Split"],
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/Trafficsignalkit.com+-+Signal+Phase+Plotter+-+Red-Green-Yellow.png",
          title: "Phase Plotter",
          description: "Plot Phase State over Time",
          link: "/phase-plotter",
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
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com+-+GPX+Map+and+Table.png",
          title: "GPX Mapper",
          description: "Plot GPX tracks on a map",
          link: "/gpx-mapper",
          topics: ["GPX", "Map"],
        },
        {
          image:
            "https://trafficsignalkit.s3.us-east-2.amazonaws.com/Photos/TrafficSignalKit.com-PracticeExamTE.jpg",
          title: "Practice Exam",
          description: "Practice exam questions and grading",
          link: "/PracticeExam",
          topics: ["Exam", "Practice", "TE"],
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
