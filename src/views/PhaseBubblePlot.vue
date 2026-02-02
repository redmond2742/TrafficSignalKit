<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Phase Bubble Plot</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Phase Bubble Plot" value="about">
          <v-expansion-panel-text>
            This tool combines detector-to-phase mappings with high-resolution
            controller events to visualize detector activity aligned to phase
            service. Use the mapping box to assign detector channels to phases,
            then plot the detection events against the phase timeline.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What You Need" value="requirements">
          <v-expansion-panel-text>
            <ul>
              <li>High-resolution CSV data (timestamp, event code, parameter)</li>
              <li>Detector-to-phase mapping table (detector channel, phase)</li>
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
            Then paste detector mappings like:
            <pre>
Det 1\t6
Det 2\t2
Det 3\t0
            </pre>
            Click <b>Process Bubble Plot</b> to render the visualization.
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
      @coordCycleStateEvents="storeCoordCycleStateEvents"
    ></ProcessDetectionEvents>
    <div>
      <v-btn @click="processDetection" color="primary">
        Process Bubble Plot
      </v-btn>
    </div>
    <PlotDetectionTimeSeries
      :plotData="detectionEvents"
      :phaseData="phaseEvents"
      :coordPatternData="coordPatternEvents"
      :coordCycleStateData="coordCycleStateEvents"
    ></PlotDetectionTimeSeries>
  </div>
</template>

<script>
import ProcessDetectionEvents from "../components/ProcessDetectionEvents.vue";
import PlotDetectionTimeSeries from "../components/foundational/PlotDetectionTimeSeries.vue";

export default {
  name: "PhaseBubblePlot",
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
      coordCycleStateEvents: [],
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
    storeCoordCycleStateEvents(events) {
      this.coordCycleStateEvents = events;
    },
  },
};
</script>

<style scoped></style>
