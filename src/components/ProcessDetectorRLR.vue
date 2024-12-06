<template>
  <div>
    <simple-intersection-input-card></simple-intersection-input-card>
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
  computed: {
    ...mapState(useDataStore, {
      counter: "count",
    }),
  },
  methods: {
    ...mapActions(useDataStore, ["increment"]),
  },
};
</script>

<style lang="scss" scoped>
canvas {
  max-width: 100%;
}
</style>
