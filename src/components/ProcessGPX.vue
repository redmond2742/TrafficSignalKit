<template>
  <v-container class="grey lighten-5">
    <div class="left-justify-text">
      <v-expansion-panels v-model="gpxPanel" multiple>
        <v-expansion-panel
          title="Signal Locations as CSV: Name,Latitude,Longitude"
          value="about"
        >
          <v-expansion-panel-text>
            <div class="grow-wrap">
              <InputBox
                v-model="signalLocations"
                :defaultText="signalInfoTextboxDefaultText"
              />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-container>

  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="gpxTextboxDefaultText" />
  </div>
  <br />
  <div class="button-container">
    <v-row>
      <v-btn color="primary" @click="btnProcessGPX">Plot</v-btn>
      <hr />
      <hr />
      <hr />

      <v-switch
        v-model="switchValue"
        color="primary"
        label="Show Speeds as Color"
      ></v-switch>
    </v-row>
  </div>

  <br />
  <v-row>
    <v-col cols="2"></v-col>
    <div class="metrics-container">
      <metric :data="datetime"></metric>
    </div>
    <v-col cols="2"></v-col>
  </v-row>

  <v-row>
    <v-col cols="4"></v-col>
    <div class="metrics-container">
      <metric :data="travelTime"></metric>
      <metric :data="travelDist"></metric>
      <metric :data="avgSpeed"></metric>
    </div>
  </v-row>
  <v-row>
    <v-col cols="4"></v-col>
    <div class="metrics-container">
      <metric :data="numStops"></metric>
      <metric :data="durationStops"></metric>
      <metric :data="avgDurationStops"></metric>
    </div>
  </v-row>

  <br />
  <div>
    <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>

    <canvas ref="scatterPlotCanvas"></canvas>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import Metric from "./foundational/Metric.vue";
import processTimeSpace from "../mixins/processTimeSpace";

export default {
  mixins: [processTimeSpace],
  components: { InputBox, Metric },
  props: {},
  data() {
    return {
      gpxTextboxDefaultText: "Paste in GPX file in XML format",
      signalInfoTextboxDefaultText:
        "For each signal location, Paste in CSV of: Name, Latitude, Longitude",
      gpxPanel: ["signal locations"],
      inputData: "",
      signalLocations: "",
    };
  },
  mounted() {},
  methods: {
    btnProcessGPX() {
      this.ProcessGPX(this.inputData, this.signalLocations);
    },
    createSignal(signalName, signalData) {
      return {
        label: signalName,
        data: signalData,
        backgroundColor: "rgba(200, 200, 200, 0.2)",
        borderColor: "rgba(150, 150, 150, 1)",
        borderWidth: 1,
        showLine: true,
        fill: false,
      };
    },
    parseCSVToSignalObj(csvString) {
      // Split the CSV string into individual lines
      const lines = csvString.trim().split("\n");

      // Initialize an empty array to store the parsed objects
      const objects = [];

      // Iterate over each line and parse its fields
      lines.forEach((line) => {
        // Split the line into fields (name, latitude, longitude)
        const fields = line.trim().split(",");

        // Extract name, latitude, and longitude from the fields
        const name = fields[0].trim();
        const latitude = parseFloat(fields[1].trim());
        const longitude = parseFloat(fields[2].trim());

        // Construct an object with name, latitude, and longitude
        const object = {
          name: name,
          latitude: latitude,
          longitude: longitude,
          latlon: [latitude, longitude],
          distances: [[], []],
          cDistance: [],
        };

        // Push the object to the array of parsed objects
        objects.push(object);
      });

      // Return the array of parsed objects
      return objects;
    },
  },
};
</script>

<style scoped>
textarea {
  height: 400px;
}
signaltextarea {
  height: 200px;
}
.metrics-container {
  display: flex;
  justify-content: center;
}

/* Adjust spacing between metrics if needed */
.metrics-container > * {
  margin-right: 20px; /* Adjust margin as needed */
}
.button-space {
  margin-left: 20px;
}
</style>
