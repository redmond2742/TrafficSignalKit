<template>
  <v-expansion-panels class="mapping-card" variant="accordion">
    <v-expansion-panel>
      <v-expansion-panel-title>Detector-to-Phase Alignment</v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-row>
          <v-col cols="12" md="7">
            <v-textarea
              v-model="mappingInput"
              :placeholder="mappingPlaceholder"
              label="Detector-to-Phase Table"
              rows="6"
              class="mapping-textarea"
            ></v-textarea>
          </v-col>
          <v-col cols="12" md="5">
            <div class="alignment-toggle">
              <div class="alignment-label">Sort rows by</div>
              <v-btn-toggle v-model="alignmentMode" color="primary" mandatory>
                <v-btn value="channels">Detection</v-btn>
                <v-btn value="phases">Phase</v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
  <div class="plot-mode-controls">
    <div class="alignment-label">Plot mode</div>
    <v-btn-toggle v-model="phasePlotMode" color="primary" mandatory>
      <v-btn value="all">All phases</v-btn>
      <v-btn value="single">Single phase</v-btn>
    </v-btn-toggle>
    <v-select
      v-if="phasePlotMode === 'single'"
      v-model="selectedPhase"
      :items="phaseSelectItems"
      item-title="title"
      item-value="value"
      label="Phase to align"
      density="compact"
      class="phase-select"
    ></v-select>
  </div>
  <template v-if="showChart">
    <br />
    <v-btn @click="resetZoom">Reset Zoom</v-btn>
    <br />
    <Scatter
      :data="chartData"
      :options="chartOptions"
      ref="scatterChart"
    ></Scatter>
  </template>
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
    showChart: {
      type: Boolean,
      default: true,
    },
    phaseData: {
      type: Array,
      default: () => [],
    },
    coordPatternData: {
      type: Array,
      default: () => [],
    },
    coordCycleStateData: {
      type: Array,
      default: () => [],
    },
  },
  watch: {
    phases: {
      immediate: true,
      handler(phases) {
        if (!phases.length) {
          this.selectedPhase = null;
          return;
        }

        if (!phases.includes(this.selectedPhase)) {
          this.selectedPhase = phases[0];
        }
      },
    },
  },
  data() {
    return {
      mappingInput: "",
      alignmentMode: "channels",
      phasePlotMode: "all",
      selectedPhase: null,
      mappingPlaceholder:
        "Paste detector-to-phase mappings, e.g.\nDet 1\t6\nDet 2\t2\nDet 3\t0",
    };
  },
  computed: {
    mappingEntries() {
      if (!this.mappingInput) {
        return [];
      }

      return this.mappingInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const numbers = line.match(/\d+/g);
          if (!numbers || numbers.length < 2) {
            return null;
          }
          const detector = parseInt(numbers[0], 10);
          const phase = parseInt(numbers[1], 10);
          if (Number.isNaN(detector) || Number.isNaN(phase)) {
            return null;
          }
          return {
            detector,
            phase: phase === 0 ? null : phase,
          };
        })
        .filter(Boolean);
    },
    mappingByChannel() {
      return this.mappingEntries.reduce((lookup, entry) => {
        lookup[entry.detector] = entry.phase;
        return lookup;
      }, {});
    },
    hasMapping() {
      return Object.keys(this.mappingByChannel).length > 0;
    },
    channels() {
      const channelSet = new Set();
      this.plotData.forEach((event) => {
        if (typeof event.parameterCode === "number") {
          channelSet.add(event.parameterCode);
        }
      });
      return Array.from(channelSet).sort((a, b) => a - b);
    },
    alignedRows() {
      const rows = this.channels.map((channel) => ({
        channel,
        phase: this.mappingByChannel[channel] ?? null,
      }));

      if (!this.hasMapping) {
        return rows;
      }

      if (this.alignmentMode === "phases") {
        return [...rows].sort((a, b) => {
          if (a.phase === null && b.phase === null) {
            return a.channel - b.channel;
          }
          if (a.phase === null) {
            return 1;
          }
          if (b.phase === null) {
            return -1;
          }
          if (a.phase === b.phase) {
            return a.channel - b.channel;
          }
          return a.phase - b.phase;
        });
      }

      return rows;
    },
    channelLabels() {
      if (!this.hasMapping) {
        return this.channels.map((channel) => `Channel ${channel}`);
      }
      return this.alignedRows.map((row) => `Channel ${row.channel}`);
    },
    channelLookup() {
      if (!this.hasMapping) {
        return this.channels.reduce((lookup, channel) => {
          lookup[channel] = `Channel ${channel}`;
          return lookup;
        }, {});
      }

      return this.alignedRows.reduce((lookup, row) => {
        lookup[row.channel] = `Channel ${row.channel}`;
        return lookup;
      }, {});
    },
    plotRowLabels() {
      if (this.activePhase !== null) {
        return this.singlePhaseRows;
      }
      return this.channelLabels;
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
    phaseSelectItems() {
      return this.phases.map((phase) => ({
        title: `Phase ${phase}`,
        value: phase,
      }));
    },
    activePhase() {
      if (this.phasePlotMode !== "single") {
        return null;
      }
      return typeof this.selectedPhase === "number" ? this.selectedPhase : null;
    },
    mappedPhaseCodes() {
      if (!this.hasMapping) {
        return [];
      }
      return this.alignedRows
        .map((row) => row.phase)
        .filter((phase) => typeof phase === "number");
    },
    extraPhases() {
      if (!this.hasMapping) {
        return [];
      }
      const mappedPhases = new Set(this.mappedPhaseCodes);
      return this.phases.filter((phase) => !mappedPhases.has(phase));
    },
    mappedPhaseAxisLabels() {
      if (!this.hasMapping) {
        return [];
      }

      return this.alignedRows.map((row, index) => {
        const baseLabel = row.phase ? `Phase ${row.phase}` : "Unassigned";
        return {
          axisLabel: `${baseLabel}||row-${index}`,
          displayLabel: baseLabel,
          phase: row.phase,
        };
      });
    },
    extraPhaseAxisLabels() {
      if (!this.hasMapping) {
        return [];
      }

      return this.extraPhases.map((phase) => ({
        axisLabel: `Phase ${phase}||extra-${phase}`,
        displayLabel: `Phase ${phase}`,
        phase,
      }));
    },
    phaseAxisLabels() {
      if (!this.hasMapping) {
        return this.phases.map((phase) => ({
          axisLabel: `Phase ${phase}`,
          displayLabel: `Phase ${phase}`,
          phase,
        }));
      }

      return [...this.mappedPhaseAxisLabels, ...this.extraPhaseAxisLabels];
    },
    phaseLabels() {
      return this.phaseAxisLabels.map((label) => label.axisLabel);
    },
    phaseDisplayLabelLookup() {
      return this.phaseAxisLabels.reduce((lookup, label) => {
        lookup[label.axisLabel] = label.displayLabel;
        return lookup;
      }, {});
    },
    phaseLookup() {
      if (!this.hasMapping) {
        return this.phases.reduce((lookup, phase) => {
          lookup[phase] = `Phase ${phase}`;
          return lookup;
        }, {});
      }

      const lookup = this.alignedRows.reduce((lookup, row, index) => {
        if (row.phase) {
          lookup[row.phase] = this.mappedPhaseAxisLabels[index].axisLabel;
        }
        return lookup;
      }, {});

      this.extraPhaseAxisLabels.forEach((label) => {
        lookup[label.phase] = label.axisLabel;
      });

      return lookup;
    },
    phaseAxisLabelGroups() {
      if (!this.hasMapping) {
        return {};
      }

      return this.alignedRows.reduce((lookup, row, index) => {
        if (!row.phase) {
          return lookup;
        }
        if (!lookup[row.phase]) {
          lookup[row.phase] = [];
        }
        lookup[row.phase].push(this.mappedPhaseAxisLabels[index].axisLabel);
        return lookup;
      }, {});
    },
    phaseCycles() {
      if (this.activePhase === null) {
        return [];
      }

      const phaseEvents = this.phaseData
        .filter((event) => event.parameterCode === this.activePhase)
        .sort((a, b) => a.timestampMs - b.timestampMs);

      const cycles = [];
      let currentCycle = null;

      phaseEvents.forEach((event) => {
        if (event.phaseState === "green") {
          if (currentCycle && currentCycle.end <= currentCycle.start) {
            currentCycle.end = event.timestampMs;
            currentCycle.duration = currentCycle.end - currentCycle.start;
            cycles.push(currentCycle);
          }
          currentCycle = {
            phase: this.activePhase,
            start: event.timestampMs,
            end: event.timestampMs,
          };
          return;
        }

        if (!currentCycle) {
          return;
        }

        if (event.phaseState === "inactive") {
          currentCycle.end = event.timestampMs;
          currentCycle.duration = currentCycle.end - currentCycle.start;
          if (currentCycle.duration > 0) {
            cycles.push(currentCycle);
          }
          currentCycle = null;
        }
      });

      return cycles.map((cycle, index) => ({
        ...cycle,
        rowLabel: `Run ${index + 1}`,
      }));
    },
    singlePhaseRows() {
      return this.phaseCycles.map((cycle) => cycle.rowLabel);
    },
    filteredDetectionEvents() {
      if (this.activePhase === null) {
        return this.plotData;
      }

      if (!this.hasMapping) {
        return this.plotData;
      }

      return this.plotData.filter(
        (event) => this.mappingByChannel[event.parameterCode] === this.activePhase
      );
    },
    singlePhaseDetectionPoints() {
      if (this.activePhase === null || !this.phaseCycles.length) {
        return [];
      }

      const mappedChannels = this.getChannelsForActivePhase();

      return this.phaseCycles.flatMap((cycle) => {
        const cycleEvents = this.filteredDetectionEvents.filter(
          (event) =>
            event.timestampMs >= cycle.start && event.timestampMs <= cycle.end
        );

        const carryInEvents = this.getCarryInDetectionEvents(cycle, mappedChannels);

        return [...carryInEvents, ...cycleEvents].map((event) => ({
          x: event.timestampMs - cycle.start,
          y: cycle.rowLabel,
          event,
          cycle,
        }));
      });
    },
    singlePhaseStateBars() {
      if (this.activePhase === null || !this.phaseCycles.length) {
        return [];
      }

      const states = this.phaseIntervals.filter(
        (interval) => interval.phase === this.activePhase
      );

      return this.phaseCycles.flatMap((cycle) =>
        states
          .filter(
            (interval) => interval.start >= cycle.start && interval.end <= cycle.end
          )
          .map((interval) => ({
            x: [interval.start - cycle.start, interval.end - cycle.start],
            y: cycle.rowLabel,
            phase: interval,
          }))
      );
    },
    singlePhaseRange() {
      if (!this.singlePhaseDetectionPoints.length && !this.phaseCycles.length) {
        return null;
      }

      const durations = this.phaseCycles
        .map((cycle) => cycle.duration)
        .filter((value) => typeof value === "number" && value > 0);

      if (!durations.length) {
        return null;
      }

      const max = Math.max(...durations);
      return {
        min: 0,
        max: max * 1.05,
      };
    },
    chartEndTimestamp() {
      const timestamps = [
        ...this.plotData.map((event) => event.timestampMs),
        ...this.phaseData.map((event) => event.timestampMs),
        ...this.coordPatternData.map((event) => event.timestampMs),
        ...this.coordCycleStateData.map((event) => event.timestampMs),
      ].filter((value) => typeof value === "number");
      return timestamps.length ? Math.max(...timestamps) : null;
    },
    eventRange() {
      const timestamps = [
        ...this.plotData.map((event) => event.timestampMs),
        ...this.phaseData.map((event) => event.timestampMs),
        ...this.coordPatternData.map((event) => event.timestampMs),
        ...this.coordCycleStateData.map((event) => event.timestampMs),
      ].filter((value) => typeof value === "number");
      if (!timestamps.length) {
        return null;
      }
      const min = Math.min(...timestamps);
      const max = Math.max(...timestamps);
      if (min === max) {
        return { min: min - 1000, max: max + 1000 };
      }
      const padding = Math.max((max - min) * 0.05, 1);
      return { min: min - padding, max: max + padding };
    },
    coordPatternNumbers() {
      const patternSet = new Set();
      this.coordPatternData.forEach((event) => {
        if (typeof event.parameterCode === "number") {
          patternSet.add(event.parameterCode);
        }
      });
      return Array.from(patternSet).sort((a, b) => a - b);
    },
    coordPatternColors() {
      const count = this.coordPatternNumbers.length;
      const basePalette = [
        "#e53935",
        "#1e88e5",
        "#43a047",
        "#8e24aa",
        "#f4511e",
        "#3949ab",
        "#00897b",
        "#f9a825",
        "#6d4c41",
        "#5e35b1",
      ];
      const extraCount = Math.max(count - basePalette.length, 1);
      const colorMap = {};
      this.coordPatternNumbers.forEach((pattern, index) => {
        if (index < basePalette.length) {
          colorMap[pattern] = basePalette[index];
          return;
        }
        const hue = Math.round(
          ((index - basePalette.length) / extraCount) * 360
        );
        colorMap[pattern] = `hsl(${hue}, 70%, 45%)`;
      });
      return colorMap;
    },
    coordPatternLineDataset() {
      if (this.activePhase !== null) {
        return [];
      }

      if (!this.coordPatternData.length) {
        return [];
      }

      if (!this.plotRowLabels.length) {
        return [];
      }

      const yStart = this.plotRowLabels[0];
      const yEnd = this.plotRowLabels[this.plotRowLabels.length - 1];

      const grouped = this.coordPatternData.reduce((lookup, event) => {
        if (typeof event.parameterCode !== "number") {
          return lookup;
        }
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push(event);
        return lookup;
      }, {});

      return Object.entries(grouped).map(([patternCode, events]) => ({
        type: "line",
        label: `Coord Pattern ${patternCode}`,
        data: events.flatMap((event) => [
          { x: event.timestampMs, y: yStart, event },
          { x: event.timestampMs, y: yEnd, event },
        ]),
        borderColor: this.coordPatternColors[patternCode] ?? "#ff7043",
        backgroundColor: this.coordPatternColors[patternCode] ?? "#ff7043",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        showLine: true,
        borderCapStyle: "round",
        borderJoinStyle: "round",
        spanGaps: true,
      }));
    },
    coordCycleStateTypes() {
      const typeSet = new Set();
      this.coordCycleStateData.forEach((event) => {
        if (typeof event.parameterCode === "number") {
          typeSet.add(event.parameterCode);
        }
      });
      return Array.from(typeSet).sort((a, b) => a - b);
    },
    coordCycleStateLabels() {
      return {
        0: "Free",
        1: "In Step",
        2: "Transition - Add",
        3: "Transition - Subtract",
        4: "Transition - Dwell",
        5: "Local Zero",
        6: "Begin Pickup",
        7: "Master Cycle Zero",
      };
    },
    coordCycleStateColors() {
      const palette = [
        "#00acc1",
        "#3949ab",
        "#7cb342",
        "#f4511e",
        "#8e24aa",
        "#fdd835",
        "#6d4c41",
        "#00897b",
      ];
      const colorMap = {};
      this.coordCycleStateTypes.forEach((state, index) => {
        colorMap[state] = palette[index % palette.length];
      });
      return colorMap;
    },
    coordCycleStateLineDataset() {
      if (this.activePhase !== null) {
        return [];
      }

      if (!this.coordCycleStateData.length) {
        return [];
      }

      if (!this.plotRowLabels.length) {
        return [];
      }

      const yStart = this.plotRowLabels[0];
      const yEnd = this.plotRowLabels[this.plotRowLabels.length - 1];

      const grouped = this.coordCycleStateData.reduce((lookup, event) => {
        if (typeof event.parameterCode !== "number") {
          return lookup;
        }
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push(event);
        return lookup;
      }, {});

      return Object.entries(grouped).map(([stateCode, events]) => {
        const label =
          this.coordCycleStateLabels[stateCode] ?? `State ${stateCode}`;
        const color = this.coordCycleStateColors[stateCode] ?? "#546e7a";
        return {
          type: "line",
          label: `Coord Cycle ${label}`,
          data: events.flatMap((event) => [
            { x: event.timestampMs, y: yStart, event },
            { x: event.timestampMs, y: yEnd, event },
          ]),
          borderColor: color,
          backgroundColor: color,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          borderCapStyle: "round",
          borderJoinStyle: "round",
          spanGaps: true,
        };
      });
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
      if (this.activePhase !== null) {
        if (!this.singlePhaseStateBars.length) {
          return null;
        }

        const stateColors = {
          green: "rgba(76, 175, 80, 0.25)",
          yellow: "rgba(251, 192, 45, 0.25)",
          red: "rgba(229, 57, 53, 0.25)",
        };
        const borderColors = {
          green: "rgba(76, 175, 80, 0.7)",
          yellow: "rgba(251, 192, 45, 0.7)",
          red: "rgba(229, 57, 53, 0.7)",
        };

        return {
          type: "bar",
          label: "Phase State",
          data: this.singlePhaseStateBars,
          backgroundColor: this.singlePhaseStateBars.map(
            (point) => stateColors[point.phase.state] ?? "#9e9e9e"
          ),
          borderColor: this.singlePhaseStateBars.map(
            (point) => borderColors[point.phase.state] ?? "#9e9e9e"
          ),
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
          indexAxis: "y",
        };
      }

      if (!this.phaseIntervals.length) {
        return null;
      }

      const stateColors = {
        green: "rgba(76, 175, 80, 0.25)",
        yellow: "rgba(251, 192, 45, 0.25)",
        red: "rgba(229, 57, 53, 0.25)",
      };
      const borderColors = {
        green: "rgba(76, 175, 80, 0.7)",
        yellow: "rgba(251, 192, 45, 0.7)",
        red: "rgba(229, 57, 53, 0.7)",
      };

      const phaseDataPoints = [];
      if (this.hasMapping) {
        this.phaseIntervals.forEach((interval) => {
          const labels = this.phaseAxisLabelGroups[interval.phase] ?? [];
          if (labels.length) {
            labels.forEach((label) => {
              phaseDataPoints.push({
                x: [interval.start, interval.end],
                y: label,
                phase: interval,
              });
            });
          } else {
            const fallbackLabel =
              this.phaseLookup[interval.phase] ?? `Phase ${interval.phase}`;
            phaseDataPoints.push({
              x: [interval.start, interval.end],
              y: fallbackLabel,
              phase: interval,
            });
          }
        });
      } else {
        phaseDataPoints.push(
          ...this.phaseIntervals.map((interval) => ({
            x: [interval.start, interval.end],
            y: this.phaseLookup[interval.phase] ?? `Phase ${interval.phase}`,
            phase: interval,
          }))
        );
      }

      return {
        type: "bar",
        label: "Phase State",
        yAxisID: "y1",
        data: phaseDataPoints,
        backgroundColor: phaseDataPoints.map(
          (point) => stateColors[point.phase.state] ?? "#9e9e9e"
        ),
        borderColor: phaseDataPoints.map(
          (point) => borderColors[point.phase.state] ?? "#9e9e9e"
        ),
        borderWidth: 1,
        borderSkipped: false,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
        indexAxis: "y",
      };
    },
    chartData() {
      if (this.activePhase !== null) {
        return {
          datasets: [
            {
              label: "Detection Events",
              data: this.singlePhaseDetectionPoints,
              borderColor: this.singlePhaseDetectionPoints.map(
                (point) => this.getDetectionEventStyle(point.event).color
              ),
              backgroundColor: this.singlePhaseDetectionPoints.map(
                (point) => this.getDetectionEventStyle(point.event).color
              ),
              pointRadius: this.singlePhaseDetectionPoints.map(
                (point) => this.getDetectionEventStyle(point.event).radius
              ),
              pointStyle: this.singlePhaseDetectionPoints.map(
                (point) => this.getDetectionEventStyle(point.event).style
              ),
              pointHoverRadius: this.singlePhaseDetectionPoints.map(
                (point) => this.getDetectionEventStyle(point.event).radius + 1
              ),
            },
          ].concat(this.phaseDataset ? [this.phaseDataset] : []),
        };
      }

      if (!this.plotData.length) {
        return {
          datasets: [
            {
              label: "Detection Events",
              data: [],
              borderColor: "#1976d2",
              backgroundColor: "#1976d2",
            },
          ]
            .concat(this.coordPatternLineDataset)
            .concat(this.coordCycleStateLineDataset)
            .concat(this.phaseDataset ? [this.phaseDataset] : []),
        };
      }

      return {
        datasets: [
          {
            label: "Detection Events",
            data: this.filteredDetectionEvents.map((event) => ({
              x: event.timestampMs,
              y:
                this.channelLookup[event.parameterCode] ??
                `Channel ${event.parameterCode}`,
              event,
            })),
            borderColor: this.filteredDetectionEvents.map(
              (event) => this.getDetectionEventStyle(event).color
            ),
            backgroundColor: this.filteredDetectionEvents.map(
              (event) => this.getDetectionEventStyle(event).color
            ),
            pointRadius: this.filteredDetectionEvents.map(
              (event) => this.getDetectionEventStyle(event).radius
            ),
            pointStyle: this.filteredDetectionEvents.map(
              (event) => this.getDetectionEventStyle(event).style
            ),
            pointHoverRadius: this.filteredDetectionEvents.map(
              (event) => this.getDetectionEventStyle(event).radius + 1
            ),
          },
        ]
          .concat(this.coordPatternLineDataset)
          .concat(this.coordCycleStateLineDataset)
          .concat(this.phaseDataset ? [this.phaseDataset] : []),
      };
    },
    chartOptions() {
      return {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: (chart) => {
                const baseLabels =
                  ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                const filteredLabels = baseLabels.filter(
                  (label) => label.text !== "Detection Events"
                );
                const detectionLegendItems = [
                  {
                    text: "Detector On",
                    fillStyle: "#1e88e5",
                    strokeStyle: "#1e88e5",
                    lineWidth: 1,
                    hidden: false,
                    pointStyle: "circle",
                  },
                  {
                    text: "Detector Off",
                    fillStyle: "#8e24aa",
                    strokeStyle: "#8e24aa",
                    lineWidth: 1,
                    hidden: false,
                    pointStyle: "circle",
                  },
                ];

                return [...detectionLegendItems, ...filteredLabels];
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const event = context.raw?.event;
                const phase = context.raw?.phase;
                if (!event) {
                  if (phase) {
                    return [
                      `${this.formatPhaseAxisLabel(context.parsed.y)}: ${phase.state.toUpperCase()}`,
                      `Start: ${new Date(phase.start).toLocaleString()}`,
                      `End: ${new Date(phase.end).toLocaleString()}`,
                    ];
                  }
                  return `${this.formatPhaseAxisLabel(context.parsed.y)}`;
                }
                if (
                  event.eventDescriptor?.toLowerCase().includes("coord pattern change")
                ) {
                  return [
                    `${event.eventDescriptor} (Code ${event.eventCode})`,
                    `Pattern: ${event.parameterCode ?? "N/A"}`,
                    `Time: ${event.humanReadable ?? event.timestampISO}`,
                  ];
                }
                if (
                  event.eventDescriptor
                    ?.toLowerCase()
                    .includes("coord cycle state change")
                ) {
                  const stateLabel =
                    this.coordCycleStateLabels[event.parameterCode] ??
                    `State ${event.parameterCode ?? "N/A"}`;
                  return [
                    `${event.eventDescriptor} (Code ${event.eventCode})`,
                    `State: ${stateLabel}`,
                    `Time: ${event.humanReadable ?? event.timestampISO}`,
                  ];
                }
                return [
                  `${event.eventDescriptor} (Code ${event.eventCode})`,
                  `Channel: ${event.parameterCode ?? "N/A"}`,
                  ...(context.raw?.cycle
                    ? [`Phase Run: ${context.raw.cycle.rowLabel}`]
                    : []),
                  ...(this.activePhase !== null
                    ? [
                        `Offset: ${(context.parsed.x / 1000).toFixed(2)}s from green start`,
                      ]
                    : []),
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
              drag: {
                enabled: true,
                backgroundColor: "rgba(25, 118, 210, 0.15)",
              },
              mode: "x",
            },
            pan: {
              enabled: true,
              mode: "x",
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            min:
              this.activePhase !== null
                ? this.singlePhaseRange?.min
                : this.eventRange?.min,
            max:
              this.activePhase !== null
                ? this.singlePhaseRange?.max
                : this.eventRange?.max,
            title: {
              display: true,
              text:
                this.activePhase !== null
                  ? "Time from Start of Green (ms)"
                  : "Timestamp",
            },
            ticks: {
              callback: (value) => {
                if (this.activePhase !== null) {
                  const numericValue =
                    typeof value === "string" ? parseFloat(value) : value;
                  if (Number.isNaN(numericValue)) {
                    return value;
                  }
                  return `${(numericValue / 1000).toFixed(1)}s`;
                }
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
            labels: this.plotRowLabels,
            title: {
              display: true,
              text:
                this.activePhase !== null ? "Phase Occurrence" : "Detection Channel",
            },
          },
          y1: {
            type: "category",
            labels: this.phaseLabels,
            position: "right",
            display: this.activePhase === null,
            title: {
              display: true,
              text: "Phase State",
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value) => this.formatPhaseAxisLabel(value),
            },
          },
        },
      };
    },
  },
  methods: {
    getChannelsForActivePhase() {
      if (this.activePhase === null) {
        return [];
      }

      if (!this.hasMapping) {
        return this.channels;
      }

      return Object.entries(this.mappingByChannel)
        .filter(([, phase]) => phase === this.activePhase)
        .map(([channel]) => Number(channel))
        .filter((channel) => !Number.isNaN(channel));
    },
    getCarryInDetectionEvents(cycle, mappedChannels) {
      if (!mappedChannels.length) {
        return [];
      }

      return mappedChannels
        .map((channel) => {
          const channelEvents = this.filteredDetectionEvents
            .filter((event) => event.parameterCode === channel)
            .sort((a, b) => a.timestampMs - b.timestampMs);

          const eventsBeforeGreen = channelEvents.filter(
            (event) => event.timestampMs < cycle.start
          );

          const lastOnEvent = [...eventsBeforeGreen]
            .reverse()
            .find((event) => this.isDetectorOnEvent(event));

          if (!lastOnEvent) {
            return null;
          }

          const turnedOffBeforeGreen = eventsBeforeGreen.some(
            (event) =>
              event.timestampMs > lastOnEvent.timestampMs &&
              this.isDetectorOffEvent(event)
          );

          if (turnedOffBeforeGreen) {
            return null;
          }

          const hasOffDuringCycle = channelEvents.some(
            (event) =>
              event.timestampMs >= cycle.start &&
              event.timestampMs <= cycle.end &&
              this.isDetectorOffEvent(event)
          );

          if (!hasOffDuringCycle) {
            return null;
          }

          return {
            ...lastOnEvent,
            timestampMs: cycle.start,
            eventDescriptor: `${lastOnEvent.eventDescriptor} (active at green start)`,
            carryInAtGreenStart: true,
          };
        })
        .filter(Boolean);
    },
    isDetectorOnEvent(event) {
      const descriptor = event?.eventDescriptor?.toLowerCase() ?? "";
      return descriptor.includes("detector on");
    },
    isDetectorOffEvent(event) {
      const descriptor = event?.eventDescriptor?.toLowerCase() ?? "";
      return descriptor.includes("detector off");
    },
    getDetectionEventStyle(event) {
      const descriptor = event?.eventDescriptor?.toLowerCase() ?? "";

      if (descriptor.includes("fault") || descriptor.includes("failed")) {
        return { color: "#e53935", style: "crossRot", radius: 6 };
      }

      if (descriptor.includes("detector on")) {
        return { color: "#1e88e5", style: "circle", radius: 4 };
      }

      if (descriptor.includes("detector off")) {
        return { color: "#8e24aa", style: "circle", radius: 4 };
      }

      return { color: "#546e7a", style: "circle", radius: 4 };
    },
    formatPhaseAxisLabel(value) {
      if (value == null) {
        return "";
      }
      if (typeof value === "number") {
        const label = this.phaseLabels[value];
        return this.phaseDisplayLabelLookup[label] ?? label ?? value;
      }
      return this.phaseDisplayLabelLookup[value] ?? value;
    },
    resetZoom() {
      this.$refs.scatterChart?.chart?.resetZoom?.();
    },
  },
};
</script>

<style scoped>
.mapping-card {
  margin-bottom: 16px;
}

.mapping-textarea {
  max-height: 180px;
  overflow-y: auto;
}

.alignment-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alignment-label {
  font-weight: 500;
}

.plot-mode-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.phase-select {
  min-width: 200px;
  max-width: 260px;
}
</style>
