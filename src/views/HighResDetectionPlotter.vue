<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Timeseries Plot Detection Channels</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Detection Channels" value="about">
          <v-expansion-panel-text>
            Detection events are logged when the controller registers a detector
            state change, including vehicle, pedestrian, and TSP detector
            activity. This tool filters the detection-related enumerations from
            high resolution controller data and plots them on a time series.
            The y-axis shows only the detector channels that appear in your data
            so you can focus on active detection inputs.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>Timeline of detector enumeration events</li>
              <li>Detection channels that appear in the CSV data</li>
              <li>Hover details for event codes and timestamps</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high resolution controller data as CSV lines in the format:
            <pre>
16764339605, 82, 7
16764339625, 81, 7
16764339705, 90, 12
            </pre>
            Click <b>Process Detection Events</b> to plot the detection channel
            timeline.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <ProcessDetectionEvents
      ref="processDetectionEvents"
      @detectionEvents="storeDetectionEvents"
      @phaseEvents="storePhaseEvents"
      @coordPatternEvents="storeCoordPatternEvents"
    ></ProcessDetectionEvents>
    <div>
      <v-btn @click="processDetection" color="primary">
        Process Detection Events
      </v-btn>
    </div>
    <PlotDetectionTimeSeries
      :plotData="detectionEvents"
      :phaseData="phaseEvents"
      :coordPatternData="coordPatternEvents"
    ></PlotDetectionTimeSeries>
  </div>
</template>

<script>
import ProcessDetectionEvents from "../components/ProcessDetectionEvents.vue";
import PlotDetectionTimeSeries from "../components/foundational/PlotDetectionTimeSeries.vue";

export default {
  name: "DetectionChannelPlotter",
  components: {
    ProcessDetectionEvents,
    PlotDetectionTimeSeries,
  },
  data() {
    return {
      panel: [],
      detectionEvents: [],
      phaseEvents: [],
      coordPatternEvents: [],
    };
  },
  methods: {
    processDetection() {
      this.$refs.processDetectionEvents?.processDetectionEvents?.();
    },
    storeDetectionEvents(events) {
      this.detectionEvents = events;
    },
    storePhaseEvents(events) {
      this.phaseEvents = events;
    },
    storeCoordPatternEvents(events) {
      this.coordPatternEvents = events;
    },
  },
};
</script>

<style scoped></style>
