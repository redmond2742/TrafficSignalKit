<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Phase Pressure Map</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Phase Pressure Map" value="about">
          <v-expansion-panel-text>
            Pressure compares demand versus service for each phase service cycle. In this tool,
            demand is detector ON events mapped to a phase and service is that phase's completed
            green/yellow service time in seconds.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="How to Use" value="how">
          <v-expansion-panel-text>
            <ol>
              <li>
                Paste CSV lines (timestamp, event code, parameter) or use file upload in the input
                box.
              </li>
              <li>
                Provide detector-to-phase mappings (for example: <b>DET 12 4</b> or <b>12,4</b>
                means detector channel 12 maps to phase 4).
              </li>
              <li>Optionally set the minimum service-seconds floor used in the ratio.</li>
              <li>Click <b>Build Phase Pressure Map</b>.</li>
              <li>
                Hover any heat-map cell to view cycle demand count, service seconds, and pressure.
              </li>
            </ol>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <PhasePressureMapTool />
  </div>
</template>

<script>
import PhasePressureMapTool from "../components/PhasePressureMapTool.vue";

export default {
  name: "PhasePressureMap",
  components: {
    PhasePressureMapTool,
  },
  data() {
    return {
      panel: [],
    };
  },
};
</script>
