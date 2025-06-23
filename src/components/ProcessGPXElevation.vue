<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="gpxTextboxDefaultText" />
  </div>
  <br />
  <v-btn color="primary" @click="btnPlot">Plot</v-btn>
  <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>
  <br />
  <canvas ref="scatterPlotCanvas"></canvas>
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
