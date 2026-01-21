<template>
  <div>
    <div class="rlr-inputs">
      <div class="grow-wrap">
        <InputBox v-model="inputData" :defaultText="dataDefaultText" />
      </div>
      <div class="grow-wrap">
        <InputBox
          v-model="detectorMapInput"
          :defaultText="detectorDefaultText"
        />
      </div>
    </div>
    <div class="actions">
      <v-btn color="primary" @click="processDetectorEvents">Process</v-btn>
    </div>

    <div v-if="tableRows.length" class="rlr-table-wrapper">
      <table class="rlr-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Detector</th>
            <th>Phase</th>
            <th>Signal State</th>
            <th>Seconds Into State</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.key">
            <td>{{ row.timestamp }}</td>
            <td>{{ row.detector }}</td>
            <td>{{ row.phase }}</td>
            <td>{{ row.state }}</td>
            <td>{{ formatSeconds(row.elapsedSeconds) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="hasProcessed" class="no-results">
      No yellow/red detector-off events were found for the mapped phases.
    </div>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import convertTime from "../mixins/convertTime";
import InputBox from "./foundational/InputBox.vue";

const DISPLAY_FORMAT = "ccc, MMM d yyyy h:mm:ss.S a";

export default {
  mixins: [convertTime],
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
      detectorMapInput: "",
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
      detectorDefaultText: "Det 1\t6\nDet 2\t2\nDet 3\t0\nDet 4\t0\nDet 5\t0",
      tableRows: [],
      hasProcessed: false,
    };
  },
  methods: {
    processDetectorEvents() {
      const { detectorToPhase, phaseColumns } = this.parseDetectorMapping(
        this.detectorMapInput
      );
      const events = this.parseHighResData(this.inputData);
      if (!events.length || !phaseColumns.length) {
        this.tableRows = [];
        this.hasProcessed = true;
        return;
      }

      const phaseIntervals = this.buildSignalIntervals(events, phaseColumns);
      const rows = events
        .filter(
          (event) =>
            event.eventCode === 81 && detectorToPhase[event.parameterCode]
        )
        .map((event) => {
          const phase = detectorToPhase[event.parameterCode];
          const interval = this.findInterval(
            phaseIntervals[phase] || [],
            event.millis
          );
          if (!interval) {
            return null;
          }
          return {
            key: `${event.millis}-${event.parameterCode}`,
            timestamp: this.formatMillis(event.millis),
            detector: event.parameterCode,
            phase,
            state: interval.state,
            elapsedSeconds: (event.millis - interval.start) / 1000,
          };
        })
        .filter((row) => row !== null);

      this.tableRows = rows;
      this.hasProcessed = true;
    },
    parseDetectorMapping(text) {
      const detectorToPhase = {};
      const phases = new Set();

      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .forEach((line) => {
          const matches = line.match(/\d+/g);
          if (!matches || matches.length < 2) {
            return;
          }
          const detector = Number(matches[0]);
          const phase = Number(matches[1]);
          if (!Number.isNaN(detector) && phase > 0) {
            detectorToPhase[detector] = phase;
            phases.add(phase);
          }
        });

      return {
        detectorToPhase,
        phaseColumns: Array.from(phases).sort((a, b) => a - b),
      };
    },
    parseHighResData(text) {
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const [timestamp, eventCode, parameter] = line.split(",");
          const converted = this.convertTimestamp(timestamp?.trim() || "");
          if (!converted?.MillisecFromEpoch) {
            return null;
          }
          return {
            millis: converted.MillisecFromEpoch,
            eventCode: Number(eventCode),
            parameterCode: Number(parameter),
          };
        })
        .filter((event) => event && !Number.isNaN(event.eventCode))
        .sort((a, b) => a.millis - b.millis);
    },
    buildSignalIntervals(events, phaseColumns) {
      const phaseState = {};
      const intervalsByPhase = {};

      phaseColumns.forEach((phase) => {
        phaseState[phase] = {
          yellowStart: null,
          redStart: null,
          redCandidate: null,
        };
        intervalsByPhase[phase] = [];
      });

      events.forEach((event) => {
        const phase = event.parameterCode;
        if (!phaseColumns.includes(phase)) {
          return;
        }
        const state = phaseState[phase];

        if (event.eventCode === 8) {
          state.yellowStart = event.millis;
        }

        if (event.eventCode === 9) {
          if (state.yellowStart !== null) {
            intervalsByPhase[phase].push({
              state: "Yellow",
              start: state.yellowStart,
              end: event.millis,
            });
            state.yellowStart = null;
          }
          if (state.redStart === null) {
            state.redCandidate = event.millis;
          }
        }

        if (event.eventCode === 10) {
          state.redStart = event.millis;
          state.redCandidate = null;
        }

        if ([11, 12, 0, 1].includes(event.eventCode)) {
          const redStart =
            state.redStart !== null ? state.redStart : state.redCandidate;
          if (redStart !== null) {
            intervalsByPhase[phase].push({
              state: "Red",
              start: redStart,
              end: event.millis,
            });
            state.redStart = null;
            state.redCandidate = null;
          }
        }
      });

      return intervalsByPhase;
    },
    findInterval(intervals, millis) {
      return intervals.find(
        (interval) => millis >= interval.start && millis <= interval.end
      );
    },
    formatMillis(millis) {
      return DateTime.fromMillis(millis).toFormat(DISPLAY_FORMAT);
    },
    formatSeconds(seconds) {
      const rounded = Math.round(seconds * 10) / 10;
      return `${rounded.toFixed(1)} sec`;
    },
  },
};
</script>

<style scoped>
.rlr-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0;
}

.rlr-table-wrapper {
  overflow-x: auto;
}

.rlr-table {
  width: 100%;
  border-collapse: collapse;
}

.rlr-table th,
.rlr-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.no-results {
  margin-top: 12px;
  font-style: italic;
}

.grow-wrap {
  display: grid;
}

.grow-wrap::after {
  content: attr(data-replicated-value) " ";
  white-space: pre-wrap;
  visibility: hidden;
}

.grow-wrap > textarea {
  resize: none;
  overflow: hidden;
  overflow-y: scroll;
}

.grow-wrap > textarea,
.grow-wrap::after {
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;
  grid-area: 1 / 1 / 2 / 2;
}
</style>
