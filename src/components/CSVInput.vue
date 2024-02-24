<template>
  <div>
    <div class="grow-wrap">
      <textarea name="text" id="csvInput" v-model="csvData"></textarea>

      <v-card>
        <v-tabs v-model="tab" bg-color="primary" center>
          <v-tab @click="processCSV" value="table-view">
            <v-icon>mdi-table</v-icon>
            Tabluated
          </v-tab>
          <v-tab @click="processTimeSeriesData" value="two">
            <v-icon>mdi-text</v-icon>
            Explained
          </v-tab>
          <v-tab value="three">
            <v-icon>mdi-chart-bar-stacked</v-icon>
            Graph
          </v-tab>
        </v-tabs>

        <v-card-text>
          <v-window v-model="tab">
            <v-window-item value="table-view">
              <div>
                <input
                  type="text"
                  placeholder="Filter by timestamp, enumeration or channel/phase"
                  v-model="filter"
                />
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
            </v-window-item>

            <v-window-item value="two">
              <span>
                <div>
                  <dl>
                    <v-list
                      v-for="(item, index) in timeSeriesText"
                      :key="index"
                    >
                      <dt>{{ item[0] }}</dt>
                      <!--Timestamp-->
                      <v-list
                        v-for="(signalEventArray, i) in item.slice(1)"
                        :key="i"
                      >
                        <dd
                          v-for="(signalEvent, j) in signalEventArray.split(
                            ','
                          )"
                          :key="j"
                        >
                          {{ signalEvent }}
                        </dd>
                      </v-list>
                    </v-list>
                  </dl>
                </div>
              </span>
            </v-window-item>

            <v-window-item value="three">
              Something
              <a
                href="https://observablehq.com/@d3/the-impact-of-vaccines?intent=fork"
                >like this
              </a>
              to be explored in another month.
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    csvDataProcessed: Function,
  },
  data() {
    return {
      tab: null,
      csvData: "",
      filter: "",
      humanDate: 0,
      rowData: [],
      timeSeriesText: [],
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
        21: "Pedestrian Begin Walk",
        22: "Pedestrian Begin Clearance",
        23: "Pedestrian Begin Solid Don’t Walk",
        24: "Pedestrian Dark",
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
        150: "Coord cycle state change",
        151: "Coordinated phase yield point",
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
    convertTimestamp(ts) {
      console.log("ts: " + ts);
      const date = new Date(Date.UTC(70, 0, 0, 0, 0, ts / 10, ts % 10));
      // Convert the date to a human-readable format
      console.log(date);
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        fractionalSecondDigits: 3,
        timeZone: "UTC",
      };
      this.humanDate = date.toLocaleDateString(undefined, options);
      return date.toLocaleDateString(undefined, options);
    },
    parameterSwitch(e) {
      if (e < 24 || (e >= 41 && e < 60)) {
        return "Phase";
      } else if (e === 31) {
        return "Barrier";
      } else if (e >= 32 && e <= 33) {
        return "FYA";
      } else if (e >= 61 && e <= 80) {
        return "Overlap";
      } else if (e >= 81 && e <= 89) {
        return "Detector Channel";
      } else if (e >= 89 && e <= 100) {
        return "Pedestrian Detector";
      } else if (e >= 101 && e <= 111) {
        return "Preempt";
      } else if (e >= 112 && e <= 115) {
        return "TSP";
      } else if (e === 131) {
        return "Pattern";
      } else if (e >= 132 && e <= 133) {
        return "Seconds";
      } else if (e >= 134 && e <= 149) {
        return "New Split time in Seconds";
      } else if (e === 150) {
        return "Coordination State Change";
      } else if (e === 151) {
        return "Phase";
      } else {
        return "Channel";
      }
    },
    processCSV() {
      const rows = this.csvData.split("\n");
      const processedData = rows.map((row) => {
        const values = row.split(",");
        this.convertTimestamp(Number(values[0]));
        let tempEnumeration;
        this.enumerations[Number(values[1])]
          ? (tempEnumeration = this.enumerations[Number(values[1])])
          : (tempEnumeration = "-");

        if (this.enumerations[Number(values[1])]) {
          console.log("The value is in the array.");
        } else {
          console.log("The value is not in the array.");
        }

        const explainInfo = {
          timestamp: this.humanDate,
          enumeration: tempEnumeration,
          channel: Number(values[2]),
        };
        this.rowData.push(explainInfo);
        console.log(typeof explainInfo.enumeration);
        return explainInfo;
      });
      //this.csvDataProcessed(processedData);

      console.log(processedData);
    },
    handleProcessedData(data) {
      this.processedData = data;
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

    processTimeSeriesData() {
      const signalStates = {};
      console.log(this.csvData);

      const rows = this.csvData.split("\n");

      rows.map((row) => {
        const [timestamp, state, chan] = row.split(", ");
        const time = Math.floor(parseFloat(timestamp));
        console.log(
          "Time: " +
            time +
            " " +
            typeof time +
            " " +
            this.convertTimestamp(time)
        );

        if (signalStates[time]) {
          signalStates[time].push({ state, chan });
        } else {
          signalStates[time] = [{ state, chan }];
        }
      });

      const output = [];
      for (const time in signalStates) {
        const states = signalStates[time]
          .map(
            ({ state, chan }) =>
              `${this.parameterSwitch(chan)} ${chan} ${
                this.enumerations[state]
              }`
          )
          .join();
        output.push([`${this.convertTimestamp(Number(time))}`, `${states}`]);
        console.log(states);
      }
      this.timeSeriesText = output;
      return output;
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

<style scoped>
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
