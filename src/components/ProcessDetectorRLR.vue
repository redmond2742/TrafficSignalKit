<template>
  <div>
    <simple-intersection-input-card
      @rlr-events="handleRLREvents"
    ></simple-intersection-input-card>
  </div>
  <div>
    <dashboard-metric
      :yellowRunners="yellowRunners"
      :yAverageSeconds="yAverageSeconds"
      :redClearRunners="redClearRunners"
      :rcAverageSeconds="rcAverageSeconds"
      :redRunners="redRunners"
      :rAverageSeconds="rAverageSeconds"
    />
  </div>
  <div>
    <v-data-table-virtual
      :items="dataTableItems"
      :headers="headers"
      height="400"
      item-value="name"
      return-object
      show-select
    ></v-data-table-virtual>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { mapActions } from "pinia";
import { useDataStore } from "../stores/data";
//import DetectorInputCard from "./foundational/DetectorInputCard.vue";
import SimpleIntersectionInputCard from "../components/foundational/SimpleIntersectionInputCard.vue";
import DashboardMetric from "../components/foundational/DashboardMetric.vue";
import { ref } from "vue";

export default {
  components: { SimpleIntersectionInputCard, DashboardMetric },
  setup() {
    const dataStore = useDataStore();

    return { dataStore };
  },
  data() {
    return {
      headers: [
        { title: "Timestamp", align: "start", key: "Timestamp.humanReadable" },
        { title: "Type", align: "end", key: "Type" },
        {
          title: "Seconds into Yellow or Red",
          align: "end",
          key: "Elapse",
        },
      ],
      dataTableItems: [],
    };
  },
  computed: {
    ...mapState(useDataStore, {
      counter: "count",
    }),
  },
  methods: {
    ...mapActions(useDataStore, ["increment"]),
    handleRLREvents(data) {
      console.log("emitted data from process", data);
      let yEvents = this.countEventData(data, "Yellow Start/Yellow End");
      let rcEvents = this.countEventData(data, "Red Start/Red End");
      let rEvents = this.countEventData(data, "Red Start/Phase Inactive End");

      this.yellowRunners = yEvents.Count;
      this.yAverageSeconds = yEvents.AverageTime;
      this.redClearRunners = rcEvents.Count;
      this.rcAverageSeconds = rcEvents.AverageTime;
      this.redRunners = rEvents.Count;
      this.rAverageSeconds = rEvents.AverageTime;

      this.dataTableItems = data;
    },
    convertRLReventsToArray(rlrEvents) {
      const dataArray = [];

      for (let i = 0; i < rlrEvents.length; i++) {
        rlrEvents[i].Type;

        dataArray.push({
          Type: rlrEvents.Type,
        });
      }
    },
    countEventData(d, type) {
      let eventCount = 0;
      let sumEvent = 0;
      for (let i = 0; i < d.length; i++) {
        if (d[i].Type == type) {
          eventCount++;
          sumEvent = sumEvent + d[i].Elapse;
          console.log(d[i].Type, d[i].Elapse, sumEvent, sumEvent / eventCount);
        }
      }
      return {
        Count: eventCount,
        AverageTime: (sumEvent / eventCount).toFixed(2),
      };
    },
  },
};
</script>

<style lang="scss" scoped>
canvas {
  max-width: 100%;
}
</style>
