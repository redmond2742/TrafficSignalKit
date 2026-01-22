<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Pedestrian Investigator</h1>
    <p class="intro-text">
      Analyze pedestrian walk intervals from high-resolution controller logs.
      This tool looks for walk events (enumeration 21), walk change interval
      start (enumeration 22), and solid don’t walk start (enumeration 23) to
      estimate pedestrian walk times, clearance intervals, and crossing
      distances.
    </p>

    <div class="grow-wrap">
      <InputBox v-model="inputData" :defaultText="dataDefaultText" />
    </div>

    <div class="actions">
      <v-btn color="primary" :disabled="!inputData.trim()" @click="processData">
        Process Pedestrian Data
      </v-btn>
      <span v-if="invalidRows" class="warning-text">
        Skipped {{ invalidRows }} rows that did not match the expected CSV
        format.
      </span>
    </div>

    <v-card v-if="metadataRows.length" class="metadata-card" variant="outlined">
      <v-card-title>Data Log Details</v-card-title>
      <v-card-text>
        <dl class="metadata-grid">
          <div
            v-for="detail in metadataRows"
            :key="`meta-${detail.label}`"
            class="metadata-item"
          >
            <dt>{{ detail.label }}</dt>
            <dd>{{ detail.value }}</dd>
          </div>
        </dl>
      </v-card-text>
    </v-card>

    <div v-if="summaryRows.length" class="summary-wrapper">
      <h2>Walk Phase Summary</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Ped Phase Uses</th>
            <th>Ped Calls / Hr</th>
            <th>Full-Service Cycles</th>
            <th>Calls in Full-Service Cycles (%)</th>
            <th>Avg Walk Time (s)</th>
            <th>Avg Walk Change Interval (s)</th>
            <th>Avg Call-to-Walk Delay (s)</th>
            <th>Risk Score</th>
            <th>Estimated Crossing Distance (ft)</th>
            <th>Estimated Lanes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="`summary-${row.phase}`">
            <td>{{ row.phase }}</td>
            <td>{{ row.pedEventCount }}</td>
            <td>{{ formatRate(row.pedCallsPerHour) }}</td>
            <td>{{ row.fullServiceCycleCount }}</td>
            <td>{{ formatPercent(row.fullServiceCallPercent) }}</td>
            <td>{{ formatSeconds(row.averageWalkTime) }}</td>
            <td>{{ formatSeconds(row.averageChangeInterval) }}</td>
            <td>{{ formatSeconds(row.averageCallToWalkDelay) }}</td>
            <td>{{ formatRisk(row.riskScore) }}</td>
            <td>{{ formatDistance(row.estimatedDistance) }}</td>
            <td>{{ formatLanes(row.estimatedLanes) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note-text">
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

export default {
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, phase)",
      invalidRows: 0,
      metadataRows: [],
      summaryRows: [],
    };
  },
  methods: {
    processData() {
      const lines = this.inputData.split(/\r?\n/).filter(Boolean);
      const metadataRows = this.extractMetadata(lines);
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

      const summaryRows = Object.keys(phaseStats)
        .map((phase) => {
          const stats = phaseStats[phase];
          const averageWalkTime = this.averageSeconds(stats.walkDurations);
          const averageChangeInterval = this.averageSeconds(
            stats.changeIntervals
          );
          const averageCallToWalkDelay = this.averageSeconds(
            stats.callToWalkDelays
          );
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
        })
        .sort((a, b) => a.phase - b.phase);

      this.invalidRows = invalidRows;
      this.metadataRows = metadataRows;
      this.summaryRows = summaryRows;
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

.warning-text {
  color: #b00020;
  font-size: 0.9rem;
}

.metadata-card {
  margin-top: 16px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px 24px;
  margin: 0;
}

.metadata-item {
  margin: 0;
}

.metadata-item dt {
  font-weight: 600;
  color: #222;
}

.metadata-item dd {
  margin: 4px 0 0;
  color: #444;
}

.summary-wrapper {
  margin-top: 24px;
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

.note-text {
  margin-top: 12px;
  font-size: 0.95rem;
  color: #444;
  text-align: left;
}
</style>
