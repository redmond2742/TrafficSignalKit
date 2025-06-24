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
  <table v-if="hoveredPoint">
    <thead>
      <tr>
        <th>Distance (ft)</th>
        <th>Elevation (ft)</th>
        <th>Latitude</th>
        <th>Longitude</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{ hoveredPoint.distance.toFixed(1) }}</td>
        <td>{{ hoveredPoint.elevation.toFixed(1) }}</td>
        <td>{{ hoveredPoint.lat.toFixed(5) }}</td>
        <td>{{ hoveredPoint.lon.toFixed(5) }}</td>
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
    }
  }
};
</script>

<style scoped>
.grow-wrap > textarea {
  height: 200px;
}
</style>
