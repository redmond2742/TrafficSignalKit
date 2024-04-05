<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <div>
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
import InputBox from "../components/InputBox.vue";

export default {
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
    };
  },
  methods: {
    calculatePhaseDurations() {
      // Parse CSV data into an array of objects
      const rows = this.inputData
        .split("\n")
        .map((row) => row.trim().split(","));

      // Filter out rows with phases 1-8
      const filteredRows = rows.filter((row) => row[2] >= 1 && row[2] <= 8);

      // Initialize variables to store phase durations
      const phaseDurations = {};

      let phaseStartTime = null;
      let currentPhase = null;

      // Iterate over filtered rows to calculate phase durations
      for (let i = 0; i < filteredRows.length; i++) {
        const currentRow = filteredRows[i];
        const timestamp = parseInt(currentRow[0]);
        const enumeration = parseInt(rows[i][1]);
        const phase = parseInt(currentRow[2]);

        // TODO: Build up a Cycle Length with each phase having a Green time, Yellow Time and termination type
        // if the phase is repeating, close out that cycle length
        /*
            Push these values into each pahse.
            const examplePhase = {
                phaseNumber: 1,
                greenTime: 30, // seconds
                yellowTime: 5, // seconds
                phaseTerminationType: 'Force Off'
            };

        Push phases into a cycle length.

            IF phase is 1-8, then add to create a phase object.
            -look at enumeration: append state color and start/end time to that phase
            -if end time, then determine the termination of the phase reason from enumeration
            -if more than one phase has been served, then if repeated phase shows up, consider that a cycle legnth and start over. Calculate cycle time.
            


        */

        if (enumeration === 0 && phaseStartTime === null) {
          // Phase starts
          phaseStartTime = timestamp;
          currentPhase = phase;
        } else if (enumeration === 1) {
          phaseState = "Green";
        }

        if (!phaseDurations[phase]) {
          phaseDurations[phase] = 0;
        }

        if (i < filteredRows.length - 1) {
          const nextRow = filteredRows[i + 1];
          const nextTimestamp = parseInt(nextRow[0]);
          phaseDurations[phase] += nextTimestamp - timestamp;
        }
      }

      // Convert durations from milliseconds to seconds
      for (let phase in phaseDurations) {
        phaseDurations[phase] /= 1000;
      }
      console.log(phaseDurations);
      return phaseDurations;
    },
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
</style>
