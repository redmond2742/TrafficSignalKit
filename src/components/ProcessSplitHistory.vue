<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->
  </div>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <div>
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import processPhaseSplits from "../mixins/processPhaseSplits";
import TableDisplaySplit from "./foundational/TableDisplaySplit.vue";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
    TableDisplaySplit,
  },
  data() {
    return {
      inputData: "",
      //rowData: [],
      hdDataObj: [],
      //countCycles: 1,
      //cycleCount: 1,
      //currentCycleLength: 0,
      //phasesInCycle: [],
      //activePhasesInCycle: [],
      //phaseArray: [],
      //phaseElementsCount: 8, //update based on available JS items logged for each phase
      /*terminationResults: {
        phase1: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase2: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase3: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase4: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase5: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase6: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase7: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase8: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
      },
      */
      //maxOutPercents: [],

      //allB1Phases: [1, 2, 5, 6],
      //allB2Phases: [3, 4, 7, 8],

      //incompleteB1Phases: [],
      //incompleteB2Phases: [],
      //completedB1Phases: [],
      //completedB2Phases: [],
      //unusedPhases: [],
      //activeB1Phases: [],
      //activeB2Phases: [],
      //timezone: "",
    };
  },
  created() {
    // Resetting the variable in the created hook
    this.phaseArray = [];
  },
  computed: {},
  methods: {
    calculatePhaseDurations() {
      this.hdDataObj = this.loadCsv2JsonObj(this.inputData); //load all the enumerations into JSON obj.
      this.buildCycleItem(this.hdDataObj);
      //this.rowData = this.fillInEndTime(this.rowData);
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
