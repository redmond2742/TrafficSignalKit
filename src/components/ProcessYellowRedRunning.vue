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
      <h2 class="section-title">Phase Summary Table</h2>
      <table class="rlr-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('phase')"
              >
                Phase
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "phase")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('yellowCount')"
              >
                Yellow Count
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "yellowCount")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('yellowAvg')"
              >
                Yellow Avg
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "yellowAvg")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('redCount')"
              >
                Red Count
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "redCount")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('redAvg')"
              >
                Red Avg
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "redAvg")
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedSummaryRows" :key="row.phase">
            <td>{{ row.phase }}</td>
            <td>{{ row.yellowCount }}</td>
            <td>{{ formatSecondsOrDash(row.yellowAvg) }}</td>
            <td>{{ row.redCount }}</td>
            <td>{{ formatSecondsOrDash(row.redAvg) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tableRows.length" class="rlr-table-wrapper">
      <h2 class="section-title">All Yellow and Red Running Events Table</h2>
      <table class="rlr-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('timestamp')"
              >
                Timestamp
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "timestamp")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('detector')"
              >
                Detector
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "detector")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('phase')"
              >
                Phase
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "phase")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('state')"
              >
                Signal State
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "state")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('elapsedSeconds')"
              >
                Seconds Into State
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "elapsedSeconds")
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedTableRows" :key="row.key">
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
      mappedPhases: [],
      detailSort: {
        key: "timestamp",
        direction: "asc",
      },
      summarySort: {
        key: "phase",
        direction: "asc",
      },
    };
  },
  computed: {
    sortedTableRows() {
      return this.sortRows(
        this.tableRows,
        this.detailSort.key,
        this.detailSort.direction
      );
    },
    summaryRows() {
      const summary = this.mappedPhases.map((phase) => {
        const phaseRows = this.tableRows.filter((row) => row.phase === phase);
        const yellowRows = phaseRows.filter((row) => row.state === "Yellow");
        const redRows = phaseRows.filter((row) => row.state === "Red");
        const yellowStats = this.computeStats(yellowRows);
        const redStats = this.computeStats(redRows);

        return {
          phase,
          yellowCount: yellowStats.count,
          yellowAvg: yellowStats.avg,
          redCount: redStats.count,
          redAvg: redStats.avg,
        };
      });

      return summary.filter(
        (row) => row.yellowCount > 0 || row.redCount > 0
      );
    },
    sortedSummaryRows() {
      return this.sortRows(
        this.summaryRows,
        this.summarySort.key,
        this.summarySort.direction
      );
    },
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
        this.mappedPhases = phaseColumns;
        return;
      }
      this.mappedPhases = phaseColumns;

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
    computeStats(rows) {
      if (!rows.length) {
        return {
          count: 0,
          min: null,
          max: null,
          avg: null,
        };
      }
      const values = rows.map((row) => row.elapsedSeconds);
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: total / values.length,
      };
    },
    setDetailSort(key) {
      this.detailSort = this.toggleSort(this.detailSort, key);
    },
    setSummarySort(key) {
      this.summarySort = this.toggleSort(this.summarySort, key);
    },
    toggleSort(sortState, key) {
      if (sortState.key === key) {
        return {
          key,
          direction: sortState.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: "asc",
      };
    },
    sortRows(rows, key, direction) {
      if (!key) {
        return [...rows];
      }
      const sorted = [...rows].sort((a, b) => {
        const valueA = a[key];
        const valueB = b[key];
        if (valueA === valueB) {
          return 0;
        }
        if (valueA === null || valueA === undefined) {
          return 1;
        }
        if (valueB === null || valueB === undefined) {
          return -1;
        }
        if (typeof valueA === "number" && typeof valueB === "number") {
          return valueA - valueB;
        }
        return String(valueA).localeCompare(String(valueB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      return direction === "asc" ? sorted : sorted.reverse();
    },
    sortIndicator(sortState, key) {
      if (sortState.key !== key) {
        return "";
      }
      return sortState.direction === "asc" ? "▲" : "▼";
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
              end: event.millis + 6000,
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
    formatSecondsOrDash(seconds) {
      if (seconds === null || seconds === undefined) {
        return "—";
      }
      return this.formatSeconds(seconds);
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

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
}

.sort-button:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}

.sort-indicator {
  font-size: 0.75em;
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
