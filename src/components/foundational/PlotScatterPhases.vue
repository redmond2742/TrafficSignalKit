<template>
  <br />
  <v-btn @click="resetZoom">Reset Zoom</v-btn>
  <br />
  <Scatter
    :data="storePhaseDuration"
    :options="chartOptions"
    ref="scatterChart"
  ></Scatter>
</template>

<script>
import { DateTime } from "luxon";
//https://vue-chartjs.org/
import { Scatter } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LinearScale,
} from "chart.js";
import convertTime from "../../mixins/convertTime";

ChartJS.register(Title, Tooltip, Legend, PointElement, LinearScale, zoom);

export default {
  mixins: [convertTime],
  //https://www.chartjs.org/docs/latest/charts/scatter.html
  components: { Scatter },
  props: {
    plotData: {
      type: Array,
      required: true,
    },
  },
  beforemount() {
    this.plotData = [];
  },
  mounted() {
    // Log the Data to inspect its structure
    //console.log("Phase Data:", this.tableData);

    console.log("Inherited Data ", this.plotData);
  },
  data() {
    return {
      tab: null,
      showPlot: true,
      xValues: [],
      xyGreenValues: [],
      xyGreenForceOffValues: [],
      xyGreenMaxOutValues: [],
      xyYellowValues: [],
      xyRedValues: [],

      chartOptions: {
        responsive: true,
        plugins: {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "xy",
            },
            pan: {
              enabled: true,
              mode: "xy",
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            unit: "second",
            stepSize: 0.1, // Show points at 1/10 second intervals
            displayFormats: {
              second: "ss.SSS", // Display format for seconds with milliseconds
            },
            ticks: {
              source: "data",
              autoSkip: false, // Ensure no ticks are skipped
            },
          },
          y: {
            beginAtZero: true,
            type: "linear",
            position: "left",
            max: 10, // Set the maximum y value to num. of phases
            ticks: {
              stepSize: 1,
              callback: function (value) {
                return Number.isInteger(value) ? value : null;
              },
            },
          },
        },
      },
    };
  },
  computed: {
    storePhaseDuration() {
      let chartData = {
        datasets: [
          {
            label: "Force Off",
            fill: false,
            borderColor: "#000000",
            backgroundColor: "#000000",
            data: [
              {
                x: 3,
                y: 7,
              },
              {
                x: 9,
                y: 3,
              },
            ],
          },
          {
            label: "Max Out",
            fill: false,
            borderColor: "#000000",
            backgroundColor: "#00A36C",
            data: [
              {
                x: 2,
                y: 7,
              },
              {
                x: 6,
                y: 3,
              },
            ],
          },
          {
            label: "Green",
            fill: false,
            borderColor: "#00A36C",
            backgroundColor: "#00A36C",
            data: [
              {
                x: 0,
                y: 2,
              },
              {
                x: 1,
                y: 6,
              },
            ],
          },

          {
            label: "Yellow",
            fill: false,
            borderColor: "#FAFA33",
            backgroundColor: "#FAFA33",
            data: [
              {
                x: 2,
                y: 5,
              },
              {
                x: 8,
                y: 3,
              },
            ],
          },
          {
            label: "Red",
            fill: false,
            borderColor: "#FF0000",
            backgroundColor: "#FF0000",
            data: [
              {
                x: 3,
                y: 6,
              },
              {
                x: 4,
                y: 1,
              },
            ],
          },
        ],
      };
      if (this.plotData.length > 0 && this.plotData != null) {
        console.log("COMPUTE: ", this.plotData);
        this.plotData.reduce((previous, item, index, arr) => {
          // Convert timestampStartISO to epoch time
          const startTime = DateTime.fromISO(
            item.timestampStartISO
          ).toSeconds();

          let nextStartTime = 0;

          for (let i = 1; index + i < this.plotData.length; i++) {
            if (arr[index + i].phase == item.phase) {
              nextStartTime = DateTime.fromISO(
                arr[index + i].timestampStartISO
              ).toSeconds();
              break;
            }
          }

          const interval = 1; // 1/10 if you want all high res data
          const timeMultiplier = 1;

          const redDuration = nextStartTime - startTime;

          for (
            let t = startTime;
            t <= startTime + item.duration + redDuration;
            t += interval
          ) {
            if (t <= startTime + item.greenTime) {
              if (t == startTime + item.greenTime) {
                if (item.termReason == "Force Off") {
                  this.xyGreenForceOffValues.push({ x: t, y: item.phase });
                }
                if (item.termReason == "Max Out") {
                  this.xyGreenMaxOutValues.push({ x: t, y: item.phase });
                }
              } else {
                this.xyGreenValues.push({ x: t, y: item.phase });
              }
            } else if (
              t >= startTime + item.greenTime &&
              t < startTime + item.yellowTime + item.greenTime
            ) {
              this.xyYellowValues.push({ x: t, y: item.phase });
            } else if (t >= startTime + item.yellowTime && t < nextStartTime) {
              this.xyRedValues.push({ x: t, y: item.phase });
            }
          }

          // Add to xyValues with phase and color
        });
        console.log(this.xyYellowValues);
        chartData.datasets[0].data = this.xyGreenForceOffValues;
        chartData.datasets[1].data = this.xyGreenMaxOutValues;
        chartData.datasets[2].data = this.xyGreenValues;
        chartData.datasets[3].data = this.xyYellowValues;
        chartData.datasets[4].data = this.xyRedValues;

        return chartData;

        //return NaN;
      } else {
        return chartData;
      }

      //return phaseData;
      //this.processData(this.plotData);

      /*
      Build X data: ADD timestamp start to array from this.plotData.timestampStartISO
      Build Y data: Add Phase Number and color
      */
      //return this.convertTimestampToEpoch(phaseData);

      //this.generateScatterPlot();
    },
  },
  methods: {
    resetZoom() {
      this.$refs.scatterChart.chart.resetZoom();
      //this.fillInEndTime(this.plotData);
    },
    zoomToGPX() {
      this.$refs.scatterChart.chart.resetZoom();
      //this.fillInEndTime(this.plotData);
    },
    processData(dataObject) {
      // Assuming dataObject is an array of objects with Phase, duration, and start time
      // Example: [{ phase: 'A', duration: 10, startTime: '2024-06-03T16:56:08' }, ...]
      console.log(dataObject);
    },
    truncateToOneDecimal(number) {
      // Truncate the number to one decimal place
      return String(Math.floor(number * 10) / 10);
    },
    isDataPresent() {
      if (this.plotData !== null || this.plotData.length > 0) {
        this.showPlot = true;
      }
      return this.showPlot;
    },
    convertTimestampToEpoch(tsISO) {
      const dateTimeISO = DateTime.fromISO(tsISO);
      const timeSinceEpoch = dateTimeISO.toMillis() / 1000;
      return timeSinceEpoch;
    },
    generatePlotPoints(startTime, duration, phase) {
      const startTimeFromEpoch = this.convertTimestampToEpoch(startTime);
      const points = [];
      const interval = 1; // 1/10th of a second in milliseconds
      const timeMultiplier = 1;
      const endTime = startTimeFromEpoch + duration * timeMultiplier; // Convert duration to milliseconds
      console.log(startTimeFromEpoch, endTime, duration);
      for (let time = startTimeFromEpoch; time <= endTime; time += interval) {
        points.push({ x: time, y: phase }); // y can be any value; here it's set to 0
      }
      console.log("Points", points);
      return points;
    },
  },
};
</script>
