<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Traffic Signal Kit</h1>

    <p>
      In 2024, I'm diving into Vue.js with Traffic Signal Kit. Each month, I'll
      build a practical traffic signal-related tool to learn different Vue
      aspects. I am building in public and using ChatGPT will help scale it up
      fast. These tools won't be polished; they're just proof of concepts. Your
      feedback (with the heart button) guides my future resources. The goal is
      to understand the landscape of these tools without getting cought up in
      feature creep. Remember, bare bones proof of concepts! To move quickly,
      everything about this website is very much a work in progress.
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
            "../src/assets/covershots/trafficsignalkit.com-split-calculator.png",
          title: "Split Calculator",
          description: "Verify splits and cycle lengths during adjustments",
          link: "/split-calculator",
          topics: ["Coordination", "Split", "Calculator"],
        },
        {
          image:
            "../src/assets/covershots/trafficsignalkit.com-high-resolution-controller-data-explainer-ATSPM.png",
          title: "High Resolution Data Explainer",
          description:
            "Explore traffic signal controller enumerations and high resolution data logs",
          link: "/explainer",
          topics: ["Controller Data", "Enumerations"],
        },
        {
          image:
            "../src/assets/covershots/trafficsignalkit.com-timespace-diagram-gpx-plot.png",
          title: "Time Space Diagram Visulizer",
          description: "Plot a GPX file in a timespace diagram plot",
          link: "/gpx",
          topics: ["GPX", "Time space"],
        },
        {
          image:
            "../src/assets/covershots/trafficsignalkit.com - split history phase termination table.png",
          title: "High Resolution Split History",
          description: "Calculate Phase Durations from High Resolution Data",
          link: "/split-history",
          topics: ["Controller Data", "Enumerations", "Split"],
        },
        {
          image:
            "../src/assets/covershots/trafficsignalkit.com - intersection simulator.png",
          title: "Max Out and Gap Out Traffic Simulator",
          description: "Simulate Basic Intersection Functionality",
          link: "/traffic-simulator",
          topics: ["Simulation", "Basic Timing"],
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
