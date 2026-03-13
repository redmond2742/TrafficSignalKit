<template>
  <div class="tsp-dashboard-view">
    <h1 class="h1-center-text dashboard-title">TSP Dashboard</h1>

    <div v-if="!dashboardReady" class="input-panel">
      <InputBox
        v-model="inputData"
        class="dashboard-input"
        defaultText="Paste high-resolution signal CSV data or upload files"
      />
      <v-btn color="primary" class="process-btn" size="small" @click="processDashboard">
        Process TSP Data
      </v-btn>
    </div>

    <div v-else class="dashboard-content">
      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">TSP Channels and Event Frequency</v-card-title>
        <v-card-text class="card-body">
          <v-table density="compact">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Total Events</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Service Start (TSP On)</th>
                <th>Service End (TSP Off)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in channelFrequencyRows" :key="`freq-${row.channel}`">
                <td>{{ row.channel }}</td>
                <td>{{ row.total }}</td>
                <td>{{ row.checkIn }}</td>
                <td>{{ row.checkOut }}</td>
                <td>{{ row.serviceStart }}</td>
                <td>{{ row.serviceEnd }}</td>
              </tr>
              <tr v-if="channelFrequencyRows.length === 0">
                <td colspan="6" class="empty-state">No TSP events found in the supplied data.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">TSP Enumeration Time Series</v-card-title>
        <v-card-text class="card-body">
          <Scatter v-if="tspEnumerationChartData.datasets.length" :data="tspEnumerationChartData" :options="tspEnumerationChartOptions" />
          <div v-else class="empty-state">No plottable TSP enumerations found.</div>
        </v-card-text>
      </v-card>

      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">TSP Events by Channel with Active Phase State</v-card-title>
        <v-card-text class="card-body">
          <Scatter v-if="tspPhaseChartData.datasets.length" :data="tspPhaseChartData" :options="tspPhaseChartOptions" />
          <div v-else class="empty-state">No TSP phase-state points available.</div>
        </v-card-text>
      </v-card>

      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">Channel Timing Metrics (Check-In/Out and TSP On/Off)</v-card-title>
        <v-card-text class="card-body">
          <v-table density="compact">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Metric</th>
                <th>Total Count</th>
                <th>Average (s)</th>
                <th>Std Dev (s)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in channelMetricSummaryRows" :key="`summary-${row.channel}-${row.metric}`">
                <td>{{ row.channel }}</td>
                <td>{{ row.metric }}</td>
                <td>{{ row.count }}</td>
                <td>{{ row.averageSec }}</td>
                <td>{{ row.stdDevSec }}</td>
              </tr>
              <tr v-if="channelMetricSummaryRows.length === 0">
                <td colspan="5" class="empty-state">No paired TSP timing events found for summary stats.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">Detailed TSP Event Pairs</v-card-title>
        <v-card-text class="card-body table-scroll">
          <v-table density="compact">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Metric</th>
                <th>Start Event</th>
                <th>Start Time</th>
                <th>End Event</th>
                <th>End Time</th>
                <th>Duration (s)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in detailedPairRows" :key="row.id">
                <td>{{ row.channel }}</td>
                <td>{{ row.metric }}</td>
                <td>{{ row.startEvent }}</td>
                <td>{{ row.startTime }}</td>
                <td>{{ row.endEvent }}</td>
                <td>{{ row.endTime }}</td>
                <td>{{ row.durationSec }}</td>
              </tr>
              <tr v-if="detailedPairRows.length === 0">
                <td colspan="7" class="empty-state">No matched TSP pairs were identified.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script>
import { Scatter } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  LinearScale,
} from "chart.js";
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";
import enumerationObj from "../data/enumerations.json";

ChartJS.register(Title, Tooltip, Legend, PointElement, LineElement, LinearScale);

const CHECK_IN_CODE = 112;
const CHECK_OUT_CODE = 115;
const SERVICE_START_CODE = 118;
const SERVICE_END_CODE = 119;
const CHANNEL_COLORS = [
  "rgba(25, 118, 210, 0.85)",
  "rgba(46, 125, 50, 0.85)",
  "rgba(198, 40, 40, 0.85)",
  "rgba(123, 31, 162, 0.85)",
  "rgba(251, 140, 0, 0.85)",
  "rgba(0, 121, 107, 0.85)",
  "rgba(93, 64, 55, 0.85)",
  "rgba(57, 73, 171, 0.85)",
  "rgba(216, 27, 96, 0.85)",
  "rgba(2, 136, 209, 0.85)",
];

export default {
  name: "TSPDashboard",
  components: {
    InputBox,
    Scatter,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      dashboardReady: false,
      tspEvents: [],
      phaseEvents: [],
      detailedPairRows: [],
      fileTimeBounds: null,
    };
  },
  computed: {
    tspLookup() {
      return enumerationObj.reduce((lookup, item) => {
        const code = parseInt(item.eventCode, 10);
        if (Number.isNaN(code)) {
          return lookup;
        }
        lookup[code] = item.eventDescriptor?.trim() || `Event ${code}`;
        return lookup;
      }, {});
    },
    tspEventCodes() {
      return enumerationObj
        .filter((item) => {
          const descriptor = item.eventDescriptor?.toLowerCase() || "";
          const parameterType = item.parameterType?.toLowerCase() || "";
          return descriptor.includes("tsp") || parameterType === "tsp";
        })
        .map((item) => parseInt(item.eventCode, 10))
        .filter((code) => !Number.isNaN(code));
    },
    phaseEventStates() {
      return enumerationObj.reduce((lookup, item) => {
        if (!item.parameterType || item.parameterType.toLowerCase() !== "phase") {
          return lookup;
        }
        const descriptor = item.eventDescriptor.trim().toLowerCase();
        const eventCode = parseInt(item.eventCode, 10);
        if (Number.isNaN(eventCode)) {
          return lookup;
        }

        if (descriptor.includes("phase begin green")) {
          lookup[eventCode] = "green";
        } else if (descriptor.includes("phase begin yellow clearance")) {
          lookup[eventCode] = "yellow";
        } else if (
          descriptor.includes("phase begin red clearance") ||
          descriptor.includes("phase end yellow clearance")
        ) {
          lookup[eventCode] = "red";
        } else if (
          descriptor.includes("phase end red clearance") ||
          descriptor.includes("phase inactive")
        ) {
          lookup[eventCode] = "inactive";
        }

        return lookup;
      }, {});
    },
    channelFrequencyRows() {
      const byChannel = new Map();
      this.tspEvents.forEach((event) => {
        if (!byChannel.has(event.parameterCode)) {
          byChannel.set(event.parameterCode, {
            channel: event.parameterCode,
            total: 0,
            checkIn: 0,
            checkOut: 0,
            serviceStart: 0,
            serviceEnd: 0,
          });
        }
        const row = byChannel.get(event.parameterCode);
        row.total += 1;
        if (event.eventCode === CHECK_IN_CODE) row.checkIn += 1;
        if (event.eventCode === CHECK_OUT_CODE) row.checkOut += 1;
        if (event.eventCode === SERVICE_START_CODE) row.serviceStart += 1;
        if (event.eventCode === SERVICE_END_CODE) row.serviceEnd += 1;
      });

      return Array.from(byChannel.values()).sort((a, b) => a.channel - b.channel);
    },
    enumerationLevels() {
      const levels = Array.from(new Set(this.tspEvents.map((event) => event.eventCode))).sort(
        (a, b) => a - b,
      );
      return levels;
    },
    tspEnumerationChartData() {
      const groupedByChannel = this.tspEvents.reduce((lookup, event) => {
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push({
          x: event.timestampMs,
          y: event.eventCode,
          parameterCode: event.parameterCode,
        });
        return lookup;
      }, {});

      return {
        datasets: Object.entries(groupedByChannel).map(([channel, points], index) => ({
          label: `Channel ${channel}`,
          data: points,
          pointRadius: 4,
          showLine: false,
          backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
        })),
      };
    },
    tspEnumerationChartOptions() {
      const codeToDescriptor = this.tspLookup;
      return {
        responsive: true,
        parsing: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label(context) {
                const code = context.parsed.y;
                const timestamp = new Date(context.parsed.x).toLocaleString();
                const channel = context.raw.parameterCode;
                return `${timestamp} · Channel ${channel} · ${code}: ${codeToDescriptor[code] || "TSP Event"}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            ticks: {
              callback(value) {
                return new Date(value).toLocaleTimeString();
              },
            },
            title: { display: true, text: "Time" },
          },
          y: {
            type: "linear",
            ticks: {
              callback: (value) => codeToDescriptor[value] || `Event ${value}`,
            },
            afterBuildTicks: (axis) => {
              axis.ticks = this.enumerationLevels.map((value) => ({ value }));
            },
            title: { display: true, text: "TSP Enumeration" },
          },
        },
      };
    },
    tspPhaseChartData() {
      const grouped = new Map();
      this.tspEvents.forEach((event) => {
        const channel = event.parameterCode;
        if (!grouped.has(channel)) {
          grouped.set(channel, []);
        }
        grouped.get(channel).push({
          x: event.timestampMs,
          y: event.parameterCode,
          eventCode: event.eventCode,
          phaseStateAtEvent: event.phaseStateAtEvent,
        });
      });

      return {
        datasets: Array.from(grouped.entries()).map(([channel, points], index) => ({
          label: `Channel ${channel}`,
          data: points,
          pointRadius: 4,
          showLine: false,
          backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
        })),
      };
    },
    tspPhaseChartOptions() {
      const codeToDescriptor = this.tspLookup;
      const channels = Array.from(new Set(this.tspEvents.map((event) => event.parameterCode))).sort(
        (a, b) => a - b,
      );

      return {
        responsive: true,
        parsing: false,
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const timestamp = new Date(context.parsed.x).toLocaleString();
                const channel = context.parsed.y;
                const code = context.raw.eventCode;
                const phaseState = context.raw.phaseStateAtEvent || "unknown";
                return `${timestamp} · Channel ${channel} · ${codeToDescriptor[code] || `Event ${code}`} · Phase ${phaseState}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            ticks: {
              callback(value) {
                return new Date(value).toLocaleTimeString();
              },
            },
            title: { display: true, text: "Time" },
          },
          y: {
            type: "linear",
            ticks: {
              callback: (value) => `Channel ${value}`,
            },
            afterBuildTicks: (axis) => {
              axis.ticks = channels.map((value) => ({ value }));
            },
            title: { display: true, text: "TSP Channel" },
          },
        },
      };
    },
    channelMetricSummaryRows() {
      const grouped = this.detailedPairRows.reduce((lookup, row) => {
        const key = `${row.channel}-${row.metric}`;
        if (!lookup[key]) {
          lookup[key] = {
            channel: row.channel,
            metric: row.metric,
            values: [],
          };
        }
        lookup[key].values.push(row.durationSecValue);
        return lookup;
      }, {});

      return Object.values(grouped)
        .map((entry) => {
          const avg = this.average(entry.values);
          return {
            channel: entry.channel,
            metric: entry.metric,
            count: entry.values.length,
            averageSec: avg.toFixed(2),
            stdDevSec: this.stdDev(entry.values, avg).toFixed(2),
          };
        })
        .sort((a, b) => (a.channel === b.channel ? a.metric.localeCompare(b.metric) : a.channel - b.channel));
    },
  },
  methods: {
    processDashboard() {
      const lines = this.inputData.split("\n");
      const tspEvents = [];
      const phaseEvents = [];
      let minTimestampMs = Number.POSITIVE_INFINITY;
      let maxTimestampMs = Number.NEGATIVE_INFINITY;

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith("signals:")) {
          return;
        }

        const [timestamp, eventCodeRaw, parameterRaw] = trimmedLine.split(",").map((value) => value.trim());
        const timestampInfo = this.convertTimestamp(timestamp);
        if (!timestampInfo || Number.isNaN(timestampInfo.MillisecFromEpoch)) {
          return;
        }
        minTimestampMs = Math.min(minTimestampMs, timestampInfo.MillisecFromEpoch);
        maxTimestampMs = Math.max(maxTimestampMs, timestampInfo.MillisecFromEpoch);

        const eventCode = parseInt(eventCodeRaw, 10);
        const parameterCode = parseInt(parameterRaw, 10);
        if (Number.isNaN(eventCode) || Number.isNaN(parameterCode)) {
          return;
        }

        const baseEvent = {
          id: `${timestampInfo.MillisecFromEpoch}-${eventCode}-${parameterCode}-${index}`,
          timestampMs: timestampInfo.MillisecFromEpoch,
          timestampText: timestampInfo.humanReadable,
          eventCode,
          parameterCode,
          description: this.tspLookup[eventCode] || `Event ${eventCode}`,
        };

        if (this.tspEventCodes.includes(eventCode)) {
          tspEvents.push(baseEvent);
        }

        const phaseState = this.phaseEventStates[eventCode];
        if (phaseState) {
          phaseEvents.push({
            ...baseEvent,
            phaseState,
            phase: parameterCode,
          });
        }
      });

      tspEvents.sort((a, b) => a.timestampMs - b.timestampMs);
      phaseEvents.sort((a, b) => a.timestampMs - b.timestampMs);
      this.fileTimeBounds = Number.isFinite(minTimestampMs) && Number.isFinite(maxTimestampMs)
        ? {
            minTimestampMs,
            maxTimestampMs,
            minTimestampText: new Date(minTimestampMs).toLocaleString(),
            maxTimestampText: new Date(maxTimestampMs).toLocaleString(),
          }
        : null;

      this.phaseEvents = phaseEvents;
      this.tspEvents = tspEvents.map((event) => ({
        ...event,
        phaseStateAtEvent: this.lookupPhaseStateAtTime(event.parameterCode, event.timestampMs),
      }));
      this.detailedPairRows = this.buildDetailedPairRows();
      this.dashboardReady = true;
    },
    lookupPhaseStateAtTime(channel, timestampMs) {
      const channelPhaseEvents = this.phaseEvents.filter((event) => event.phase === channel);
      if (!channelPhaseEvents.length) {
        return "unknown";
      }

      let active = "unknown";
      channelPhaseEvents.forEach((event) => {
        if (event.timestampMs <= timestampMs) {
          active = event.phaseState;
        }
      });

      return active;
    },
    buildDetailedPairRows() {
      const pairDefinitions = [
        {
          startCode: CHECK_IN_CODE,
          endCode: CHECK_OUT_CODE,
          metric: "Check In → Check Out",
        },
        {
          startCode: SERVICE_START_CODE,
          endCode: SERVICE_END_CODE,
          metric: "TSP On → TSP Off",
        },
      ];

      const rows = [];
      const byChannel = this.tspEvents.reduce((lookup, event) => {
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push(event);
        return lookup;
      }, {});

      Object.entries(byChannel).forEach(([channel, events]) => {
        pairDefinitions.forEach((definition) => {
          const starts = [];
          events.forEach((event) => {
            if (event.eventCode === definition.startCode) {
              starts.push(event);
            }
            if (event.eventCode === definition.endCode) {
              if (starts.length) {
                const startEvent = starts.shift();
                const durationSecValue = (event.timestampMs - startEvent.timestampMs) / 1000;
                if (durationSecValue >= 0) {
                  rows.push({
                    id: `${channel}-${definition.metric}-${startEvent.id}-${event.id}`,
                    channel: Number(channel),
                    metric: definition.metric,
                    startEvent: `${definition.startCode} ${this.tspLookup[definition.startCode] || ""}`.trim(),
                    startTime: startEvent.timestampText,
                    endEvent: `${definition.endCode} ${this.tspLookup[definition.endCode] || ""}`.trim(),
                    endTime: event.timestampText,
                    durationSecValue,
                    durationSec: durationSecValue.toFixed(2),
                    startTimestampMs: startEvent.timestampMs,
                  });
                }
              } else if (this.fileTimeBounds) {
                const estimatedDuration = (event.timestampMs - this.fileTimeBounds.minTimestampMs) / 1000;
                if (estimatedDuration >= 0) {
                  rows.push({
                    id: `${channel}-${definition.metric}-estimated-start-${event.id}`,
                    channel: Number(channel),
                    metric: definition.metric,
                    startEvent: `${definition.startCode} ${this.tspLookup[definition.startCode] || ""} (missing)`
                      .trim(),
                    startTime: `${this.fileTimeBounds.minTimestampText} (+)`,
                    endEvent: `${definition.endCode} ${this.tspLookup[definition.endCode] || ""}`.trim(),
                    endTime: event.timestampText,
                    durationSecValue: estimatedDuration,
                    durationSec: `${estimatedDuration.toFixed(2)}+`,
                    startTimestampMs: this.fileTimeBounds.minTimestampMs,
                  });
                }
              }
            }
          });

          if (this.fileTimeBounds) {
            starts.forEach((startEvent) => {
              const estimatedDuration = (this.fileTimeBounds.maxTimestampMs - startEvent.timestampMs) / 1000;
              if (estimatedDuration >= 0) {
                rows.push({
                  id: `${channel}-${definition.metric}-${startEvent.id}-estimated-end`,
                  channel: Number(channel),
                  metric: definition.metric,
                  startEvent: `${definition.startCode} ${this.tspLookup[definition.startCode] || ""}`.trim(),
                  startTime: startEvent.timestampText,
                  endEvent: `${definition.endCode} ${this.tspLookup[definition.endCode] || ""} (missing)`
                    .trim(),
                  endTime: `${this.fileTimeBounds.maxTimestampText} (+)`,
                  durationSecValue: estimatedDuration,
                  durationSec: `${estimatedDuration.toFixed(2)}+`,
                  startTimestampMs: startEvent.timestampMs,
                });
              }
            });
          }
        });
      });

      return rows.sort((a, b) => (a.channel === b.channel ? a.startTimestampMs - b.startTimestampMs : a.channel - b.channel));
    },
    average(values) {
      if (!values.length) {
        return 0;
      }
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    },
    stdDev(values, mean = this.average(values)) {
      if (values.length < 2) {
        return 0;
      }
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance);
    },
  },
};
</script>

<style scoped>
.tsp-dashboard-view {
  padding: 8px;
}

.dashboard-title {
  font-size: 1.2rem;
  margin-bottom: 8px;
}

.input-panel {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.process-btn {
  align-self: flex-start;
}

.tool-card {
  margin-bottom: 10px;
}

.card-title {
  font-size: 0.95rem;
  padding: 10px 14px 4px;
}

.card-body {
  padding: 10px 14px 14px;
}

.empty-state {
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.table-scroll {
  max-height: 340px;
  overflow: auto;
}
</style>
