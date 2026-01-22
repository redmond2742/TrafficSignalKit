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
    showAllEnumerations: {
      type: Boolean,
      default: true,
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
    displayedEnumerationLabels() {
      if (this.showAllEnumerations) {
        return this.enumerationLabels;
      }
      const labels = new Set();
      this.plotData.forEach((event) => {
        labels.add(this.eventLookup[event.eventCode] ?? `Event ${event.eventCode}`);
      });
      return Array.from(labels);
    },
    timestampRange() {
      if (!this.plotData.length) {
        return { min: 0, max: 0 };
      }
      const timestamps = this.plotData.map((event) => event.timestampMs);
      return {
        min: Math.min(...timestamps),
        max: Math.max(...timestamps),
      };
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
            backgroundColor: this.plotData.map((event) =>
              this.getTimestampColor(event.timestampMs)
            ),
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
              drag: {
                enabled: true,
              },
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
            labels: this.displayedEnumerationLabels,
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
    getTimestampColor(timestampMs) {
      const { min, max } = this.timestampRange;
      if (min === max) {
        return "#2c7fb8";
      }
      const ratio = (timestampMs - min) / (max - min);
      return this.interpolateColor("#2c7fb8", "#f03b20", ratio);
    },
    interpolateColor(startHex, endHex, ratio) {
      const clampRatio = Math.max(0, Math.min(1, ratio));
      const start = this.hexToRgb(startHex);
      const end = this.hexToRgb(endHex);
      if (!start || !end) {
        return startHex;
      }
      const r = Math.round(start.r + (end.r - start.r) * clampRatio);
      const g = Math.round(start.g + (end.g - start.g) * clampRatio);
      const b = Math.round(start.b + (end.b - start.b) * clampRatio);
      return `rgb(${r}, ${g}, ${b})`;
    },
    hexToRgb(hex) {
      const normalized = hex.replace("#", "");
      if (normalized.length !== 6) {
        return null;
      }
      const intValue = parseInt(normalized, 16);
      return {
        r: (intValue >> 16) & 255,
        g: (intValue >> 8) & 255,
        b: intValue & 255,
      };
    },
    resetZoom() {
      this.$refs.scatterChart.chart.resetZoom();
    },
  },
};
</script>
