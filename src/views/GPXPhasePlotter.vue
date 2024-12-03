<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">GPX & Phase Plotter (with TSP Events)</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: GPX Phase Plotter" value="about">
          <v-expansion-panel-text>
            A time-space diagram provides a comprehensive visualization of the
            spatiotemporal behavior of traffic movements, making it an
            invaluable tool for analyzing GPX files and adjusting signal timing.
            By plotting the geographical positions of vehicles over time,
            time-space diagrams offer a clear representation of how traffic
            flows through a given area, highlighting congestion patterns, travel
            speeds, and traffic density variations.
            <br /><br />
            GPX, short for GPS Exchange Format, serves as a standardized XML
            schema tailored to facilitate the exchange of GPS data across
            various software applications. When incorporated into GPX
            files—repositories of GPS data capturing vehicle
            trajectories—time-space diagrams emerge as powerful tools for
            traffic engineers and planners. These diagrams enable a
            comprehensive evaluation of existing signal timing plans, offering
            insights into traffic dynamics and identifying areas ripe for
            enhancement. By tracking vehicle movements through intersections and
            along road segments over time, decision-makers gain the ability to
            pinpoint congestion hotspots and fine-tune signal phasing and timing
            parameters accordingly. This optimization process, in turn, drives
            improvements in overall traffic efficiency and safety. Moreover,
            time-space diagrams play a crucial role in assessing proposed signal
            timing adjustments, providing visual simulations that highlight
            potential impacts on traffic flow dynamics. Armed with this
            information, stakeholders can make informed decisions, leading to
            the implementation of more effective traffic management strategies.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="GPX Time Space Visualizer TODO List"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            * Update Extend green on the plot
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            GPX Data & Signal High Resolution Data needed during the same time
            period.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <ProcessGPXPhasePlotter></ProcessGPXPhasePlotter>
  </div>
  <br />
</template>
<script>
import ProcessGPX from "../components/ProcessGPX.vue";
import ProcessGPXPhasePlotter from "../components/ProcessGPXPhasePlotter.vue";

export default {
  name: "GpxPlotter",
  components: {
    ProcessGPX,
    ProcessGPXPhasePlotter,
  },
  data() {
    return {
      panel: [],
      xmlString: "",
    };
  },
  methods: {},
};
</script>
<style scoped></style>
