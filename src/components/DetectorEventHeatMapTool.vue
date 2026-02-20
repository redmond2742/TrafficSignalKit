<template>
  <div>
    <v-card class="mb-4" variant="outlined">
      <v-card-title>Detector Occupancy Cycle Heat Map Inputs</v-card-title>
      <v-card-text>
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />

        <v-row class="mt-2">
          <v-col cols="12" md="4">
            <v-select
              v-model="sortMode"
              :items="sortOptions"
              item-title="label"
              item-value="value"
              label="Detector channel sort"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn color="primary" @click="buildCycleHeatMap">Build Occupancy Heat Map</v-btn>
          </v-col>
        </v-row>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </v-card-text>
    </v-card>

    <v-card v-if="cycleRows.length" variant="outlined">
      <v-card-title>Detector Occupancy Duration by Cycle</v-card-title>
      <v-card-text>
        <div class="cycle-legend mb-4">
          <span>Short occupancy</span>
          <div class="legend-bar"></div>
          <span>Long occupancy</span>
        </div>

        <div class="heat-map-shell">
          <div class="channel-axis" :style="channelAxisStyle">
            <div class="axis-header-cell">Cycle</div>
            <div v-for="channel in orderedChannels" :key="`head-${channel}`" class="channel-header">
              Ch {{ channel }}
            </div>
          </div>

          <div class="heat-map-scroll-y">
            <div class="heat-map-grid" :style="gridStyle">
              <template v-for="row in cycleRows" :key="`cycle-${row.cycleNumber}`">
                <div class="cycle-label">Cycle {{ row.cycleNumber }}</div>
                <div
                  v-for="channel in orderedChannels"
                  :key="`cell-${row.cycleNumber}-${channel}`"
                  class="cycle-cell"
                  :style="{ backgroundColor: getHeatColor(getCellDuration(row, channel)) }"
                  :title="buildCellTitle(row, channel)"
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
      sortMode: "highest",
      cycleRows: [],
      orderedChannels: [],
      maxDuration: 0,
      errorMessage: "",
      sortOptions: [
        { label: "Highest utilized channels first", value: "highest" },
        { label: "Lowest utilized channels first", value: "lowest" },
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
    channelAxisStyle() {
      return {
        gridTemplateColumns: `120px repeat(${this.orderedChannels.length || 1}, minmax(48px, 1fr))`,
      };
    },
    gridStyle() {
      return {
        gridTemplateColumns: `120px repeat(${this.orderedChannels.length || 1}, minmax(48px, 1fr))`,
      };
    },
  },
  methods: {
    buildCycleHeatMap() {
      this.errorMessage = "";
      this.cycleRows = [];
      this.orderedChannels = [];
      this.maxDuration = 0;

      const events = this.parseDetectorEvents();
      if (!events.length) {
        this.errorMessage = "No detector ON/OFF events were found in the input CSV data.";
        return;
      }

      const occupancyIntervals = this.pairDetectorOccupancy(events);
      if (!occupancyIntervals.length) {
        this.errorMessage = "No valid ON-to-OFF detector occupancy intervals were found.";
        return;
      }

      const cycleRows = this.buildCyclesFromIntervals(occupancyIntervals);
      if (!cycleRows.length) {
        this.errorMessage = "Unable to build cycle rows from detector occupancy intervals.";
        return;
      }

      this.cycleRows = cycleRows;
      this.orderedChannels = this.sortChannelsByUtilization(occupancyIntervals);
      this.maxDuration = Math.max(
        0,
        ...cycleRows.flatMap((row) =>
          this.orderedChannels.map((channel) => this.getCellDuration(row, channel)),
        ),
      );
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
            isOn,
            isOff,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.timestampMs - b.timestampMs);
    },
    pairDetectorOccupancy(events) {
      const onStartByChannel = new Map();
      const occupancyIntervals = [];

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

        occupancyIntervals.push({
          channel: event.channel,
          startMs: startTime,
          endMs: event.timestampMs,
          durationSeconds: (event.timestampMs - startTime) / 1000,
        });
        onStartByChannel.delete(event.channel);
      });

      return occupancyIntervals.sort((a, b) => a.startMs - b.startMs);
    },
    buildCyclesFromIntervals(intervals) {
      const cycles = [];
      let activeIntervals = [];
      let currentCycle = null;

      intervals.forEach((interval) => {
        activeIntervals = activeIntervals.filter((item) => item.endMs > interval.startMs);

        if (!currentCycle || activeIntervals.length === 0) {
          currentCycle = {
            cycleNumber: cycles.length + 1,
            cellsByChannel: {},
          };
          cycles.push(currentCycle);
        }

        if (!currentCycle.cellsByChannel[interval.channel]) {
          currentCycle.cellsByChannel[interval.channel] = [];
        }
        currentCycle.cellsByChannel[interval.channel].push(interval);
        activeIntervals.push(interval);
      });

      return cycles;
    },
    sortChannelsByUtilization(intervals) {
      const durationByChannel = intervals.reduce((lookup, interval) => {
        lookup[interval.channel] = (lookup[interval.channel] || 0) + interval.durationSeconds;
        return lookup;
      }, {});

      return Object.keys(durationByChannel)
        .map((value) => parseInt(value, 10))
        .sort((a, b) => {
          const delta = (durationByChannel[a] || 0) - (durationByChannel[b] || 0);
          if (delta === 0) {
            return a - b;
          }
          return this.sortMode === "highest" ? -delta : delta;
        });
    },
    getCellDuration(row, channel) {
      const intervals = row.cellsByChannel[channel] || [];
      return intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0);
    },
    formatTime(timestampMs) {
      return new Date(timestampMs).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
    buildCellTitle(row, channel) {
      const intervals = row.cellsByChannel[channel] || [];
      if (!intervals.length) {
        return `Cycle ${row.cycleNumber}\nChannel ${channel}\nNo occupancy in this cycle`;
      }

      const intervalLines = intervals
        .map((interval, index) => {
          return `${index + 1}. ${this.formatTime(interval.startMs)} to ${this.formatTime(
            interval.endMs,
          )} (${interval.durationSeconds.toFixed(2)} sec)`;
        })
        .join("\n");

      return `Cycle ${row.cycleNumber}\nChannel ${channel}\n${intervalLines}`;
    },
    getHeatColor(value) {
      if (!this.maxDuration || value <= 0) {
        return "#f3f5f7";
      }

      const ratio = Math.min(1, value / this.maxDuration);
      const hue = 210 - ratio * 210;
      const saturation = 82;
      const lightness = 96 - ratio * 46;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },
  },
};
</script>

<style scoped>
.error-message {
  color: #b00020;
  font-weight: 600;
}

.heat-map-shell {
  border: 1px solid #d7dee6;
  border-radius: 6px;
}

.channel-axis,
.heat-map-grid {
  display: grid;
  gap: 2px;
  align-items: stretch;
}

.channel-axis {
  background: #f7f9fb;
  border-bottom: 1px solid #d7dee6;
  padding: 4px;
}

.axis-header-cell,
.channel-header,
.cycle-label {
  font-size: 0.8rem;
  font-weight: 700;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.heat-map-scroll-y {
  max-height: 520px;
  overflow-y: auto;
  padding: 4px;
}

.cycle-label {
  font-weight: 600;
  color: #2f3b48;
}

.cycle-cell {
  min-height: 32px;
  border: 1px solid #e2e8ee;
  border-radius: 3px;
}

.cycle-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.legend-bar {
  width: 160px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(to right, hsl(210, 82%, 96%), hsl(0, 82%, 50%));
}
</style>
