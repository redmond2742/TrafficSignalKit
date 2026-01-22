<template>
  <div>
    <div class="stuck-inputs">
      <div class="grow-wrap">
        <InputBox v-model="inputData" :defaultText="dataDefaultText" />
      </div>
    </div>
    <div class="actions">
      <v-btn @click="processStuckDetectors" color="primary">Process</v-btn>
    </div>

    <div v-if="tableItems.length" class="table-wrapper">
      <v-data-table
        :headers="headers"
        :items="tableItems"
        :sort-by="sortBy"
        item-value="detectorId"
        density="comfortable"
      >
        <template #item.percentOn="{ item }">
          {{ item.percentOn.toFixed(1) }}%
        </template>
      </v-data-table>
    </div>
    <div v-else class="empty-state">
      <em v-if="hasProcessed">No stuck detectors found after processing data.</em>
      <em v-else>Paste data and click process to find stuck detectors.</em>
    </div>
    <div
      v-if="hasProcessed"
      :class="['analysis-summary', { 'analysis-summary--clear': !tableItems.length }]"
    >
      <p>{{ analysisSummary }}</p>
    </div>
  </div>
</template>

<script>
import convertTime from "../mixins/convertTime";
import InputBox from "./foundational/InputBox.vue";

const ON_EVENT_CODES = new Set([82, 90]);
const OFF_EVENT_CODES = new Set([81, 89]);

export default {
  mixins: [convertTime],
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
      headers: [
        { title: "Detector ID", key: "detectorId", sortable: true },
        {
          title: "Percent Time On",
          key: "percentOn",
          sortable: true,
        },
      ],
      sortBy: [{ key: "percentOn", order: "desc" }],
      tableItems: [],
      hasProcessed: false,
      analysisSummary: "",
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
    };
  },
  methods: {
    processStuckDetectors() {
      this.hasProcessed = true;
      const events = this.parseHighResData(this.inputData);

      if (events.length < 2) {
        this.tableItems = [];
        this.analysisSummary =
          "Methodology: parsed high-resolution events and searched for detectors that stayed ON without a matching OFF. There was not enough data to evaluate, so nothing stands out yet.";
        return;
      }

      const firstMillis = events[0].millis;
      const lastMillis = events[events.length - 1].millis;
      const totalDuration = lastMillis - firstMillis;
      if (totalDuration <= 0) {
        this.tableItems = [];
        this.analysisSummary =
          "Methodology: parsed high-resolution events and searched for detectors that stayed ON without a matching OFF. The time span was too short or invalid, so there is nothing to investigate.";
        return;
      }

      const detectorStats = new Map();

      const ensureStats = (detectorId) => {
        if (!detectorStats.has(detectorId)) {
          detectorStats.set(detectorId, {
            detectorId,
            onDuration: 0,
            isOn: false,
            lastOnStart: null,
            hasOnEvent: false,
            hasOffEvent: false,
          });
        }
        return detectorStats.get(detectorId);
      };

      events.forEach((event) => {
        if (!ON_EVENT_CODES.has(event.eventCode) && !OFF_EVENT_CODES.has(event.eventCode)) {
          return;
        }
        const detectorId = event.parameterCode;
        if (Number.isNaN(detectorId)) {
          return;
        }
        const stats = ensureStats(detectorId);
        if (ON_EVENT_CODES.has(event.eventCode)) {
          stats.hasOnEvent = true;
          if (!stats.isOn) {
            stats.isOn = true;
            stats.lastOnStart = event.millis;
          }
        }
        if (OFF_EVENT_CODES.has(event.eventCode)) {
          stats.hasOffEvent = true;
          if (stats.isOn && stats.lastOnStart !== null) {
            stats.onDuration += event.millis - stats.lastOnStart;
          }
          stats.isOn = false;
          stats.lastOnStart = null;
        }
      });

      detectorStats.forEach((stats) => {
        if (stats.isOn && stats.lastOnStart !== null) {
          stats.onDuration += lastMillis - stats.lastOnStart;
        }
      });

      const items = [];
      detectorStats.forEach((stats) => {
        if (!stats.hasOnEvent || stats.hasOffEvent) {
          return;
        }
        const percentOn = (stats.onDuration / totalDuration) * 100;
        items.push({
          detectorId: stats.detectorId,
          percentOn,
        });
      });

      this.tableItems = items.sort((a, b) => b.percentOn - a.percentOn);
      const detectorCount = detectorStats.size;
      const flaggedCount = this.tableItems.length;
      if (flaggedCount > 0) {
        const topDetector = this.tableItems[0];
        this.analysisSummary = `Methodology: parsed ${events.length} events and compared ON/OFF pairs for ${detectorCount} detector(s), flagging any detector that stayed ON without a matching OFF. Found ${flaggedCount} detector(s) to investigate, with detector ${topDetector.detectorId} at ${topDetector.percentOn.toFixed(
          1,
        )}% ON time as the highest priority.`;
      } else {
        this.analysisSummary = `Methodology: parsed ${events.length} events and compared ON/OFF pairs for ${detectorCount} detector(s), flagging any detector that stayed ON without a matching OFF. No stuck detectors were identified, so there is nothing specific to investigate right now.`;
      }
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
  },
};
</script>

<style scoped>
.stuck-inputs {
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

.table-wrapper {
  margin-top: 12px;
}

.empty-state {
  margin-top: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.analysis-summary {
  margin-top: 16px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.analysis-summary--clear {
  border: 2px solid #2e7d32;
  border-radius: 8px;
  padding: 12px;
  background: rgba(46, 125, 50, 0.08);
}

.analysis-summary p {
  margin: 0;
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
