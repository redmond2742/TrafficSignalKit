<template>
  <v-card-text>
    <v-window v-model="tab">
      <v-window-item value="table-view">
        <div>
          <input
            type="text"
            placeholder="Filter by start timestamp, cycle length, phase or duration values"
            v-model="filter"
          />
          <table v-if="dataIsPresent">
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
                <td v-html="highlightMatches(String(row.phase))"></td>
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
    },
  },
  mounted() {
    // Log the Data to inspect its structure
    //console.log("Phase Data:", this.tableData);
  },
  data() {
    return {
      tab: null,
      filter: "",
    };
  },
  computed: {
    dataIsPresent() {
      return this.tableData !== null || this.tableData.length > 0;
    },
    filteredRows() {
      return this.tableData.filter((row) => {
        const timestamp = row.timestampStart.toLowerCase();
        const cycleCount = row.cycleCount.toString();
        const enumeration = row.phase.toString().toLowerCase();
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
  },
  methods: {
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
    truncateToOneDecimal(number) {
      // Truncate the number to one decimal place
      return String(Math.floor(number * 10) / 10);
    },
  },
};
</script>
