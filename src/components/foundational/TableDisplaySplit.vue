<template>
  <v-card-text>
    <v-window v-model="tab">
      <v-window-item value="table-view">
        <div>
          <input
            type="text"
            placeholder="Filter by start timestamp, phase or duration values"
            v-model="filter"
          />
          <table>
            <thead>
              <tr>
                <th>Start Timestamp</th>
                <th>Phase</th>
                <th>Duration (seconds)</th>
                <th>Phase Termination Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in filteredRows"
                :key="`employee-${index}`"
              >
                <td v-html="highlightMatches(row.timestampStart)"></td>
                <td v-html="highlightMatches(String(row.phase))"></td>
                <td v-html="highlightMatches(String(row.duration))"></td>
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
  data() {
    return {
      tab: null,
      filter: "",
    };
  },
  computed: {
    filteredRows() {
      return this.tableData.filter((row) => {
        const timestamp = row.timestampStart.toLowerCase();
        const enumeration = row.phase.toString().toLowerCase();
        const channel = row.duration.toString();
        const terminationReason = row.termReason.toString().toLowerCase();
        const searchTerm = this.filter.toLowerCase();
        return (
          timestamp.includes(searchTerm) ||
          enumeration.includes(searchTerm) ||
          channel.includes(searchTerm) ||
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
  },
};
</script>
