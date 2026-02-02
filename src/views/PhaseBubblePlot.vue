<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Phase Bubble Plot</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Phase Bubble Plot" value="about">
          <v-expansion-panel-text>
            This tool combines detector-to-phase mappings with split history
            input so split failure and red-light running metrics can be
            summarized by phase. Use the mapping box to assign detector
            channels to phases before running the split failure bubble plot.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What You Need" value="requirements">
          <v-expansion-panel-text>
            <ul>
              <li>Detector-to-phase mapping table (detector channel, phase)</li>
              <li>Split history data for split failures and red-light running</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste detector mappings like:
            <pre>
Det 1\t6
Det 2\t2
Det 3\t0
            </pre>
            Then load split history data and click <b>Process</b> to review the
            split failure bubble plot below.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <section class="left-justify-text mt-6">
      <h2>Split Failure Bubble Plot</h2>
      <p class="muted">
        Use the split history input to size bubbles by average split served and
        compare split failures to red-light runner exposure. The Y-axis sums
        elapsed seconds from yellow start for each red-light runner event; time
        during all-red continues incrementing beyond yellow. If you prefer an
        average or count instead of a sum, adjust the aggregation logic and
        update the labels and tooltip text accordingly.
      </p>
      <v-row>
        <v-col cols="12" md="7">
          <ProcessSplitHistory
            @phaseSplitAggregates="storePhaseAggregates"
            @phaseSplitPatternAggregates="storePatternAggregates"
            @splitFailureEvents="storeSplitFailureEvents"
          ></ProcessSplitHistory>
        </v-col>
        <v-col cols="12" md="5">
          <PlotDetectionTimeSeries :plotData="[]" :showChart="false" />
        </v-col>
      </v-row>
      <div v-if="phaseAggregates.length" class="bubble-chart">
        <div class="bubble-chart__controls">
          <v-select
            v-if="patternOptions.length"
            v-model="selectedPattern"
            :items="patternOptions"
            label="Coordination pattern"
            variant="outlined"
            density="comfortable"
          />
          <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>
        </div>
        <Bubble
          ref="bubbleChart"
          :data="bubbleChartData"
          :options="bubbleChartOptions"
        />
      </div>
      <div v-if="splitFailureRows.length" class="split-failure-table">
        <h3>Split Failure Event Details</h3>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Failure timestamp</th>
              <th>Detector on timestamp</th>
              <th>Yellow start</th>
              <th>Red-clear start</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in splitFailureRows" :key="`${row.phase}-${index}`">
              <td>{{ row.phase }}</td>
              <td>{{ row.timestamp }}</td>
              <td>{{ row.detectorOnTimestamp }}</td>
              <td>{{ row.yellowStartTimestamp }}</td>
              <td>{{ row.redClearStartTimestamp }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </section>
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
import ProcessSplitHistory from "../components/ProcessSplitHistory.vue";
import PlotDetectionTimeSeries from "../components/foundational/PlotDetectionTimeSeries.vue";

ChartJS.register(PointElement, LinearScale, Tooltip, Legend, zoom);

export default {
  name: "PhaseBubblePlot",
  components: {
    Bubble,
    ProcessSplitHistory,
    PlotDetectionTimeSeries,
  },
  data() {
    return {
      panel: [],
      phaseAggregates: [],
      patternAggregates: [],
      selectedPattern: null,
      splitFailureEvents: [],
    };
  },
  computed: {
    patternOptions() {
      if (!this.patternAggregates.length) {
        return [];
      }
      return [
        { title: "All patterns", value: null },
        ...this.patternAggregates.map((entry) => ({
          title: `Pattern ${entry.pattern}`,
          value: entry.pattern,
        })),
      ];
    },
    displayedPhaseAggregates() {
      if (!this.patternAggregates.length) {
        return this.phaseAggregates;
      }
      if (this.selectedPattern === null || this.selectedPattern === undefined) {
        return this.phaseAggregates;
      }
      const selected = this.patternAggregates.find(
        (entry) => entry.pattern === this.selectedPattern
      );
      return selected ? selected.aggregates : this.phaseAggregates;
    },
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
      const phaseColors = new Map();
      this.displayedPhaseAggregates.forEach((row, index) => {
        phaseColors.set(row.phase, palette[index % palette.length]);
      });
      const bubbleScale = 1.4;
      return {
        datasets: this.displayedPhaseAggregates.map((row) => {
          const radius = Math.max(
            4,
            Math.sqrt(Number(row.avgSplitServed) || 0) * bubbleScale,
          );
          const color = phaseColors.get(row.phase);
          return {
            label: `Phase ${row.phase}`,
            data: [
              {
                x: Number(row.splitFailures) || 0,
                y: Number(row.redRunnerSeconds) || 0,
                r: radius,
                phase: row.phase,
                avgSplitServed: row.avgSplitServed,
              },
            ],
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
                const phase = raw.phase ?? context.dataset.label;
                return [
                  `Phase: ${phase}`,
                  `Split failures: ${raw.x ?? 0}`,
                  `Red-runner seconds since yellow start (summed; includes all-red): ${
                    raw.y ?? 0
                  }`,
                  `Avg split served: ${raw.avgSplitServed ?? "—"}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Split Failures",
            },
            beginAtZero: true,
          },
          y: {
            title: {
              display: true,
              text: "Red-light runner seconds since yellow start (summed; includes all-red)",
            },
            beginAtZero: true,
          },
        },
      };
    },
    splitFailureRows() {
      return this.splitFailureEvents
        .map((event) => ({
          phase: event.phase,
          timestampMs: event.timestamp?.MillisecFromEpoch ?? 0,
          timestamp: this.formatTimestamp(event.timestamp),
          detectorOnTimestamp: this.formatTimestamp(event.detectorOnTimestamp),
          yellowStartTimestamp: this.formatTimestamp(event.yellowStartTimestamp),
          redClearStartTimestamp: this.formatTimestamp(
            event.redClearStartTimestamp
          ),
        }))
        .sort((a, b) => {
          if (a.phase === b.phase) {
            return a.timestampMs - b.timestampMs;
          }
          return a.phase - b.phase;
        });
    },
  },
  methods: {
    storePhaseAggregates(data) {
      this.phaseAggregates = data;
    },
    storePatternAggregates(data) {
      this.patternAggregates = Array.isArray(data) ? data : [];
      if (!this.patternAggregates.length) {
        this.selectedPattern = null;
        return;
      }
      if (
        this.selectedPattern !== null &&
        !this.patternAggregates.some(
          (entry) => entry.pattern === this.selectedPattern
        )
      ) {
        this.selectedPattern = null;
      }
    },
    storeSplitFailureEvents(data) {
      this.splitFailureEvents = Array.isArray(data) ? data : [];
    },
    resetZoom() {
      if (this.$refs.bubbleChart?.chart?.resetZoom) {
        this.$refs.bubbleChart.chart.resetZoom();
      }
    },
    formatTimestamp(timestamp) {
      if (!timestamp) {
        return "—";
      }
      if (typeof timestamp === "string") {
        return timestamp;
      }
      return timestamp.humanReadable || timestamp.iso || timestamp.OGtimestamp || "—";
    },
  },
};
</script>

<style scoped>
.bubble-chart {
  min-height: 320px;
  margin-top: 16px;
}
.bubble-chart__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.bubble-chart__controls :deep(.v-input) {
  max-width: 280px;
}
.split-failure-table {
  margin-top: 24px;
}
.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}
</style>
