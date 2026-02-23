<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Detector Bubble Chart</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Detector Bubble Chart" value="about">
          <v-expansion-panel-text>
            This tool parses detector on/off events from high-resolution controller
            data and plots each detector actuation as a bubble. The X-axis is the
            cycle number, the Y-axis is the gap from detector off to the next detector
            on for the same channel, and bubble size is scaled to detector on duration
            using a square-root transform.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What You Need" value="requirements">
          <v-expansion-panel-text>
            <ul>
              <li>High-resolution CSV rows: timestamp, event code, parameter</li>
              <li>Detector on/off events (81/82 or other detector toggles)</li>
              <li>Optional phase and coordinated cycle events for richer context</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <ProcessDetectionEvents
      ref="processDetectionEvents"
      @detectionEvents="storeDetectionEvents"
      @phaseEvents="storePhaseEvents"
      @coordCycleStateEvents="storeCoordCycleStateEvents"
    />

    <div class="actions-row">
      <v-btn color="primary" @click="processDetection">Process Detector Bubble Chart</v-btn>
      <v-btn color="info" variant="outlined" @click="resetZoom">Reset Zoom</v-btn>
    </div>

    <div v-if="bubbleChartData.datasets.length" class="chart-wrap">
      <Bubble ref="bubbleChart" :data="bubbleChartData" :options="bubbleChartOptions" />
    </div>

    <div v-if="!bubbleChartData.datasets.length && hasProcessed" class="muted mt-4">
      No detector on/off pairs with a measurable off-to-on gap were found.
    </div>
  </div>
</template>

<script>
import { Bubble } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import ProcessDetectionEvents from "../components/ProcessDetectionEvents.vue";

ChartJS.register(PointElement, LinearScale, Tooltip, Legend, zoom);

export default {
  name: "DetectorBubbleChart",
  components: {
    Bubble,
    ProcessDetectionEvents,
  },
  data() {
    return {
      panel: [],
      detectionEvents: [],
      phaseEvents: [],
      coordCycleStateEvents: [],
      bubbleRows: [],
      hasProcessed: false,
    };
  },
  computed: {
    bubbleChartData() {
      const palette = [
        "#1565c0",
        "#2e7d32",
        "#ef6c00",
        "#6a1b9a",
        "#00838f",
        "#c2185b",
        "#5d4037",
        "#0277bd",
        "#558b2f",
        "#ad1457",
      ];
      const phases = [...new Set(this.bubbleRows.map((row) => row.phaseLabel))];
      const phaseColorMap = new Map(
        phases.map((phase, index) => [phase, palette[index % palette.length]])
      );

      return {
        datasets: phases.map((phase) => {
          const color = phaseColorMap.get(phase);
          return {
            label: `Phase ${phase}`,
            data: this.bubbleRows
              .filter((row) => row.phaseLabel === phase)
              .map((row) => ({
                x: row.cycleNumber,
                y: row.gapToNextOnSec,
                r: row.radius,
                channel: row.channel,
                phase: row.phaseLabel,
                startTime: row.startTime,
                endTime: row.endTime,
                durationSec: row.durationSec,
                cycleNumber: row.cycleNumber,
              })),
            backgroundColor: color,
            borderColor: color,
          };
        }),
      };
    },
    bubbleChartOptions() {
      return {
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
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const raw = context.raw || {};
                return [
                  `Phase: ${raw.phase ?? "Unknown"}`,
                  `Channel: ${raw.channel ?? "—"}`,
                  `Cycle: ${raw.cycleNumber ?? "—"}`,
                  `Gap to next ON (s): ${Number(raw.y ?? 0).toFixed(2)}`,
                  `Start: ${raw.startTime ?? "—"}`,
                  `End: ${raw.endTime ?? "—"}`,
                  `ON duration (s): ${Number(raw.durationSec ?? 0).toFixed(2)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Cycle Number",
            },
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
          y: {
            title: {
              display: true,
              text: "Detector OFF-to-ON Gap Time (seconds)",
            },
            beginAtZero: true,
          },
        },
      };
    },
  },
  methods: {
    processDetection() {
      this.$refs.processDetectionEvents?.processDetectionEvents?.();
      this.hasProcessed = true;
      this.rebuildBubbleRows();
    },
    storeDetectionEvents(events) {
      this.detectionEvents = Array.isArray(events) ? events : [];
      this.rebuildBubbleRows();
    },
    storePhaseEvents(events) {
      this.phaseEvents = Array.isArray(events) ? events : [];
      this.rebuildBubbleRows();
    },
    storeCoordCycleStateEvents(events) {
      this.coordCycleStateEvents = Array.isArray(events) ? events : [];
      this.rebuildBubbleRows();
    },
    resetZoom() {
      if (this.$refs.bubbleChart?.chart?.resetZoom) {
        this.$refs.bubbleChart.chart.resetZoom();
      }
    },
    rebuildBubbleRows() {
      const cycleAnchors = this.buildCycleAnchors();
      const detectorIntervalsByChannel = this.buildDetectorIntervalsByChannel();
      const phaseLookup = this.buildPhaseLookup();
      const rows = [];

      detectorIntervalsByChannel.forEach((intervals, channel) => {
        intervals.forEach((interval) => {
          if (interval.gapToNextOnSec === null || interval.gapToNextOnSec < 0) {
            return;
          }

          const duration = interval.durationSec;
          const radius = Math.max(4, Math.sqrt(Math.max(duration, 0)) * 3.4);
          const cycleNumber = this.lookupCycleNumber(
            cycleAnchors,
            interval.onTimestampMs
          );
          const phase = phaseLookup(interval.onTimestampMs);

          rows.push({
            channel,
            startTime: interval.onTimestampHuman,
            endTime: interval.offTimestampHuman,
            durationSec: duration,
            gapToNextOnSec: interval.gapToNextOnSec,
            cycleNumber,
            phaseLabel: phase ?? "Unknown",
            radius,
          });
        });
      });

      this.bubbleRows = rows.sort((a, b) => a.cycleNumber - b.cycleNumber);
    },
    buildDetectorIntervalsByChannel() {
      const intervalsByChannel = new Map();
      const pendingOnByChannel = new Map();
      const sortedEvents = [...this.detectionEvents].sort(
        (a, b) => a.timestampMs - b.timestampMs
      );

      sortedEvents.forEach((event) => {
        const descriptor = String(event.eventDescriptor || "").toLowerCase();
        const isOn = descriptor.includes("detector on");
        const isOff = descriptor.includes("detector off");
        const channel = event.parameterCode;

        if (isOn) {
          pendingOnByChannel.set(channel, event);
          return;
        }

        if (isOff) {
          const pendingOn = pendingOnByChannel.get(channel);
          if (!pendingOn) {
            return;
          }

          const durationSec = (event.timestampMs - pendingOn.timestampMs) / 1000;
          if (durationSec < 0) {
            pendingOnByChannel.delete(channel);
            return;
          }

          if (!intervalsByChannel.has(channel)) {
            intervalsByChannel.set(channel, []);
          }
          intervalsByChannel.get(channel).push({
            onTimestampMs: pendingOn.timestampMs,
            offTimestampMs: event.timestampMs,
            onTimestampHuman: pendingOn.humanReadable,
            offTimestampHuman: event.humanReadable,
            durationSec,
            gapToNextOnSec: null,
          });
          pendingOnByChannel.delete(channel);
        }
      });

      intervalsByChannel.forEach((intervals) => {
        for (let i = 0; i < intervals.length; i += 1) {
          const next = intervals[i + 1];
          intervals[i].gapToNextOnSec =
            next ? (next.onTimestampMs - intervals[i].offTimestampMs) / 1000 : null;
        }
      });

      return intervalsByChannel;
    },
    buildCycleAnchors() {
      const sortedCycleEvents = [...this.coordCycleStateEvents]
        .filter((event) => Number.isFinite(event.timestampMs))
        .sort((a, b) => a.timestampMs - b.timestampMs);

      if (sortedCycleEvents.length) {
        return sortedCycleEvents.map((event) => event.timestampMs);
      }

      const greenPhaseStarts = [...this.phaseEvents]
        .filter((event) => event.phaseState === "green")
        .sort((a, b) => a.timestampMs - b.timestampMs)
        .map((event) => event.timestampMs);

      return greenPhaseStarts;
    },
    lookupCycleNumber(cycleAnchors, timestampMs) {
      if (!cycleAnchors.length) {
        return 1;
      }

      let low = 0;
      let high = cycleAnchors.length - 1;
      let idx = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (cycleAnchors[mid] <= timestampMs) {
          idx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      return idx + 1;
    },
    buildPhaseLookup() {
      const phaseEvents = [...this.phaseEvents].sort(
        (a, b) => a.timestampMs - b.timestampMs
      );
      let pointer = 0;
      const phaseStateMap = new Map();

      return (timestampMs) => {
        while (
          pointer < phaseEvents.length &&
          phaseEvents[pointer].timestampMs <= timestampMs
        ) {
          const event = phaseEvents[pointer];
          phaseStateMap.set(event.parameterCode, event.phaseState);
          pointer += 1;
        }

        const activeGreen = [...phaseStateMap.entries()]
          .filter(([, state]) => state === "green")
          .map(([phase]) => Number(phase))
          .sort((a, b) => a - b);

        if (activeGreen.length) {
          return activeGreen[0];
        }

        const activeYellow = [...phaseStateMap.entries()]
          .filter(([, state]) => state === "yellow")
          .map(([phase]) => Number(phase))
          .sort((a, b) => a - b);

        return activeYellow.length ? activeYellow[0] : null;
      };
    },
  },
};
</script>

<style scoped>
.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-wrap {
  margin-top: 20px;
  min-height: 360px;
}

.muted {
  color: rgba(0, 0, 0, 0.6);
}
</style>
