<template>
  <div>
    &nbsp;

    <h1 class="h1-center-text">Traffic Signal Split Calculator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Split Calculator" value="about">
          <v-expansion-panel-text>
            This is a simple signal timing calculator for setting the "split"
            time of traffic lights. It helps decide how long each phase can be
            allocated. By balancing the green light time well, it helps to
            lessen traffic jams, make traffic flow smoother, and increase safety
            on the roads.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Detailed Explination: Phase Splits"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            Coordinated traffic signals use a agreed upon cycle length to help
            align the green phases on coordinated phases. Splits are the green,
            yellow and red time of a phase and are only used in coordination and
            this calculator helps confirm that adding up one ring of the splits
            sum up to the cycle length.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            <pre>

1. Include a brief label for intersection and/or pattern #/name.
2. Set the Cycle length and distribute time over existing phases.
3. Label each phase based on the sequence of phases.
4. Set the direction and movement type for each phase.
5. Modify splits accordingly to determine if the sum is equal to the cycle length.

            </pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />

    <!--
     <RingBarrier></RingBarrier>

   -->

    <SplitCard></SplitCard>
  </div>
</template>

<script>
import SplitCard from "../components/SplitCard.vue";

//import { defineComponent } from '@vue/composition-api'

export default {
  name: "SplitCalculator",
  components: {
    SplitCard,
  },
  data() {
    return {
      panel: [],
    };
  },
  methods: {
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
  },
};
</script>
