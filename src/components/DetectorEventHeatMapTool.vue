<template>
  <div>
    <v-card class="mb-4" variant="outlined">
      <v-card-title>Detector Event Heat Map Inputs</v-card-title>
      <v-card-text>
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />

        <v-textarea
          v-model="mappingInput"
          class="mt-4"
          label="Detector Channel to Phase Mapping"
          rows="5"
          placeholder="Examples:\nDet 1, Phase 2\n2,6\nChannel 7 -> Phase 4"
        />

        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="metricMode"
              :items="metricOptions"
              item-title="label"
              item-value="value"
              label="Heat map metric"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="eventFilter"
              :items="eventFilterOptions"
              item-title="label"
              item-value="value"
              label="Count mode event type"
              :disabled="metricMode === 'duration'"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="rowMode"
              :items="rowModeOptions"
              item-title="label"
              item-value="value"
              label="Y-axis focus toggle"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="binMinutes"
              type="number"
              min="1"
              max="120"
              label="Time bin size (minutes)"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn color="primary" @click="processHeatMap">Build Heat Map</v-btn>
          </v-col>
        </v-row>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </v-card-text>
    </v-card>

    <v-card v-if="heatGrid.length" variant="outlined">
      <v-card-title>
        Detector Event Heat Map
        <span class="text-subtitle-2 ml-2">
          ({{ metricMode === "count" ? "Event count" : "Detector occupancy duration" }})
        </span>
      </v-card-title>
      <v-card-text>
        <div class="heat-map-scroll">
          <div class="heat-map" :style="gridStyle">
            <div class="axis-header left">{{ leftAxisTitle }}</div>
            <div class="axis-header x">
              <div class="x-axis-grid" :style="xAxisStyle">
                <div
                  v-for="(label, index) in xAxisLabels"
                  :key="`x-label-${index}`"
                  class="x-label"
                >
                  {{ label }}
                </div>
              </div>
            </div>
            <div class="axis-header right">{{ rightAxisTitle }}</div>

            <template v-for="row in heatGrid" :key="row.id">
              <div class="row-label left">{{ row.leftLabel }}</div>
              <div class="row-cells" :style="xAxisStyle">
                <div
                  v-for="cell in row.cells"
                  :key="`${row.id}-${cell.binIndex}`"
                  class="cell"
                  :style="{ backgroundColor: getHeatColor(cell.value) }"
                  :title="buildCellTitle(row, cell)"
                ></div>
              </div>
              <div class="row-label right">{{ row.rightLabel }}</div>
            </template>
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
  name: "DetectorEventHeatMapTool",
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      textboxDefaultText:
        "Paste in High-Resolution CSV data or switch to file upload in the input control.",
      mappingInput: "",
      metricMode: "count",
      eventFilter: "all",
      rowMode: "phase",
      binMinutes: 15,
      heatGrid: [],
      xAxisLabels: [],
      maxValue: 0,
      errorMessage: "",
      metricOptions: [
        { label: "Count detector on/off events", value: "count" },
        { label: "Sum detector on-to-off durations", value: "duration" },
      ],
      eventFilterOptions: [
        { label: "Count ON + OFF events", value: "all" },
        { label: "Count only ON events", value: "on" },
        { label: "Count only OFF events", value: "off" },
      ],
      rowModeOptions: [
        { label: "Primary Y-axis = Phase", value: "phase" },
        { label: "Primary Y-axis = Detector Channel", value: "channel" },
      ],
    };
  },
  computed: {
    detectorOnCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("detector on"))
          .map((item) => parseInt(item.eventCode, 10))
          .filter((value) => !Number.isNaN(value)),
      );
    },
    detectorOffCodes() {
      return new Set(
        enumerationObj
          .filter((item) => item.eventDescriptor.toLowerCase().includes("detector off"))
          .map((item) => parseInt(item.eventCode, 10))
          .filter((value) => !Number.isNaN(value)),
      );
    },
    parsedMappings() {
      return this.mappingInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const numbers = line.match(/\d+/g);
          if (!numbers || numbers.length < 2) {
            return null;
          }
          const channel = parseInt(numbers[0], 10);
          const phase = parseInt(numbers[1], 10);
          if (Number.isNaN(channel) || Number.isNaN(phase)) {
            return null;
          }
          return { channel, phase };
        })
        .filter(Boolean);
    },
    mappingByChannel() {
      return this.parsedMappings.reduce((lookup, mapping) => {
        lookup[mapping.channel] = mapping.phase;
        return lookup;
      }, {});
    },
    channelsByPhase() {
      return this.parsedMappings.reduce((lookup, mapping) => {
        if (!lookup[mapping.phase]) {
          lookup[mapping.phase] = [];
        }
        lookup[mapping.phase].push(mapping.channel);
        return lookup;
      }, {});
    },
    leftAxisTitle() {
      return this.rowMode === "phase" ? "Phase" : "Detector Channel";
    },
    rightAxisTitle() {
      return this.rowMode === "phase"
        ? "Mapped Detector Channels"
        : "Mapped Phase";
    },
    gridStyle() {
      return {
        gridTemplateColumns: "150px 1fr 180px",
      };
    },
    xAxisStyle() {
      return {
        gridTemplateColumns: `repeat(${this.xAxisLabels.length || 1}, minmax(12px, 1fr))`,
      };
    },
  },
  methods: {
    processHeatMap() {
      this.errorMessage = "";
      this.heatGrid = [];
      this.xAxisLabels = [];
      this.maxValue = 0;

      const parsedEvents = this.parseDetectorEvents();
      if (!parsedEvents.length) {
        this.errorMessage = "No detector ON/OFF events were found in the input CSV data.";
        return;
      }

      const binSizeMinutes = Number(this.binMinutes);
      const safeBinMinutes = Number.isFinite(binSizeMinutes)
        ? Math.max(1, Math.min(120, Math.floor(binSizeMinutes)))
        : 15;

      const timeRange = this.getRange(parsedEvents.map((event) => event.timestampMs));
      if (!timeRange) {
        this.errorMessage = "Unable to compute event timestamps from the CSV input.";
        return;
      }

      const binSizeMs = safeBinMinutes * 60 * 1000;
      const binCount = Math.max(
        1,
        Math.ceil((timeRange.max - timeRange.min + 1) / binSizeMs),
      );
      this.xAxisLabels = Array.from({ length: binCount }, (_, index) => {
        const labelTimeMs = timeRange.min + index * binSizeMs;
        return new Date(labelTimeMs).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      });

      const matrix = this.buildMatrix(parsedEvents, timeRange.min, binSizeMs, binCount);
      this.heatGrid = matrix.rows;
      this.maxValue = matrix.maxValue;
      if (!this.heatGrid.length) {
        this.errorMessage =
          "No rows available. Add detector-to-phase mappings and verify detector events are present.";
      }
    },
    parseDetectorEvents() {
      return this.inputData
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [timestampRaw, eventCodeRaw, parameterRaw] = line
            .split(",")
            .map((value) => value.trim());
          const eventCode = parseInt(eventCodeRaw, 10);
          const channel = parseInt(parameterRaw, 10);
          if (Number.isNaN(eventCode) || Number.isNaN(channel)) {
            return null;
          }

          const timestampInfo = this.convertTimestamp(timestampRaw);
          const timestampMs = timestampInfo?.MillisecFromEpoch;
          if (!Number.isFinite(timestampMs)) {
            return null;
          }

          const isOn = this.detectorOnCodes.has(eventCode);
          const isOff = this.detectorOffCodes.has(eventCode);
          if (!isOn && !isOff) {
            return null;
          }

          return {
            timestampMs,
            channel,
            eventCode,
            isOn,
            isOff,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampMs - b.timestampMs);
    },
    getRange(values) {
      const filteredValues = values.filter((value) => Number.isFinite(value));
      if (!filteredValues.length) {
        return null;
      }
      return {
        min: Math.min(...filteredValues),
        max: Math.max(...filteredValues),
      };
    },
    buildMatrix(events, startMs, binSizeMs, binCount) {
      if (this.metricMode === "duration") {
        return this.buildDurationMatrix(events, startMs, binSizeMs, binCount);
      }
      return this.buildCountMatrix(events, startMs, binSizeMs, binCount);
    },
    buildCountMatrix(events, startMs, binSizeMs, binCount) {
      const getRowKey = (event) => {
        if (this.rowMode === "phase") {
          return this.mappingByChannel[event.channel] ?? null;
        }
        return event.channel;
      };

      const rowValues = new Map();

      events.forEach((event) => {
        const includeEvent =
          this.eventFilter === "all" ||
          (this.eventFilter === "on" && event.isOn) ||
          (this.eventFilter === "off" && event.isOff);
        if (!includeEvent) {
          return;
        }

        const rowKey = getRowKey(event);
        if (rowKey === null || rowKey === undefined) {
          return;
        }

        const binIndex = Math.floor((event.timestampMs - startMs) / binSizeMs);
        if (binIndex < 0 || binIndex >= binCount) {
          return;
        }

        if (!rowValues.has(rowKey)) {
          rowValues.set(rowKey, Array.from({ length: binCount }, () => 0));
        }
        rowValues.get(rowKey)[binIndex] += 1;
      });

      return this.finalizeRows(rowValues);
    },
    buildDurationMatrix(events, startMs, binSizeMs, binCount) {
      const onStartByChannel = new Map();
      const rowValues = new Map();

      events.forEach((event) => {
        if (event.isOn) {
          onStartByChannel.set(event.channel, event.timestampMs);
          return;
        }

        if (!event.isOff) {
          return;
        }

        const startTime = onStartByChannel.get(event.channel);
        if (!Number.isFinite(startTime) || event.timestampMs <= startTime) {
          return;
        }

        const durationSeconds = (event.timestampMs - startTime) / 1000;
        onStartByChannel.delete(event.channel);

        const rowKey =
          this.rowMode === "phase"
            ? this.mappingByChannel[event.channel] ?? null
            : event.channel;

        if (rowKey === null || rowKey === undefined) {
          return;
        }

        const binIndex = Math.floor((event.timestampMs - startMs) / binSizeMs);
        if (binIndex < 0 || binIndex >= binCount) {
          return;
        }

        if (!rowValues.has(rowKey)) {
          rowValues.set(rowKey, Array.from({ length: binCount }, () => 0));
        }
        rowValues.get(rowKey)[binIndex] += durationSeconds;
      });

      return this.finalizeRows(rowValues);
    },
    finalizeRows(rowValues) {
      const rowKeys = Array.from(rowValues.keys()).sort((a, b) => a - b);
      const rows = rowKeys.map((rowKey) => {
        const values = rowValues.get(rowKey) || [];
        return {
          id: rowKey,
          leftLabel: this.rowMode === "phase" ? `Phase ${rowKey}` : `Ch ${rowKey}`,
          rightLabel:
            this.rowMode === "phase"
              ? this.getChannelListForPhase(rowKey)
              : this.getPhaseForChannel(rowKey),
          cells: values.map((value, binIndex) => ({ binIndex, value })),
        };
      });

      const maxValue = Math.max(
        0,
        ...rows.flatMap((row) => row.cells.map((cell) => Number(cell.value) || 0)),
      );

      return { rows, maxValue };
    },
    getChannelListForPhase(phase) {
      const channels = this.channelsByPhase[phase] || [];
      if (!channels.length) {
        return "Unmapped";
      }
      return channels
        .slice()
        .sort((a, b) => a - b)
        .map((channel) => `Ch ${channel}`)
        .join(", ");
    },
    getPhaseForChannel(channel) {
      const phase = this.mappingByChannel[channel];
      return Number.isFinite(phase) ? `Phase ${phase}` : "Unmapped";
    },
    getHeatColor(value) {
      if (!this.maxValue || value <= 0) {
        return "#f4f6f8";
      }

      const ratio = Math.min(1, value / this.maxValue);
      const hue = 120 - ratio * 120;
      const saturation = 85;
      const lightness = 92 - ratio * 42;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },
    buildCellTitle(row, cell) {
      const metricLabel =
        this.metricMode === "count"
          ? `${cell.value.toFixed(0)} detector events`
          : `${cell.value.toFixed(2)} seconds occupied`;
      return `${row.leftLabel}\n${this.xAxisLabels[cell.binIndex] || "Time bin"}\n${metricLabel}`;
    },
  },
};
</script>

<style scoped>
.error-message {
  color: #b00020;
  font-weight: 600;
}

.heat-map-scroll {
  overflow-x: auto;
}

.heat-map {
  min-width: 980px;
  display: grid;
  gap: 4px;
  align-items: stretch;
}

.axis-header {
  font-size: 0.85rem;
  font-weight: 700;
  color: #333;
  padding: 4px;
}

.x-axis-grid,
.row-cells {
  display: grid;
  gap: 1px;
}

.x-label {
  font-size: 0.7rem;
  text-align: center;
  color: #444;
  white-space: nowrap;
  transform: rotate(-45deg);
  transform-origin: center;
  height: 34px;
}

.row-label {
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  min-height: 16px;
}

.row-label.right {
  justify-content: flex-start;
  color: #555;
}

.cell {
  min-height: 16px;
  border: 1px solid #e2e8ee;
}
</style>
