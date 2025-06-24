<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="gpxTextboxDefaultText" />
  </div>
  <br />
  <v-btn color="primary" @click="btnPlot">Plot</v-btn>
  <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>
  <br />
  <canvas ref="scatterPlotCanvas"></canvas>
  <br />
  <table v-if="hoveredPoints.length">
    <thead>
      <tr>
        <th>Distance (ft)</th>
        <th>Elevation (ft)</th>
        <th>Latitude</th>
        <th>Longitude</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(point, index) in hoveredPoints" :key="index">
        <td>{{ point.distance.toFixed(1) }}</td>
        <td>{{ point.elevation.toFixed(1) }}</td>
        <td>{{ point.lat.toFixed(5) }}</td>
        <td>{{ point.lon.toFixed(5) }}</td>
        <td>
          <v-btn size="x-small" color="primary" @click="copyLatLon(point)">
            Copy
          </v-btn>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import processElevation from "../mixins/processElevation";

export default {
  mixins: [processElevation],
  components: { InputBox },
  data() {
    return {
      gpxTextboxDefaultText: "Paste in GPX file in XML format",
      inputData: ""
    };
  },
  methods: {
    btnPlot() {
      const pts = this.processGPXElevation(this.inputData);
      this.renderElevationChart(pts);
    },
    copyLatLon(point) {
      const text = `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
      navigator.clipboard?.writeText(text)
    }
  }
};
</script>

<style scoped>
.grow-wrap > textarea {
  height: 200px;
}
</style>
