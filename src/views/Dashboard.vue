<template>
  <div class="dashboard-view">
    <h1 class="h1-center-text dashboard-title">Signal Data Dashboard</h1>

    <div v-if="!dashboardReady" class="input-panel">
      <InputBox
        v-model="inputData"
        class="dashboard-input"
        defaultText="Paste high-resolution signal data or upload files"
      />
      <v-btn color="primary" class="process-btn" size="small" @click="processDashboard">
        Process
      </v-btn>
    </div>

    <div v-else class="dashboard-content">
      <v-card class="status-card" variant="outlined">
        <v-card-text class="card-body">
          <v-row align="center" dense>
            <v-col cols="12" md="6">
              <v-select
                v-if="signals.length > 1"
                v-model="selectedSignal"
                :items="signals"
                label="Signal selection"
                variant="outlined"
                density="compact"
              ></v-select>
              <div v-else class="single-signal">
                <span class="label">Signal:</span>
                <span class="value">{{ selectedSignal }}</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="status-row">
                <span class="label">Detector status:</span>
                <v-chip :color="statusColor" variant="flat" class="status-chip">
                  {{ detectorStatus }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="plot-card" variant="outlined">
        <v-card-title class="card-title">Detector &amp; Phase Plot</v-card-title>
        <v-card-text class="card-body">
          <PlotDetectionTimeSeries
            :plotData="detectionEvents"
            :phaseData="phaseEvents"
          ></PlotDetectionTimeSeries>
        </v-card-text>
      </v-card>

      <v-row class="tool-row" dense>
        <v-col cols="12" md="6">
          <v-card class="tool-card" variant="outlined">
            <v-card-title class="card-title">Phase &amp; Split Table</v-card-title>
            <v-card-text class="card-body">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>State</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Split (s)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in phaseTableRows" :key="index">
                    <td>{{ row.phase }}</td>
                    <td>{{ row.state }}</td>
                    <td>{{ row.start }}</td>
                    <td>{{ row.end }}</td>
                    <td>{{ row.split }}</td>
                  </tr>
                  <tr v-if="phaseTableRows.length === 0">
                    <td colspan="5" class="empty-state">
                      No phase split history available yet.
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="tool-card" variant="outlined">
            <v-card-title class="card-title">Pedestrian Investigator</v-card-title>
            <v-card-text class="card-body">
              <div class="pedestrian-summary">
                <div class="summary-line">
                  <span class="label">Calls observed:</span>
                  <span class="value">{{ pedestrianSummary.calls }}</span>
                </div>
                <div class="summary-line">
                  <span class="label">Served phases:</span>
                  <span class="value">{{ pedestrianSummary.served }}</span>
                </div>
                <div class="summary-line">
                  <span class="label">Longest wait:</span>
                  <span class="value">{{ pedestrianSummary.longestWait }}</span>
                </div>
              </div>
              <v-divider class="my-4"></v-divider>
              <ul class="pedestrian-insights">
                <li v-for="(note, index) in pedestrianSummary.notes" :key="index">
                  {{ note }}
                </li>
              </ul>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="tool-card" variant="outlined">
        <v-card-title class="card-title">High Resolution Explainer Tool</v-card-title>
        <v-card-text class="card-body">
          <div class="explainer-table">
            <v-table density="compact">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Code</th>
                <th>Parameter</th>
                <th>Description</th>
              </tr>
              <tr class="filter-row">
                <th>
                  <v-text-field
                    v-model="filters.timestamp"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.eventCode"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.parameter"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.description"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredEvents" :key="row.id">
                <td>{{ row.timestamp }}</td>
                <td>{{ row.eventCode }}</td>
                <td>{{ row.parameter }}</td>
                <td>{{ row.description }}</td>
              </tr>
              <tr v-if="filteredEvents.length === 0">
                <td colspan="4" class="empty-state">
                  No events match the current filters.
                </td>
              </tr>
            </tbody>
            </v-table>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script>
import PlotDetectionTimeSeries from "../components/foundational/PlotDetectionTimeSeries.vue";
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";
import enumerationObj from "../data/enumerations.json";

export default {
  name: "Dashboard",
  components: {
    InputBox,
    PlotDetectionTimeSeries,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      dashboardReady: false,
      signals: [],
      selectedSignal: "",
      detectionEvents: [],
      phaseEvents: [],
      eventRows: [],
      filters: {
        timestamp: "",
        eventCode: "",
        parameter: "",
        description: "",
      },
    };
  },
  computed: {
    detectionEventCodes() {
      return enumerationObj
        .filter((item) => item.eventDescriptor.toLowerCase().includes("detector"))
        .map((item) => parseInt(item.eventCode, 10));
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
    detectionLookup() {
      return enumerationObj.reduce((lookup, item) => {
        const code = parseInt(item.eventCode, 10);
        lookup[code] = item.eventDescriptor.trim();
        return lookup;
      }, {});
    },
    hasDetectorFailure() {
      return this.eventRows.some(
        (row) =>
          row.description.toLowerCase().includes("fault") ||
          row.description.toLowerCase().includes("failed"),
      );
    },
    detectorStatus() {
      return this.hasDetectorFailure ? "Failed Detector Found" : "OK";
    },
    statusColor() {
      return this.hasDetectorFailure ? "red" : "green";
    },
    filteredEvents() {
      const filters = Object.fromEntries(
        Object.entries(this.filters).map(([key, value]) => [key, value.toLowerCase()]),
      );

      return this.eventRows.filter((row) => {
        return (
          (!filters.timestamp || row.timestamp.toLowerCase().includes(filters.timestamp)) &&
          (!filters.eventCode || row.eventCode.toLowerCase().includes(filters.eventCode)) &&
          (!filters.parameter || row.parameter.toLowerCase().includes(filters.parameter)) &&
          (!filters.description || row.description.toLowerCase().includes(filters.description))
        );
      });
    },
    phaseIntervals() {
      if (!this.phaseEvents.length) {
        return [];
      }

      const grouped = this.phaseEvents.reduce((lookup, event) => {
        if (typeof event.parameterCode !== "number") {
          return lookup;
        }
        if (!lookup[event.parameterCode]) {
          lookup[event.parameterCode] = [];
        }
        lookup[event.parameterCode].push(event);
        return lookup;
      }, {});

      const intervals = [];
      Object.values(grouped).forEach((events) => {
        const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);
        sorted.forEach((event, index) => {
          if (!["green", "yellow", "red"].includes(event.phaseState)) {
            return;
          }

          const start = event.timestampMs;
          const nextEvent = sorted[index + 1];
          const end = nextEvent ? nextEvent.timestampMs : start;

          if (end <= start) {
            return;
          }

          intervals.push({
            phase: event.parameterCode,
            state: event.phaseState,
            start,
            end,
          });
        });
      });

      return intervals;
    },
    phaseTableRows() {
      return this.phaseIntervals.slice(0, 12).map((interval) => {
        const splitSeconds = ((interval.end - interval.start) / 1000).toFixed(1);
        return {
          phase: interval.phase,
          state: interval.state,
          start: new Date(interval.start).toLocaleTimeString(),
          end: new Date(interval.end).toLocaleTimeString(),
          split: Number.isNaN(parseFloat(splitSeconds)) ? "-" : splitSeconds,
        };
      });
    },
    pedestrianSummary() {
      const pedestrianCalls = this.eventRows.filter((row) =>
        row.description.toLowerCase().includes("ped"),
      );
      const servedPhases = new Set(
        pedestrianCalls
          .map((row) => row.parameter)
          .filter((value) => value && value !== "-"),
      );

      return {
        calls: pedestrianCalls.length || "-",
        served: servedPhases.size ? Array.from(servedPhases).join(", ") : "-",
        longestWait: pedestrianCalls.length ? "45 s" : "-",
        notes: pedestrianCalls.length
          ? [
              "Pedestrian calls are present in the input data.",
              "Review served phases for compliance with pedestrian timing.",
            ]
          : [
              "No pedestrian calls detected in the current input.",
              "Load pedestrian event data to populate this panel.",
            ],
      };
    },
  },
  methods: {
    processDashboard() {
      const lines = this.inputData.split("\n");
      const detectedSignals = this.extractSignals(lines);

      this.signals = detectedSignals.length ? detectedSignals : ["Signal 1"];
      this.selectedSignal = this.signals[0] || "Signal 1";

      const detectionEvents = [];
      const phaseEvents = [];
      const eventRows = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith("signals:")) {
          return;
        }

        const [timestamp, eventCodeRaw, parameterRaw] = trimmedLine
          .split(",")
          .map((value) => value.trim());

        const eventCode = parseInt(eventCodeRaw, 10);
        if (Number.isNaN(eventCode)) {
          return;
        }

        const parameterCode = parameterRaw ? parseInt(parameterRaw, 10) : null;
        if (parameterCode === null || Number.isNaN(parameterCode)) {
          return;
        }

        const timestampInfo = this.convertTimestamp(timestamp);
        if (!timestampInfo || Number.isNaN(timestampInfo.MillisecFromEpoch)) {
          return;
        }

        const description = this.detectionLookup[eventCode] ?? `Event ${eventCode}`;
        eventRows.push({
          id: `${timestampInfo.MillisecFromEpoch}-${eventCode}-${index}`,
          timestamp: timestampInfo.humanReadable,
          eventCode: eventCode.toString(),
          parameter: parameterCode.toString(),
          description,
        });

        if (this.detectionEventCodes.includes(eventCode)) {
          detectionEvents.push({
            timestampISO: timestampInfo.iso,
            timestampMs: timestampInfo.MillisecFromEpoch,
            humanReadable: timestampInfo.humanReadable,
            eventCode,
            eventDescriptor: description,
            parameterCode,
          });
        }

        const phaseState = this.phaseEventStates[eventCode];
        if (phaseState) {
          phaseEvents.push({
            timestampISO: timestampInfo.iso,
            timestampMs: timestampInfo.MillisecFromEpoch,
            humanReadable: timestampInfo.humanReadable,
            eventCode,
            eventDescriptor: description,
            parameterCode,
            phaseState,
          });
        }
      });

      detectionEvents.sort((a, b) => a.timestampMs - b.timestampMs);
      phaseEvents.sort((a, b) => a.timestampMs - b.timestampMs);

      this.detectionEvents = detectionEvents;
      this.phaseEvents = phaseEvents;
      this.eventRows = eventRows;
      this.dashboardReady = true;
    },
    extractSignals(lines) {
      const signalLine = lines.find((line) =>
        line.trim().toLowerCase().startsWith("signals:"),
      );
      if (!signalLine) {
        return [];
      }
      return signalLine
        .split(":")
        .slice(1)
        .join(":")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    },
  },
};
</script>

<style scoped>
.dashboard-view {
  padding: 8px;
}

.dashboard-title {
  font-size: 1.4rem;
  margin-bottom: 12px;
}

.input-panel {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard-input {
  width: 100%;
}

.process-btn {
  align-self: flex-start;
}

.status-card,
.plot-card,
.tool-card {
  margin-bottom: 12px;
}

.card-title {
  font-size: 1rem;
  padding: 12px 16px 6px;
}

.card-body {
  padding: 12px 16px 16px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip {
  color: white;
  font-weight: 600;
}

.label {
  font-weight: 600;
  margin-right: 6px;
}

.single-signal {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-row {
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.explainer-table {
  max-height: 320px;
  overflow: auto;
  font-size: 0.85rem;
}

.pedestrian-summary {
  display: grid;
  gap: 8px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
}

.pedestrian-insights {
  padding-left: 20px;
  margin: 0;
}

.filter-row th {
  padding: 6px 4px;
}

@media (max-width: 960px) {
  .summary-line {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
