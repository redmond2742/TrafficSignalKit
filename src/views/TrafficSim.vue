<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Gap Out/Max Out Intersection Simulator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Intersection Simulator" value="about">
          <v-expansion-panel-text>
            Traffic signal events like "gap out" and "max out" are essential
            concepts in managing intersections. With this simple intersection
            simulator, you can explore how these events happen and understand
            their significance.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Detailed Explination About This Tool"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            <b>What is "Gap Out"?</b> "Gap out" occurs when the traffic light
            changes from green to yellow because there are no vehicles detected
            in the intersection for a specific period. In simpler terms, the
            green light ends because the intersection becomes temporarily empty
            of cars. <br />
            <u>Example:</u> Imagine a green light at an intersection, and the
            traffic flows smoothly. If there's a brief moment when no cars are
            approaching or waiting at the intersection, the traffic signal will
            "gap out" and transition to yellow, signaling that the green phase
            is ending. <br />
            <b>What is "Max Out"?</b> "Max out" happens when the green light
            duration reaches its maximum limit, regardless of whether there are
            still cars waiting. This ensures that traffic in the other
            directions gets a chance to move. <br />
            <u>Example:</u> Suppose the green light has a maximum duration set
            to allow traffic to flow smoothly. Even if there are still cars
            waiting, once this maximum time is reached, the light will "max
            out," turning yellow to give other directions their turn.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            A. Try adding vehicles to a single direction. Notice the light goes
            green for that phase. <br />B. Try adding vehicles to the opposing
            phase and see how the intersection gaps out or max's out. <br />C.
            Modify the Min and Max times while adding lot's of vehicles on both
            streets. <br />D. Explore the event history to see how long each
            phase was served.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <IntersectionSim></IntersectionSim>
  </div>
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
<style scoped></style>
