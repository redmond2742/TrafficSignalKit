<template>
  <div class="time-to-reduce-tool">
    &nbsp;
    <h1 class="h1-center-text">Time to Reduce</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Time to Reduce" value="about">
          <v-expansion-panel-text>
            This tool combines high-resolution controller events with detector
            assignments to visualize how long phases sit in minimum green,
            extension, and gap-out time. Use it to evaluate gap settings and
            fine-tune detector assignments for more accurate timing updates.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Inputs Needed" value="inputs">
          <v-expansion-panel-text>
            Provide two CSV inputs:
            <ul>
              <li>
                High-resolution events as <b>timestamp, event code, parameter</b>.
                Example: <code>16764339605, 1, 6</code>.
              </li>
              <li>
                Detector assignments as <b>phase, detector channel</b>.
                Example: <code>6, 12</code>.
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Adjustments" value="adjustments">
          <v-expansion-panel-text>
            Apply offsets to the calculated durations to reflect local
            observations (for example, if a controller logs min complete later
            than expected). Adjustments add or subtract seconds from the plotted
            values without changing the raw high-resolution data.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="mt-6" variant="outlined">
      <v-card-text>
        <div class="settings-grid">
          <v-select
            v-model.number="detectorEventCode"
            :items="detectorEventOptions"
            label="Detector event code"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model.number="minGreenFallback"
            label="Fallback min green (sec)"
            type="number"
            min="0"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model.number="minGreenAdjustment"
            label="Min green adjustment (sec)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model.number="extensionAdjustment"
            label="Extension adjustment (sec)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model.number="gapOutAdjustment"
            label="Gap-out adjustment (sec)"
            type="number"
            variant="outlined"
            density="comfortable"
          />
        </div>

        <div class="input-section">
          <div>
            <h3>High-Resolution Event Data</h3>
            <InputBox
              v-model="inputData"
              :default-text="defaultText"
            />
          </div>
          <div>
            <h3>Detector Assignments</h3>
            <InputBox
              v-model="assignmentData"
              :default-text="assignmentPlaceholder"
            />
          </div>
        </div>

        <div class="action-row">
          <v-btn color="primary" :disabled="!canProcess" @click="processData">
            Process Time to Reduce
          </v-btn>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="intervalRows.length" class="mt-6" variant="outlined">
      <v-card-text>
        <div class="chart-header">
          <div>
            <h2>Time to Reduce Plot</h2>
            <p class="muted">
              Select a phase to plot min green, extension, and gap-out durations
              per green interval.
            </p>
          </div>
          <v-select
            v-model="selectedPhase"
            :items="availablePhases"
            label="Phase"
            variant="outlined"
            density="comfortable"
            class="phase-select"
          />
        </div>

        <div v-if="chartReady" class="chart-wrapper">
          <Scatter :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="empty-state">
          Select a phase to view the time-to-reduce plot.
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="summaryRows.length" class="mt-6" variant="outlined">
      <v-card-text>
        <h2>Average Durations by Phase</h2>
        <v-table density="compact" class="mt-4">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Avg Min Green (sec)</th>
              <th>Avg Extension (sec)</th>
              <th>Avg Gap-Out (sec)</th>
              <th>Intervals</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summaryRows" :key="row.phase">
              <td>{{ row.phase }}</td>
              <td>{{ row.minGreen }}</td>
              <td>{{ row.extension }}</td>
              <td>{{ row.gapOut }}</td>
              <td>{{ row.count }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-card v-if="intervalRows.length" class="mt-6" variant="outlined">
      <v-card-text>
        <h2>Interval Details</h2>
        <v-table density="compact" class="mt-4">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Green Start</th>
              <th>Min Green (sec)</th>
              <th>Extension (sec)</th>
              <th>Gap-Out (sec)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in intervalRows" :key="row.id">
              <td>{{ row.phase }}</td>
              <td>{{ row.greenStart }}</td>
              <td>{{ row.minGreen }}</td>
              <td>{{ row.extension }}</td>
              <td>{{ row.gapOut ?? "—" }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { Scatter } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  LinearScale,
} from "chart.js";
import InputBox from "../components/foundational/InputBox.vue";

ChartJS.register(Title, Tooltip, Legend, PointElement, LineElement, LinearScale);

const EVENT_CODES = {
  BEGIN_GREEN: 1,
  MIN_COMPLETE: 3,
  BEGIN_YELLOW: 8,
  DETECTOR_OFF: 81,
  DETECTOR_ON: 82,
};

export default {
  name: "TimeToReduce",
  components: {
    InputBox,
    Scatter,
  },
  data() {
    return {
      panel: [],
      inputData: "",
      assignmentData: "",
      defaultText: "Paste high-resolution data here (timestamp, event, parameter).",
      assignmentPlaceholder: "Paste detector assignments: phase, detector.",
      detectorEventCode: EVENT_CODES.DETECTOR_ON,
      minGreenFallback: 0,
      minGreenAdjustment: 0,
      extensionAdjustment: 0,
      gapOutAdjustment: 0,
      intervalRows: [],
      summaryRows: [],
      selectedPhase: null,
      errorMessage: "",
    };
  },
  computed: {
    canProcess() {
      return this.inputData.trim().length > 0;
    },
    detectorEventOptions() {
      return [
        { title: "Detector On (82)", value: EVENT_CODES.DETECTOR_ON },
        { title: "Detector Off (81)", value: EVENT_CODES.DETECTOR_OFF },
      ];
    },
    availablePhases() {
      const phases = Array.from(
        new Set(this.intervalRows.map((row) => row.phase)),
      ).sort((a, b) => a - b);
      return phases;
    },
    chartReady() {
      return this.selectedPhase !== null && this.filteredIntervals.length > 0;
    },
    filteredIntervals() {
      if (this.selectedPhase === null) {
        return [];
      }
      return this.intervalRows.filter((row) => row.phase === this.selectedPhase);
    },
    chartData() {
      const rows = this.filteredIntervals;
      const buildSeries = (key) =>
        rows
          .map((row, index) => ({ x: index + 1, y: row[key] }))
          .filter((point) => point.y !== null && point.y !== undefined);

      return {
        datasets: [
          {
            label: "Min Green",
            data: buildSeries("minGreen"),
            borderColor: "#1565c0",
            backgroundColor: "#1565c0",
            showLine: true,
          },
          {
            label: "Extension",
            data: buildSeries("extension"),
            borderColor: "#2e7d32",
            backgroundColor: "#2e7d32",
            showLine: true,
          },
          {
            label: "Gap-Out",
            data: buildSeries("gapOut"),
            borderColor: "#ef6c00",
            backgroundColor: "#ef6c00",
            showLine: true,
          },
        ],
      };
    },
    chartOptions() {
      return {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Green Interval Index",
            },
            ticks: {
              stepSize: 1,
            },
          },
          y: {
            title: {
              display: true,
              text: "Seconds",
            },
            beginAtZero: true,
          },
        },
      };
    },
  },
  methods: {
    processData() {
      const events = this.parseEvents();
      if (!events.length) {
        this.errorMessage = "No valid events found. Check your input format.";
        this.intervalRows = [];
        this.summaryRows = [];
        this.selectedPhase = null;
        return;
      }

      const assignments = this.parseAssignments();
      if (!assignments.size) {
        this.errorMessage =
          "No detector assignments were found. Gap-out calculations will be blank.";
      } else {
        this.errorMessage = "";
      }

      const detectionEvents = events.filter(
        (event) => event.eventCode === this.detectorEventCode,
      );

      const phaseEventsByPhase = new Map();
      events.forEach((event) => {
        if (
          ![
            EVENT_CODES.BEGIN_GREEN,
            EVENT_CODES.MIN_COMPLETE,
            EVENT_CODES.BEGIN_YELLOW,
          ].includes(event.eventCode)
        ) {
          return;
        }
        if (!phaseEventsByPhase.has(event.parameter)) {
          phaseEventsByPhase.set(event.parameter, []);
        }
        phaseEventsByPhase.get(event.parameter).push(event);
      });

      const intervalRows = [];
      phaseEventsByPhase.forEach((phaseEvents, phase) => {
        phaseEvents.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < phaseEvents.length; i += 1) {
          const event = phaseEvents[i];
          if (event.eventCode !== EVENT_CODES.BEGIN_GREEN) {
            continue;
          }
          const beginYellow = phaseEvents
            .slice(i + 1)
            .find((nextEvent) => nextEvent.eventCode === EVENT_CODES.BEGIN_YELLOW);
          if (!beginYellow) {
            continue;
          }
          const minComplete = phaseEvents
            .slice(i + 1)
            .find(
              (nextEvent) =>
                nextEvent.eventCode === EVENT_CODES.MIN_COMPLETE &&
                nextEvent.timestamp < beginYellow.timestamp,
            );
          const totalGreen = (beginYellow.timestamp - event.timestamp) / 10;
          const minGreenRaw = minComplete
            ? (minComplete.timestamp - event.timestamp) / 10
            : this.minGreenFallback || totalGreen;
          const extensionRaw = Math.max(0, totalGreen - minGreenRaw);

          const assignedDetectors = assignments.get(phase) || [];
          const lastDetection = this.findLastDetection(
            detectionEvents,
            assignedDetectors,
            event.timestamp,
            beginYellow.timestamp,
          );
          const gapOutRaw = lastDetection
            ? (beginYellow.timestamp - lastDetection) / 10
            : null;

          intervalRows.push({
            id: `${phase}-${event.timestamp}`,
            phase,
            greenStart: event.timestamp,
            minGreen: this.applyAdjustment(minGreenRaw, this.minGreenAdjustment),
            extension: this.applyAdjustment(
              extensionRaw,
              this.extensionAdjustment,
            ),
            gapOut:
              gapOutRaw === null
                ? null
                : this.applyAdjustment(gapOutRaw, this.gapOutAdjustment),
          });
        }
      });

      intervalRows.sort((a, b) => a.greenStart - b.greenStart);
      this.intervalRows = intervalRows;
      this.summaryRows = this.buildSummary(intervalRows);
      this.selectedPhase =
        this.selectedPhase && this.availablePhases.includes(this.selectedPhase)
          ? this.selectedPhase
          : this.availablePhases[0] ?? null;
    },
    parseEvents() {
      if (!this.inputData) {
        return [];
      }
      return this.inputData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(",").map((value) => value.trim()))
        .map((parts) => {
          if (parts.length < 3) {
            return null;
          }
          const timestamp = Number(parts[0]);
          const eventCode = Number(parts[1]);
          const parameter = Number(parts[2]);
          if (
            Number.isNaN(timestamp) ||
            Number.isNaN(eventCode) ||
            Number.isNaN(parameter)
          ) {
            return null;
          }
          return { timestamp, eventCode, parameter };
        })
        .filter(Boolean);
    },
    parseAssignments() {
      if (!this.assignmentData) {
        return new Map();
      }
      const assignments = new Map();
      this.assignmentData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const parts = line.split(",").map((value) => value.trim());
          if (parts.length < 2) {
            return;
          }
          const phase = Number(parts[0]);
          const detector = Number(parts[1]);
          if (Number.isNaN(phase) || Number.isNaN(detector)) {
            return;
          }
          if (!assignments.has(phase)) {
            assignments.set(phase, []);
          }
          assignments.get(phase).push(detector);
        });
      return assignments;
    },
    findLastDetection(events, detectors, start, end) {
      if (!detectors.length) {
        return null;
      }
      const detectorSet = new Set(detectors);
      const matches = events.filter(
        (event) =>
          detectorSet.has(event.parameter) &&
          event.timestamp >= start &&
          event.timestamp <= end,
      );
      if (!matches.length) {
        return null;
      }
      return matches.reduce(
        (latest, event) => Math.max(latest, event.timestamp),
        matches[0].timestamp,
      );
    },
    applyAdjustment(value, adjustment) {
      const adjusted = Number(value) + Number(adjustment || 0);
      return Number(adjusted.toFixed(2));
    },
    buildSummary(rows) {
      const phaseMap = new Map();
      rows.forEach((row) => {
        if (!phaseMap.has(row.phase)) {
          phaseMap.set(row.phase, []);
        }
        phaseMap.get(row.phase).push(row);
      });
      return Array.from(phaseMap.entries())
        .map(([phase, phaseRows]) => ({
          phase,
          minGreen: this.average(phaseRows.map((row) => row.minGreen)),
          extension: this.average(phaseRows.map((row) => row.extension)),
          gapOut: this.average(
            phaseRows.map((row) => row.gapOut).filter((value) => value !== null),
          ),
          count: phaseRows.length,
        }))
        .sort((a, b) => a.phase - b.phase);
    },
    average(values) {
      if (!values.length) {
        return "—";
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      return Number((total / values.length).toFixed(2));
    },
  },
};
</script>

<style scoped>
.time-to-reduce-tool {
  text-align: left;
}
.left-justify-text {
  margin: 0;
  padding: 0;
  text-align: left;
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.input-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
}
.chart-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
}
.phase-select {
  min-width: 220px;
}
.chart-wrapper {
  min-height: 320px;
}
.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}
.error-message {
  color: #c62828;
  margin: 0;
}
.empty-state {
  margin-top: 16px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
