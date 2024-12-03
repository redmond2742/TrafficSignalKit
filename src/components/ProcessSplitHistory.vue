<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->
  </div>
  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="textboxDefaultText" />
  </div>
  <div>
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
  data() {
    return {
      inputData: "",
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
  methods: {
    calculatePhaseDurations() {
      this.hdDataObj = this.loadCsv2JsonObj(this.inputData); //load all the enumerations into JSON obj.
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
