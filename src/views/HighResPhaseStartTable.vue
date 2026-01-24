<template>
  <div class="phase-start-tool">
    <h1 class="h1-center-text">High Resolution Phase Start Table</h1>
    <p class="tool-intro">
      Paste or upload high-resolution controller data to generate a table of
      phase start timestamps for green, yellow, and red intervals.
    </p>

    <div class="input-box-wrapper">
      <InputBox
        v-model="inputData"
        :defaultText="inputPlaceholder"
      />
    </div>

    <div class="action-row">
      <v-btn
        color="primary"
        :disabled="!canProcess"
        @click="processData"
      >
        Process High Resolution Data
      </v-btn>
      <v-btn
        color="secondary"
        :disabled="!tableRows.length"
        @click="downloadExcel"
      >
        Download Excel (ISO 8601)
      </v-btn>
    </div>

    <v-card v-if="tableRows.length" class="results-card">
      <v-card-title>Phase Start Timestamps</v-card-title>
      <v-card-text>
        <div class="table-wrapper">
          <table class="phase-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Green Start</th>
                <th>Yellow Start</th>
                <th>Red Start</th>
              </tr>
              <tr class="filter-row">
                <th>
                  <input
                    v-model="filters.phase"
                    type="text"
                    class="column-filter"
                    placeholder="Filter"
                    aria-label="Filter phase column"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.green"
                    type="text"
                    class="column-filter"
                    placeholder="Filter"
                    aria-label="Filter green start column"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.yellow"
                    type="text"
                    class="column-filter"
                    placeholder="Filter"
                    aria-label="Filter yellow start column"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.red"
                    type="text"
                    class="column-filter"
                    placeholder="Filter"
                    aria-label="Filter red start column"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredRows" :key="`phase-${row.phase}`">
                <td class="phase-cell">{{ row.phase }}</td>
                <td v-html="formatCell(row.greenStarts)"></td>
                <td v-html="formatCell(row.yellowStarts)"></td>
                <td v-html="formatCell(row.redStarts)"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

export default {
  name: "HighResPhaseStartTable",
  components: { InputBox },
  mixins: [convertTime],
  data() {
    return {
      inputData: "",
      tableRows: [],
      filters: {
        phase: "",
        green: "",
        yellow: "",
        red: "",
      },
      inputPlaceholder:
        "Paste or upload high-resolution data: timestamp, event code, phase",
    };
  },
  computed: {
    canProcess() {
      return this.inputData.trim().length > 0;
    },
    filteredRows() {
      if (!this.tableRows.length) {
        return [];
      }
      const normalizedFilters = {
        phase: this.filters.phase.trim().toLowerCase(),
        green: this.filters.green.trim().toLowerCase(),
        yellow: this.filters.yellow.trim().toLowerCase(),
        red: this.filters.red.trim().toLowerCase(),
      };
      const matches = (value, filter) => {
        if (!filter) {
          return true;
        }
        return value.toLowerCase().includes(filter);
      };
      return this.tableRows.filter((row) => {
        const phaseValue = `${row.phase}`;
        const greenValue = row.greenStarts.join(" ");
        const yellowValue = row.yellowStarts.join(" ");
        const redValue = row.redStarts.join(" ");
        return (
          matches(phaseValue.toLowerCase(), normalizedFilters.phase) &&
          matches(greenValue.toLowerCase(), normalizedFilters.green) &&
          matches(yellowValue.toLowerCase(), normalizedFilters.yellow) &&
          matches(redValue.toLowerCase(), normalizedFilters.red)
        );
      });
    },
  },
  methods: {
    processData() {
      const lines = this.inputData
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const phaseData = new Map();
      const phaseSet = new Set();

      lines.forEach((line) => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length < 3) {
          return;
        }
        const [timestamp, eventCodeRaw, phaseRaw] = parts;
        const eventCode = Number(eventCodeRaw);
        const phase = Number(phaseRaw);
        if (Number.isNaN(eventCode) || Number.isNaN(phase)) {
          return;
        }
        phaseSet.add(phase);
        if (!phaseData.has(phase)) {
          phaseData.set(phase, {
            greenStarts: [],
            yellowStarts: [],
            redStarts: [],
          });
        }
        const data = phaseData.get(phase);
        if (eventCode === 1) {
          data.greenStarts.push(timestamp);
        }
        if (eventCode === 8) {
          data.yellowStarts.push(timestamp);
        }
        if (eventCode === 10) {
          data.redStarts.push(timestamp);
        }
      });

      this.tableRows = Array.from(phaseSet)
        .sort((a, b) => a - b)
        .map((phase) => ({
          phase,
          ...phaseData.get(phase),
        }))
        .filter(
          (row) =>
            row.greenStarts.length ||
            row.yellowStarts.length ||
            row.redStarts.length,
        );
    },
    formatCell(values) {
      if (!values.length) {
        return "—";
      }
      return values.map((value) => this.escapeHtml(value)).join("<br />");
    },
    escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },
    toIsoZ(timestamp) {
      const converted = this.convertTimestamp(timestamp);
      if (converted?.iso) {
        return DateTime.fromISO(converted.iso).toUTC().toISO();
      }
      const isoCandidate = DateTime.fromISO(timestamp);
      if (isoCandidate.isValid) {
        return isoCandidate.toUTC().toISO();
      }
      return timestamp;
    },
    downloadExcel() {
      const header = ["Phase", "Green Start", "Yellow Start", "Red Start"];
      const escapeCsvValue = (value) => {
        const stringValue = `${value}`;
        if (/[",\n\t]/.test(stringValue)) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      const rows = this.tableRows.map((row) => {
        const green = row.greenStarts.map(this.toIsoZ).join("\n");
        const yellow = row.yellowStarts.map(this.toIsoZ).join("\n");
        const red = row.redStarts.map(this.toIsoZ).join("\n");
        return [row.phase, green || "—", yellow || "—", red || "—"];
      });
      const csvContent = [header, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");
      const blob = new Blob(["\ufeff", csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "phase-start-timestamps.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.phase-start-tool {
  padding: 16px 0 32px;
}

.tool-intro {
  max-width: 760px;
  margin: 0 auto 16px;
  text-align: center;
}

.input-box-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

.input-box-wrapper :deep(.input-box) {
  width: 100%;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin: 16px 0;
}

.results-card {
  max-width: 1100px;
  margin: 16px auto 0;
}

.table-wrapper {
  overflow-x: auto;
}

.phase-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.phase-table th,
.phase-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  vertical-align: top;
}

.phase-table th {
  font-weight: 600;
}

.filter-row th {
  padding-top: 6px;
  padding-bottom: 12px;
}

.column-filter {
  width: 100%;
  min-width: 120px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background-color: rgba(0, 0, 0, 0.15);
  color: inherit;
}

.column-filter::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.phase-cell {
  font-weight: 600;
}
</style>
