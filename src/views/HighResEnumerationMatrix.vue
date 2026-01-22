<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Enumeration Matrix</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Enumeration Matrix" value="about">
          <v-expansion-panel-text>
            This tool plots high-resolution enumeration events against the
            reported phase or channel value so you can compare what happened and
            where it occurred.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>Enumeration codes on the y-axis</li>
              <li>Phase/channel values on the x-axis</li>
              <li>Hoverable dots with timestamps for each event</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high resolution controller data as CSV lines in the format:
            <pre>
16764339605, 101, 1
16764339625, 102, 1
16764339645, 105, 1
16764339705, 111, 1
            </pre>
            Click <b>Process All Enumerations</b> to plot the matrix.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <ProcessPreemptionEvents
      @preemptionEvents="storePreemptionEvents"
    ></ProcessPreemptionEvents>
    <PlotPreemptionMatrix
      :plotData="preemptionEvents"
    ></PlotPreemptionMatrix>
  </div>
</template>

<script>
import ProcessPreemptionEvents from "../components/ProcessPreemptionEvents.vue";
import PlotPreemptionMatrix from "../components/foundational/PlotPreemptionMatrix.vue";

export default {
  name: "EnumerationMatrix",
  components: {
    ProcessPreemptionEvents,
    PlotPreemptionMatrix,
  },
  data() {
    return {
      panel: [],
      preemptionEvents: [],
    };
  },
  methods: {
    storePreemptionEvents(events) {
      this.preemptionEvents = events;
    },
  },
};
</script>

<style scoped></style>
