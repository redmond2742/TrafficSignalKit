<template>
  <div class="phase-start-tool">
    <h1 class="h1-center-text">High Resolution Phase Start Table</h1>
    <p class="tool-intro">
      Paste or upload high-resolution controller data to generate a table of
      phase start timestamps for green, yellow, and red intervals.
    </p>

    <div class="input-controls">
      <v-switch
        v-model="useFileUpload"
        inset
        label="Upload a file instead of pasting"
      />
    </div>

    <div v-if="useFileUpload" class="file-upload">
      <div class="file-drop-zone" @dragover.prevent @drop.prevent="handleDrop">
        <p>Drag and drop a CSV file here, or choose a file to upload.</p>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv"
          @change="handleFileSelection"
        />
      </div>
      <p v-if="selectedFileName" class="file-name">
        Selected file: {{ selectedFileName }}
      </p>
      <v-btn
        v-if="selectedFileName"
        variant="text"
        color="secondary"
        @click="clearFileSelection"
      >
        Clear selection
      </v-btn>
    </div>

    <InputBox
      v-else
      v-model="inputData"
      :defaultText="inputPlaceholder"
    />

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
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="`phase-${row.phase}`">
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
      useFileUpload: false,
      selectedFileName: "",
      tableRows: [],
      inputPlaceholder:
        "Paste high-resolution data: timestamp, event code, phase",
    };
  },
  computed: {
    canProcess() {
      return this.inputData.trim().length > 0;
    },
  },
  methods: {
    handleFileSelection(event) {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      this.loadCsvFile(file);
    },
    handleDrop(event) {
      const file = event.dataTransfer.files?.[0];
      if (!file) {
        return;
      }
      this.loadCsvFile(file);
    },
    loadCsvFile(file) {
      const reader = new FileReader();
      this.selectedFileName = file.name;
      reader.onload = () => {
        this.inputData = reader.result?.toString() ?? "";
      };
      reader.readAsText(file);
    },
    clearFileSelection() {
      this.selectedFileName = "";
      this.inputData = "";
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = "";
      }
    },
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
        }));
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
  watch: {
    useFileUpload(newValue) {
      if (newValue) {
        this.inputData = "";
        this.tableRows = [];
      } else {
        this.clearFileSelection();
      }
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

.input-controls {
  max-width: 760px;
  margin: 0 auto 12px;
}

.file-upload {
  max-width: 760px;
  margin: 0 auto 16px;
  text-align: center;
}

.file-drop-zone {
  border: 2px dashed rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.04);
}

.file-drop-zone input[type="file"] {
  margin-top: 12px;
}

.file-name {
  margin-top: 8px;
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

.phase-cell {
  font-weight: 600;
}
</style>
