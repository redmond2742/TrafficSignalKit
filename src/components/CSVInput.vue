<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->

    <div class="grow-wrap">
      <InputBox v-model="inputData" />

      <v-card>
        <v-card-text>
          <v-btn
            color="primary"
            :loading="isProcessing"
            :disabled="isProcessing || !inputData.trim()"
            @click="processCSV"
          >
            Process High Resolution Data
          </v-btn>
        </v-card-text>

        <v-card-text>
          <div>
            <input
              type="text"
              placeholder="Filter by timestamp, enumeration or channel/phase"
              v-model="filter"
            />
            <div class="table-actions">
              <v-btn
                color="secondary"
                :disabled="!rowData.length"
                @click="exportToExcel"
              >
                Export to Excel
              </v-btn>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Enumeration</th>
                  <th>Channel/Phase</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in filteredRows"
                  :key="`employee-${index}`"
                >
                  <td v-html="highlightMatches(row.timestamp)"></td>
                  <td v-html="row.enumeration"></td>
                  <td v-html="row.channel"></td>
                </tr>
              </tbody>
            </table>
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
      filter: "",
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
    highlightMatches(text) {
      if (typeof text === "string") {
        const matchExists = text
          .toLowerCase()
          .includes(this.filter.toLowerCase());
        if (!matchExists) return text;
        const re = new RegExp(this.filter, "ig");
        return text.replace(
          re,
          (matchedText) => `<strong>${matchedText}</strong>`
        );
      } else {
        console.log("number, not text");
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
  computed: {
    filteredRows() {
      return this.rowData.filter((row) => {
        const timestamp = row.timestamp.toString().toLowerCase();
        const enumeration = row.enumeration.toString().toLowerCase();
        const channel = row.channel.toString();
        const searchTerm = this.filter.toLowerCase();
        return (
          timestamp.includes(searchTerm) ||
          enumeration.includes(searchTerm) ||
          channel.includes(searchTerm)
        );
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
.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
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
