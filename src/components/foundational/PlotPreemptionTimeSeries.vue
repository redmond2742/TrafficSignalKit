<template>
  <br />
  <div class="controls">
    <v-btn @click="resetZoom">Reset Zoom</v-btn>
    <v-switch
      v-model="colorByChannel"
      density="compact"
      hide-details
      label="Color dots by phase/channel"
    ></v-switch>
    <v-switch
      v-model="showOnlyTriggeredEnumerations"
      density="compact"
      hide-details
      label="Show only triggered enumeration rows"
    ></v-switch>
  </div>
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
  data() {
    return {
      colorByChannel: false,
      showOnlyTriggeredEnumerations: false,
      channelPalette: [
        "#1565C0",
        "#2E7D32",
        "#6A1B9A",
        "#EF6C00",
        "#00838F",
        "#AD1457",
        "#5D4037",
        "#3949AB",
      ],
    };
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
    activeEnumerationLabels() {
      if (!this.showOnlyTriggeredEnumerations) {
        return this.enumerationLabels;
      }

      const usedEventCodes = new Set(this.plotData.map((event) => event.eventCode));
      const usedKnownLabels = this.enumerations
        .filter((item) => usedEventCodes.has(item.code))
        .map((item) => item.label);

      const usedUnknownLabels = [...usedEventCodes]
        .filter((code) => !this.eventLookup[code])
        .sort((a, b) => a - b)
        .map((code) => `Event ${code}`);

      return [...usedKnownLabels, ...usedUnknownLabels];
    },
    pointBackgroundColors() {
      if (!this.colorByChannel) {
        return "#009688";
      }

      return this.plotData.map((event) => this.getColorForChannel(event.parameterCode));
    },
    chartData() {
      if (!this.plotData.length) {
        return {
          datasets: [
            {
              label: "All Enumerations",
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
            label: "All Enumerations",
            data: this.plotData.map((event) => ({
              x: event.timestampMs,
              y: this.eventLookup[event.eventCode] ?? `Event ${event.eventCode}`,
              event,
            })),
            borderColor: "#009688",
            backgroundColor: this.pointBackgroundColors,
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
              afterLabel: (context) => {
                if (!this.colorByChannel) {
                  return undefined;
                }
                const event = context.raw?.event;
                if (!event) {
                  return undefined;
                }
                return `Color group: channel ${event.parameterCode ?? "N/A"}`;
              },
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
            labels: this.activeEnumerationLabels,
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
    getColorForChannel(channel) {
      const channelNumber = Number(channel);
      if (!Number.isFinite(channelNumber)) {
        return "#757575";
      }

      const normalizedIndex = Math.abs(Math.trunc(channelNumber)) % this.channelPalette.length;
      return this.channelPalette[normalizedIndex];
    },
    resetZoom() {
      this.$refs.scatterChart.chart.resetZoom();
    },
  },
};
</script>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
