<template>
  <div class="startup-loss-tool">
    <h1 class="h1-center-text">Start Up Loss Average</h1>
    <p class="tool-intro">
      Paste high-resolution controller data and a detector-to-phase mapping to
      estimate start-up loss times. The tool matches each phase green event
      (event code 1) with the first detector-off event (event code 81) on the
      mapped detector channels. A per-phase fudge factor is subtracted to
      account for vehicles clearing the detection zone.
    </p>

    <div class="input-grid">
      <div class="input-card">
        <h3>High-Resolution Data</h3>
        <InputBox v-model="inputData" :defaultText="dataPlaceholder" />
      </div>
      <div class="input-card">
        <h3>Detector Mapping &amp; Fudge Factor</h3>
        <InputBox v-model="detectorMapInput" :defaultText="mappingPlaceholder" />
      </div>
    </div>

    <div class="action-row">
      <v-btn color="primary" :disabled="!canProcess" @click="processData">
        Calculate Start-Up Loss
      </v-btn>
      <v-btn
        color="secondary"
        variant="tonal"
        :disabled="!tableRows.length"
        @click="resetResults"
      >
        Clear Results
      </v-btn>
    </div>

    <v-card v-if="tableRows.length" class="results-card" variant="outlined">
      <v-card-title>Start-Up Loss Summary by Phase</v-card-title>
      <v-card-text>
        <div class="table-wrapper">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Fudge Factor (s)</th>
                <th>Samples</th>
                <th>Average Start-Up Loss (s)</th>
                <th>Sample Losses (s)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="`phase-${row.phase}`">
                <td class="phase-cell">{{ row.phase }}</td>
                <td>{{ formatSeconds(row.fudgeSeconds) }}</td>
                <td>{{ row.samples.length }}</td>
                <td>
                  <span v-if="row.averageSeconds !== null">
                    {{ formatSeconds(row.averageSeconds) }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <div v-if="row.samples.length" class="sample-list">
                    <div
                      v-for="(sample, index) in row.samples"
                      :key="`sample-${row.phase}-${index}`"
                    >
                      {{ formatSeconds(sample.adjustedSeconds) }}
                      <span class="sample-meta">
                        (G {{ sample.greenLabel }}, Det {{ sample.detector }})
                      </span>
                    </div>
                  </div>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

const DISPLAY_FORMAT = "ccc, MMM d yyyy h:mm:ss.S a";

export default {
  name: "StartUpLossAverage",
  components: { InputBox },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      detectorMapInput: "",
      tableRows: [],
      dataPlaceholder:
        "timestamp, eventCode, parameter\n2024-03-14T08:00:00.100, 1, 2\n2024-03-14T08:00:02.300, 81, 12",
      mappingPlaceholder:
        "Detector, Phase, FudgeSeconds\n12, 2, 0.6\n15, 6, 0.8",
    };
  },
  computed: {
    canProcess() {
      return this.inputData.trim().length > 0 && this.detectorMapInput.trim().length > 0;
    },
  },
  methods: {
    resetResults() {
      this.tableRows = [];
    },
    processData() {
      const mapping = this.parseDetectorMapping(this.detectorMapInput);
      const events = this.parseHighResData(this.inputData);
      if (!events.length || !mapping.phaseDetectors.size) {
        this.tableRows = [];
        return;
      }

      const detectorOffByChannel = this.groupDetectorOffEvents(events, 81);
      const phaseGreenEvents = this.collectPhaseEvents(events, 1);
      const phaseRedEvents = this.collectPhaseEvents(events, 10);

      const phaseResults = new Map();

      mapping.phaseDetectors.forEach((detectors, phase) => {
        phaseResults.set(phase, {
          phase,
          fudgeSeconds: mapping.phaseFudge.get(phase) ?? 0,
          samples: [],
        });
      });

      phaseGreenEvents.forEach((greenEvents, phase) => {
        const detectors = mapping.phaseDetectors.get(phase);
        if (!detectors || !detectors.size) {
          return;
        }
        const redEvents = phaseRedEvents.get(phase) || [];

        greenEvents.forEach((greenMillis) => {
          const endMillis =
            this.findNextEventMillis(redEvents, greenMillis) ?? Number.POSITIVE_INFINITY;

          let earliestOff = null;
          let earliestDetector = null;

          detectors.forEach((channel) => {
            const detectorOffs = detectorOffByChannel.get(channel) || [];
            const candidate = this.findFirstInRange(detectorOffs, greenMillis, endMillis);
            if (candidate !== null && (earliestOff === null || candidate < earliestOff)) {
              earliestOff = candidate;
              earliestDetector = channel;
            }
          });

          if (earliestOff === null) {
            return;
          }

          const phaseResult = phaseResults.get(phase);
          if (!phaseResult) {
            return;
          }

          const rawSeconds = (earliestOff - greenMillis) / 1000;
          const fudge = phaseResult.fudgeSeconds || 0;
          const adjustedSeconds = Math.max(0, rawSeconds - fudge);

          phaseResult.samples.push({
            greenLabel: this.formatMillis(greenMillis),
            detector: earliestDetector,
            rawSeconds,
            adjustedSeconds,
          });
        });
      });

      const tableRows = Array.from(phaseResults.values())
        .map((row) => ({
          ...row,
          averageSeconds: this.calculateAverage(row.samples),
        }))
        .sort((a, b) => a.phase - b.phase);

      this.tableRows = tableRows;
    },
    parseHighResData(input) {
      return input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/[,\t]/).map((part) => part.trim()))
        .filter((parts) => parts.length >= 3)
        .map(([timestamp, eventCodeRaw, parameterRaw]) => {
          const eventCode = Number(eventCodeRaw);
          const parameter = Number(parameterRaw);
          if (Number.isNaN(eventCode) || Number.isNaN(parameter)) {
            return null;
          }
          const converted = this.convertTimestamp(timestamp);
          if (!converted?.calculatable) {
            return null;
          }
          return {
            timestamp,
            eventCode,
            parameter,
            millis: converted.MillisecFromEpoch,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.millis - b.millis);
    },
    parseDetectorMapping(input) {
      const phaseDetectors = new Map();
      const phaseFudge = new Map();

      const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      lines.forEach((line) => {
        const numericParts = line.match(/-?\d+(?:\.\d+)?/g);
        if (!numericParts || numericParts.length < 2) {
          return;
        }
        const [detectorRaw, phaseRaw, fudgeRaw] = numericParts;
        const detector = Number(detectorRaw);
        const phase = Number(phaseRaw);
        const fudge = fudgeRaw !== undefined ? Number(fudgeRaw) : 0;

        if (Number.isNaN(detector) || Number.isNaN(phase)) {
          return;
        }

        if (!phaseDetectors.has(phase)) {
          phaseDetectors.set(phase, new Set());
        }
        phaseDetectors.get(phase).add(detector);
        phaseFudge.set(phase, Number.isNaN(fudge) ? 0 : fudge);
      });

      return { phaseDetectors, phaseFudge };
    },
    collectPhaseEvents(events, eventCode) {
      const phaseMap = new Map();
      events
        .filter((event) => event.eventCode === eventCode)
        .forEach((event) => {
          if (!phaseMap.has(event.parameter)) {
            phaseMap.set(event.parameter, []);
          }
          phaseMap.get(event.parameter).push(event.millis);
        });
      phaseMap.forEach((list) => list.sort((a, b) => a - b));
      return phaseMap;
    },
    groupDetectorOffEvents(events, eventCode) {
      const detectorMap = new Map();
      events
        .filter((event) => event.eventCode === eventCode)
        .forEach((event) => {
          if (!detectorMap.has(event.parameter)) {
            detectorMap.set(event.parameter, []);
          }
          detectorMap.get(event.parameter).push(event.millis);
        });
      detectorMap.forEach((list) => list.sort((a, b) => a - b));
      return detectorMap;
    },
    findNextEventMillis(eventMillis, startMillis) {
      const index = this.lowerBound(eventMillis, startMillis + 1);
      if (index < eventMillis.length) {
        return eventMillis[index];
      }
      return null;
    },
    findFirstInRange(list, start, end) {
      if (!list.length) {
        return null;
      }
      const index = this.lowerBound(list, start);
      if (index < list.length && list[index] <= end) {
        return list[index];
      }
      return null;
    },
    lowerBound(list, value) {
      let low = 0;
      let high = list.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (list[mid] < value) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    },
    calculateAverage(samples) {
      if (!samples.length) {
        return null;
      }
      const total = samples.reduce((sum, sample) => sum + sample.adjustedSeconds, 0);
      return total / samples.length;
    },
    formatSeconds(value) {
      return Number.isFinite(value) ? value.toFixed(2) : "—";
    },
    formatMillis(millis) {
      return DateTime.fromMillis(millis).toFormat(DISPLAY_FORMAT);
    },
  },
};
</script>

<style scoped>
.startup-loss-tool {
  padding: 16px 0 32px;
}

.tool-intro {
  max-width: 860px;
  margin: 0 auto 20px;
  text-align: center;
}

.input-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  max-width: 1200px;
  margin: 0 auto 16px;
}

.input-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin: 8px 0 16px;
}

.results-card {
  max-width: 1100px;
  margin: 0 auto;
}

.table-wrapper {
  overflow-x: auto;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.summary-table th,
.summary-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  vertical-align: top;
}

.summary-table th {
  font-weight: 600;
}

.phase-cell {
  font-weight: 600;
}

.sample-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sample-meta {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-left: 6px;
}
</style>
