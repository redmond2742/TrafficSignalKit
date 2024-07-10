<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">GPX & Phase Plotter</h1>

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
            * Input Box for each signal, with name, lat, lon, high res data,
            phase of interest and TSP #, and input box for high res data for
            that signal.
            <br /><br />
            * Phase plot of signal data for each signal data added.
            <br /><br />
            * Graph Time space Diagram of GPX data. If time is same for GPX and
            high res data, this should be the same graph
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Main & Penniman, 37.91468731793959, -122.065680012584, <br />
            CA/Civic, 37.9013511000743, -122.064401378189 <br />
            CA/YVR, 37.90495039889445, -122.06575265782921 <br />
            CA/Mt. D, 37.897397411618044, -122.06344916387569 <br />
            CA/Olympic, 37.89600895917039, -122.06282426447109 <br />
            CA/Bohtelo, 37.89457361001387, -122.061923996248 <br />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-btn @click="addCard" color="primary">Add Signal Input Card</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col v-for="(card, index) in cards" :key="index" cols="12" sm="12">
          <signal-input-card :card-id="index"></signal-input-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
  <br />
</template>
<script>
import SignalInputCard from "@/components/foundational/SignalInputCard.vue";
import ProcessGPX from "../components/ProcessGPX.vue";

export default {
  name: "GpxPlotter",
  components: {
    ProcessGPX,
    SignalInputCard,
  },
  data() {
    return {
      panel: [],
      xmlString: "",
      cards: [],
    };
  },
  methods: {
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
    addCard() {
      this.cards.push({});
    },
  },
};
</script>
<style scoped></style>
