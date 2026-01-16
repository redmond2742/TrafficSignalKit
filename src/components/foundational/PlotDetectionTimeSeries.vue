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
  BarElement,
  LinearScale,
  CategoryScale,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  zoom
);

export default {
  components: { Scatter },
  props: {
    plotData: {
      type: Array,
      required: true,
    },
    phaseData: {
      type: Array,
      default: () => [],
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
    phases() {
      const phaseSet = new Set();
      this.phaseData.forEach((event) => {
        if (typeof event.parameterCode === "number") {
          phaseSet.add(event.parameterCode);
        }
      });
      return Array.from(phaseSet).sort((a, b) => a - b);
    },
    phaseLabels() {
      return this.phases.map((phase) => `Phase ${phase}`);
    },
    phaseLookup() {
      return this.phases.reduce((lookup, phase) => {
        lookup[phase] = `Phase ${phase}`;
        return lookup;
      }, {});
    },
    chartEndTimestamp() {
      const timestamps = [
        ...this.plotData.map((event) => event.timestampMs),
        ...this.phaseData.map((event) => event.timestampMs),
      ].filter((value) => typeof value === "number");
      return timestamps.length ? Math.max(...timestamps) : null;
    },
    phaseIntervals() {
      if (!this.phaseData.length) {
        return [];
      }

      const grouped = this.phaseData.reduce((lookup, event) => {
        if (typeof event.parameterCode !== "number") {
          return lookup;
        }
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push(event);
        return lookup;
      }, {});

      const intervals = [];
      const chartEnd = this.chartEndTimestamp;

      Object.values(grouped).forEach((events) => {
        const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);
        sorted.forEach((event, index) => {
          if (!["green", "yellow", "red"].includes(event.phaseState)) {
            return;
          }

          const start = event.timestampMs;
          const nextEvent = sorted[index + 1];
          const end = nextEvent ? nextEvent.timestampMs : chartEnd ?? start;

          if (end <= start) {
            return;
          }

          intervals.push({
            phase: event.parameterCode,
            start,
            end,
            state: event.phaseState,
          });
        });
      });

      return intervals;
    },
    phaseDataset() {
      if (!this.phaseIntervals.length) {
        return null;
      }

      const stateColors = {
        green: "#4caf50",
        yellow: "#fbc02d",
        red: "#e53935",
      };

      return {
        type: "bar",
        label: "Phase State",
        yAxisID: "y1",
        data: this.phaseIntervals.map((interval) => ({
          x: [interval.start, interval.end],
          y: this.phaseLookup[interval.phase] ?? `Phase ${interval.phase}`,
          phase: interval,
        })),
        backgroundColor: this.phaseIntervals.map(
          (interval) => stateColors[interval.state] ?? "#9e9e9e"
        ),
        borderColor: this.phaseIntervals.map(
          (interval) => stateColors[interval.state] ?? "#9e9e9e"
        ),
        borderWidth: 1,
        borderSkipped: false,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
        indexAxis: "y",
      };
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
          ].concat(this.phaseDataset ? [this.phaseDataset] : []),
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
        ].concat(this.phaseDataset ? [this.phaseDataset] : []),
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
                const phase = context.raw?.phase;
                if (!event) {
                  if (phase) {
                    return [
                      `${context.parsed.y}: ${phase.state.toUpperCase()}`,
                      `Start: ${new Date(phase.start).toLocaleString()}`,
                      `End: ${new Date(phase.end).toLocaleString()}`,
                    ];
                  }
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
          y1: {
            type: "category",
            labels: this.phaseLabels,
            position: "right",
            title: {
              display: true,
              text: "Phase State",
            },
            grid: {
              drawOnChartArea: false,
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
