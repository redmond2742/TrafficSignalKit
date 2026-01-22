<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Timeseries Plot All Enumerations</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: All Enumerations" value="about">
          <v-expansion-panel-text>
            This tool plots the enumeration values from high resolution
            controller data on a time series so you can see when each event
            occurred.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>Timeline of enumeration event codes</li>
              <li>Event labels for each enumeration</li>
              <li>Channel values captured with each event</li>
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
            Click <b>Process All Enumerations</b> to plot the event timeline.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <ProcessPreemptionEvents
      @preemptionEvents="storePreemptionEvents"
    ></ProcessPreemptionEvents>
    <PlotPreemptionTimeSeries
      :plotData="preemptionEvents"
    ></PlotPreemptionTimeSeries>
  </div>
</template>

<script>
import ProcessPreemptionEvents from "../components/ProcessPreemptionEvents.vue";
import PlotPreemptionTimeSeries from "../components/foundational/PlotPreemptionTimeSeries.vue";

export default {
  name: "PreemptionPlotter",
  components: {
    ProcessPreemptionEvents,
    PlotPreemptionTimeSeries,
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
