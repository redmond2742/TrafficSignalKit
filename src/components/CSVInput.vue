<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->

    <div class="grow-wrap">
      <div class="input-toggle">
        <v-switch
          v-model="useFileUpload"
          inset
          label="Upload CSV files instead of pasting"
        />
      </div>

      <div v-if="useFileUpload" class="file-upload">
        <div class="input-toggle">
          <v-switch
            v-model="allowMultipleUploads"
            inset
            label="Allow multiple CSV uploads"
          />
        </div>
        <div
          class="file-drop-zone"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <p>Drag and drop CSV files here, or choose files to upload.</p>
          <input
            ref="fileInput"
            type="file"
            :multiple="allowMultipleUploads"
            accept=".csv,text/csv"
            @change="handleFileSelection"
          />
        </div>
        <div class="file-list">
          <p v-if="isLoadingFiles" class="file-placeholder">
            Loading files...
          </p>
          <p
            v-else-if="!selectedFileNames.length"
            class="file-placeholder"
          >
            No files selected yet.
          </p>
          <ul v-else>
            <li v-for="fileName in selectedFileNames" :key="fileName">
              {{ fileName }}
            </li>
          </ul>
          <v-btn
            v-if="selectedFileNames.length"
            variant="text"
            color="secondary"
            @click="clearFileSelection"
          >
            Clear selection
          </v-btn>
        </div>
      </div>

      <InputBox v-else v-model="inputData" />

      <v-card>
        <v-card-text>
          <v-btn
            color="primary"
            :loading="isProcessing"
            :disabled="isProcessing || isLoadingFiles || !canProcess"
            @click="processCSV"
          >
            Process High Resolution Data
          </v-btn>
        </v-card-text>

        <v-card-text>
          <div>
            <div class="table-toolbar">
              <div class="table-count">
                Rows in table: {{ filteredRows.length }}
              </div>
              <v-btn
                color="secondary"
                :disabled="!rowData.length"
                @click="exportToExcel"
              >
                Export to Excel
              </v-btn>
            </div>
            <div class="virtual-table">
              <div class="virtual-table__filters">
                <input
                  type="text"
                  placeholder="Filter timestamp"
                  v-model="filters.timestamp"
                />
                <input
                  type="text"
                  placeholder="Filter enumeration"
                  v-model="filters.enumeration"
                />
                <input
                  type="text"
                  placeholder="Filter channel/phase"
                  v-model="filters.channel"
                />
              </div>
              <div class="virtual-table__header">
                <div class="virtual-table__cell">Timestamp</div>
                <div class="virtual-table__cell">Enumeration</div>
                <div class="virtual-table__cell">Channel/Phase</div>
              </div>
              <v-virtual-scroll
                class="virtual-table__body"
                :items="filteredRows"
                :item-height="44"
              >
                <template #default="{ item, index }">
                  <div class="virtual-table__row" :key="`row-${index}`">
                    <div
                      class="virtual-table__cell"
                      v-html="highlightMatches(item.timestamp, filters.timestamp)"
                    ></div>
                    <div
                      class="virtual-table__cell"
                      v-html="
                        highlightMatches(item.enumeration, filters.enumeration)
                      "
                    ></div>
                    <div
                      class="virtual-table__cell"
                      v-html="highlightMatches(item.channel, filters.channel)"
                    ></div>
                  </div>
                </template>
              </v-virtual-scroll>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";

export default {
  mixins: [convertTime],
  components: { InputBox },
  props: {
    csvDataProcessed: Function,
  },
  data() {
    return {
      inputData: "",
      useFileUpload: false,
      allowMultipleUploads: true,
      selectedFileNames: [],
      filesLoaded: false,
      isLoadingFiles: false,
      filters: {
        timestamp: "",
        enumeration: "",
        channel: "",
      },
      rowData: [],
      isProcessing: false,
      timezoneOffset: "America/Los_Angeles",
      usaTimezones: {
        "America/New_York": -5, // UTC offset: -5 hours
        "America/Chicago": -6, // UTC offset: -6 hours
        "America/Denver": -7, // UTC offset: -7 hours
        "America/Los_Angeles": -8, // UTC offset: -8 hours
      },
      //https://docs.lib.purdue.edu/cgi/viewcontent.cgi?article=1003&context=jtrpdata
      enumerations: {
        0: "Phase On",
        1: "Phase Begin Green",
        2: "Phase Check",
        3: "Phase Min Complete",
        4: "Phase Gap Out",
        5: "Phase Max Out",
        6: "Phase Force Off",
        7: "Phase Green Termination",
        8: "Phase Begin Yellow Clearance",
        9: "Phase End Yellow Clearance",
        10: "Phase Begin Red Clearance",
        11: "Phase End Red Clearance",
        12: "Phase Inactive",
        13: "Extension Timer Gap Out",
        14: "Phase Skipped",
        15: "Extension Timer Reduction Start",
        16: "Extension Timer Minimum Achieved",
        17: "Added initial Complete",
        18: "Next Phase Decision",
        19: "TSP Early Force Off",
        20: "Preemption Force Off",
        21: "Pedestrian Begin Walk",
        22: "Pedestrian Begin Clearance",
        23: "Pedestrian Begin Solid Don’t Walk",
        24: "Pedestrian Dark",
        25: "Extended Pedestrian Change Interval",
        26: "Oversized Pedestrian Served",
        31: "Barrier Termination",
        32: "FYA – Begin Permissive",
        33: "FYA – End Permissive",
        41: "Phase Hold Active",
        42: "Phase Hold Released",
        43: "Phase Call Registered",
        44: "Phase Call Dropped",
        45: "Pedestrian Call Registered",
        46: "Phase Omit On",
        47: "Phase Omit Off",
        48: "Pedestrian Omit On",
        49: "Pedestrian Omit Off",
        50: "MAX 1 In-Effect",
        51: "MAX 2 In-Effect",
        52: "Dynamic MAX In-Effect",
        53: "Dynamic MAX Step Up",
        54: "Dynamic MAX Step Down",
        55: "Advance Warning Sign On",
        56: "Advance Warning Sign Off",
        61: "Overlap Begin Green",
        62: "Overlap Begin Trailing Green (Extension)",
        63: "Overlap Begin Yellow",
        64: "Overlap Begin Red Clearance",
        65: "Overlap Off (Inactive with red indication)",
        66: "Overlap Dark",
        67: "Pedestrian Overlap Begin Walk",
        68: "Pedestrian Overlap Begin Clearance",
        69: "Pedestrian Overlap Begin Solid Don’t Walk",
        70: "Pedestrian Overlap Dark",
        71: "Advance Warning Sign On",
        72: "Advance Warning Sign Off",
        81: "Detector Off",
        82: "Detector On",
        83: "Detector Restored",
        84: "Detector Fault- Other",
        85: "Detector Fault- Watchdog Fault",
        86: "Detector Fault- Open Loop Fault",
        87: "Detector Fault- Shorted Loop Fault",
        88: "Detector Fault- Excessive Change Fault",
        89: "PedDetector Off",
        90: "PedDetector On",
        91: "Pedestrian Detector Failed",
        92: "Pedestrian Detector Restored",
        93: "TSP Detector Off",
        94: "TSP Detector On",
        101: "Preempt Advance Warning Input",
        102: "Preempt (Call) Input On",
        103: "Preempt Gate Down Input Received",
        104: "Preempt (Call) Input Off",
        105: "Preempt Entry Started",
        106: "Preemption Begin Track Clearance",
        107: "Preemption Begin Dwell Service",
        108: "Preemption Link Active On",
        109: "Preemption Link Active Off",
        110: "Preemption Max Presence Exceeded",
        111: "Preemption Begin Exit Interval",
        112: "TSP Check In",
        113: "TSP Adjustment to Early Green",
        114: "TSP Adjustment to Extend Green",
        115: "TSP Check Out",
        116: "Preemption Force Off",
        117: "TSP Early Force Off",
        120: "TSP Service Start",
        121: "TSP Service End",
        131: "Coord Pattern Change",
        132: "Cycle Length Change",
        133: "Offset Length Change",
        134: "Split 1 Change",
        135: "Split 2 Change",
        136: "Split 3 Change",
        137: "Split 4 Change",
        138: "Split 5 Change",
        139: "Split 6 Change",
        140: "Split 7 Change",
        141: "Split 8 Change",
        142: "Split 9 Change",
        143: "Split 10 Change",
        144: "Split 11 Change",
        145: "Split 12 Change",
        146: "Split 13 Change",
        147: "Split 14 Change",
        148: "Split 15 Change",
        149: "Split 16 Change",
        150: "Coord Cycle State Change",
        151: "Coordinated Phase Yield Point",
        152: "Coordinated Phase Begin",
        153: "Logic Statement True",
        154: "Logic Statement False",
        155: "Unit Control Status Change",
        156: "Additional Cycle Length Change",
        171: "Test Input on",
        172: "Test Input off",
        173: "Unit Flash Status change",
        174: "Unit Alarm Status 1 change",
        175: "Alarm Group State Change",
        176: "Special Function Output on",
        177: "Special Function Output off",
        178: "Manual control enable off/on",
        179: "Interval Advance off/on",
        180: "Stop Time Input off/on",
        181: "Controller Clock Updated",
        182: "Power Failure Detected",
        184: "Power Restored",
        185: "Vendor Specific Alarm",
        200: "Alarm On",
        201: "Alarm Off",
        202: "Aux Switch On/Off",
        203: "Split 17 Change",
        204: "Split 18 Change",
        205: "Split 19 Change",
        206: "Split 20 Change",
        207: "Split 21 Change",
        208: "Split 22 Change",
        209: "Split 23 Change",
        210: "Split 24 Change",
        211: "Split 25 Change",
        212: "Split 26 Change",
        213: "Split 27 Change",
        214: "Split 28 Change",
        215: "Split 29 Change",
        216: "Split 30 Change",
        217: "Split 31 Change",
        218: "Split 32 Change",
      },
      transitionStates: {
        0: "Free",
        1: "In Step",
        2: "Transition - Add",
        3: "Transition - Subtract",
        4: "Transition - Dwell",
        5: "Local Zero",
        6: "Begin Pickup",
      },
    };
  },
  methods: {
    selectedTimezone(tzData) {
      this.timezoneOffset = tzData;
    },
    handleFileSelection(event) {
      const files = event.target?.files;
      this.loadCsvFiles(files);
    },
    handleDrop(event) {
      const files = event.dataTransfer?.files;
      this.loadCsvFiles(files);
    },
    clearFileSelection() {
      this.selectedFileNames = [];
      this.filesLoaded = false;
      this.isLoadingFiles = false;
      this.inputData = "";
      this.rowData = [];
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = "";
      }
    },
    async loadCsvFiles(fileList) {
      if (!fileList || !fileList.length) {
        this.clearFileSelection();
        return;
      }
      this.isLoadingFiles = true;
      this.filesLoaded = false;
      const files = Array.from(fileList);
      const filesToLoad = this.allowMultipleUploads ? files : files.slice(0, 1);
      this.selectedFileNames = filesToLoad.map((file) => file.name);
      const combinedLines = [];
      let headerLine = null;
      let normalizedHeader = null;

      try {
        for (const file of filesToLoad) {
          const text = await file.text();
          const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          if (!lines.length) {
            continue;
          }
          if (!headerLine) {
            headerLine = lines[0];
            normalizedHeader = this.normalizeHeader(headerLine);
            combinedLines.push(...lines);
            continue;
          }
          const currentHeader = this.normalizeHeader(lines[0]);
          if (currentHeader === normalizedHeader) {
            combinedLines.push(...lines.slice(1));
          } else {
            combinedLines.push(...lines);
          }
        }
      } finally {
        this.inputData = combinedLines.join("\n");
        this.filesLoaded = combinedLines.length > 0;
        this.isLoadingFiles = false;
      }
    },
    normalizeHeader(line) {
      if (!line) {
        return "";
      }
      return line.replace(/^\uFEFF/, "").trim().toLowerCase();
    },
    async processCSV() {
      this.isProcessing = true;
      this.rowData = [];
      const rows = this.inputData
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean);
      const chunkSize = 500;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const chunkData = chunk.map((row) => {
          const values = row.split(",").map((value) => value.trim());
          const dateTimeOriginal = this.convertTimestamp(
            values[0],
            this.timezoneOffset
          );
          const tempEnumeration =
            this.enumerations[Number(values[1])] || "-";
          const dtString = dateTimeOriginal.new
            ? dateTimeOriginal.humanReadable
            : dateTimeOriginal.OGtimestamp;
          return {
            timestamp: dtString,
            enumeration: tempEnumeration,
            channel: Number(values[2]),
          };
        });
        this.rowData.push(...chunkData);
        await this.yieldToMainThread();
      }

      this.isProcessing = false;
    },
    yieldToMainThread() {
      return new Promise((resolve) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => resolve(), { timeout: 50 });
        } else {
          setTimeout(resolve, 0);
        }
      });
    },
    highlightMatches(text, filterValue) {
      if (filterValue === "" || filterValue === null || filterValue === undefined) {
        return text;
      }
      if (typeof text === "string") {
        const matchExists = text
          .toLowerCase()
          .includes(filterValue.toLowerCase());
        if (!matchExists) return text;
        const re = new RegExp(filterValue, "ig");
        return text.replace(
          re,
          (matchedText) => `<strong>${matchedText}</strong>`
        );
      } else {
        const stringText = text?.toString() ?? "";
        const matchExists = stringText
          .toLowerCase()
          .includes(filterValue.toLowerCase());
        if (!matchExists) return text;
        const re = new RegExp(filterValue, "ig");
        return stringText.replace(
          re,
          (matchedText) => `<strong>${matchedText}</strong>`
        );
      }
    },
    exportToExcel() {
      const rows = this.filteredRows.length ? this.filteredRows : this.rowData;
      const header = ["Timestamp", "Enumeration", "Channel/Phase"];
      const escapeCsvValue = (value) => {
        const stringValue = `${value}`;
        if (/[",\n\t]/.test(stringValue)) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      const bodyRows = rows.map((row) => [
        row.timestamp,
        row.enumeration,
        row.channel,
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
      link.download = "high-resolution-data-explainer.csv";
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
        this.rowData = [];
      } else {
        this.clearFileSelection();
      }
    },
    allowMultipleUploads(newValue) {
      if (newValue) {
        return;
      }
      const currentFiles = this.$refs.fileInput?.files;
      if (currentFiles && currentFiles.length > 1) {
        this.loadCsvFiles([currentFiles[0]]);
        return;
      }
      if (this.selectedFileNames.length > 1) {
        this.clearFileSelection();
      }
    },
  },
  computed: {
    canProcess() {
      if (this.useFileUpload) {
        return this.filesLoaded && this.inputData.trim().length > 0;
      }
      return this.inputData.trim().length > 0;
    },
    filteredRows() {
      const timestampFilter = this.filters.timestamp.toLowerCase();
      const enumerationFilter = this.filters.enumeration.toLowerCase();
      const channelFilter = this.filters.channel.toLowerCase();
      return this.rowData.filter((row) => {
        const timestamp = row.timestamp.toString().toLowerCase();
        const enumeration = row.enumeration.toString().toLowerCase();
        const channel = row.channel.toString();
        const timestampMatches = timestampFilter
          ? timestamp.includes(timestampFilter)
          : true;
        const enumerationMatches = enumerationFilter
          ? enumeration.includes(enumerationFilter)
          : true;
        const channelMatches = channelFilter
          ? channel.includes(channelFilter)
          : true;
        return timestampMatches && enumerationMatches && channelMatches;
      });
    },
  },
  mounted() {
    // Output the processed data when the component is mounted
    //const output = this.processTimeSeriesData();
    //document.querySelector('timeseries').innerHTML = output;
  },
};
</script>

<style>
.grow-wrap {
  /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
  display: grid;
}
.grow-wrap::after {
  /* Note the weird space! Needed to preventy jumpy behavior */
  content: attr(data-replicated-value) " ";

  /* This is how textarea text behaves */
  white-space: pre-wrap;

  /* Hidden from view, clicks, and screen readers */
  visibility: hidden;
}
.input-toggle {
  margin-bottom: 12px;
}
.file-upload {
  border: 1px dashed #c0c0c0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}
.file-drop-zone {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
.file-drop-zone input[type="file"] {
  padding: 8px 0;
}
.file-list ul {
  margin: 0;
  padding-left: 18px;
}
.file-placeholder {
  margin: 0 0 8px;
  color: #6b6b6b;
}
.grow-wrap > textarea {
  /* You could leave this, but after a user resizes, then it ruins the auto sizing */
  resize: none;

  /* Firefox shows scrollbar on growth, you can hide like this. */
  overflow: hidden;
  overflow-y: scroll;
}
.grow-wrap > textarea,
.grow-wrap::after {
  /* Identical styling required!! */
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;

  /* Place on top of each other */
  grid-area: 1 / 1 / 2 / 2;
}

.virtual-table {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
}

.virtual-table__header,
.virtual-table__row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  align-items: center;
  gap: 8px;
  padding: 0.5rem 0.75rem;
}

.virtual-table__filters {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  gap: 8px;
  padding: 0.5rem 0.75rem;
  background: #fafafa;
  border-bottom: 1px solid #ececec;
}

.virtual-table__filters input[type="text"] {
  width: 100%;
  margin: 0;
  padding: 8px 10px;
}

.virtual-table__header {
  background: #f5f5f5;
  font-weight: 600;
  border-bottom: 1px solid #d0d0d0;
}

.virtual-table__body {
  max-height: 420px;
}

.virtual-table__row {
  border-bottom: 1px solid #ececec;
}

.virtual-table__row:last-child {
  border-bottom: none;
}

.virtual-table__cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

textarea {
  overflow-y: scroll;
  height: 100px;
}

body {
  margin: 2rem;
  font: 1rem/1.4 system-ui, sans-serif;
}

label {
  display: block;
}

table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

td,
th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

th {
  background-color: #dddddd;
}

input[type="text"],
select {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  margin-top: 25px;
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.table-count {
  font-weight: 600;
  color: #4a4a4a;
}
dd {
  margin-left: 0;
  margin-bottom: 0.5rem;
  display: list-item;
  list-style-type: disc;
}
dt {
  font-weight: bold;
}
</style>
