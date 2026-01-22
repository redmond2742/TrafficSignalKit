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
    phaseChannelLabels() {
      const labels = new Set();
      this.plotData.forEach((event) => {
        labels.add(this.formatPhaseChannel(event.parameterCode));
      });
      return Array.from(labels).sort((a, b) => {
        if (a === "N/A") return 1;
        if (b === "N/A") return -1;
        const aValue = Number(a);
        const bValue = Number(b);
        if (Number.isNaN(aValue) || Number.isNaN(bValue)) {
          return a.localeCompare(b);
        }
        return aValue - bValue;
      });
    },
    chartData() {
      if (!this.plotData.length) {
        return {
          datasets: [
            {
              label: "Enumeration Matrix",
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
            label: "Enumeration Matrix",
            data: this.plotData.map((event) => ({
              x: this.formatPhaseChannel(event.parameterCode),
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
                  `Phase/Channel: ${this.formatPhaseChannel(event.parameterCode)}`,
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
            type: "category",
            labels: this.phaseChannelLabels,
            title: {
              display: true,
              text: "Phase/Channel",
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
    formatPhaseChannel(parameterCode) {
      if (parameterCode === null || parameterCode === undefined) {
        return "N/A";
      }
      return `${parameterCode}`;
    },
    resetZoom() {
      this.$refs.scatterChart.chart.resetZoom();
    },
  },
};
</script>
