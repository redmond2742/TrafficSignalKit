<template>
  <button @click="resetZoom">Reset Zoom</button>
  <Scatter :data="storePhaseDuration" :options="chartOptions"></Scatter>
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

ChartJS.register(Title, Tooltip, Legend, PointElement, LinearScale, zoom);

export default {
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
      xyValues: [],

      chartOptions: {
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
          },
          y: {
            type: "linear",
            position: "left",
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
            label: "Start of Green",
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
        ],
      };
      if (this.plotData != null && this.plotData.length > 0) {
        console.log("COMPUTE: ", this.plotData);
        this.plotData.forEach((item) => {
          // Convert timestampStartISO to epoch time
          const timestamp =
            DateTime.fromISO(item.timestampStartISO).toMillis() / 1000;
          // Add to xValues
          this.xValues.push(timestamp);
          // Add to yValues with phase and color
          this.xyValues.push({ x: timestamp, y: item.phase });
        });
        chartData.datasets[0].data = this.xyValues;
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
      this.chart.resetZoom();
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
  },
};
</script>
