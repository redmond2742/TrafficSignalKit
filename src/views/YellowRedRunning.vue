<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Yellow &amp; Red Light Running Tool</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Yellow &amp; Red Light Running" value="about">
          <v-expansion-panel-text>
            This tool reviews detector off events (event 81) and checks whether
            the associated phase was in yellow or red at that time. It reports
            the number of seconds into the yellow or red interval for each
            detector-off event.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high-resolution controller CSV data in the first box and map
            detector channels to phases in the second box. Click Process to
            list detector-off events that occur during yellow or red.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <ProcessYellowRedRunning />
  </div>
</template>

<script>
import ProcessYellowRedRunning from "../components/ProcessYellowRedRunning.vue";

export default {
  name: "YellowRedRunning",
  components: {
    ProcessYellowRedRunning,
  },
  data() {
    return {
      panel: [],
    };
  },
};
</script>

<style scoped></style>
