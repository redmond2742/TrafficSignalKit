<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <v-btn @click="bProcessGPX">Process</v-btn>
  <br />
  {{ outputData }}
</template>

<script>
import InputBox from "./InputBox.vue";
import { parseGPX } from "@we-gold/gpxjs"; //https://github.com/We-Gold/gpxjs
import { GPXParser } from "gpxparser";

export default {
  components: { InputBox },
  props: {},
  data() {
    return {
      tracks: [],
      inputData: "",
      outputData: "sample",
    };
  },
  methods: {
    bProcessGPX(input) {
      let gpxParser = require("gpxparser");
      let gpx = new gpxParser();
      gpx.parse(InputBox);

      const totalDistance = gpx.tracks[0].distance.total;
      this.outputData = totalDistance;
      console.log(this.outputData);
    },
  },
};
</script>

<style scoped></style>
