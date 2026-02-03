<template>
  <div class="split-failure-tool">
    &nbsp;
    <h1 class="h1-center-text">Split Failure Checker</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Split Failure Checker" value="about">
          <v-expansion-panel-text>
            This tool processes high-resolution controller events alongside
            phase-to-detector assignments to flag split failures. A split failure
            occurs when a green phase terminates while the stop bar detector is
            still on, indicating demand remained but was not served.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Inputs Needed" value="inputs">
          <v-expansion-panel-text>
            Provide two CSV inputs:
            <ul>
              <li>
                High-resolution events as
                <b>timestamp, event code, parameter</b>. Example:
                <code>1/6/2024 15:00:03.3, 7, 4</code>
              </li>
              <li>
                Stop bar detector assignments as <b>phase, detector channel</b> or
                <b>detector, phase</b>. Labels like <code>Det 1</code> are
                accepted. Example: <code>4, 12</code> or <code>Det 12, 4</code>
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="mt-6" variant="outlined">
      <v-card-text>
        <div class="input-section">
          <div>
            <h3>High-Resolution Event Data</h3>
            <InputBox v-model="inputData" :default-text="defaultText" />
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
            Check for Split Failures
          </v-btn>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="results.length" class="mt-6" variant="outlined">
      <v-card-text>
        <h2>Split Failure Events</h2>
        <p class="muted">
          Green terminations where assigned stop bar detectors remained on.
        </p>
        <v-table density="compact" class="mt-4">
          <thead>
            <tr>
              <th>Green Termination</th>
              <th>Phase</th>
              <th>Detector</th>
              <th>Detector On</th>
              <th>Seconds On</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in results" :key="row.id">
              <td>{{ row.terminationTime }}</td>
              <td>{{ row.phase }}</td>
              <td>{{ row.detector }}</td>
              <td>{{ row.detectorOn }}</td>
              <td>{{ row.secondsOn ?? "—" }}</td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-card v-else-if="processed" class="mt-6" variant="outlined">
      <v-card-text>
        <p class="empty-state">
          No split failures were found in the current inputs.
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

const EVENT_CODES = {
  GREEN_TERMINATION: 7,
  DETECTOR_OFF: 81,
  DETECTOR_ON: 82,
};

export default {
  name: "SplitFailureChecker",
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      panel: [],
      inputData: "",
      assignmentData: "",
      results: [],
      errorMessage: "",
      processed: false,
      defaultText: "Paste high-resolution data: timestamp, event code, parameter",
      assignmentPlaceholder:
        "Paste stop bar detector assignments: phase, detector channel (or detector, phase). Labels like 'Det 1' are supported.",
    };
  },
  computed: {
    canProcess() {
      return this.inputData.trim().length > 0 && this.assignmentData.trim().length > 0;
    },
  },
  methods: {
    processData() {
      this.processed = true;
      this.errorMessage = "";
      this.results = [];

      const events = this.parseEvents();
      if (!events.length) {
        this.errorMessage = "No valid high-resolution events were found.";
        return;
      }

      const assignments = this.parseAssignments();
      if (!assignments.size) {
        this.errorMessage =
          "No detector assignments were found. Provide phase, detector pairs.";
        return;
      }

      this.results = this.findSplitFailures(events, assignments);
    },
    parseEvents() {
      if (!this.inputData) {
        return [];
      }
      return this.inputData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(",").map((value) => value.trim());
          if (parts.length < 3) {
            return null;
          }
          const [timestampRaw, eventCodeRaw, parameterRaw] = parts;
          const eventCode = Number(eventCodeRaw);
          const parameter = this.parseNumberFromText(parameterRaw);
          if (Number.isNaN(eventCode) || Number.isNaN(parameter)) {
            return null;
          }
          const converted = this.convertTimestamp(timestampRaw || "");
          if (!converted?.MillisecFromEpoch) {
            return null;
          }
          return {
            millis: converted.MillisecFromEpoch,
            displayTime: converted.humanReadable || timestampRaw,
            eventCode,
            parameter,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.millis - b.millis);
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
          const parts = line.split(/[\t,]/).map((value) => value.trim());
          if (parts.length < 2) {
            return;
          }
          const detectorFirst = /det/i.test(parts[0]);
          const phase = this.parseNumberFromText(detectorFirst ? parts[1] : parts[0]);
          const detector = this.parseNumberFromText(
            detectorFirst ? parts[0] : parts[1]
          );
          if (Number.isNaN(phase) || Number.isNaN(detector)) {
            return;
          }
          if (!assignments.has(phase)) {
            assignments.set(phase, new Set());
          }
          assignments.get(phase).add(detector);
        });
      const normalized = new Map();
      assignments.forEach((detectors, phase) => {
        normalized.set(phase, Array.from(detectors).sort((a, b) => a - b));
      });
      return normalized;
    },
    findSplitFailures(events, assignments) {
      const detectorState = new Map();
      const results = [];

      events.forEach((event) => {
        if (event.eventCode === EVENT_CODES.DETECTOR_ON) {
          detectorState.set(event.parameter, {
            isOn: true,
            lastOnMillis: event.millis,
            lastOnDisplay: event.displayTime,
          });
          return;
        }
        if (event.eventCode === EVENT_CODES.DETECTOR_OFF) {
          detectorState.set(event.parameter, {
            isOn: false,
            lastOffMillis: event.millis,
            lastOffDisplay: event.displayTime,
          });
          return;
        }
        if (event.eventCode === EVENT_CODES.GREEN_TERMINATION) {
          const detectors = assignments.get(event.parameter) || [];
          detectors.forEach((detector) => {
            const state = detectorState.get(detector);
            if (!state?.isOn) {
              return;
            }
            const secondsOn = state.lastOnMillis
              ? (event.millis - state.lastOnMillis) / 1000
              : null;
            results.push({
              id: `${event.millis}-${event.parameter}-${detector}`,
              terminationTime: event.displayTime,
              terminationMillis: event.millis,
              phase: event.parameter,
              detector,
              detectorOn: state.lastOnDisplay || "—",
              secondsOn: secondsOn === null ? null : Number(secondsOn.toFixed(1)),
              description: this.buildDescription({
                phase: event.parameter,
                detector,
                termination: event.displayTime,
                detectorOn: state.lastOnDisplay,
                secondsOn,
              }),
            });
          });
        }
      });

      return results.sort((a, b) => a.terminationMillis - b.terminationMillis);
    },
    buildDescription({ phase, detector, termination, detectorOn, secondsOn }) {
      const durationText =
        secondsOn === null
          ? ""
          : ` for ${secondsOn.toFixed(1)} sec`;
      return `Phase ${phase} terminated at ${termination} while Detector ${detector} was still on${durationText}. Call began at ${
        detectorOn || "an unknown time"
      }.`;
    },
    parseNumberFromText(value) {
      if (value === null || value === undefined) {
        return Number.NaN;
      }
      const trimmed = String(value).trim();
      if (!trimmed) {
        return Number.NaN;
      }
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
      const match = trimmed.match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : Number.NaN;
    },
  },
};
</script>

<style scoped>
.split-failure-tool {
  text-align: left;
}

.left-justify-text {
  margin: 0;
  padding: 0;
  text-align: left;
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

.error-message {
  color: #c62828;
  margin: 0;
}

.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}

.empty-state {
  margin: 0;
  color: rgba(0, 0, 0, 0.6);
}
</style>
