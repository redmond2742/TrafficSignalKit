<template>
  <v-container class="sim-page">
    <v-sheet class="sim-hero" elevation="2">
      <div class="sim-hero__content">
        <h1 class="sim-hero__title">Gap Out/Max Out Intersection Simulator</h1>
        <p class="sim-hero__subtitle">
          Explore real-world signal timing behavior with an interactive
          intersection model. Tune timings, add vehicles, and watch how phases
          end by gap out or max out.
        </p>
      </div>
    </v-sheet>

    <v-row class="sim-info" dense>
      <v-col cols="12" md="5">
        <v-card class="sim-info__card" elevation="2">
          <v-card-title>About the Simulator</v-card-title>
          <v-card-text>
            Traffic signal events like "gap out" and "max out" are essential
            concepts in managing intersections. With this simulator, you can
            explore how these events happen and understand their significance.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <v-expansion-panels v-model="panel" multiple>
          <v-expansion-panel
            title="Detailed Explanation About This Tool"
            value="detailed-explain"
          >
            <v-expansion-panel-text>
              <b>What is "Gap Out"?</b> "Gap out" occurs when the traffic light
              changes from green to yellow because there are no vehicles
              detected in the intersection for a specific period. In simpler
              terms, the green light ends because the intersection becomes
              temporarily empty of cars. <br />
              <u>Example:</u> Imagine a green light at an intersection, and the
              traffic flows smoothly. If there's a brief moment when no cars
              are approaching or waiting at the intersection, the traffic
              signal will "gap out" and transition to yellow, signaling that
              the green phase is ending. <br />
              <b>What is "Max Out"?</b> "Max out" happens when the green light
              duration reaches its maximum limit, regardless of whether there
              are still cars waiting. This ensures that traffic in the other
              directions gets a chance to move. <br />
              <u>Example:</u> Suppose the green light has a maximum duration
              set to allow traffic to flow smoothly. Even if there are still
              cars waiting, once this maximum time is reached, the light will
              "max out," turning yellow to give other directions their turn.
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel title="Example: Using This Tool" value="example">
            <v-expansion-panel-text>
              A. Try adding vehicles to a single direction. Notice the light
              goes green for that phase. <br />B. Try adding vehicles to the
              opposing phase and see how the intersection gaps out or maxes
              out. <br />C. Modify the Min and Max times while adding lots of
              vehicles on both streets. <br />D. Explore the event history to
              see how long each phase was served.
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <IntersectionSim class="sim-core" />
  </v-container>
</template>

<script>
import IntersectionSim from "../components/IntersectionSim";

export default {
  components: {
    IntersectionSim,
  },

  data() {
    return {
      processedData: null,
      panel: [],
      phaseDurationObj: "",
    };
  },
  methods: {
    handleProcessedData(data) {
      this.processedData = data;
    },
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
    loadPhaseDurationObj(data) {
      this.phaseDurationObj = data;
      console.log(this.phaseDurationObj);
    },
  },
};
</script>
<style scoped>
.sim-page {
  padding-top: 16px;
  padding-bottom: 40px;
}

.sim-hero {
  padding: 28px 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, #0b2b4e 0%, #1c4a7a 45%, #2d6ca3 100%);
  color: #fff;
  margin-bottom: 24px;
}

.sim-hero__content {
  max-width: 820px;
}

.sim-hero__title {
  font-size: clamp(1.8rem, 2.6vw, 2.6rem);
  font-weight: 700;
  margin-bottom: 8px;
}

.sim-hero__subtitle {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
}

.sim-info {
  margin-bottom: 24px;
}

.sim-info__card {
  border-radius: 16px;
}

.sim-core {
  margin-top: 8px;
}
</style>
