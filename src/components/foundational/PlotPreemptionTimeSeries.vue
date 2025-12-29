<template>
  <br />
  <v-btn @click="resetZoom">Reset Zoom</v-btn>
  <br />
  <Scatter
    :data="chartData"
    :options="chartOptions"
    ref="scatterChart"
  ></Scatter>
</template>

<script>
import { Scatter } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import { Chart as ChartJS, Title, Tooltip, Legend, PointElement, LinearScale } from "chart.js";

ChartJS.register(Title, Tooltip, Legend, PointElement, LinearScale, zoom);

export default {
  components: { Scatter },
  props: {
    plotData: {
      type: Array,
      required: true,
    },
  },
  computed: {
    baseTimeMs() {
      return this.plotData.length > 0 ? this.plotData[0].timestampMs : 0;
    },
    eventLookup() {
      return this.plotData.reduce((lookup, item) => {
        lookup[item.eventCode] = item.eventDescriptor;
        return lookup;
      }, {});
    },
    chartData() {
      if (!this.plotData.length) {
        return {
          datasets: [
            {
              label: "Preemption Events",
              data: [],
              borderColor: "#009688",
              backgroundColor: "#009688",
            },
          ],
        };
      }

      return {
        datasets: [
          {
            label: "Preemption Events",
            data: this.plotData.map((event) => ({
              x: (event.timestampMs - this.baseTimeMs) / 1000,
              y: event.eventCode,
              event,
            })),
            borderColor: "#009688",
            backgroundColor: "#009688",
            pointRadius: 4,
          },
        ],
      };
    },
    chartOptions() {
      return {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const event = context.raw?.event;
                if (!event) {
                  return `${context.parsed.y}`;
                }
                return [
                  `${event.eventDescriptor} (Code ${event.eventCode})`,
                  `Channel: ${event.parameterCode ?? "N/A"}`,
                  `Time: ${event.humanReadable ?? event.timestampISO}`,
                ];
              },
            },
          },
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
            title: {
              display: true,
              text: "Seconds from first preemption event",
            },
          },
          y: {
            type: "linear",
            title: {
              display: true,
              text: "Preemption Event",
            },
            ticks: {
              stepSize: 1,
              callback: (value) => this.eventLookup[value] || value,
            },
          },
        },
      };
    },
  },
  methods: {
    resetZoom() {
      this.$refs.scatterChart.chart.resetZoom();
    },
  },
};
</script>
