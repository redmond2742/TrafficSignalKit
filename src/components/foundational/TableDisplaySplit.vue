<template>
  <v-card-text>
    <v-window v-model="tab">
      <v-window-item value="table-view">
        <div>
          <table>
            <thead>
              <tr>
                <th>Termination Reason</th>
                <th v-for="phase in 8" :key="phase">Phase {{ phase }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gap Out</td>
                <td>{{ processedMetrics.gapOutPercent1 }}%</td>
                <td>{{ processedMetrics.gapOutPercent2 }}%</td>
                <td>{{ processedMetrics.gapOutPercent3 }}%</td>
                <td>{{ processedMetrics.gapOutPercent4 }}%</td>
                <td>{{ processedMetrics.gapOutPercent5 }}%</td>
                <td>{{ processedMetrics.gapOutPercent6 }}%</td>
                <td>{{ processedMetrics.gapOutPercent7 }}%</td>
                <td>{{ processedMetrics.gapOutPercent8 }}%</td>
              </tr>
              <tr>
                <td>Max Out</td>
                <td>{{ processedMetrics.maxOutPercent1 }}%</td>
                <td>{{ processedMetrics.maxOutPercent2 }}%</td>
                <td>{{ processedMetrics.maxOutPercent3 }}%</td>
                <td>{{ processedMetrics.maxOutPercent4 }}%</td>
                <td>{{ processedMetrics.maxOutPercent5 }}%</td>
                <td>{{ processedMetrics.maxOutPercent6 }}%</td>
                <td>{{ processedMetrics.maxOutPercent7 }}%</td>
                <td>{{ processedMetrics.maxOutPercent8 }}%</td>
              </tr>
              <tr>
                <td>Force Off</td>
                <td>{{ processedMetrics.forceOffPercent1 }}%</td>
                <td>{{ processedMetrics.forceOffPercent2 }}%</td>
                <td>{{ processedMetrics.forceOffPercent3 }}%</td>
                <td>{{ processedMetrics.forceOffPercent4 }}%</td>
                <td>{{ processedMetrics.forceOffPercent5 }}%</td>
                <td>{{ processedMetrics.forceOffPercent6 }}%</td>
                <td>{{ processedMetrics.forceOffPercent7 }}%</td>
                <td>{{ processedMetrics.forceOffPercent8 }}%</td>
              </tr>
              <tr>
                <td>Skipped</td>
                <td>{{ processedMetrics.skippedPercent1 }}%</td>
                <td>{{ processedMetrics.skippedPercent2 }}%</td>
                <td>{{ processedMetrics.skippedPercent3 }}%</td>
                <td>{{ processedMetrics.skippedPercent4 }}%</td>
                <td>{{ processedMetrics.skippedPercent5 }}%</td>
                <td>{{ processedMetrics.skippedPercent6 }}%</td>
                <td>{{ processedMetrics.skippedPercent7 }}%</td>
                <td>{{ processedMetrics.skippedPercent8 }}%</td>
              </tr>
            </tbody>
          </table>
          <br /><br />
          <input
            type="text"
            placeholder="Filter by start timestamp, cycle length, phase or duration values"
            v-model="filter"
          />
          <br />
          <table>
            <thead>
              <tr>
                <th>Start Timestamp</th>
                <th>#/Cycle Length</th>
                <th>Phase</th>
                <th>Duration (G/Y/AR)</th>
                <th>Phase Termination Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in filteredRows"
                :key="`employee-${index}`"
              >
                <td v-html="highlightMatches(row.timestampStart)"></td>
                <td
                  v-html="
                    highlightMatches(
                      `${String(row.cycleCount)} / ${truncateToOneDecimal(
                        row.cycleLength
                      )}`
                    )
                  "
                ></td>
                <td
                  v-html="highlightMatches(`Phase ${String(row.phase)}`)"
                ></td>
                <td
                  v-html="
                    highlightMatches(
                      `${truncateToOneDecimal(
                        row.duration
                      )} (${truncateToOneDecimal(
                        row.greenTime
                      )}/${truncateToOneDecimal(
                        row.yellowTime
                      )}/${truncateToOneDecimal(row.allRedTime)})`
                    )
                  "
                ></td>
                <td v-html="highlightMatches(row.termReason)"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-window-item>
    </v-window>
  </v-card-text>
</template>

<script>
export default {
  components: {},
  props: {
    tableData: {
      type: Array,
      required: true,
      value: [],
    },
  },
  mounted() {
    // Log the Data to inspect its structure
    //console.log("Phase Data:", this.tableData);
    this.isDataPresent();
  },
  data() {
    return {
      tab: null,
      filter: "",
      showTables: true,
    };
  },
  computed: {
    filteredRows() {
      return this.tableData.filter((row) => {
        const timestamp = row.timestampStart.toLowerCase();
        const cycleCount = row.cycleCount.toString();
        const enumeration = "phase " + row.phase.toString().toLowerCase();
        const duration =
          row.duration.toString() +
          "(" +
          row.greenTime.toString() +
          "/" +
          row.yellowTime.toString() +
          "/" +
          row.allRedTime.toString() +
          ")";
        const terminationReason = row.termReason.toString().toLowerCase();
        const searchTerm = this.filter.toLowerCase();
        return (
          timestamp.includes(searchTerm) ||
          cycleCount.includes(searchTerm) ||
          enumeration.includes(searchTerm) ||
          duration.includes(searchTerm) ||
          terminationReason.includes(searchTerm)
        );
      });
    },
    processedMetrics() {
      if (this.isDataLoaded()) {
        let maxLength = this.tableData.length - 1;

        let phaseData = this.tableData[maxLength];

        return {
          gapOutPercent1: phaseData.gapOutPercents[0],
          gapOutPercent2: phaseData.gapOutPercents[1],
          gapOutPercent3: phaseData.gapOutPercents[2],
          gapOutPercent4: phaseData.gapOutPercents[3],
          gapOutPercent5: phaseData.gapOutPercents[4],
          gapOutPercent6: phaseData.gapOutPercents[5],
          gapOutPercent7: phaseData.gapOutPercents[6],
          gapOutPercent8: phaseData.gapOutPercents[7],
          maxOutPercent1: phaseData.maxOutPercents[0],
          maxOutPercent2: phaseData.maxOutPercents[1],
          maxOutPercent3: phaseData.maxOutPercents[2],
          maxOutPercent4: phaseData.maxOutPercents[3],
          maxOutPercent5: phaseData.maxOutPercents[4],
          maxOutPercent6: phaseData.maxOutPercents[5],
          maxOutPercent7: phaseData.maxOutPercents[6],
          maxOutPercent8: phaseData.maxOutPercents[7],
          forceOffPercent1: phaseData.forceOffPercents[0],
          forceOffPercent2: phaseData.forceOffPercents[1],
          forceOffPercent3: phaseData.forceOffPercents[2],
          forceOffPercent4: phaseData.forceOffPercents[3],
          forceOffPercent5: phaseData.forceOffPercents[4],
          forceOffPercent6: phaseData.forceOffPercents[5],
          forceOffPercent7: phaseData.forceOffPercents[6],
          forceOffPercent8: phaseData.forceOffPercents[7],
          skippedPercent1: phaseData.skippedPercents[0],
          skippedPercent2: phaseData.skippedPercents[1],
          skippedPercent3: phaseData.skippedPercents[2],
          skippedPercent4: phaseData.skippedPercents[3],
          skippedPercent5: phaseData.skippedPercents[4],
          skippedPercent6: phaseData.skippedPercents[5],
          skippedPercent7: phaseData.skippedPercents[6],
          skippedPercent8: phaseData.skippedPercents[7],
        };
      } else {
        return "";
      }
    },
  },
  methods: {
    isDataLoaded() {
      if (this.tableData.length > 0) {
        return true;
      } else {
        return false;
      }
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
        console.log("Filter Text is number, not text");
      }
    },
    truncateToOneDecimal(number) {
      // Truncate the number to one decimal place
      return String(Math.floor(number * 10) / 10);
    },
    isDataPresent() {
      if (this.tableData != null && this.tableData.length > 0) {
        this.tableData = true;
      }
      return this.showTables;
    },
  },
};
</script>
