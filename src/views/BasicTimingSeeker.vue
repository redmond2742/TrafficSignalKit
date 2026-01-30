<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Basic Timing Seeker</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Basic Timing Seeker" value="about">
          <v-expansion-panel-text>
            Basic Timing Seeker processes high-resolution controller events to
            estimate timing parameters (min green, yellow, all-red, and
            pedestrian intervals) for each phase. It outputs GTSS-ready CSV.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel
          title="Detailed Explanation: How the timing is calculated"
          value="details"
        >
          <v-expansion-panel-text>
            The tool derives averages from event pairs in the high-resolution
            log: begin green to min complete for min green, begin green to begin
            yellow for max green, begin yellow to end yellow for yellow, begin
            red to end red for all-red, and pedestrian walk/clear events for
            pedestrian intervals. Missing events default to 0 so you can still
            export a template for GTSS.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            <pre>
1. Paste high-resolution events (timestamp, enumeration, phase).
2. Set the signal ID to match your controller.
3. Click "Process High Resolution Data".
4. Download the GTSS CSV (.txt).

Example input:
16764339605, 1, 6
16764339809, 8, 6
16764339849, 9, 6
16764339859, 10, 6
16764339879, 11, 6
            </pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="mt-6" variant="outlined">
      <v-card-text>
        <div class="input-row">
          <v-text-field
            v-model.number="signalId"
            label="Signal ID"
            type="number"
            min="1"
            variant="outlined"
            density="comfortable"
          />
          <v-btn
            color="primary"
            :disabled="!canProcess"
            @click="processData"
          >
            Process High Resolution Data
          </v-btn>
        </div>
        <InputBox v-model="inputData" :default-text="defaultText" />
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </v-card-text>
    </v-card>

    <v-card v-if="processedRows.length" class="mt-6" variant="outlined">
      <v-card-text>
        <div class="download-row">
          <div>
            <h2>GTSS Basic Timing Output</h2>
            <p class="muted">
              Generated {{ processedRows.length }} phase rows from your
              high-resolution data.
            </p>
          </div>
          <div class="download-buttons">
            <v-btn color="secondary" @click="downloadGtssTxt">
              Download GTSS CSV (.txt)
            </v-btn>
          </div>
        </div>

        <v-table density="compact" class="mt-4">
          <thead>
            <tr>
              <th v-for="header in csvHeaders" :key="header">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in processedRows" :key="`row-${index}`">
              <td>
                <v-text-field
                  v-model.number="row.phase"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.signal_id"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.ped_walk"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.ped_clearance"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.leading_ped_interval"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.min_green"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.max_green"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.yellow"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-text-field
                  v-model.number="row.all_red"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-input"
                />
              </td>
              <td>
                <v-select
                  v-model="row.veh_recall_type"
                  :items="vehRecallOptions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-select"
                />
              </td>
              <td>
                <v-select
                  v-model="row.ped_recall"
                  :items="booleanOptions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="table-select"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import InputBox from "../components/foundational/InputBox.vue";

const EVENT_CODES = {
  BEGIN_GREEN: 1,
  MIN_COMPLETE: 3,
  GREEN_TERMINATION: 7,
  BEGIN_YELLOW: 8,
  END_YELLOW: 9,
  BEGIN_RED: 10,
  END_RED: 11,
  PED_WALK: 21,
  PED_CLEARANCE: 22,
  PED_SOLID_DW: 23,
  PED_DARK: 24,
};

export default {
  name: "BasicTimingSeeker",
  components: {
    InputBox,
  },
  data() {
    return {
      panel: [],
      inputData: "",
      defaultText:
        "Paste high-resolution data here (timestamp, enumeration, phase). CSV rows with date/time stamps are supported.",
      signalId: 1,
      processedRows: [],
      errorMessage: "",
      booleanOptions: [true, false],
      vehRecallOptions: ["None", "Min", "Max", "Soft"],
      csvHeaders: [
        "phase",
        "signal_id",
        "ped_walk",
        "ped_clearance",
        "leading_ped_interval",
        "min_green",
        "max_green",
        "yellow",
        "all-red",
        "veh_recall_type",
        "ped_recall",
      ],
    };
  },
  computed: {
    canProcess() {
      return this.inputData && this.inputData.trim().length > 0;
    },
  },
  methods: {
    processData() {
      const events = this.parseInput();
      if (!events.length) {
        this.errorMessage = "No valid events found. Check your input format.";
        this.processedRows = [];
        return;
      }
      this.errorMessage = "";
      const phases = new Map();
      events.forEach((event) => {
        if (!phases.has(event.phase)) {
          phases.set(event.phase, []);
        }
        phases.get(event.phase).push(event);
      });

      const rows = [];
      Array.from(phases.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([phase, phaseEvents]) => {
          phaseEvents.sort((a, b) => a.timestamp - b.timestamp);
          const minGreen = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.BEGIN_GREEN],
            [EVENT_CODES.MIN_COMPLETE],
          );
          const maxGreen = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.BEGIN_GREEN],
            [EVENT_CODES.BEGIN_YELLOW, EVENT_CODES.GREEN_TERMINATION],
          );
          const yellow = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.BEGIN_YELLOW],
            [EVENT_CODES.END_YELLOW],
          );
          const allRed = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.BEGIN_RED],
            [EVENT_CODES.END_RED],
          );
          const pedWalk = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.PED_WALK],
            [EVENT_CODES.PED_CLEARANCE],
          );
          const pedClearance = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.PED_CLEARANCE],
            [EVENT_CODES.PED_SOLID_DW, EVENT_CODES.PED_DARK],
          );
          const lpi = this.averageDuration(
            phaseEvents,
            [EVENT_CODES.PED_WALK],
            [EVENT_CODES.BEGIN_GREEN],
          );

          const hasTiming = [
            minGreen,
            maxGreen,
            yellow,
            allRed,
            pedWalk,
            pedClearance,
            lpi,
          ].some((value) => value > 0);

          if (!hasTiming) {
            return;
          }

          rows.push({
            phase: Number(phase),
            signal_id: this.signalId,
            ped_walk: pedWalk,
            ped_clearance: pedClearance,
            leading_ped_interval: lpi,
            min_green: minGreen,
            max_green: maxGreen,
            yellow: yellow,
            all_red: allRed,
            veh_recall_type: "Min",
            ped_recall: true,
          });
        });

      this.processedRows = rows;
    },
    parseInput() {
      if (!this.inputData) {
        return [];
      }
      const parseIntegerField = (value) => {
        const trimmed = String(value ?? "").trim();
        if (!trimmed || !/^-?\d+$/.test(trimmed)) {
          return null;
        }
        return Number(trimmed);
      };
      const parseTimestampToTenths = (value) => {
        const trimmed = String(value ?? "").trim();
        if (!trimmed) {
          return null;
        }
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          return Number(trimmed);
        }
        const match = trimmed.match(
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/,
        );
        if (!match) {
          return null;
        }
        const [, month, day, year, hour, minute, second, fraction] = match;
        const milliseconds = fraction
          ? Number(String(fraction).padEnd(3, "0").slice(0, 3))
          : 0;
        const utcTimestamp = Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
          milliseconds,
        );
        return utcTimestamp / 100;
      };
      const lines = this.inputData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return lines
        .map((line) => line.split(",").map((value) => value.trim()))
        .map((parts) => {
          if (parts.length < 3) {
            return null;
          }
          const timestamp = parseTimestampToTenths(parts[0]);
          const enumeration = parseIntegerField(parts[1]);
          const phase = parseIntegerField(parts[2]);
          if (timestamp === null || enumeration === null || phase === null) {
            return null;
          }
          if (phase === 0) {
            return null;
          }
          return { timestamp, enumeration, phase };
        })
        .filter(Boolean);
    },
    averageDuration(events, startEnums, endEnums) {
      const durations = [];
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        if (!startEnums.includes(event.enumeration)) {
          continue;
        }
        const endEvent = events
          .slice(i + 1)
          .find((nextEvent) => endEnums.includes(nextEvent.enumeration));
        if (!endEvent) {
          continue;
        }
        const durationSeconds = (endEvent.timestamp - event.timestamp) / 10;
        if (durationSeconds > 0) {
          durations.push(durationSeconds);
        }
      }
      if (!durations.length) {
        return 0;
      }
      const total = durations.reduce((sum, value) => sum + value, 0);
      return Number((total / durations.length).toFixed(1));
    },
    csvEscape(value) {
      const stringValue = String(value ?? "");
      if (stringValue.includes(",") || stringValue.includes("\"")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    },
    buildCsvContent() {
      const header = this.csvHeaders.join(",");
      const rows = this.processedRows.map((row) =>
        [
          row.phase,
          row.signal_id,
          row.ped_walk,
          row.ped_clearance,
          row.leading_ped_interval,
          row.min_green,
          row.max_green,
          row.yellow,
          row.all_red,
          row.veh_recall_type,
          row.ped_recall,
        ]
          .map(this.csvEscape)
          .join(","),
      );
      return [header, ...rows].join("\n");
    },
    downloadGtssTxt() {
      const csvContent = this.buildCsvContent();
      const blob = new Blob(["\ufeff", csvContent], {
        type: "text/plain;charset=utf-8",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "basic-timing-gtss.txt";
      link.click();
      URL.revokeObjectURL(link.href);
    },
  },
};
</script>

<style scoped>
.left-justify-text {
  margin: 0;
  padding: 0;
  text-align: left;
}
.input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}
.download-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
}
.download-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.table-input {
  min-width: 110px;
}
.table-select {
  min-width: 110px;
}
.table-select .v-field__input,
.table-select .v-select__selection {
  font-size: 0.75rem;
}
.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}
.error-message {
  color: #c62828;
  margin-top: 12px;
}
</style>
