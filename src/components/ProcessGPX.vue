<template>
  <v-container class="grey lighten-5">
    <div class="left-justify-text">
      <v-expansion-panels v-model="gpxPanel" multiple>
        <v-expansion-panel title="Signal Data" value="about">
          <v-expansion-panel-text>
            <div class="grow-wrap">
              <InputBox v-model="signalLocations" />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-container>

  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <br />
  <v-btn @click="bProcessGPX">Plot</v-btn>
  <v-btn @click="resetZoom">Reset Zoom</v-btn>

  <br />
  <div>
    <canvas ref="scatterPlotCanvas"></canvas>
  </div>
</template>

<script>
import InputBox from "./InputBox.vue";
import gpxParser from "gpxparser";
import { Chart } from "chart.js/auto"; // https://www.chartjs.org/
import zoomPlugin from "chartjs-plugin-zoom"; // https://www.chartjs.org/chartjs-plugin-zoom/latest/guide/animations.html

Chart.register(zoomPlugin);

export default {
  components: { InputBox },
  props: {},
  data() {
    return {
      gpxPanel: ["signal locations"],
      tracks: [],
      inputData: "",
      signalLocations: "37.9013511000743, -122.064401378189",
      outputData: "",
      scatterData: [],
      signalPlotData: [],
    };
  },
  mounted() {},
  methods: {
    earthDistance(point1, point2, miles = true) {
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
      if (miles) {
        return distance * 0.621371; //converted to miles
      } else {
        return distance * 0.621371 * 5280; //converted to feet
      }
    },
    bProcessGPX(input) {
      //let gpxParser = require("gpxparser");
      let i = 0;
      let gpx = new gpxParser();
      //let cumDist = 0;
      //let tsData = [];
      let currentLoc = [];
      let nextLoc = [];
      let totalCumlDistance = 0;
      let signalDistance = [];
      let signalStartTime = 0;
      let signalEndTime = 0;

      if (false) {
        console.log(error);
      } else {
        console.log(this.signalLocations);
        gpx.parse(this.inputData);

        let gpxPoints = gpx.tracks[0].points;
        let signalPoint = this.signalLocations.split(",");

        for (i = 0; i < gpx.tracks[0].points.length - 1; i++) {
          currentLoc = [gpxPoints[i].lat, gpxPoints[i].lon];
          nextLoc = [gpxPoints[i + 1].lat, gpxPoints[i + 1].lon];
          totalCumlDistance += this.earthDistance(nextLoc, currentLoc);

          //calculate distance from current point to intersection point.

          signalDistance.push({
            d: this.earthDistance(currentLoc, signalPoint, false),
            cd: totalCumlDistance,
          });

          this.scatterData.push({
            x: gpxPoints[i].time.getTime() / 1000, //milliseconds to seconds
            y: totalCumlDistance, //cumDist,
          });
        }
        //console.log(tsData);

        signalStartTime = gpxPoints[0].time.getTime() / 1000;
        signalEndTime =
          gpxPoints[gpx.tracks[0].points.length - 1].time.getTime() / 1000;

        const { cd: corY } = signalDistance.reduce((min, current) =>
          current.d < min.d ? current : min
        );

        this.signalPlotData.push({
          x: signalStartTime,
          y: corY,
        });
        this.signalPlotData.push({
          x: signalEndTime,
          y: corY,
        });
        console.log(corY);
        console.log(Math.min(signalDistance[0]) + " " + this.signalPlotData);
        //console.log(Math.min(...signalDistance) + " " + this.signalPlotData);

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
          {
            label: "Signal 1",
            data: this.signalPlotData,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            showLine: true,
            fill: false,
          },
        ],
      };

      window.myPlot = new Chart(ctx, {
        type: "scatter",
        data: tempScatterData,
        options: chartOptions,
      });
    },
    resetZoom() {
      window.myPlot.resetZoom();
    },
  },
};
</script>

<style scoped>
textarea {
  height: 400px;
}
signaltextarea {
  height: 200px;
}
</style>
