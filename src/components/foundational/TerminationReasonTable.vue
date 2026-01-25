<template>
  <v-card-text>
    <div v-if="processedMetrics">
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
    </div>
    <div v-else class="empty-state">No termination data available.</div>
  </v-card-text>
</template>

<script>
export default {
  props: {
    tableData: {
      type: Array,
      required: true,
      value: [],
    },
  },
  computed: {
    processedMetrics() {
      if (!this.isDataLoaded()) {
        return null;
      }

      const phaseData = this.tableData[this.tableData.length - 1];
      if (!phaseData) {
        return null;
      }

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
    },
  },
  methods: {
    isDataLoaded() {
      return this.tableData.length > 0;
    },
  },
};
</script>

<style scoped>
.empty-state {
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}
</style>
