<template>
  <Scatter :data="chartData" :options="chartOptions"></Scatter>
</template>

<script>
//https://vue-chartjs.org/
import { Scatter } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, PointElement, LinearScale);

export default {
  components: { Scatter },
  props: {
    plotData: {
      type: Array,
      required: true,
      value: [],
    },
  },
  beforemount() {
    this.plotData = [];
  },
  mounted() {
    // Log the Data to inspect its structure
    //console.log("Phase Data:", this.tableData);
    console.log(this.isDataPresent());
  },
  data() {
    return {
      tab: null,
      showPlot: false,
      chartData: {
        datasets: [
          {
            label: "Phase 1",
            fill: false,
            borderColor: "#f87979",
            backgroundColor: "#f87979",
            data: [
              {
                x: -2,
                y: 4,
              },
              {
                x: -1,
                y: 1,
              },
              {
                x: 0,
                y: 0,
              },
              {
                x: 1,
                y: 1,
              },
              {
                x: 2,
                y: 4,
              },
            ],
          },
        ],
      },
      chartOptions: {
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
      console.log(this.plotData);
      this.processData(this.plotData);

      //this.generateScatterPlot();
    },
  },
  methods: {
    processData(dataObject) {
      // Assuming dataObject is an array of objects with Phase, duration, and start time
      // Example: [{ phase: 'A', duration: 10, startTime: '2024-06-03T16:56:08' }, ...]
      console.log(dataObject);
    },
    generateScatterPlot() {
      let dataObject;
      console.log(this.plotData);
      try {
        //dataObject = JSON.parse(this.phaseData); //TODO: fix this JSON phase Data.
      } catch (error) {
        alert("Invalid JSON data");
        return;
      }

      // Process the JSON data to create scatter plot data
      const scatterData = this.processData(dataObject);
      console.log("Scatter Data:" + scatterData);

      // Update the chart data
      this.chartData = {
        datasets: [
          {
            label: "Scatter Dataset",
            data: scatterData,
          },
        ],
      };
    },
    truncateToOneDecimal(number) {
      // Truncate the number to one decimal place
      return String(Math.floor(number * 10) / 10);
    },
    isDataPresent() {
      this.showPlot = this.plotData !== null || this.plotData.length > 0;
      return this.showPlot;
    },
  },
};
</script>
