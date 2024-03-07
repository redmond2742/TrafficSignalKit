<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <br />
  <v-btn @click="bProcessGPX">Plot</v-btn>

  <br />
  <div>
    <canvas ref="scatterPlotCanvas"></canvas>
  </div>
</template>

<script>
import InputBox from "./InputBox.vue";
import gpxParser from "gpxparser";
import { Chart } from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

export default {
  components: { InputBox },
  props: {},
  data() {
    return {
      tracks: [],
      inputData: "",
      outputData: "",
      scatterData: [],
    };
  },
  mounted() {},
  methods: {
    earthDistance(point1, point2) {
      const R = 6371; // Radius of the Earth in kilometers
      const [lat1, lon1] = point1;
      const [lat2, lon2] = point2;
      const dLat = ((lat2 - lat1) * Math.PI) / 180; // Convert degrees to radians
      const dLon = ((lon2 - lon1) * Math.PI) / 180; // Convert degrees to radians
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in kilometers
      return distance * 0.621371; //converted to miles
    },
    bProcessGPX(input) {
      //let gpxParser = require("gpxparser");
      let i = 0;
      let gpx = new gpxParser();
      let cumDist = 0;
      let tsData = [];
      let currentLoc = [];
      let nextLoc = [];
      let totalCumlDistance = 0;
      if (false) {
        console.log(error);
      } else {
        gpx.parse(this.inputData);

        let gpxPoints = gpx.tracks[0].points;

        for (i = 0; i < gpx.tracks[0].points.length - 1; i++) {
          currentLoc = [gpxPoints[i].lat, gpxPoints[i].lon];
          nextLoc = [gpxPoints[i + 1].lat, gpxPoints[i + 1].lon];
          totalCumlDistance += this.earthDistance(nextLoc, currentLoc);
          cumDist += gpx.tracks[0].distance.cumul[i] * 0.000621371; //meters to miles
          tsData.push(gpxPoints[i].time.getTime() + "," + cumDist);
          this.scatterData.push({
            x: gpxPoints[i].time.getTime() / 1000, //milliseconds to seconds
            y: totalCumlDistance, //cumDist,
          });
        }
        console.log(tsData);

        const totalDistance = gpx.tracks[0].distance.cumul;
        this.outputData = totalDistance;
        console.log(gpx.tracks[0].points);
        console.log(this.outputData);
        this.renderChart();
      }
    },
    renderChart() {
      const ctx = this.$refs.scatterPlotCanvas.getContext("2d");
      var chartOptions = {
        title: {
          display: true,
          text: "Scatter Plot with Line Connecting Dots",
        },
        scales: {
          xAxes: [
            {
              type: "linear",
              position: "bottom",
            },
          ],
          yAxes: [
            {
              type: "linear",
              position: "left",
            },
          ],
        },
        plugins: {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              drag: {
                enabled: true,
              },
              mode: "xy",
            },
          },
        },
      };

      var tempScatterData = {
        datasets: [
          {
            label: "Test Scatter Dataset",
            data: this.scatterData,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            showLine: true,
            fill: false,
          },
        ],
      };

      new Chart(ctx, {
        type: "scatter",
        data: tempScatterData,
        options: chartOptions,
      });
    },
  },
};
</script>

<style scoped>
textarea {
  height: 400px;
}
</style>
