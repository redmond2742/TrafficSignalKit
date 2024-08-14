<template>
  <v-container>
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
        <v-btn color="info" @click="gpxZoom">Zoom to GPX</v-btn>
      </v-col>
    </v-row>
    <GPXMapper></GPXMapper>
  </v-container>
</template>

<script>
import InputBox from "@/components/foundational/InputBox.vue";
import processTimeSpace from "../mixins/processTimeSpace";
import GPXMapper from "../components/foundational/Map3.vue";

export default {
  mixins: [processTimeSpace],
  components: {
    InputBox,
    GPXMapper,
  },
  data() {
    return {
      xmlString: "",
      cards: [],
      childSignalData: [],
      gpx: "",
      textboxDefaultText: "Paste in GPX file as text in XML format",
      signalCardCount: 0,
      inputData: "",
      gpxBoxXY: [],
    };
  },
  methods: {
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
    handleSignalData(sigID, staticObjectDataObj) {
      //this.childSignalData.push(staticObjectDataObj);

      this.childSignalData[sigID] = staticObjectDataObj;

      console.log("emitted data :", sigID, this.childSignalData);
    },
    btnProcessGPX() {
      this.gpxBoxXY = this.ProcessGPX(
        this.inputData,
        this.childSignalData,
        true //map points for mapping
      );
    },
    gpxZoom() {
      let xMin = this.gpxBoxXY[0];
      let yMin = this.gpxBoxXY[1];
      let xMax = this.gpxBoxXY[2];
      let yMax = this.gpxBoxXY[3];

      this.zoomToDimensions(xMin, xMax, yMin, yMax);
    },
    parseStaticObjInfo(staticObjDataArray) {
      const objects = [];
      staticObjDataArray.forEach((item) => {
        console.log(item);
        let object = {};
        if (item.hdData) {
          object = {
            name: item.name,
            type: item.typeStaticObject,
            latitude: item.latitude,
            longitude: item.longitude,
            latlon: [item.latitude, item.longitude],
            distances: [[], []],
            cDistance: [],
            phase: item.phaseValue,
            tspPreempt: item.tspValue,
            tspEvents: item.tspEvents,
            phaseData: item.phaseData,
            startTimeISO: item.phaseData[0].timestampStartISO,
          };
        } else {
          object = {
            name: item.name,
            type: item.typeStaticObject,
            latitude: item.latitude,
            longitude: item.longitude,
            latlon: [item.latitude, item.longitude],
            distances: [[], []],
            cDistance: [],
            phase: item.phaseValue,
            tspPreempt: item.tspValue,
            phaseData: item.phaseData,
          };
        }

        objects.push(object);
      });
      return objects;
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
