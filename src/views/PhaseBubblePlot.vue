<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Phase Bubble Plot</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Phase Bubble Plot" value="about">
          <v-expansion-panel-text>
            This tool combines detector-to-phase mappings with high-resolution
            controller events to visualize detector activity aligned to phase
            service. Use the mapping box to assign detector channels to phases,
            then plot the detection events against the phase timeline.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What You Need" value="requirements">
          <v-expansion-panel-text>
            <ul>
              <li>High-resolution CSV data (timestamp, event code, parameter)</li>
              <li>Detector-to-phase mapping table (detector channel, phase)</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high resolution controller data as CSV lines in the format:
            <pre>
16764339605, 82, 7
16764339625, 81, 7
16764339705, 90, 12
            </pre>
            Then paste detector mappings like:
            <pre>
Det 1\t6
Det 2\t2
Det 3\t0
            </pre>
            Click <b>Process Bubble Plot</b> to render the visualization.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />
    <ProcessDetectionEvents
      ref="processDetectionEvents"
      @detectionEvents="storeDetectionEvents"
      @phaseEvents="storePhaseEvents"
      @coordPatternEvents="storeCoordPatternEvents"
      @coordCycleStateEvents="storeCoordCycleStateEvents"
    ></ProcessDetectionEvents>
    <div>
      <v-btn @click="processDetection" color="primary">
        Process Bubble Plot
      </v-btn>
    </div>
    <PlotDetectionTimeSeries
      :plotData="detectionEvents"
      :phaseData="phaseEvents"
      :coordPatternData="coordPatternEvents"
      :coordCycleStateData="coordCycleStateEvents"
    ></PlotDetectionTimeSeries>

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
      <ProcessSplitHistory
        @phaseSplitAggregates="storePhaseAggregates"
      ></ProcessSplitHistory>
      <div v-if="phaseAggregates.length" class="bubble-chart">
        <Bubble :data="bubbleChartData" :options="bubbleChartOptions" />
      </div>
    </section>
  </div>
</template>

<script>
import { Bubble } from "vue-chartjs";
import {
  Chart as ChartJS,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import ProcessDetectionEvents from "../components/ProcessDetectionEvents.vue";
import ProcessSplitHistory from "../components/ProcessSplitHistory.vue";
import PlotDetectionTimeSeries from "../components/foundational/PlotDetectionTimeSeries.vue";

ChartJS.register(PointElement, LinearScale, Tooltip, Legend);

export default {
  name: "PhaseBubblePlot",
  components: {
    Bubble,
    ProcessDetectionEvents,
    ProcessSplitHistory,
    PlotDetectionTimeSeries,
  },
  data() {
    return {
      panel: [],
      detectionEvents: [],
      phaseEvents: [],
      coordPatternEvents: [],
      coordCycleStateEvents: [],
      phaseAggregates: [],
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
      const phaseColors = new Map();
      this.phaseAggregates.forEach((row, index) => {
        phaseColors.set(row.phase, palette[index % palette.length]);
      });
      const bubbleScale = 1.4;
      return {
        datasets: this.phaseAggregates.map((row) => {
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
  },
  methods: {
    processDetection() {
      this.$refs.processDetectionEvents?.processDetectionEvents?.();
    },
    storeDetectionEvents(events) {
      this.detectionEvents = events;
    },
    storePhaseEvents(events) {
      this.phaseEvents = events;
    },
    storeCoordPatternEvents(events) {
      this.coordPatternEvents = events;
    },
    storeCoordCycleStateEvents(events) {
      this.coordCycleStateEvents = events;
    },
    storePhaseAggregates(data) {
      this.phaseAggregates = data;
    },
  },
};
</script>

<style scoped>
.bubble-chart {
  min-height: 320px;
  margin-top: 16px;
}
.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}
</style>
