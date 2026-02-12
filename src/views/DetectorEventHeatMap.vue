<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Detector Event Heat Map</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Detector Event Heat Map" value="about">
          <v-expansion-panel-text>
            Build a heat map from high-resolution detector events. Time of day is
            plotted on the x-axis and either phases or detector channels are shown
            on the y-axis. Color intensity can represent event counts or detector
            ON-to-OFF occupancy duration.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="How to Use" value="how">
          <v-expansion-panel-text>
            <ol>
              <li>
                Paste CSV lines (timestamp, event code, channel) or use file upload
                in the input box.
              </li>
              <li>
                Add detector channel mappings such as <b>2,6</b> (channel 2 to
                phase 6).
              </li>
              <li>
                Choose count or duration mode, then click
                <b>Build Heat Map</b>.
              </li>
            </ol>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <DetectorEventHeatMapTool />
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
