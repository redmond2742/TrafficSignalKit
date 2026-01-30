<template>
  <div class="skipped-phase-tool">
    &nbsp;
    <h1 class="h1-center-text">Skipped Phase Finder</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Skipped Phase Finder" value="about">
          <v-expansion-panel-text>
            This tool scans high-resolution controller data for detector on
            events and checks whether the assigned phase is served within
            two minutes. It is useful for spotting missed calls or phases that
            are starving despite demand.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Inputs Needed" value="inputs">
          <v-expansion-panel-text>
            Provide two CSV inputs:
            <ul>
              <li>
                High-resolution events as
                <b>timestamp, event code, parameter</b> (phase or detector
                channel depending on the event). Example:
                <code>1/6/2024 15:00:03.3, 82, 12</code>
              </li>
              <li>
                Detector assignments as <b>phase, detector channel</b>.
                Labels like <code>Det 1</code> are accepted.
                Example: <code>6, 12</code>
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
            Find Skipped Phases
          </v-btn>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="results.length" class="mt-6" variant="outlined">
      <v-card-text>
        <h2>Skipped Phase Events</h2>
        <p class="muted">
          Detector on events where the assigned phase was not served within
          120 seconds.
        </p>
        <v-table density="compact" class="mt-4">
          <thead>
            <tr>
              <th>Detector On Time</th>
              <th>Phase</th>
              <th>Detector</th>
              <th>Next Green</th>
              <th>Wait (sec)</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in results" :key="row.id">
              <td>{{ row.detectorOn }}</td>
              <td>{{ row.phase }}</td>
              <td>{{ row.detector }}</td>
              <td>{{ row.nextGreen }}</td>
              <td>{{ row.waitSeconds ?? "—" }}</td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-card v-else-if="processed" class="mt-6" variant="outlined">
      <v-card-text>
        <p class="empty-state">
          No skipped phase events were found in the current inputs.
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

const EVENT_CODES = {
  BEGIN_GREEN: 1,
  DETECTOR_ON: 82,
};

export default {
  name: "SkippedPhaseFinder",
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
      defaultText:
        "Paste high-resolution data: timestamp, event code, parameter",
      assignmentPlaceholder:
        "Paste detector assignments: phase, detector channel. Labels like 'Det 1' are supported.",
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

      const greenEventsByPhase = this.collectGreenEvents(events);
      const detectorEvents = events.filter(
        (event) => event.eventCode === EVENT_CODES.DETECTOR_ON,
      );

      const results = [];
      detectorEvents.forEach((event) => {
        const phases = assignments.get(event.parameter) || [];
        if (!phases.length) {
          return;
        }
        phases.forEach((phase) => {
          const nextGreen = this.findNextGreen(
            greenEventsByPhase.get(phase),
            event.millis,
          );
          const waitSeconds = nextGreen
            ? (nextGreen.millis - event.millis) / 1000
            : null;
          if (waitSeconds === null || waitSeconds > 120) {
            results.push({
              id: `${event.millis}-${phase}-${event.parameter}`,
              detectorOn: event.displayTime,
              detectorOnMillis: event.millis,
              phase,
              detector: event.parameter,
              nextGreen: nextGreen ? nextGreen.displayTime : "—",
              waitSeconds:
                waitSeconds === null ? null : Number(waitSeconds.toFixed(1)),
              description: this.buildDescription({
                phase,
                detector: event.parameter,
                detectorOn: event.displayTime,
                nextGreen: nextGreen ? nextGreen.displayTime : null,
                waitSeconds,
              }),
            });
          }
        });
      });

      this.results = results.sort(
        (a, b) => a.detectorOnMillis - b.detectorOnMillis,
      );
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
          const phase = this.parseNumberFromText(parts[0]);
          const detector = this.parseNumberFromText(parts[1]);
          if (Number.isNaN(phase) || Number.isNaN(detector)) {
            return;
          }
          if (!assignments.has(detector)) {
            assignments.set(detector, new Set());
          }
          assignments.get(detector).add(phase);
        });
      const normalized = new Map();
      assignments.forEach((phases, detector) => {
        normalized.set(detector, Array.from(phases).sort((a, b) => a - b));
      });
      return normalized;
    },
    collectGreenEvents(events) {
      const phaseMap = new Map();
      events
        .filter((event) => event.eventCode === EVENT_CODES.BEGIN_GREEN)
        .forEach((event) => {
          if (!phaseMap.has(event.parameter)) {
            phaseMap.set(event.parameter, []);
          }
          phaseMap.get(event.parameter).push(event);
        });
      phaseMap.forEach((phaseEvents) => {
        phaseEvents.sort((a, b) => a.millis - b.millis);
      });
      return phaseMap;
    },
    findNextGreen(events, startMillis) {
      if (!events || !events.length) {
        return null;
      }
      return events.find((event) => event.millis > startMillis) || null;
    },
    buildDescription({ phase, detector, detectorOn, nextGreen, waitSeconds }) {
      if (waitSeconds === null) {
        return `Detector ${detector} called Phase ${phase} at ${detectorOn}, but no green event was found after the call.`;
      }
      return `Detector ${detector} called Phase ${phase} at ${detectorOn}. Next green was ${nextGreen} (${waitSeconds.toFixed(
        1,
      )} sec later).`;
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
.skipped-phase-tool {
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
