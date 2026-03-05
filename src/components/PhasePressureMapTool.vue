<template>
  <div>
    <v-card class="mb-4" variant="outlined">
      <v-card-title>Phase Pressure Map Inputs</v-card-title>
      <v-card-text>
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />

        <v-textarea
          v-model="detectorPhaseMapInput"
          class="mt-3"
          label="Detector-to-phase map (one pair per line, e.g., 'DET 12 4' or '12,4')"
          rows="4"
        />

        <v-row class="mt-2">
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="minServiceSeconds"
              type="number"
              min="0"
              step="1"
              label="Minimum service seconds"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn color="primary" @click="buildPressureMap">Build Phase Pressure Map</v-btn>
          </v-col>
        </v-row>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </v-card-text>
    </v-card>

    <v-card v-if="pressureRows.length" variant="outlined">
      <v-card-title>Phase Pressure by Service Cycle</v-card-title>
      <v-card-text>
        <div class="cycle-legend mb-4">
          <span>Low pressure</span>
          <div class="legend-bar"></div>
          <span>High pressure</span>
        </div>

        <div class="heat-map-shell">
          <div class="phase-axis" :style="phaseAxisStyle">
            <div class="axis-header-cell">Cycle</div>
            <div v-for="phase in orderedPhases" :key="`head-${phase}`" class="phase-header">
              Ph {{ phase }}
            </div>
          </div>

          <div class="heat-map-scroll-y">
            <div class="heat-map-grid" :style="gridStyle">
              <template v-for="row in pressureRows" :key="`cycle-${row.cycleNumber}`">
                <div class="cycle-label">Cycle {{ row.cycleNumber }}</div>
                <div
                  v-for="phase in orderedPhases"
                  :key="`cell-${row.cycleNumber}-${phase}`"
                  class="pressure-cell"
                  :style="{ backgroundColor: getHeatColor(getCellPressure(row, phase)) }"
                  :title="buildCellTitle(row, phase)"
                ></div>
              </template>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";
import enumerationObj from "../data/enumerations.json";

export default {
  name: "PhasePressureMapTool",
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      textboxDefaultText:
        "Paste high-resolution CSV data (timestamp, event code, parameter) or switch to file upload.",
      detectorPhaseMapInput: "",
      minServiceSeconds: 1,
      orderedPhases: [],
      pressureRows: [],
      maxPressure: 0,
      errorMessage: "",
    };
  },
  computed: {
    detectionOnCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("detector on"))
          .map((item) => Number(item.eventCode))
          .filter((code) => !Number.isNaN(code)),
      );
    },
    phaseBeginGreenCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("phase begin green"))
          .map((item) => Number(item.eventCode))
          .filter((code) => !Number.isNaN(code)),
      );
    },
    phaseEndServiceCodes() {
      return new Set(
        enumerationObj
          .filter((item) => {
            const descriptor = item.eventDescriptor.toLowerCase();
            return (
              descriptor.includes("phase begin red clearance") ||
              descriptor.includes("phase end yellow clearance") ||
              descriptor.includes("phase inactive")
            );
          })
          .map((item) => Number(item.eventCode))
          .filter((code) => !Number.isNaN(code)),
      );
    },
    phaseAxisStyle() {
      return {
        gridTemplateColumns: `120px repeat(${this.orderedPhases.length}, minmax(48px, 1fr))`,
      };
    },
    gridStyle() {
      return {
        gridTemplateColumns: `120px repeat(${this.orderedPhases.length}, minmax(48px, 1fr))`,
      };
    },
  },
  methods: {
    buildPressureMap() {
      this.errorMessage = "";
      this.pressureRows = [];
      this.orderedPhases = [];
      this.maxPressure = 0;

      const detectorToPhase = this.parseDetectorPhaseMap(this.detectorPhaseMapInput);
      if (!detectorToPhase.size) {
        this.errorMessage = "Provide at least one detector-to-phase mapping pair.";
        return;
      }

      const records = this.parseRecords(this.inputData);
      if (!records.length) {
        this.errorMessage = "No usable CSV rows were found.";
        return;
      }

      const phaseIntervalsByPhase = this.buildPhaseIntervals(records);
      const detectorOnEventsByPhase = this.buildDetectorOnEventsByPhase(records, detectorToPhase);

      const perPhaseRows = [];
      phaseIntervalsByPhase.forEach((intervals, phase) => {
        const detectorOnEvents = detectorOnEventsByPhase.get(phase) || [];
        let previousEnd = null;

        intervals.forEach((interval, index) => {
          const serviceSeconds = Math.max(0, (interval.endMs - interval.startMs) / 1000);
          const serviceFloor = Math.max(0, Number(this.minServiceSeconds) || 0);
          const safeServiceSeconds = Math.max(serviceSeconds, serviceFloor);

          const windowStart = previousEnd === null ? Number.NEGATIVE_INFINITY : previousEnd;
          const demandCount = detectorOnEvents.filter(
            (timestampMs) => timestampMs > windowStart && timestampMs <= interval.startMs,
          ).length;
          const pressure = safeServiceSeconds > 0 ? demandCount / safeServiceSeconds : 0;

          perPhaseRows.push({
            phase,
            cycleNumber: index + 1,
            demandCount,
            serviceSeconds,
            pressure,
            windowStart,
            startMs: interval.startMs,
          });

          previousEnd = interval.endMs;
        });
      });

      if (!perPhaseRows.length) {
        this.errorMessage = "No phase service intervals were detected in the input.";
        return;
      }

      this.orderedPhases = [...new Set(perPhaseRows.map((row) => row.phase))].sort((a, b) => a - b);
      const maxCycle = Math.max(...perPhaseRows.map((row) => row.cycleNumber));

      this.pressureRows = Array.from({ length: maxCycle }, (_, index) => ({
        cycleNumber: index + 1,
        byPhase: {},
      }));

      perPhaseRows.forEach((row) => {
        const cycleRow = this.pressureRows[row.cycleNumber - 1];
        if (!cycleRow) {
          return;
        }
        cycleRow.byPhase[row.phase] = row;
      });

      this.maxPressure = perPhaseRows.reduce(
        (maxValue, row) => Math.max(maxValue, row.pressure),
        0,
      );
    },
    parseDetectorPhaseMap(input) {
      const map = new Map();

      String(input || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const numbers = line.match(/\d+/g);
          if (!numbers || numbers.length < 2) {
            return;
          }

          const detector = Number(numbers[0]);
          const phase = Number(numbers[1]);

          if (Number.isNaN(detector) || Number.isNaN(phase)) {
            return;
          }

          map.set(detector, phase);
        });

      return map;
    },
    parseRecords(input) {
      return String(input || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [timestamp, eventCodeRaw, parameterRaw] = line.split(",").map((value) => value.trim());
          const eventCode = Number(eventCodeRaw);
          const parameter = Number(parameterRaw);
          const timestampInfo = this.convertTimestamp(timestamp);

          if (
            Number.isNaN(eventCode) ||
            Number.isNaN(parameter) ||
            !timestampInfo ||
            Number.isNaN(timestampInfo.MillisecFromEpoch)
          ) {
            return null;
          }

          return {
            timestampMs: timestampInfo.MillisecFromEpoch,
            humanReadable: timestampInfo.humanReadable,
            eventCode,
            parameter,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampMs - b.timestampMs);
    },
    buildPhaseIntervals(records) {
      const intervalsByPhase = new Map();
      const openStartByPhase = new Map();

      records.forEach((record) => {
        const phase = record.parameter;

        if (this.phaseBeginGreenCodes.has(record.eventCode)) {
          openStartByPhase.set(phase, record.timestampMs);
          return;
        }

        if (this.phaseEndServiceCodes.has(record.eventCode)) {
          const startMs = openStartByPhase.get(phase);
          if (startMs === undefined || record.timestampMs <= startMs) {
            return;
          }

          if (!intervalsByPhase.has(phase)) {
            intervalsByPhase.set(phase, []);
          }

          intervalsByPhase.get(phase).push({
            startMs,
            endMs: record.timestampMs,
            endHumanReadable: record.humanReadable,
          });
          openStartByPhase.delete(phase);
        }
      });

      intervalsByPhase.forEach((intervals) => intervals.sort((a, b) => a.startMs - b.startMs));
      return intervalsByPhase;
    },
    buildDetectorOnEventsByPhase(records, detectorToPhase) {
      const eventsByPhase = new Map();

      records.forEach((record) => {
        if (!this.detectionOnCodes.has(record.eventCode)) {
          return;
        }

        const mappedPhase = detectorToPhase.get(record.parameter);
        if (mappedPhase === undefined) {
          return;
        }

        if (!eventsByPhase.has(mappedPhase)) {
          eventsByPhase.set(mappedPhase, []);
        }

        eventsByPhase.get(mappedPhase).push(record.timestampMs);
      });

      eventsByPhase.forEach((timestamps) => timestamps.sort((a, b) => a - b));
      return eventsByPhase;
    },
    getCellPressure(row, phase) {
      return row.byPhase?.[phase]?.pressure ?? null;
    },
    getHeatColor(pressure) {
      if (pressure === null || pressure === undefined) {
        return "#f5f5f5";
      }

      const ratio = this.maxPressure > 0 ? Math.min(1, pressure / this.maxPressure) : 0;
      const hue = 120 - ratio * 120;
      return `hsl(${hue}, 75%, 50%)`;
    },
    buildCellTitle(row, phase) {
      const cell = row.byPhase?.[phase];
      if (!cell) {
        return `Phase ${phase} - Cycle ${row.cycleNumber}\nNo completed service interval.`;
      }

      return [
        `Phase ${phase} - Cycle ${row.cycleNumber}`,
        `Demand (detector ON count): ${cell.demandCount}`,
        `Service (seconds): ${cell.serviceSeconds.toFixed(2)}`,
        `Pressure (demand/service): ${cell.pressure.toFixed(3)}`,
      ].join("\n");
    },
  },
};
</script>

<style scoped>
.error-message {
  color: #b00020;
  font-weight: 600;
}

.cycle-legend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.legend-bar {
  width: 170px;
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c);
}

.heat-map-shell {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.phase-axis,
.heat-map-grid {
  display: grid;
}

.axis-header-cell,
.phase-header,
.cycle-label,
.pressure-cell {
  border-bottom: 1px solid #ececec;
  border-right: 1px solid #ececec;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.9rem;
}

.axis-header-cell,
.phase-header {
  font-weight: 700;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 1;
}

.cycle-label {
  font-weight: 600;
  background: #fafafa;
}

.pressure-cell {
  cursor: default;
}

.heat-map-scroll-y {
  max-height: 500px;
  overflow: auto;
}
</style>
