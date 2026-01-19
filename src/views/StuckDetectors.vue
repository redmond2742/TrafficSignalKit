<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Stuck Detector Finder</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Stuck Detectors" value="about">
          <v-expansion-panel-text>
            Use high-resolution detector on/off events to find detectors that
            appear to stay active. This tool supports vehicle and pedestrian
            detectors by scanning for detector on events without matching off
            events, then computing the percent of time each detector stayed on.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high-resolution data and click Process to see detectors that
            never appear to turn off during the data window.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <process-stuck-detectors></process-stuck-detectors>
  </div>
</template>

<script>
import ProcessStuckDetectors from "../components/ProcessStuckDetectors.vue";

export default {
  name: "stuckDetectors",
  components: {
    ProcessStuckDetectors,
  },
  data() {
    return {
      panel: [],
    };
  },
};
</script>

<style scoped></style>
