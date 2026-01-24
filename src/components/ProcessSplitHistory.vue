<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->
  </div>
  <div v-if="!hideInput" class="grow-wrap">
    <InputBox v-model="localInputData" :defaultText="textboxDefaultText" />
  </div>
  <div v-if="!hideInput">
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
//mixins
import processPhaseSplits from "../mixins/processPhaseSplits";
// components
import InputBox from "./foundational/InputBox.vue";
import TableDisplaySplit from "./foundational/TableDisplaySplit.vue";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
    TableDisplaySplit,
  },
  props: {
    inputData: {
      type: String,
      default: "",
    },
    hideInput: {
      type: Boolean,
      default: false,
    },
    autoProcess: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localInputData: "",
      hdDataObj: [],
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as Text in CSV format",
    };
  },
  created() {
    // Resetting the variable in the created hook
    this.phaseArray = [];
  },
  computed: {},
  watch: {
    inputData: {
      immediate: true,
      handler(value) {
        if (value !== this.localInputData) {
          this.localInputData = value || "";
        }
        if (this.autoProcess && this.localInputData.trim()) {
          this.calculatePhaseDurations();
        }
        if (this.autoProcess && !this.localInputData.trim()) {
          this.rowData = [];
          this.$emit("phaseDurations", this.rowData);
        }
      },
    },
  },
  methods: {
    resetPhaseState() {
      this.phasesInCycle = [];
      this.phaseArray = [];
      this.activePhasesInCycle = [];
      this.cycleCount = 1;
      this.countCycles = 1;
      this.currentCycleLength = 0;
      this.rowData = [];
      this.processedData = [];
      this.eventStates = {};
      this.totalPhaseCalls = [];
      this.previousYellowChangeState = false;
      this.previousRedClearState = false;
      this.previousPhaseState = false;
      this.previousDetectorState = false;
    },
    calculatePhaseDurations() {
      if (!this.localInputData.trim()) {
        this.rowData = [];
        this.$emit("phaseDurations", this.rowData);
        return;
      }
      this.resetPhaseState();
      this.hdDataObj = this.loadCsv2JsonObj(this.localInputData); //load all the enumerations into JSON obj.
      let allHDData = this.buildCycleItem(this.hdDataObj);
      //emit here not necessary because buildCycleItem emit's the phase data
      console.log(allHDData);
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
