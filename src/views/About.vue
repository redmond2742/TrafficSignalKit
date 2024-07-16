<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Traffic Signal Kit</h1>

    <p>
      Each month in 2024, I am building free traffic signal related tools for
      traffic engineers. These tools bare bones proof of concepts that allow me
      to move quickly and test what is worthy of additional resources. I am
      building in public and leveraging ChatGPT to write code and help me learn
      Vue.JS. Feedback (with the heart button) guides future features.
    </p>

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
          topics: ["GPX", "Time space"],
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
