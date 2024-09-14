<template>
  <div>
    RLR Component
    {{ counter }}
    <v-btn @click="increment()">Increment {{ counter }}</v-btn>
    <detector-input-card></detector-input-card>
  </div>
</template>

<script>
import { mapState } from "pinia";
import { mapActions } from "pinia";
import { useDataStore } from "../stores/data";
import DetectorInputCard from "./foundational/DetectorInputCard.vue";

export default {
  components: { DetectorInputCard },
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

<style lang="scss" scoped></style>
