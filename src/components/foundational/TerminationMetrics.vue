Let's update your component to display the gapOutArrayPercent, maxOutPercents,
and forceOffPercents arrays in a table. We'll remove the metric component and
replace it with a table structure to display the data. Here is the updated
TerminationMetrics.vue component: vue Copy code
<template>
  <div :key="componentKey">
    {{ componentKey }}
    <button @click="reloadComponent">Reload Component</button>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Gap Out Percent</th>
          <th>Max Out Percent</th>
          <th>Force Off Percent</th>
          <th>Skipped Percent</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(percent, index) in gapOutArrayPercent" :key="index">
          <td>Phase {{ index + 1 }}</td>
          <td>{{ gapOutArrayPercent[index] }}%</td>
          <td>{{ maxOutArrayPercent[index] }}%</td>
          <td>{{ forceOffArrayPercent[index] }}%</td>
          <td>{{ skippedPercent[index] }}%</td>
        </tr>
      </tbody>
    </table>
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
  created() {
    this.processTerminationArray();
  },
  mounted() {
    // Log the Data to inspect its structure
    console.log("Phase Data:");
    this.createGapOutMetrics();
    this.createMaxOutMetrics();
    this.createForceOffMetrics();
    this.createSkippedfMetrics();
  },
  watch: {
    gapOutMetrics: {
      handler(newVal, oldVal) {
        this.createGapOutMetrics();
      },
      deep: true,
    },
  },
  data() {
    return {
      gapOutArrayPercent: [],
      maxOutArrayPercent: [],
      forceOffArrayPercent: [],
      skippedArrayPercent: [],
      componentKey: 0, // Key to force re-render

      gapOutMetrics: [],
      maxOutMetrics: [],
      forceOffMetrics: [],
      skippedMetrics: [],
    };
  },

  methods: {
    createGapOutMetrics() {
      for (let i = 0; i < this.gapOutArrayPercent.length; i++) {
        let metricObj = {
          label: `Ph ${i + 1}`,
          value: this.gapOutArrayPercent[i],
          unit: "%",
        };

        this.gapOutMetrics.push(metricObj);
      }
    },
    createMaxOutMetrics() {
      for (let i = 0; i < this.maxOutArrayPercent.length; i++) {
        let metricObj = {
          label: `Ph ${i + 1}`,
          value: this.maxOutArrayPercent[i],
          unit: "%",
        };

        this.maxOutMetrics.push(metricObj);
      }
    },
    createForceOffMetrics() {
      for (let i = 0; i < this.forceOffArrayPercent.length; i++) {
        let metricObj = {
          label: `Ph ${i + 1}`,
          value: this.forceOffArrayPercent[i],
          unit: "%",
        };

        this.forceOffMetrics.push(metricObj);
      }
    },
    createSkippedfMetrics() {
      for (let i = 0; i < this.skippedArrayPercent.length; i++) {
        let metricObj = {
          label: `Ph ${i + 1}`,
          value: this.skippedArrayPercent[i],
          unit: "%",
        };

        this.skippedMetrics.push(metricObj);
      }
    },
    processTerminationArray() {
      this.phaseData.filter((row) => {
        this.gapOutArrayPercent = row.gapOutPercents;
        this.maxOutArrayPercent = row.maxOutPercents;
        this.forceOffArrayPercent = row.forceOffPercents;
        this.skippedArrayPercent = row.skippedPercents;
      });
      //console.log("TERM-Component:", this.phaseData[1]);
    },
    reloadComponent() {
      this.componentKey += 1; // Update the key to force re-render
      console.log(this, this.componentKey);
    },
  },
  computed: {},
};
</script>
<style>
.metrics-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Adjust spacing between metrics if needed */
.metrics-container > * {
  margin-right: 20px; /* Adjust margin as needed */
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
}

th {
  background-color: #f2f2f2;
}
</style>
