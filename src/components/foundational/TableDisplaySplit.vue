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
              <tr>
                <td>Total Count</td>
                <td>{{ processedMetrics.totalPhaseCalls1 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls2 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls3 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls4 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls5 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls6 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls7 }}</td>
                <td>{{ processedMetrics.totalPhaseCalls8 }}</td>
              </tr>
            </tbody>
          </table>
          <br /><br />
          <div class="split-history-controls">
            <v-btn
              color="primary"
              class="split-history-export"
              @click="downloadCsv"
              :disabled="exportRows.length === 0"
            >
              Download CSV (Excel)
            </v-btn>
          </div>
          <br />
          <table>
            <thead>
              <tr class="split-history-filter-row">
                <th>
                  <input
                    v-model="filters.timestamp"
                    type="text"
                    placeholder="Filter timestamp"
                    aria-label="Filter start timestamp"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.cycle"
                    type="text"
                    placeholder="Filter cycle"
                    aria-label="Filter cycle length"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.phase"
                    type="text"
                    placeholder="Filter phase"
                    aria-label="Filter phase"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.duration"
                    type="text"
                    placeholder="Filter duration"
                    aria-label="Filter duration"
                  />
                </th>
                <th>
                  <input
                    v-model="filters.termination"
                    type="text"
                    placeholder="Filter termination"
                    aria-label="Filter termination reason"
                  />
                </th>
              </tr>
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
                <td v-html="highlightMatches(row.timestampStart, filters.timestamp)"></td>
                <td
                  v-html="
                    highlightMatches(
                      `${String(row.cycleCount)} / ${truncateToOneDecimal(
                        row.cycleLength
                      )}`,
                      filters.cycle
                    )
                  "
                ></td>
                <td
                  v-html="
                    highlightMatches(`Phase ${String(row.phase)}`, filters.phase)
                  "
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
                      ,
                      filters.duration
                    )
                  "
                ></td>
                <td
                  v-html="
                    highlightMatches(row.termReason, filters.termination)
                  "
                ></td>
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
      filters: {
        timestamp: "",
        cycle: "",
        phase: "",
        duration: "",
        termination: "",
      },
      showTables: true,
    };
  },
  computed: {
    filteredRows() {
      return this.tableData.filter((row) => {
        const timestamp = String(row.timestampStart).toLowerCase();
        const cycle = `${String(row.cycleCount)} / ${this.truncateToOneDecimal(
          row.cycleLength
        )}`.toLowerCase();
        const enumeration = `phase ${String(row.phase)}`.toLowerCase();
        const duration = `${this.truncateToOneDecimal(
          row.duration
        )} (${this.truncateToOneDecimal(
          row.greenTime
        )}/${this.truncateToOneDecimal(
          row.yellowTime
        )}/${this.truncateToOneDecimal(row.allRedTime)})`.toLowerCase();
        const terminationReason = String(row.termReason).toLowerCase();
        const timestampFilter = this.filters.timestamp.toLowerCase();
        const cycleFilter = this.filters.cycle.toLowerCase();
        const phaseFilter = this.filters.phase.toLowerCase();
        const durationFilter = this.filters.duration.toLowerCase();
        const terminationFilter = this.filters.termination.toLowerCase();
        return (
          timestamp.includes(timestampFilter) &&
          cycle.includes(cycleFilter) &&
          enumeration.includes(phaseFilter) &&
          duration.includes(durationFilter) &&
          terminationReason.includes(terminationFilter)
        );
      });
    },
    exportRows() {
      return this.filteredRows.map((row) => ({
        timestamp: row.timestampStart,
        cycleLength: this.truncateToOneDecimal(row.cycleLength),
        phase: row.phase,
        duration: this.truncateToOneDecimal(row.duration),
        termReason: row.termReason,
      }));
    },
    processedMetrics() {
      if (this.isDataLoaded()) {
        let maxLength = this.tableData.length - 1;

        let phaseData = this.tableData[maxLength];

        console.log(phaseData);

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
          totalPhaseCalls1: phaseData.totalPhaseCalls[0],
          totalPhaseCalls2: phaseData.totalPhaseCalls[1],
          totalPhaseCalls3: phaseData.totalPhaseCalls[2],
          totalPhaseCalls4: phaseData.totalPhaseCalls[3],
          totalPhaseCalls5: phaseData.totalPhaseCalls[4],
          totalPhaseCalls6: phaseData.totalPhaseCalls[5],
          totalPhaseCalls7: phaseData.totalPhaseCalls[6],
          totalPhaseCalls8: phaseData.totalPhaseCalls[7],
        };
      } else {
        return "";
      }
    },
  },
  methods: {
    buildCsvValue(value) {
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      const escapedValue = stringValue.replace(/"/g, '""');
      if (/[",\n]/.test(escapedValue)) {
        return `"${escapedValue}"`;
      }
      return escapedValue;
    },
    buildCsvContent() {
      const header = [
        "Start Timestamp",
        "Cycle Length (s)",
        "Phase",
        "Duration (s)",
        "Termination Reason",
      ];
      const rows = this.exportRows.map((row) => [
        row.timestamp,
        row.cycleLength,
        row.phase,
        row.duration,
        row.termReason,
      ]);
      return [header, ...rows]
        .map((row) => row.map(this.buildCsvValue).join(","))
        .join("\n");
    },
    downloadCsv() {
      const csvContent = this.buildCsvContent();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "High_Resolution_Split_History.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    isDataLoaded() {
      if (this.tableData.length > 0) {
        return true;
      } else {
        return false;
      }
    },
    highlightMatches(text, filterValue) {
      if (typeof text === "string") {
        const normalizedFilter = String(filterValue || "").toLowerCase();
        if (!normalizedFilter) {
          return text;
        }
        const matchExists = text.toLowerCase().includes(normalizedFilter);
        if (!matchExists) return text;
        const re = new RegExp(this.escapeRegExp(filterValue), "ig");
        return text.replace(
          re,
          (matchedText) => `<strong>${matchedText}</strong>`
        );
      } else {
        console.log("Filter Text is number, not text");
      }
    },
    escapeRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
<style scoped>
.split-history-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.split-history-filter-row input {
  width: 100%;
  min-width: 140px;
  padding: 6px 8px;
  border: 1px solid #c7c7c7;
  border-radius: 4px;
  font-size: 0.9rem;
}
</style>
