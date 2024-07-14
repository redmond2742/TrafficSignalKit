<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-btn @click="addCard" color="primary"
          >Add Traffic Signals or Bus Stops (TOTAL:{{ signalCardCount }})</v-btn
        >
      </v-col>
    </v-row>
    <v-row>
      <v-col v-for="(card, index) in cards" :key="index" cols="12" sm="12">
        <signal-input-card
          :card-id="index"
          @signal-data="handleSignalData"
        ></signal-input-card>
      </v-col>
    </v-row>
    <v-col>
      <h3>GPX Text Input</h3>
      <div class="grow-wrap">
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />
      </div>
    </v-col>
    <v-row>
      <v-col cols="12">
        <v-btn @click="btnProcessGPX" color="primary">Plot</v-btn>
        <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>
      </v-col>
    </v-row>
    <canvas ref="scatterPlotCanvas"></canvas>
  </v-container>
</template>

<script>
import SignalInputCard from "@/components/foundational/SignalInputCard.vue";
import InputBox from "@/components/foundational/InputBox.vue";
import processTimeSpace from "../mixins/processTimeSpace";

export default {
  mixins: [processTimeSpace],
  components: {
    SignalInputCard,
    InputBox,
  },
  data() {
    return {
      xmlString: "",
      cards: [],
      childSignalData: "",
      gpx: "",
      textboxDefaultText: "Paste in GPX as text in XML format",
      signalCardCount: 0,
      inputData: "",
    };
  },
  methods: {
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
    addCard() {
      this.cards.push({});
      this.signalCardCount++;
    },
    handleSignalData(sigID, sigDataObj) {
      this.childSignalData = sigDataObj;

      console.log("emitted data :", sigID, this.childSignalData);
    },
    btnProcessGPX() {
      this.ProcessGPX(this.inputData);
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
