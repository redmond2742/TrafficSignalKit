<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Signal Offset Calculator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Signal Offset Calculator" value="about">
          <v-expansion-panel-text>
            This tool compares two traffic signal controllers and calculates
            the offset between coordinated phases for every cycle in the
            high-resolution data. Paste in both data sets, pick the coordinated
            phase for each signal, and choose the event you want to align
            (start of green, start of yellow, or beginning of red).
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Detailed Explanation" value="details">
          <v-expansion-panel-text>
            Offsets are calculated by pairing each coordinated phase event in
            the left signal with the same event in the right signal, in order.
            The offset is the time difference (right minus left) in seconds.
            The results table shows a cycle-by-cycle offset and summary
            statistics for quick checks.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example Usage" value="example">
          <v-expansion-panel-text>
            <pre>
1. Paste left signal high-resolution CSV data.
2. Paste right signal high-resolution CSV data.
3. Select the coordinated phase for each signal.
4. Choose the reference event (start green, start yellow, beginning of red).
5. Click Calculate Offsets to review the cycle-by-cycle table.
            </pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="pa-4 mt-6" variant="outlined">
      <v-row align="center">
        <v-col cols="12" md="5">
          <h2 class="section-title">Left Signal (Reference)</h2>
          <v-select
            v-model="leftPhase"
            :items="phaseOptions"
            label="Coordinated phase"
            density="compact"
          ></v-select>
          <div class="grow-wrap">
            <InputBox
              v-model="leftSignalData"
              :defaultText="leftTextboxDefault"
            />
          </div>
        </v-col>

        <v-col
          cols="12"
          md="2"
          class="d-flex align-center justify-center"
        >
          <v-btn
            color="secondary"
            variant="outlined"
            class="swap-button"
            @click="swapSignals"
          >
            &gt;&gt;
          </v-btn>
        </v-col>

        <v-col cols="12" md="5">
          <h2 class="section-title">Right Signal (Offset)</h2>
          <v-select
            v-model="rightPhase"
            :items="phaseOptions"
            label="Coordinated phase"
            density="compact"
          ></v-select>
          <div class="grow-wrap">
            <InputBox
              v-model="rightSignalData"
              :defaultText="rightTextboxDefault"
            />
          </div>
        </v-col>
      </v-row>

      <v-row class="mt-2" align="center">
        <v-col cols="12" md="6">
          <v-select
            v-model="eventBasis"
            :items="eventOptions"
            item-title="label"
            item-value="value"
            label="Offset reference event"
            density="compact"
          ></v-select>
        </v-col>
        <v-col cols="12" md="6" class="d-flex justify-end">
          <v-btn color="primary" @click="calculateOffsets">
            Calculate Offsets
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-alert
      v-if="warningMessage"
      type="warning"
      class="mt-4"
      variant="tonal"
    >
      {{ warningMessage }}
    </v-alert>

    <v-card v-if="offsetRows.length" class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">Offset Summary</h2>
      <div class="summary-grid">
        <div>
          <div class="summary-label">Event Basis</div>
          <div class="summary-value">{{ selectedEventLabel }}</div>
        </div>
        <div>
          <div class="summary-label">Cycles Used</div>
          <div class="summary-value">{{ summary.count }}</div>
        </div>
        <div>
          <div class="summary-label">Left Cycles Found</div>
          <div class="summary-value">{{ summary.leftCount }}</div>
        </div>
        <div>
          <div class="summary-label">Right Cycles Found</div>
          <div class="summary-value">{{ summary.rightCount }}</div>
        </div>
      </div>

      <v-table density="compact" class="mt-4">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Cycles</th>
            <th>Average Offset (s)</th>
            <th>Min Offset (s)</th>
            <th>Max Offset (s)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="row.pattern">
            <td>{{ row.pattern }}</td>
            <td>{{ row.count }}</td>
            <td>{{ row.average }}</td>
            <td>{{ row.min }}</td>
            <td>{{ row.max }}</td>
          </tr>
        </tbody>
      </v-table>

      <div class="table-toolbar">
        <div class="table-count">Rows in table: {{ offsetRows.length }}</div>
        <v-btn color="secondary" @click="exportOffsets">
          Export to CSV
        </v-btn>
      </div>

      <v-table density="compact" class="mt-3">
        <thead>
          <tr>
            <th>Cycle</th>
            <th>Pattern</th>
            <th>Left Event Time</th>
            <th>Right Event Time</th>
            <th>Offset (seconds)</th>
            <th v-for="label in phaseHistoryLabels" :key="label">
              {{ label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in offsetRows" :key="row.cycle">
            <td>{{ row.cycle }}</td>
            <td>{{ row.pattern }}</td>
            <td>{{ row.leftTime }}</td>
            <td>{{ row.rightTime }}</td>
            <td>{{ row.offsetSeconds }}</td>
            <td
              v-for="(phaseText, index) in row.phaseHistory"
              :key="`${row.cycle}-${index}`"
            >
              {{ phaseText }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script>
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

export default {
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      panel: [],
      leftSignalData: "",
      rightSignalData: "",
      leftPhase: 2,
      rightPhase: 2,
      eventBasis: 1,
      offsetRows: [],
      warningMessage: "",
      summary: {
        count: 0,
        leftCount: 0,
        rightCount: 0,
      },
      summaryRows: [],
      leftTextboxDefault:
        "Paste left signal high-resolution CSV data (timestamp, event code, phase)",
      rightTextboxDefault:
        "Paste right signal high-resolution CSV data (timestamp, event code, phase)",
      phaseOptions: Array.from({ length: 16 }, (_, index) => index + 1),
      phaseHistoryLabels: [
        "Prev Phase 1",
        "Prev Phase 2",
        "Prev Phase 3",
        "Prev Phase 4",
      ],
      eventOptions: [
        { label: "Start of Green (Event 1)", value: 1 },
        { label: "Start of Yellow (Event 8)", value: 8 },
        { label: "Beginning of Red (Event 10)", value: 10 },
      ],
    };
  },
  computed: {
    selectedEventLabel() {
      const match = this.eventOptions.find(
        (option) => option.value === this.eventBasis
      );
      return match ? match.label : "";
    },
  },
  methods: {
    swapSignals() {
      const tempData = this.leftSignalData;
      this.leftSignalData = this.rightSignalData;
      this.rightSignalData = tempData;

      const tempPhase = this.leftPhase;
      this.leftPhase = this.rightPhase;
      this.rightPhase = tempPhase;
    },
    parseRawEvents(rawData) {
      if (!rawData || !rawData.trim()) {
        return [];
      }

      return rawData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const [timestampRaw, eventCodeRaw, parameterRaw] = line
            .split(",")
            .map((value) => value.trim());

          const parsedEventCode = Number.parseInt(eventCodeRaw, 10);
          const parsedParameter = Number.parseInt(parameterRaw, 10);

          if (Number.isNaN(parsedEventCode) || Number.isNaN(parsedParameter)) {
            return null;
          }

          const timeInfo = this.convertTimestamp(timestampRaw);
          if (!timeInfo || !timeInfo.calculatable) {
            return null;
          }

          return {
            eventCode: parsedEventCode,
            parameter: parsedParameter,
            humanReadable: timeInfo.humanReadable,
            iso: timeInfo.iso,
            milliseconds: timeInfo.MillisecFromEpoch,
          };
        })
        .filter((item) => item)
        .sort((a, b) => a.milliseconds - b.milliseconds);
    },
    parseSignalEvents(rawEvents, phase, eventCode) {
      if (!rawEvents.length) {
        return [];
      }

      return rawEvents.filter(
        (event) => event.eventCode === eventCode && event.parameter === phase
      );
    },
    getPatternAtTime(patternChanges, timestamp) {
      if (!patternChanges.length) {
        return -1;
      }

      let selected = -1;
      for (const change of patternChanges) {
        if (change.milliseconds <= timestamp) {
          selected = change.parameter;
        } else {
          break;
        }
      }
      return selected;
    },
    buildPhaseHistory(rawEvents, leftEvents, index, targetPhase) {
      const endTime = leftEvents[index].milliseconds;
      const startTime =
        index === 0
          ? Number.NEGATIVE_INFINITY
          : leftEvents[index - 1].milliseconds;

      const windowEvents = rawEvents.filter(
        (event) => event.milliseconds > startTime && event.milliseconds < endTime
      );

      const entries = [];
      const handledPhases = new Set();
      const terminationMap = {
        4: "Gap",
        5: "Max",
        6: "Force",
        14: "Skip",
      };

      const phaseEventsByPhase = windowEvents.reduce((acc, event) => {
        if (!acc.has(event.parameter)) {
          acc.set(event.parameter, []);
        }
        acc.get(event.parameter).push(event);
        return acc;
      }, new Map());

      const addEntry = (phase, timestamp, servedSeconds, terminationCode) => {
        if (phase === targetPhase || handledPhases.has(phase)) {
          return;
        }
        handledPhases.add(phase);
        const terminationLabel = terminationMap[terminationCode] || "Unknown";
        const servedText =
          servedSeconds === null || Number.isNaN(servedSeconds)
            ? "--"
            : Number(servedSeconds.toFixed(2));
        entries.push({
          phase,
          timestamp,
          text: `Phase ${phase} (${servedText}) ${terminationLabel}`,
        });
      };

      phaseEventsByPhase.forEach((events, phase) => {
        const starts = events.filter((event) => event.eventCode === 1);
        if (starts.length) {
          starts.forEach((startEvent) => {
            const endEvent = events.find(
              (event) =>
                event.milliseconds > startEvent.milliseconds &&
                [7, 8, 9, 10, 11, 12].includes(event.eventCode)
            );
            const servedSeconds = endEvent
              ? (endEvent.milliseconds - startEvent.milliseconds) / 1000
              : null;
            const terminationEvent = [...events]
              .filter(
                (event) =>
                  event.milliseconds > startEvent.milliseconds &&
                  (!endEvent || event.milliseconds <= endEvent.milliseconds) &&
                  Object.keys(terminationMap).includes(`${event.eventCode}`)
              )
              .pop();
            addEntry(
              phase,
              startEvent.milliseconds,
              servedSeconds,
              terminationEvent ? terminationEvent.eventCode : null
            );
          });
        } else {
          const skipEvent = events.find((event) => event.eventCode === 14);
          if (skipEvent) {
            addEntry(phase, skipEvent.milliseconds, 0, 14);
          }
        }
      });

      return entries
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-this.phaseHistoryLabels.length)
        .map((entry) => entry.text);
    },
    calculateOffsets() {
      this.warningMessage = "";
      const leftRawEvents = this.parseRawEvents(this.leftSignalData);
      const rightRawEvents = this.parseRawEvents(this.rightSignalData);
      const leftEvents = this.parseSignalEvents(
        leftRawEvents,
        this.leftPhase,
        this.eventBasis
      );
      const rightEvents = this.parseSignalEvents(
        rightRawEvents,
        this.rightPhase,
        this.eventBasis
      );
      const patternChanges = leftRawEvents.filter(
        (event) => event.eventCode === 131
      );

      const leftCount = leftEvents.length;
      const rightCount = rightEvents.length;
      const pairCount = Math.min(leftCount, rightCount);

      if (!pairCount) {
        this.offsetRows = [];
        this.summary = {
          count: 0,
          leftCount,
          rightCount,
        };
        this.summaryRows = [];
        this.warningMessage =
          "No matching events were found. Check phase numbers, event selection, and data format.";
        return;
      }

      if (leftCount !== rightCount) {
        this.warningMessage = `Left events: ${leftCount}, Right events: ${rightCount}. Using ${pairCount} matched cycles.`;
      }

      const offsets = [];
      this.offsetRows = Array.from({ length: pairCount }, (_, index) => {
        const leftEvent = leftEvents[index];
        const rightEvent = rightEvents[index];
        const offsetSeconds =
          (rightEvent.milliseconds - leftEvent.milliseconds) / 1000;
        offsets.push(offsetSeconds);
        const pattern = this.getPatternAtTime(
          patternChanges,
          leftEvent.milliseconds
        );
        const phaseHistory = this.buildPhaseHistory(
          leftRawEvents,
          leftEvents,
          index,
          this.leftPhase
        );
        const filledPhaseHistory = [...phaseHistory];
        while (filledPhaseHistory.length < this.phaseHistoryLabels.length) {
          filledPhaseHistory.unshift("--");
        }
        return {
          cycle: index + 1,
          pattern,
          leftTime: leftEvent.humanReadable,
          rightTime: rightEvent.humanReadable,
          offsetSeconds: Number(offsetSeconds.toFixed(2)),
          phaseHistory: filledPhaseHistory,
        };
      });

      this.summary = this.buildSummaryCounts(leftCount, rightCount, pairCount);
      this.summaryRows = this.buildPatternSummary(this.offsetRows);
    },
    buildSummaryCounts(leftCount, rightCount, count) {
      return {
        count,
        leftCount,
        rightCount,
      };
    },
    buildPatternSummary(rows) {
      const summaryMap = rows.reduce((acc, row) => {
        if (!acc.has(row.pattern)) {
          acc.set(row.pattern, []);
        }
        acc.get(row.pattern).push(row.offsetSeconds);
        return acc;
      }, new Map());

      return Array.from(summaryMap.entries())
        .map(([pattern, offsets]) => {
          const sorted = [...offsets].sort((a, b) => a - b);
          const count = sorted.length;
          const total = sorted.reduce((sum, value) => sum + value, 0);
          const average = count ? total / count : 0;
          return {
            pattern,
            count,
            average: Number(average.toFixed(2)),
            min: Number(sorted[0].toFixed(2)),
            max: Number(sorted[count - 1].toFixed(2)),
          };
        })
        .sort((a, b) => a.pattern - b.pattern);
    },
    exportOffsets() {
      if (!this.offsetRows.length) {
        return;
      }

      const header = [
        "Cycle",
        "Pattern",
        "Left Event Time",
        "Right Event Time",
        "Offset (seconds)",
        ...this.phaseHistoryLabels,
      ];
      const escapeCsvValue = (value) => {
        const stringValue = `${value}`;
        if (/[",\n\t]/.test(stringValue)) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      const bodyRows = this.offsetRows.map((row) => [
        row.cycle,
        row.pattern,
        row.leftTime,
        row.rightTime,
        row.offsetSeconds,
        ...row.phaseHistory,
      ]);
      const csvContent = [header, ...bodyRows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");

      const blob = new Blob(["\ufeff", csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "signal-offsets.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.section-title {
  margin-bottom: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.summary-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.table-count {
  font-size: 14px;
  opacity: 0.8;
}

.swap-button {
  min-width: 64px;
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
