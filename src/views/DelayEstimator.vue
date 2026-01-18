<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Delay Estimator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Delay Estimator" value="about">
          <v-expansion-panel-text>
            This tool estimates the delay between the first detector call and
            when the corresponding phase is served. It uses the first detector
            ON event within a cycle as the call start and then looks for the
            phase ON (or phase begin green) event to calculate the delay. If a
            call is not served before the cycle ends, it will be marked as
            skipped and the skip timestamp will be recorded at the cycle
            boundary or the phase skipped event if present.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high-resolution controller CSV data in the first box and map
            detector channels to phases in the second box. Click Process to
            generate a cycle-by-cycle delay table.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <ProcessDelayEstimator />
  </div>
</template>

<script>
import ProcessDelayEstimator from "../components/ProcessDelayEstimator.vue";

export default {
  name: "DelayEstimator",
  components: {
    ProcessDelayEstimator,
  },
  data() {
    return {
      panel: [],
    };
  },
};
</script>

<style scoped></style>
