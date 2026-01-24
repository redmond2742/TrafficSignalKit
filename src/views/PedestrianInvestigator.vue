<template>
  <div>
    <div v-if="!embedded">
      &nbsp;
      <h1 class="h1-center-text">Pedestrian Investigator</h1>
      <p class="intro-text">
        Analyze pedestrian walk intervals from high-resolution controller logs.
        This tool looks for walk events (enumeration 21), walk change interval
        start (enumeration 22), and solid don’t walk start (enumeration 23) to
        estimate pedestrian walk times, clearance intervals, and crossing
        distances.
      </p>

      <div class="signal-inputs">
        <div
          v-for="(signal, index) in signals"
          :key="`signal-${index}`"
          class="signal-card"
        >
          <div class="signal-card-header">
            <h2 class="signal-title">Signal {{ index + 1 }}</h2>
            <v-btn
              v-if="signals.length > 1"
              color="error"
              variant="text"
              @click="removeSignal(index)"
            >
              Remove
            </v-btn>
          </div>
          <v-text-field
            v-model="signal.signalId"
            label="Signal ID"
            density="compact"
            hide-details
            class="signal-id-input"
          ></v-text-field>
          <div class="grow-wrap">
            <InputBox v-model="signal.data" :defaultText="dataDefaultText" />
          </div>
        </div>
      </div>

      <div class="actions">
        <v-btn color="secondary" variant="outlined" @click="addSignal">
          Add Another Signal
        </v-btn>
        <v-btn color="primary" :disabled="!hasInputData" @click="processData">
          Process Pedestrian Data
        </v-btn>
        <span v-if="invalidRows" class="warning-text">
          Skipped {{ invalidRows }} rows that did not match the expected CSV
          format.
        </span>
      </div>
    </div>

    <v-card
      v-if="!embedded && metadataRows.length"
      class="metadata-card"
      variant="outlined"
    >
      <v-card-title>Data Log Details</v-card-title>
      <v-card-text>
        <table class="metadata-table">
          <thead>
            <tr>
              <th>Signal ID</th>
              <th>Detail</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(detail, index) in metadataRows"
              :key="`meta-${index}`"
            >
              <td>{{ detail.signalId }}</td>
              <td>{{ detail.label }}</td>
              <td>{{ detail.value }}</td>
            </tr>
          </tbody>
        </table>
      </v-card-text>
    </v-card>

    <div
      v-if="summaryRows.length"
      class="summary-wrapper"
      :class="{ 'summary-embedded': embedded }"
    >
      <h2>Walk Phase Summary</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th
              v-for="column in summaryColumns"
              :key="`summary-header-${column.key}`"
              class="sortable-header"
              @click="sortBy(column.key)"
            >
              <span>{{ column.label }}</span>
              <span class="sort-indicator">{{ sortIndicator(column.key) }}</span>
            </th>
          </tr>
          <tr class="summary-filter-row">
            <th
              v-for="column in summaryColumns"
              :key="`summary-filter-${column.key}`"
            >
              <input
                v-model="filters[column.key]"
                type="text"
                class="summary-filter-input"
                :placeholder="`Filter ${column.label}`"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in filteredSummaryRows"
            :key="`summary-${row.signalId}-${row.phase}-${index}`"
          >
            <td
              v-for="column in summaryColumns"
              :key="`summary-${row.signalId}-${row.phase}-${column.key}`"
            >
              {{ formatSummaryValue(row, column.key) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!embedded" class="note-text">
        Walk and change interval averages use the controller event timestamps
        (0.1-second resolution). Estimated distance uses 3.5 ft/sec multiplied
        by the average walk change interval. Estimated lanes use a 12-foot lane
        width. Risk score is calculated as (avg walk change interval + avg
        call-to-walk delay) × ped calls per hour. Full-service cycles count
        unique walk cycles in which every phase with a pedestrian call is served
        without repeats.
      </p>
    </div>
  </div>
</template>

<script>
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

const WALK_EVENT = 21;
const CHANGE_START_EVENT = 22;
const SOLID_DONT_WALK_EVENT = 23;
const PED_CALL_EVENT = 45;
const FEET_PER_SECOND = 3.5;
const LANE_WIDTH_FEET = 12;
const HEADER_SCAN_LIMIT = 12;
const SUMMARY_COLUMNS = [
  { key: "signalId", label: "Signal ID" },
  { key: "phase", label: "Phase" },
  { key: "pedEventCount", label: "Ped Phase Uses" },
  { key: "pedCallsPerHour", label: "Ped Calls / Hr" },
  { key: "fullServiceCycleCount", label: "Full-Service Cycles" },
  { key: "fullServiceCallPercent", label: "Calls in Full-Service Cycles (%)" },
  { key: "averageWalkTime", label: "Avg Walk Time (s)" },
  { key: "averageChangeInterval", label: "Avg Walk Change Interval (s)" },
  { key: "averageCallToWalkDelay", label: "Avg Call-to-Walk Delay (s)" },
  { key: "riskScore", label: "Risk Score" },
  { key: "estimatedDistance", label: "Estimated Crossing Distance (ft)" },
  { key: "estimatedLanes", label: "Estimated Lanes" },
];

export default {
  components: {
    InputBox,
  },
  mixins: [convertTime],
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
    inputData: {
      type: String,
      default: "",
    },
    signalId: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      signals: [{ signalId: "", data: "" }],
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, phase)",
      invalidRows: 0,
      metadataRows: [],
      summaryRows: [],
      filters: SUMMARY_COLUMNS.reduce((accumulator, column) => {
        accumulator[column.key] = "";
        return accumulator;
      }, {}),
      sortKey: "signalId",
      sortDirection: "asc",
    };
  },
  watch: {
    inputData: {
      immediate: true,
      handler(value) {
        if (!this.embedded) {
          return;
        }
        this.signals = [
          {
            signalId: this.signalId || "Signal 1",
            data: value || "",
          },
        ];
        if (value && value.trim()) {
          this.processData();
        } else {
          this.invalidRows = 0;
          this.metadataRows = [];
          this.summaryRows = [];
        }
      },
    },
    signalId(value) {
      if (!this.embedded || !this.signals.length) {
        return;
      }
      this.signals[0].signalId = value || "Signal 1";
    },
  },
  computed: {
    hasInputData() {
      return this.signals.some((signal) => signal.data.trim());
    },
    summaryColumns() {
      return SUMMARY_COLUMNS;
    },
    filteredSummaryRows() {
      const activeFilters = this.filters;
      const filterKeys = Object.keys(activeFilters);
      const filtered = this.summaryRows.filter((row) =>
        filterKeys.every((key) => {
          const filterValue = activeFilters[key];
          if (!filterValue) {
            return true;
          }
          const displayValue = this.formatSummaryValue(row, key);
          return displayValue
            .toString()
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        })
      );

      if (!this.sortKey) {
        return filtered;
      }
      const direction = this.sortDirection === "desc" ? -1 : 1;
      return [...filtered].sort((a, b) => {
        const valueA = this.summarySortValue(a, this.sortKey);
        const valueB = this.summarySortValue(b, this.sortKey);
        if (valueA === valueB) {
          return 0;
        }
        if (valueA === null || valueA === undefined || valueA === "") {
          return 1;
        }
        if (valueB === null || valueB === undefined || valueB === "") {
          return -1;
        }
        if (typeof valueA === "number" && typeof valueB === "number") {
          return (valueA - valueB) * direction;
        }
        return valueA.toString().localeCompare(valueB.toString()) * direction;
      });
    },
  },
  methods: {
    processData() {
      const invalidRows = [];
      const metadataRows = [];
      const summaryRows = [];

      this.signals.forEach((signal, index) => {
        if (!signal.data.trim()) {
          return;
        }
        const signalId = this.normalizeSignalId(signal.signalId, index);
        const result = this.processSignalData(signal.data, signalId);
        invalidRows.push(result.invalidRows);
        metadataRows.push(...result.metadataRows);
        summaryRows.push(...result.summaryRows);
      });

      summaryRows.sort((a, b) => {
        if (a.signalId < b.signalId) {
          return -1;
        }
        if (a.signalId > b.signalId) {
          return 1;
        }
        return a.phase - b.phase;
      });

      this.invalidRows = invalidRows.reduce((sum, value) => sum + value, 0);
      this.metadataRows = metadataRows;
      this.summaryRows = summaryRows;
    },
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        return;
      }
      this.sortKey = key;
      this.sortDirection = "asc";
    },
    sortIndicator(key) {
      if (this.sortKey !== key) {
        return "";
      }
      return this.sortDirection === "asc" ? "▲" : "▼";
    },
    formatSummaryValue(row, key) {
      switch (key) {
        case "signalId":
          return row.signalId;
        case "phase":
          return row.phase;
        case "pedEventCount":
          return row.pedEventCount;
        case "pedCallsPerHour":
          return this.formatRate(row.pedCallsPerHour);
        case "fullServiceCycleCount":
          return row.fullServiceCycleCount;
        case "fullServiceCallPercent":
          return this.formatPercent(row.fullServiceCallPercent);
        case "averageWalkTime":
          return this.formatSeconds(row.averageWalkTime);
        case "averageChangeInterval":
          return this.formatSeconds(row.averageChangeInterval);
        case "averageCallToWalkDelay":
          return this.formatSeconds(row.averageCallToWalkDelay);
        case "riskScore":
          return this.formatRisk(row.riskScore);
        case "estimatedDistance":
          return this.formatDistance(row.estimatedDistance);
        case "estimatedLanes":
          return this.formatLanes(row.estimatedLanes);
        default:
          return row[key] ?? "-";
      }
    },
    summarySortValue(row, key) {
      switch (key) {
        case "signalId":
          return row.signalId;
        case "phase":
          return row.phase;
        case "pedEventCount":
          return row.pedEventCount;
        case "pedCallsPerHour":
          return row.pedCallsPerHour;
        case "fullServiceCycleCount":
          return row.fullServiceCycleCount;
        case "fullServiceCallPercent":
          return row.fullServiceCallPercent;
        case "averageWalkTime":
          return row.averageWalkTime;
        case "averageChangeInterval":
          return row.averageChangeInterval;
        case "averageCallToWalkDelay":
          return row.averageCallToWalkDelay;
        case "riskScore":
          return row.riskScore;
        case "estimatedDistance":
          return row.estimatedDistance;
        case "estimatedLanes":
          return row.estimatedLanes;
        default:
          return row[key];
      }
    },
    processSignalData(signalData, signalId) {
      const lines = signalData.split(/\r?\n/).filter(Boolean);
      const metadataRows = this.extractMetadata(lines).map((detail) => ({
        ...detail,
        signalId,
      }));
      const events = [];
      let minTimestamp = null;
      let maxTimestamp = null;
      let invalidRows = 0;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }

        let parts = trimmed
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (parts.length < 3) {
          parts = trimmed.split(/\s+/).map((part) => part.trim());
        }
        if (parts.length < 3) {
          invalidRows += 1;
          return;
        }

        const [timestampRaw, enumerationRaw, phaseRaw] = parts;
        const enumeration = Number(enumerationRaw);
        const phase = Number(phaseRaw);
        const timestampInfo = this.convertTimestamp(timestampRaw);
        const timestampMs = timestampInfo?.MillisecFromEpoch;

        if (
          Number.isNaN(enumeration) ||
          Number.isNaN(phase) ||
          Number.isNaN(timestampMs)
        ) {
          invalidRows += 1;
          return;
        }

        if (
          ![
            WALK_EVENT,
            CHANGE_START_EVENT,
            SOLID_DONT_WALK_EVENT,
            PED_CALL_EVENT,
          ].includes(enumeration)
        ) {
          return;
        }

        events.push({
          enumeration,
          phase,
          timestampMs,
        });

        if (minTimestamp === null || timestampMs < minTimestamp) {
          minTimestamp = timestampMs;
        }
        if (maxTimestamp === null || timestampMs > maxTimestamp) {
          maxTimestamp = timestampMs;
        }
      });

      events.sort((a, b) => a.timestampMs - b.timestampMs);

      const durationHours =
        minTimestamp !== null && maxTimestamp !== null && maxTimestamp > minTimestamp
          ? (maxTimestamp - minTimestamp) / 3600000
          : null;
      const phaseStats = {};
      const cycles = [];
      let currentCycle = null;

      const startCycle = (timestampMs) => ({
        start: timestampMs,
        end: timestampMs,
        servedPhases: new Set(),
        callPhases: new Set(),
        callCounts: {},
      });

      events.forEach((event) => {
        if (!currentCycle) {
          currentCycle = startCycle(event.timestampMs);
        }

        if (event.enumeration === WALK_EVENT) {
          if (currentCycle.servedPhases.has(event.phase)) {
            currentCycle.end = event.timestampMs;
            cycles.push(currentCycle);
            currentCycle = startCycle(event.timestampMs);
          }
          currentCycle.servedPhases.add(event.phase);
        }

        if (event.enumeration === PED_CALL_EVENT) {
          currentCycle.callPhases.add(event.phase);
          currentCycle.callCounts[event.phase] =
            (currentCycle.callCounts[event.phase] || 0) + 1;
        }

        currentCycle.end = event.timestampMs;

        if (!phaseStats[event.phase]) {
          phaseStats[event.phase] = {
            pedEventCount: 0,
            callCount: 0,
            walkDurations: [],
            changeIntervals: [],
            callToWalkDelays: [],
            lastWalkStart: null,
            lastChangeStart: null,
            lastCallTime: null,
            fullServiceCycleCount: 0,
            fullServiceCallCount: 0,
          };
        }

        const stats = phaseStats[event.phase];

        if (event.enumeration === WALK_EVENT) {
          stats.pedEventCount += 1;
          stats.lastWalkStart = event.timestampMs;
          if (stats.lastCallTime !== null) {
            const callDelaySeconds = (event.timestampMs - stats.lastCallTime) / 1000;
            if (callDelaySeconds >= 0) {
              stats.callToWalkDelays.push(callDelaySeconds);
            }
            stats.lastCallTime = null;
          }
        }

        if (event.enumeration === CHANGE_START_EVENT) {
          if (stats.lastWalkStart !== null) {
            const walkDurationSeconds =
              (event.timestampMs - stats.lastWalkStart) / 1000;
            if (walkDurationSeconds >= 0) {
              stats.walkDurations.push(walkDurationSeconds);
            }
            stats.lastWalkStart = null;
          }
          stats.lastChangeStart = event.timestampMs;
        }

        if (event.enumeration === SOLID_DONT_WALK_EVENT) {
          if (stats.lastChangeStart !== null) {
            const changeIntervalSeconds =
              (event.timestampMs - stats.lastChangeStart) / 1000;
            if (changeIntervalSeconds >= 0) {
              stats.changeIntervals.push(changeIntervalSeconds);
            }
            stats.lastChangeStart = null;
          }
        }

        if (event.enumeration === PED_CALL_EVENT) {
          stats.callCount += 1;
          stats.lastCallTime = event.timestampMs;
        }
      });

      if (currentCycle) {
        cycles.push(currentCycle);
      }

      const fullServiceCycles = cycles.filter((cycle) => {
        if (cycle.callPhases.size === 0) {
          return false;
        }
        return Array.from(cycle.callPhases).every((phase) =>
          cycle.servedPhases.has(phase)
        );
      });

      fullServiceCycles.forEach((cycle) => {
        Object.entries(cycle.callCounts).forEach(([phase, count]) => {
          if (!phaseStats[phase]) {
            return;
          }
          phaseStats[phase].fullServiceCycleCount += 1;
          phaseStats[phase].fullServiceCallCount += count;
        });
      });

      const summaryRows = Object.keys(phaseStats).map((phase) => {
        const stats = phaseStats[phase];
        const averageWalkTime = this.averageSeconds(stats.walkDurations);
        const averageChangeInterval = this.averageSeconds(stats.changeIntervals);
        const averageCallToWalkDelay = this.averageSeconds(stats.callToWalkDelays);
        const pedCallsPerHour =
          durationHours && durationHours > 0
            ? stats.callCount / durationHours
            : null;
        const riskScore = this.calculateRiskScore({
          averageChangeInterval,
          averageCallToWalkDelay,
          pedCallsPerHour,
        });
        const fullServiceCallPercent = stats.callCount
          ? (stats.fullServiceCallCount / stats.callCount) * 100
          : null;
        const estimatedDistance = averageChangeInterval
          ? averageChangeInterval * FEET_PER_SECOND
          : null;
        const estimatedLanes = estimatedDistance
          ? Math.max(1, Math.round(estimatedDistance / LANE_WIDTH_FEET))
          : null;

        return {
          signalId,
          phase: Number(phase),
          pedEventCount: stats.pedEventCount,
          pedCallsPerHour,
          fullServiceCycleCount: stats.fullServiceCycleCount,
          fullServiceCallPercent,
          averageWalkTime,
          averageChangeInterval,
          averageCallToWalkDelay,
          riskScore,
          estimatedDistance,
          estimatedLanes,
        };
      });

      return { invalidRows, metadataRows, summaryRows };
    },
    addSignal() {
      this.signals.push({ signalId: "", data: "" });
    },
    removeSignal(index) {
      this.signals.splice(index, 1);
    },
    normalizeSignalId(signalId, index) {
      const trimmed = signalId?.trim();
      if (trimmed) {
        return trimmed;
      }
      return `Signal ${index + 1}`;
    },
    extractMetadata(lines) {
      const details = [];
      const scanLines = lines.slice(0, HEADER_SCAN_LIMIT);
      scanLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return;
        }
        const parts = trimmed.split(",").map((part) => part.trim());
        if (parts.length < 2) {
          return;
        }
        const label = parts[0];
        const value = parts.slice(1).join(", ").trim();
        if (!value) {
          return;
        }
        const normalized = label.toLowerCase();
        if (normalized.includes("intersection") && normalized.includes("number")) {
          details.push({
            label: "Intersection Number",
            value,
          });
          return;
        }
        if (normalized.includes("controller data log beginning")) {
          details.push({
            label: "Controller Data Log Beginning",
            value,
          });
          return;
        }
        if (normalized.includes("controller data log ending")) {
          details.push({
            label: "Controller Data Log Ending",
            value,
          });
        }
      });
      return details;
    },
    averageSeconds(values) {
      if (!values.length) {
        return null;
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      return total / values.length;
    },
    formatSeconds(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(1);
    },
    formatRisk(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(2);
    },
    formatDistance(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(1);
    },
    formatLanes(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toString();
    },
    formatRate(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(2);
    },
    formatPercent(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(1);
    },
    calculateRiskScore({
      averageChangeInterval,
      averageCallToWalkDelay,
      pedCallsPerHour,
    }) {
      if (
        averageChangeInterval === null ||
        averageChangeInterval === undefined ||
        averageCallToWalkDelay === null ||
        averageCallToWalkDelay === undefined ||
        pedCallsPerHour === null ||
        pedCallsPerHour === undefined
      ) {
        return null;
      }
      return (
        (averageChangeInterval + averageCallToWalkDelay) * pedCallsPerHour
      );
    },
  },
};
</script>

<style scoped>
.intro-text {
  max-width: 900px;
  margin: 0 auto 16px auto;
  text-align: left;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 16px 0;
}

.signal-inputs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.signal-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.signal-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.signal-title {
  margin: 0;
  font-size: 1.1rem;
}

.signal-id-input {
  max-width: 320px;
}

.warning-text {
  color: #b00020;
  font-size: 0.9rem;
}

.metadata-card {
  margin-top: 16px;
}

.metadata-table {
  width: 100%;
  border-collapse: collapse;
}

.metadata-table th,
.metadata-table td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  text-align: left;
}

.metadata-table th {
  background-color: #f6f6f6;
}

.summary-wrapper {
  margin-top: 24px;
}

.summary-wrapper.summary-embedded {
  margin-top: 0;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.summary-table th,
.summary-table td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  text-align: left;
}

.summary-table th {
  background-color: #f6f6f6;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.sort-indicator {
  margin-left: 6px;
  font-size: 0.8rem;
  color: #666;
}

.summary-filter-row th {
  background-color: #fafafa;
  padding: 6px 8px;
}

.summary-filter-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
}

.note-text {
  margin-top: 12px;
  font-size: 0.95rem;
  color: #444;
  text-align: left;
}
</style>
