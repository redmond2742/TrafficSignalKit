<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">GPX Elevation Plotter</h1>
    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: GPX Elevation Plotter" value="about">
          <v-expansion-panel-text>
            Paste GPX data and view the elevation profile over distance.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <ProcessGPXElevation />
  </div>
</template>

<script>
import ProcessGPXElevation from "../components/ProcessGPXElevation.vue";
export default {
  name: "GPXElevation",
  components: { ProcessGPXElevation },
  data() {
    return { panel: [] };
  },
  methods: {
    all() {
      this.panel = ["about"];
    },
    none() {
      this.panel = [];
    }
  }
};
</script>

<style scoped></style>
