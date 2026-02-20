<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Detector Occupancy Duration Heat Map</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Detector Occupancy Duration Heat Map" value="about">
          <v-expansion-panel-text>
            Plot detector occupancy cycles from high-resolution controller logs. The x-axis is
            detector channel and each y-axis row is a cycle of detector activations that overlap in
            time. Box color shows occupancy duration from detector ON to detector OFF.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="How to Use" value="how">
          <v-expansion-panel-text>
            <ol>
              <li>
                Paste CSV lines (timestamp, event code, channel) or use file upload in the input
                box.
              </li>
              <li>Click <b>Build Occupancy Heat Map</b>.</li>
              <li>
                Use detector channel sorting to switch between highest- and lowest-utilization views.
              </li>
              <li>Hover any square to see start time, end time, and occupancy duration.</li>
            </ol>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <DetectorEventHeatMapTool />

    <v-card class="mt-6" variant="outlined">
      <v-card-title>Why this matters</v-card-title>
      <v-card-text>
        <p>
          This occupancy-cycle heat map makes it easy to spot detector behavior patterns that are
          hard to see in raw event logs. Long-duration boxes concentrated on one channel can flag
          stuck calls, while unusually short pulses can indicate detector sensitivity or pulse-width
          configuration issues.
        </p>
        <p>
          Comparing channel utilization and cycle placement also helps infer detector purpose. Stop
          bar detectors often show different occupancy signatures than advanced detectors, so this
          visual can support field validation and timing plan diagnostics.
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import DetectorEventHeatMapTool from "../components/DetectorEventHeatMapTool.vue";

export default {
  name: "DetectorEventHeatMap",
  components: {
    DetectorEventHeatMapTool,
  },
  data() {
    return {
      panel: [],
    };
  },
};
</script>
