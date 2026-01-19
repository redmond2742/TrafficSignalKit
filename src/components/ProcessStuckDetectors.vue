<template>
  <div>
    <div class="stuck-inputs">
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
      <em>Paste data and click process to find stuck detectors.</em>
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
      detectorMapInput: "",
      headers: [
        { title: "Detector ID", key: "detectorId", sortable: true },
        { title: "Phase #", key: "phase", sortable: true },
        {
          title: "Percent Time On",
          key: "percentOn",
          sortable: true,
        },
      ],
      sortBy: [{ key: "percentOn", order: "desc" }],
      tableItems: [],
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
      detectorDefaultText:
        "Det 1\t6\nDet 2\t2\nDet 3\t0\nDet 4\t0\nDet 5\t0",
    };
  },
  methods: {
    processStuckDetectors() {
      const events = this.parseHighResData(this.inputData);
      const { detectorToPhase } = this.parseDetectorMapping(
        this.detectorMapInput
      );

      if (events.length < 2) {
        this.tableItems = [];
        return;
      }

      const firstMillis = events[0].millis;
      const lastMillis = events[events.length - 1].millis;
      const totalDuration = lastMillis - firstMillis;
      if (totalDuration <= 0) {
        this.tableItems = [];
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
          phase: detectorToPhase[stats.detectorId] ?? "-",
          percentOn,
        });
      });

      this.tableItems = items.sort((a, b) => b.percentOn - a.percentOn);
    },
    parseDetectorMapping(text) {
      const detectorToPhase = {};

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
          }
        });

      return {
        detectorToPhase,
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
