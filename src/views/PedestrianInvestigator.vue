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

    <div v-if="summaryRows.length" class="summary-wrapper">
      <h2>Walk Phase Summary</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Walk Indications</th>
            <th>Avg Walk Time (s)</th>
            <th>Avg Walk Change Interval (s)</th>
            <th>Estimated Crossing Distance (ft)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="`summary-${row.phase}`">
            <td>{{ row.phase }}</td>
            <td>{{ row.walkCount }}</td>
            <td>{{ formatSeconds(row.averageWalkTime) }}</td>
            <td>{{ formatSeconds(row.averageChangeInterval) }}</td>
            <td>{{ formatDistance(row.estimatedDistance) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note-text">
        Walk and change interval averages use the controller event timestamps
        (0.1-second resolution). Estimated distance uses 3.5 ft/sec multiplied
        by the average walk change interval.
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
const FEET_PER_SECOND = 3.5;

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
      summaryRows: [],
    };
  },
  methods: {
    processData() {
      const lines = this.inputData.split(/\r?\n/).filter(Boolean);
      const events = [];
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

        if (![WALK_EVENT, CHANGE_START_EVENT, SOLID_DONT_WALK_EVENT].includes(enumeration)) {
          return;
        }

        events.push({
          enumeration,
          phase,
          timestampMs,
        });
      });

      events.sort((a, b) => a.timestampMs - b.timestampMs);

      const phaseStats = {};

      events.forEach((event) => {
        if (!phaseStats[event.phase]) {
          phaseStats[event.phase] = {
            walkCount: 0,
            walkDurations: [],
            changeIntervals: [],
            lastWalkStart: null,
            lastChangeStart: null,
          };
        }

        const stats = phaseStats[event.phase];

        if (event.enumeration === WALK_EVENT) {
          stats.walkCount += 1;
          stats.lastWalkStart = event.timestampMs;
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
      });

      const summaryRows = Object.keys(phaseStats)
        .map((phase) => {
          const stats = phaseStats[phase];
          const averageWalkTime = this.averageSeconds(stats.walkDurations);
          const averageChangeInterval = this.averageSeconds(
            stats.changeIntervals
          );
          const estimatedDistance = averageChangeInterval
            ? averageChangeInterval * FEET_PER_SECOND
            : null;

          return {
            phase: Number(phase),
            walkCount: stats.walkCount,
            averageWalkTime,
            averageChangeInterval,
            estimatedDistance,
          };
        })
        .sort((a, b) => a.phase - b.phase);

      this.invalidRows = invalidRows;
      this.summaryRows = summaryRows;
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
    formatDistance(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return value.toFixed(1);
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
