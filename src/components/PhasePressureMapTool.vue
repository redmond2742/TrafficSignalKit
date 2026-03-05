<template>
  <div>
    <v-card class="mb-4" variant="outlined">
      <v-card-title>Phase Pressure Map Inputs</v-card-title>
      <v-card-text>
        <div class="input-label">High-resolution CSV input</div>
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />

        <div class="help-text mt-1">
          Accepted CSV format: <code>timestamp,event code,parameter</code> (one event per line).
        </div>

        <div class="input-label mt-4">Detector mapping input</div>
        <v-textarea v-model="detectorPhaseMapInput" rows="6" placeholder="12,4&#10;13,4&#10;21,8" />
        <div class="help-text mt-1">
          Accepted mapping formats (one mapping per line):
          <code>12,4</code>, <code>12 4</code>, <code>DET 12 4</code>, or
          <code>{"channel":12,"phase":4}</code>.
        </div>
        <ul v-if="mappingErrors.length" class="mapping-errors mt-2">
          <li v-for="(mappingError, index) in mappingErrors" :key="`mapping-error-${index}`">
            {{ mappingError }}
          </li>
        </ul>

        <v-row class="mt-2">
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="binSizeMinutes"
              type="number"
              min="1"
              max="60"
              step="1"
              label="Bin size (minutes)"
            />
          </v-col>
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
        <div v-if="unmappedDetectorEvents > 0" class="help-text mt-1">
          Ignored {{ unmappedDetectorEvents }} detector events from unmapped channels.
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="pressureRows.length" variant="outlined">
      <v-card-title>Phase Pressure by Time Bin</v-card-title>
      <v-card-text>
        <div class="cycle-legend mb-4">
          <span>Low pressure</span>
          <div class="legend-bar"></div>
          <span>High pressure</span>
        </div>

        <div class="heat-map-shell">
          <div class="phase-axis" :style="phaseAxisStyle">
            <div class="axis-header-cell">Bin</div>
            <div v-for="phase in orderedPhases" :key="`head-${phase}`" class="phase-header">
              Ph {{ phase }}
            </div>
          </div>

          <div class="heat-map-scroll-y">
            <div class="heat-map-grid" :style="gridStyle">
              <template v-for="row in pressureRows" :key="`cycle-${row.cycleNumber}`">
                <div class="cycle-label">Bin {{ row.cycleNumber }}</div>
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
      binSizeMinutes: 5,
      orderedPhases: [],
      pressureRows: [],
      maxPressure: 0,
      errorMessage: "",
      mappingErrors: [],
      channelToPhaseMap: {},
      unmappedDetectorEvents: 0,
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
    detectorOffCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("detector off"))
          .map((item) => Number(item.eventCode))
          .filter((code) => !Number.isNaN(code)),
      );
    },
    gapOutCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("gap out"))
          .map((item) => Number(item.eventCode))
          .filter((code) => !Number.isNaN(code)),
      );
    },
    maxOutCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("max out"))
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
      this.mappingErrors = [];
      this.pressureRows = [];
      this.orderedPhases = [];
      this.maxPressure = 0;
      this.channelToPhaseMap = {};
      this.unmappedDetectorEvents = 0;

      const mappingResult = this.parseDetectorPhaseMap(this.detectorPhaseMapInput);
      this.mappingErrors = mappingResult.errors;
      if (this.mappingErrors.length) {
        this.errorMessage = "Fix detector mapping errors before building the map.";
        return;
      }

      this.channelToPhaseMap = mappingResult.channelToPhaseMap;
      if (!Object.keys(this.channelToPhaseMap).length) {
        this.errorMessage = "Provide at least one valid detector-to-phase mapping pair.";
        return;
      }

      const records = this.parseRecords(this.inputData);
      if (!records.length) {
        this.errorMessage = "No usable CSV rows were found.";
        return;
      }

      const binSizeMs = Math.max(1, Number(this.binSizeMinutes) || 1) * 60 * 1000;
      const bins = this.buildTimeBins(records, binSizeMs);
      const phaseIntervalsByPhase = this.buildPhaseIntervals(records);
      const detectorMetricsByPhase = this.buildDetectorDemandMetrics(records, bins);
      const terminationCountsByPhase = this.buildTerminationCounts(records, bins);
      const perPhaseRows = this.buildRowsByBin(
        bins,
        phaseIntervalsByPhase,
        detectorMetricsByPhase,
        terminationCountsByPhase,
      );

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

      this.maxPressure = perPhaseRows.reduce((maxValue, row) => Math.max(maxValue, row.pressure), 0);
    },
    parseDetectorPhaseMap(input) {
      const channelToPhaseMap = {};
      const errors = [];

      String(input || "")
        .split(/\r?\n/)
        .forEach((line, index) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            return;
          }

          const parsedPair = this.parseMappingLine(trimmedLine);
          if (!parsedPair) {
            errors.push(`Line ${index + 1}: expected channel and phase values.`);
            return;
          }

          const { channel, phase } = parsedPair;
          if (!Number.isFinite(channel) || !Number.isFinite(phase)) {
            errors.push(`Line ${index + 1}: channel and phase must both be numeric.`);
            return;
          }

          if (channelToPhaseMap[channel] !== undefined) {
            errors.push(`Line ${index + 1}: channel ${channel} is mapped more than once.`);
            return;
          }

          channelToPhaseMap[channel] = phase;
        });

      return {
        channelToPhaseMap,
        errors,
      };
    },
    parseMappingLine(line) {
      if (line.startsWith("{")) {
        try {
          const parsedJson = JSON.parse(line);
          return {
            channel: Number(parsedJson.channel),
            phase: Number(parsedJson.phase),
          };
        } catch {
          return null;
        }
      }

      const numbers = line.match(/-?\d+(?:\.\d+)?/g);
      if (!numbers || numbers.length < 2) {
        return null;
      }

      return {
        channel: Number(numbers[0]),
        phase: Number(numbers[1]),
      };
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
    buildTimeBins(records, binSizeMs) {
      const startMs = records[0].timestampMs;
      const endMs = records[records.length - 1].timestampMs;
      const firstBinStart = Math.floor(startMs / binSizeMs) * binSizeMs;
      const bins = [];

      for (let binStart = firstBinStart; binStart <= endMs; binStart += binSizeMs) {
        const binEnd = binStart + binSizeMs;
        bins.push({
          startMs: binStart,
          endMs: binEnd,
          startTime: new Date(binStart).toLocaleTimeString(),
          endTime: new Date(binEnd).toLocaleTimeString(),
        });
      }

      return bins;
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
    buildDetectorDemandMetrics(records, bins) {
      const metricsByPhase = new Map();
      const openOnByChannel = new Map();

      const ensurePhaseBin = (phase, binIndex) => {
        if (!metricsByPhase.has(phase)) {
          metricsByPhase.set(phase, []);
        }
        const phaseBins = metricsByPhase.get(phase);
        if (!phaseBins[binIndex]) {
          phaseBins[binIndex] = {
            activationCount: 0,
            occupancySeconds: 0,
          };
        }
        return phaseBins[binIndex];
      };

      const addOccupancySpan = (phase, startMs, endMs) => {
        if (endMs <= startMs) {
          return;
        }
        bins.forEach((bin, binIndex) => {
          const overlapMs = Math.max(0, Math.min(endMs, bin.endMs) - Math.max(startMs, bin.startMs));
          if (overlapMs <= 0) {
            return;
          }
          const binMetrics = ensurePhaseBin(phase, binIndex);
          binMetrics.occupancySeconds += overlapMs / 1000;
        });
      };

      records.forEach((record) => {
        const mappedPhase = this.channelToPhaseMap[record.parameter];
        const isOn = this.detectionOnCodes.has(record.eventCode);
        const isOff = this.detectorOffCodes.has(record.eventCode);

        if (!isOn && !isOff) {
          return;
        }

        if (mappedPhase === undefined) {
          this.unmappedDetectorEvents += 1;
          return;
        }

        const binIndex = bins.findIndex(
          (bin) => record.timestampMs >= bin.startMs && record.timestampMs < bin.endMs,
        );

        if (isOn) {
          if (binIndex >= 0) {
            const binMetrics = ensurePhaseBin(mappedPhase, binIndex);
            binMetrics.activationCount += 1;
          }
          openOnByChannel.set(record.parameter, {
            startMs: record.timestampMs,
            phase: mappedPhase,
          });
          return;
        }

        if (isOff) {
          const open = openOnByChannel.get(record.parameter);
          if (!open) {
            return;
          }
          addOccupancySpan(open.phase, open.startMs, record.timestampMs);
          openOnByChannel.delete(record.parameter);
        }
      });

      const fallbackEndMs = bins[bins.length - 1]?.endMs;
      openOnByChannel.forEach((open) => {
        if (fallbackEndMs !== undefined) {
          addOccupancySpan(open.phase, open.startMs, fallbackEndMs);
        }
      });

      return metricsByPhase;
    },
    buildTerminationCounts(records, bins) {
      const countsByPhase = new Map();
      const ensurePhaseBin = (phase, binIndex) => {
        if (!countsByPhase.has(phase)) {
          countsByPhase.set(phase, []);
        }
        const phaseBins = countsByPhase.get(phase);
        if (!phaseBins[binIndex]) {
          phaseBins[binIndex] = {
            gapOutCount: 0,
            maxOutCount: 0,
          };
        }
        return phaseBins[binIndex];
      };

      records.forEach((record) => {
        const isGapOut = this.gapOutCodes.has(record.eventCode);
        const isMaxOut = this.maxOutCodes.has(record.eventCode);
        if (!isGapOut && !isMaxOut) {
          return;
        }

        const phase = record.parameter;
        const binIndex = bins.findIndex(
          (bin) => record.timestampMs >= bin.startMs && record.timestampMs < bin.endMs,
        );
        if (binIndex < 0) {
          return;
        }

        const counts = ensurePhaseBin(phase, binIndex);
        if (isGapOut) {
          counts.gapOutCount += 1;
        }
        if (isMaxOut) {
          counts.maxOutCount += 1;
        }
      });

      return countsByPhase;
    },
    buildRowsByBin(bins, phaseIntervalsByPhase, detectorMetricsByPhase, terminationCountsByPhase) {
      const phaseSet = new Set([
        ...phaseIntervalsByPhase.keys(),
        ...detectorMetricsByPhase.keys(),
        ...terminationCountsByPhase.keys(),
      ]);
      const serviceFloor = Math.max(0, Number(this.minServiceSeconds) || 0);
      const rows = [];

      [...phaseSet].forEach((phase) => {
        const intervals = phaseIntervalsByPhase.get(phase) || [];
        bins.forEach((bin, binIndex) => {
          const detectorMetrics = detectorMetricsByPhase.get(phase)?.[binIndex] || {
            activationCount: 0,
            occupancySeconds: 0,
          };
          const terminationCounts = terminationCountsByPhase.get(phase)?.[binIndex] || {
            gapOutCount: 0,
            maxOutCount: 0,
          };

          const serviceSeconds = intervals.reduce((sum, interval) => {
            const overlapMs = Math.max(
              0,
              Math.min(interval.endMs, bin.endMs) - Math.max(interval.startMs, bin.startMs),
            );
            return sum + overlapMs / 1000;
          }, 0);

          const demandProxy = detectorMetrics.activationCount + detectorMetrics.occupancySeconds / 10;
          const safeServiceSeconds = Math.max(serviceFloor, serviceSeconds);
          const pressure = safeServiceSeconds > 0 ? demandProxy / safeServiceSeconds : 0;

          rows.push({
            phase,
            cycleNumber: binIndex + 1,
            binStartLabel: bin.startTime,
            binEndLabel: bin.endTime,
            activationCount: detectorMetrics.activationCount,
            occupancySeconds: detectorMetrics.occupancySeconds,
            demandProxy,
            serviceSeconds,
            safeServiceSeconds,
            pressure,
            gapOutCount: terminationCounts.gapOutCount,
            maxOutCount: terminationCounts.maxOutCount,
          });
        });
      });

      return rows;
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
        `Phase ${phase} - Bin ${row.cycleNumber} (${cell.binStartLabel} - ${cell.binEndLabel})`,
        `Demand activations: ${cell.activationCount}`,
        `Demand occupancy (s): ${cell.occupancySeconds.toFixed(2)}`,
        `Demand proxy: ${cell.demandProxy.toFixed(2)} (activations + occupancy/10)`,
        `Service (seconds): ${cell.serviceSeconds.toFixed(2)}`,
        `Normalized service floor (seconds): ${cell.safeServiceSeconds.toFixed(2)}`,
        `Gap-outs: ${cell.gapOutCount}`,
        `Max-outs: ${cell.maxOutCount}`,
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

.mapping-errors {
  color: #b00020;
  margin: 0;
  padding-left: 1.1rem;
}

.input-label {
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.help-text {
  font-size: 0.85rem;
  color: #4f4f4f;
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
