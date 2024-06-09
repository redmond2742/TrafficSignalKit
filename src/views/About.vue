<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Traffic Signal Kit</h1>

    <p>
      Each month in 2024, I am building free traffic signal related tools for
      traffic engineers. These tools bare bones proof of concepts that allow me
      to move quickly and test what is worthy of additional resources. I am
      building in public and using ChatGPT to learn Vue.JS. Feedback (with the
      heart button) guides future features.
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
            "https://lh3.googleusercontent.com/drive-viewer/AKGpihZG2a-Ei2eQLarbqwc-xNl0aXR0bgYKrzMJfpGJHmtc0n0eOcJ9TWzNUioTtrne5UfrWl_CzUSx-D2PS9CAo1rDGpSgwXNLXk8=s1600-rw-v1",
          title: "Split Calculator",
          description: "Verify splits and cycle lengths during adjustments",
          link: "/split-calculator",
          topics: ["Coordination", "Split", "Calculator"],
        },
        {
          image:
            "https://lh3.googleusercontent.com/drive-viewer/AKGpihZuo8TKJsq699flefyMZbsWWJE8QgA1kAmOS8WtOQxLtpIGH9-qC_LiqF2pS8HT684BDnmLhS8tTPRsYsfl_EWHYovO8OmKZA0=s2560",
          title: "High Resolution Data Explainer",
          description:
            "Explore traffic signal controller enumerations and high resolution data logs",
          link: "/explainer",
          topics: ["Controller Data", "Enumerations"],
        },
        {
          image:
            "https://lh3.googleusercontent.com/drive-viewer/AKGpihYosiYRQji_FJmZD1O82ATwQR_TtpjH72aagT3WqxdGC-ilYy_oPW6sRklswAZ5rlk-51FOpYWZbIMQODAU8SdnYBRUBUBZEDQ=s1600-rw-v1",
          title: "Time Space Diagram Visulizer",
          description: "Plot a GPX file in a timespace diagram plot",
          link: "/gpx",
          topics: ["GPX", "Time space"],
        },
        {
          image:
            "https://lh3.googleusercontent.com/drive-viewer/AKGpihZkQwOL8h8B9rdxvv6lpeHxB2nhcy9Ly7aogakbNGUSy82dVivZ_mNIU8aRgcw61H6LFZhhMFjUdjTwrnOYTmHCSByNBS-gYFE=s2560",
          title: "High Resolution Split History",
          description: "Calculate Phase Durations from High Resolution Data",
          link: "/split-history",
          topics: ["Controller Data", "Enumerations", "Split"],
        },
        {
          image:
            "https://lh3.googleusercontent.com/drive-viewer/AKGpihYd_ioQLNiOKM4vCTjiUq0qn8YrMsP4rxREVoehTB89GdILJtAdq_hWT5ecoHxMFAYP0Vz37ggFziNxutWkrmtVILMowy5FNQY=s2560",
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
