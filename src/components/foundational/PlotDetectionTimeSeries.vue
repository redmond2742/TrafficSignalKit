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
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, PointElement, LinearScale, CategoryScale, zoom);

export default {
  components: { Scatter },
  props: {
    plotData: {
      type: Array,
      required: true,
    },
  },
  computed: {
    channels() {
      const channelSet = new Set();
      this.plotData.forEach((event) => {
        if (typeof event.parameterCode === "number") {
          channelSet.add(event.parameterCode);
        }
      });
      return Array.from(channelSet).sort((a, b) => a - b);
    },
    channelLabels() {
      return this.channels.map((channel) => `Channel ${channel}`);
    },
    channelLookup() {
      return this.channels.reduce((lookup, channel) => {
        lookup[channel] = `Channel ${channel}`;
        return lookup;
      }, {});
    },
    chartData() {
      if (!this.plotData.length) {
        return {
          datasets: [
            {
              label: "Detection Events",
              data: [],
              borderColor: "#4caf50",
              backgroundColor: "#4caf50",
            },
          ],
        };
      }

      return {
        datasets: [
          {
            label: "Detection Events",
            data: this.plotData.map((event) => ({
              x: event.timestampMs,
              y: this.channelLookup[event.parameterCode] ?? `Channel ${event.parameterCode}`,
              event,
            })),
            borderColor: "#4caf50",
            backgroundColor: "#4caf50",
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
              text: "Timestamp",
            },
            ticks: {
              callback: (value) => {
                const timestamp = typeof value === "string" ? parseFloat(value) : value;
                if (Number.isNaN(timestamp)) {
                  return value;
                }
                return new Date(timestamp).toLocaleString();
              },
            },
          },
          y: {
            type: "category",
            labels: this.channelLabels,
            title: {
              display: true,
              text: "Detection Channel",
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
