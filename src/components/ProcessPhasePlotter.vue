<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <div>
    <v-btn @click="plotPhaseDurations" color="primary">Plot</v-btn>
  </div>
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
                <td v-html="row.phase"></td>
                <td v-html="row.duration"></td>
                <td v-html="row.termReason"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-window-item>
    </v-window>
  </v-card-text>
</template>

<script>
import InputBox from "../components/InputBox.vue";
import enumerationObj from "../data/enumerations.json";

export default {
  components: {
    InputBox,
  },
  data() {},
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
</style>
