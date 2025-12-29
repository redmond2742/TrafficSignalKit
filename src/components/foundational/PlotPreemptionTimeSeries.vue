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
import enumerationObj from "../../data/enumerations.json";

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
    enumerations() {
      return enumerationObj.map((item) => ({
        code: parseInt(item.eventCode, 10),
        label: `${parseInt(item.eventCode, 10)}: ${item.eventDescriptor.trim()}`,
      }));
    },
    enumerationLabels() {
      return this.enumerations.map((item) => item.label);
    },
    eventLookup() {
      return this.enumerations.reduce((lookup, item) => {
        lookup[item.code] = item.label;
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
              x: event.timestampMs,
              y: this.eventLookup[event.eventCode] ?? `Event ${event.eventCode}`,
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
            labels: this.enumerationLabels,
            title: {
              display: true,
              text: "Enumeration",
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
