<template>
  <div class="dashboard-view">
    <h1 class="h1-center-text dashboard-title">{{ dashboardTitle }}</h1>

    <div v-if="dashboardReady" class="file-summary">
      <div class="file-summary-item">
        <span class="label">File date/time range:</span>
        <span>{{ fileDateRangeText }}</span>
      </div>
    </div>

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
                <v-chip
                  :color="statusColor"
                  :variant="statusVariant"
                  class="status-chip"
                >
                  {{ detectorStatusText }}
                </v-chip>
              </div>
              <div class="preemption-status">
                <div class="preemption-title">Preemption events</div>
                <div
                  v-if="preemptionEvents.length"
                  class="preemption-box preemption-box--alert"
                >
                  <div class="preemption-summary">Preemption detected</div>
                  <div class="preemption-chips">
                    <v-chip
                      v-for="event in preemptionEvents"
                      :key="event.id"
                      class="preemption-chip"
                      color="red"
                      variant="tonal"
                      size="small"
                    >
                      {{ event.timestamp }} · Phase/Channel {{ event.parameter }}
                    </v-chip>
                  </div>
                </div>
                <div v-else class="preemption-box preemption-box--clear">
                  No preemptions detected.
                </div>
              </div>
              <div v-if="failedDetectorRows.length" class="failed-detectors">
                <div class="failed-detectors-title">Failed detectors</div>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Code</th>
                      <th>Detector</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in failedDetectorRows" :key="row.id">
                      <td>{{ row.timestamp }}</td>
                      <td>{{ row.eventCode }}</td>
                      <td>{{ row.parameter }}</td>
                      <td>{{ row.description }}</td>
                    </tr>
                  </tbody>
                </v-table>
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

      <div class="stacked-tools">
        <v-card class="tool-card" variant="outlined">
          <v-card-title class="card-title">Phase &amp; Split Table</v-card-title>
          <v-card-text class="card-body">
            <ProcessSplitHistory
              ref="splitHistory"
              :inputData="inputData"
              :hideInput="true"
              @phaseDurations="updateSplitHistory"
            ></ProcessSplitHistory>
            <TableDisplaySplit :tableData="splitHistoryRows"></TableDisplaySplit>
          </v-card-text>
        </v-card>
        <v-card class="tool-card" variant="outlined">
          <v-card-title class="card-title">Phase Termination Reasons</v-card-title>
          <TerminationReasonTable
            class="card-body"
            :tableData="splitHistoryRows"
          ></TerminationReasonTable>
        </v-card>
        <v-card class="tool-card" variant="outlined">
          <v-card-title class="card-title">Pedestrian Investigator</v-card-title>
          <v-card-text class="card-body">
            <PedestrianInvestigator
              ref="pedestrianInvestigator"
              :embedded="true"
              :inputData="inputData"
              :signalId="selectedSignal"
            ></PedestrianInvestigator>
          </v-card-text>
        </v-card>
      </div>

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
                    class="filter-field"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.eventCode"
                    class="filter-field"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.parameter"
                    class="filter-field"
                    label="Filter"
                    variant="outlined"
                    density="compact"
                    hide-details
                  ></v-text-field>
                </th>
                <th>
                  <v-text-field
                    v-model="filters.description"
                    class="filter-field"
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
import ProcessSplitHistory from "../components/ProcessSplitHistory.vue";
import TableDisplaySplit from "../components/foundational/TableDisplaySplit.vue";
import TerminationReasonTable from "../components/foundational/TerminationReasonTable.vue";
import PedestrianInvestigator from "./PedestrianInvestigator.vue";
import convertTime from "../mixins/convertTime";
import enumerationObj from "../data/enumerations.json";

export default {
  name: "Dashboard",
  components: {
    InputBox,
    PlotDetectionTimeSeries,
    ProcessSplitHistory,
    TableDisplaySplit,
    TerminationReasonTable,
    PedestrianInvestigator,
  },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      dashboardReady: false,
      dashboardTitle: "Signal Data Dashboard",
      fileRangeStart: null,
      fileRangeEnd: null,
      signals: [],
      selectedSignal: "",
      detectionEvents: [],
      phaseEvents: [],
      eventRows: [],
      splitHistoryRows: [],
      preemptionEvents: [],
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
    preemptionEventCodes() {
      const codes = [];
      for (let code = 100; code <= 111; code += 1) {
        codes.push(code);
      }
      codes.push(116);
      return codes;
    },
    hasDetectorFailure() {
      return this.eventRows.some(
        (row) =>
          row.description.toLowerCase().includes("fault") ||
          row.description.toLowerCase().includes("failed"),
      );
    },
    failedDetectorRows() {
      return this.eventRows.filter(
        (row) =>
          row.description.toLowerCase().includes("fault") ||
          row.description.toLowerCase().includes("failed"),
      );
    },
    detectorStatusText() {
      return this.hasDetectorFailure
        ? "Failed detector found"
        : "No Failed Detectors Found";
    },
    statusColor() {
      return this.hasDetectorFailure ? "red" : "green";
    },
    statusVariant() {
      return "outlined";
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
    fileDateRangeText() {
      if (!this.fileRangeStart || !this.fileRangeEnd) {
        return "Unavailable";
      }

      return `${this.fileRangeStart} - ${this.fileRangeEnd}`;
    },
  },
  methods: {
    updateSplitHistory(data) {
      this.splitHistoryRows = data;
    },
    processDashboard() {
      const lines = this.inputData.split("\n");
      const detectedSignals = this.extractSignals(lines);

      this.signals = detectedSignals.length ? detectedSignals : ["Signal 1"];
      this.selectedSignal = this.signals[0] || "Signal 1";

      const detectionEvents = [];
      const phaseEvents = [];
      const eventRows = [];
      const preemptionEvents = [];
      const parsedTimestamps = [];

      this.dashboardTitle = "Signal Data Dashboard";
      this.fileRangeStart = null;
      this.fileRangeEnd = null;

      const intersectionId = this.extractIntersectionId(lines);
      if (intersectionId) {
        this.dashboardTitle = `Intersection ${intersectionId} Dashboard`;
      }

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.toLowerCase().startsWith("signals:")) {
          return;
        }

        const [timestamp, eventCodeRaw, parameterRaw] = trimmedLine
          .split(",")
          .map((value) => value.trim());

        const timestampInfo = this.convertTimestamp(timestamp);
        if (!timestampInfo || Number.isNaN(timestampInfo.MillisecFromEpoch)) {
          return;
        }

        parsedTimestamps.push(timestampInfo);

        const eventCode = parseInt(eventCodeRaw, 10);
        if (Number.isNaN(eventCode)) {
          return;
        }

        const parameterCode = parameterRaw ? parseInt(parameterRaw, 10) : null;
        if (parameterCode === null || Number.isNaN(parameterCode)) {
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

        if (this.preemptionEventCodes.includes(eventCode)) {
          preemptionEvents.push({
            id: `${timestampInfo.MillisecFromEpoch}-${eventCode}-${parameterCode}`,
            timestamp: timestampInfo.humanReadable,
            timestampMs: timestampInfo.MillisecFromEpoch,
            parameter: parameterCode.toString(),
          });
        }

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
      preemptionEvents.sort((a, b) => a.timestampMs - b.timestampMs);

      if (parsedTimestamps.length) {
        parsedTimestamps.sort((a, b) => a.MillisecFromEpoch - b.MillisecFromEpoch);
        this.fileRangeStart = parsedTimestamps[0].humanReadable;
        this.fileRangeEnd = parsedTimestamps[parsedTimestamps.length - 1].humanReadable;
      }

      this.detectionEvents = detectionEvents;
      this.phaseEvents = phaseEvents;
      this.eventRows = eventRows;
      this.preemptionEvents = preemptionEvents;
      this.dashboardReady = true;
      this.$nextTick(() => {
        if (this.$refs.splitHistory) {
          this.$refs.splitHistory.calculatePhaseDurations();
        }
        if (this.$refs.pedestrianInvestigator) {
          this.$refs.pedestrianInvestigator.processData();
        }
      });
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
    extractIntersectionId(lines) {
      const intersectionLine = lines.find((line) => {
        const parts = line.split(",").map((value) => value.trim().toLowerCase());
        return parts[2] === "intersection#";
      });

      if (!intersectionLine) {
        return "";
      }

      const parts = intersectionLine.split(",").map((value) => value.trim());
      return parts[3] || "";
    },
  },
};
</script>

<style scoped>
.dashboard-view {
  padding: 8px;
  font-size: 0.9rem;
}

.dashboard-title {
  font-size: 1.2rem;
  margin-bottom: 8px;
}

.file-summary {
  max-width: 900px;
  margin: 0 auto 10px;
  font-size: 0.85rem;
}

.file-summary-item {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
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
  margin-bottom: 10px;
}

.card-title {
  font-size: 0.95rem;
  padding: 10px 14px 4px;
}

.card-body {
  padding: 10px 14px 14px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip {
  font-weight: 600;
  text-transform: none;
}

.failed-detectors {
  margin-top: 10px;
}

.failed-detectors-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.preemption-status {
  margin-top: 10px;
}

.preemption-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.preemption-box {
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.82rem;
}

.preemption-box--clear {
  border: 1px solid rgba(46, 125, 50, 0.4);
  background: rgba(46, 125, 50, 0.08);
  color: #1b5e20;
  font-weight: 600;
}

.preemption-box--alert {
  border: 1px solid rgba(211, 47, 47, 0.35);
  background: rgba(211, 47, 47, 0.06);
}

.preemption-summary {
  font-weight: 600;
  margin-bottom: 6px;
  color: #b71c1c;
}

.preemption-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preemption-chip {
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

.stacked-tools {
  max-width: 1200px;
  margin: 8px auto 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stacked-tools :deep(.summary-wrapper h2) {
  font-size: 1rem;
  margin-bottom: 6px;
}

.stacked-tools :deep(.summary-table),
.stacked-tools :deep(.v-table) {
  font-size: 0.85rem;
}

.stacked-tools :deep(.summary-filter-input) {
  font-size: 0.75rem;
  padding: 4px 6px;
}

.empty-state {
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.explainer-table {
  max-height: 300px;
  overflow: auto;
  font-size: 0.8rem;
}

.explainer-table thead tr:first-child th {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 2;
}

.explainer-table thead tr.filter-row th {
  position: sticky;
  top: 34px;
  background: #fff;
  z-index: 1;
}

.filter-row th {
  padding: 6px 4px;
}

.filter-field :deep(.v-field) {
  min-height: 28px;
  font-size: 0.75rem;
}

.filter-field :deep(.v-field__input) {
  padding-top: 2px;
  padding-bottom: 2px;
  min-height: 24px;
}

.filter-field :deep(.v-label) {
  font-size: 0.7rem;
}
</style>
