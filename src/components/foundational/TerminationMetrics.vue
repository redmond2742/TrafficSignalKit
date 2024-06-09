<template>
  <div>
    <v-row>
      <v-col cols="12"></v-col>
      <div class="metrics-container">
        <h2>Gap Out</h2>
        <metric :data="processTerminationArray"></metric>
      </div>
    </v-row>
  </div>
</template>
<script>
import Metric from "./Metric.vue";

export default {
  components: { Metric },
  props: {
    phaseData: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    // Log the Data to inspect its structure
    //console.log("Phase Data:", this.phaseData);
  },
  data() {
    return {
      gapOutArrayPercent: [],
      maxOutArrayPercent: [],
      forceOffArrayPercent: [],
      skippedArrayPercent: [],
      metricGapOut1: {
        label: "Phase 1",
        value: "",
        unit: "%",
      },
    };
  },
  computed: {
    processTerminationArray() {
      this.phaseData.filter((row) => {
        this.gapOutArrayPercent = row.gapOutPercents;
        this.maxOutArrayPercent = row.maxOutPercents;
        this.forceOffArrayPercent = row.forceOffPercents;
        this.skippedArrayPercent = row.skippedPercents;
      });
      //console.log("TERM-Component:", this.phaseData[1]);

      //TODO: For loop around phases to build up each one for displaying

      let metricObj = {};
      metricObj = {
        label: "Phase 2",
        value: this.gapOutArrayPercent[0],
        unit: "%",
      };
      this.metricGapOut1 = metricObj;
      console.log("TERM: Updating metric value");
      return metricObj;
    },
  },
};
</script>
