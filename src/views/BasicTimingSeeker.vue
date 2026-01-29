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
            pedestrian intervals) for each phase. It outputs GTSS-ready CSV and
            a simple text list of phases for quick reference.
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
4. Download the GTSS CSV and the phase list text file.

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
            <v-btn color="secondary" @click="downloadCsv">
              Download GTSS CSV
            </v-btn>
            <v-btn color="secondary" variant="outlined" @click="downloadPhaseText">
              Download Phase List (.txt)
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
            <tr v-for="row in processedRows" :key="row.phase">
              <td>{{ row.phase }}</td>
              <td>{{ row.signal_id }}</td>
              <td>{{ row.ped_walk }}</td>
              <td>{{ row.ped_clearance }}</td>
              <td>{{ row.leading_ped_interval }}</td>
              <td>{{ row.min_green }}</td>
              <td>{{ row.max_green }}</td>
              <td>{{ row.yellow }}</td>
              <td>{{ row.all_red }}</td>
              <td>{{ row.veh_recall_type }}</td>
              <td>{{ row.ped_recall }}</td>
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
      defaultText: "Paste high-resolution data here (timestamp, enumeration, phase).",
      signalId: 1,
      processedRows: [],
      errorMessage: "",
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
            ped_recall: "true",
          });
        });

      this.processedRows = rows;
    },
    parseInput() {
      if (!this.inputData) {
        return [];
      }
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
          const timestamp = Number(parts[0]);
          const enumeration = Number(parts[1]);
          const phase = Number(parts[2]);
          if (
            Number.isNaN(timestamp) ||
            Number.isNaN(enumeration) ||
            Number.isNaN(phase)
          ) {
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
    downloadCsv() {
      const csvContent = this.buildCsvContent();
      const blob = new Blob(["\ufeff", csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "basic-timing-gtss.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    },
    downloadPhaseText() {
      const phases = this.processedRows
        .map((row) => `Phase ${row.phase}`)
        .join("\n");
      const blob = new Blob([phases], { type: "text/plain;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "basic-timing-phases.txt";
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
.muted {
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}
.error-message {
  color: #c62828;
  margin-top: 12px;
}
</style>
