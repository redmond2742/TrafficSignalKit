<template>
  <v-container>
    <v-col cols="12">
      <h3>GPX Text Input</h3>
      <div class="grow-wrap">
        <InputBox v-model="inputData" :defaultText="textboxDefaultText" />
        <br />
      </div>

      <v-row>
        <div class="center">
          <v-btn @click="btnProcessGPX" color="primary">Plot</v-btn>
          <!--
            <v-btn color="info" @click="gpxZoom">Zoom to GPX</v-btn>
          -->
        </div>
        <br />
      </v-row>
      <br />
      <GPXMapper
        :mapData="mapJSONData"
        :inputLocation="selectedPoint"
      ></GPXMapper>
      <br />
      <div>
        <v-data-table-virtual
          v-model="selectedPoint"
          :items="dataTableItems"
          :headers="headers"
          height="400"
          item-value="name"
          return-object
          show-select
        >
          <template v-slot:item.copy="{ item }">
            <v-btn icon @click="copyCoordinates(item)">
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
          </template>
        </v-data-table-virtual>
        <v-snackbar v-model="snackbar" timeout="2000" color="success">
          {{ snackbarMessage }}
        </v-snackbar>
      </div>
    </v-col>
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
      mapJSONData: null,
      textboxDefaultText: "Paste in GPX file as text in XML format",
      signalCardCount: 0,
      inputData: "",
      gpxBoxXY: [],
      selectedPoint: [],
      dataTableItems: [],
      headers: [
        { title: "Timestamp", align: "start", key: "Timestamp" },
        { title: "Latitude, Longitude", align: "end", key: "Coordinates" },
        { title: "Speed (MPH)", align: "end", key: "speed" },
        { title: "Bearing (deg)", align: "end", key: "bearing" },
        { title: "Elevation (ft)", align: "end", key: "elevation" },
        { title: "Copy", align: "end", key: "copy", sortable: false },
      ],
      snackbar: false,
      snackbarMessage: "",
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
      this.mapJSONData = this.gpxMapData;
      if (this.inputData.length > 0) {
        console.log("this shouldn't run unless inputbox");
        this.dataTableItems = this.convertGPXToArray();
      }
    },
    convertGPXToArray() {
      const dataArray = [];

      if (!this.gpxPointList || this.gpxPointList.length === 0) {
        return dataArray;
      }

      for (let i = 0; i < this.gpxPointList.length; i++) {
        const pt = this.gpxPointList[i];

        const lat = pt.lat;
        const lon = pt.lon;
        const coordinates = `${lat}, ${lon}`;

        const ele = pt.ele || pt.elevation || null;
        const time = pt.time ? pt.time.toISOString() : null;
        const speed = pt.speed || null;
        const bearing = pt.course || null;

        dataArray.push({
          Timestamp: time ? new Date(time).toLocaleString() : "",
          OGtimestamp: time,
          Coordinates: coordinates,
          speed: speed ? (speed * 2.23694).toFixed(2) : null,
          bearing: bearing,
          elevation: ele ? (ele * 3.28084).toFixed(2) : null,
        });
      }

      return dataArray;
    },
    copyCoordinates(item) {
      if (!item || !item.Coordinates) return;
      const parts = item.Coordinates.split(',');
      if (parts.length < 2) return;
      const lat = parts[0].trim();
      const lon = parts[1].trim();
      const coordString = `${lon},${lat}`;
      navigator.clipboard
        .writeText(coordString)
        .then(() => {
          this.snackbarMessage = `Copied ${coordString}`;
          this.snackbar = true;
        })
        .catch(() => {
          this.snackbarMessage = 'Copy failed';
          this.snackbar = true;
        });
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

.center {
  display: flex;
  justify-content: center; /* Center horizontally */
  align-items: center; /* Center vertically */
  height: 100%; /* Optional: Adjust this if you need to vertically center within a certain height */
}
</style>
