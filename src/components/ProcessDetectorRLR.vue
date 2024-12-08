<template>
  <div>
    <simple-intersection-input-card
      @rlr-events="handleRLREvents"
    ></simple-intersection-input-card>
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
  </div>
</template>

<script>
import { mapState } from "pinia";
import { mapActions } from "pinia";
import { useDataStore } from "../stores/data";
//import DetectorInputCard from "./foundational/DetectorInputCard.vue";
import SimpleIntersectionInputCard from "../components/foundational/SimpleIntersectionInputCard.vue";

export default {
  components: { SimpleIntersectionInputCard },
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
  },
};
</script>

<style lang="scss" scoped>
canvas {
  max-width: 100%;
}
</style>
