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
      <div v-if="summaryLine" class="summary-line">
        {{ summaryLine }}
      </div>
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
          item-height="48"
          item-value="name"
          return-object
          show-select
        >
          <template v-slot:item.streetView="{ item }">
            <a :href="item.streetView" target="_blank">Street View</a>
          </template>
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
      summaryMetrics: null,
      headers: [
        { title: "Timestamp", align: "start", key: "Timestamp" },
        { title: "Latitude, Longitude", align: "end", key: "Coordinates" },
        { title: "Speed (MPH)", align: "end", key: "speed" },
        { title: "Bearing (deg)", align: "end", key: "bearing" },
        { title: "Elevation (ft)", align: "end", key: "elevation" },
        {
          title: "Street View",
          align: "end",
          key: "streetView",
          sortable: false,
        },
        { title: "Copy", align: "end", key: "copy", sortable: false },
      ],
      snackbar: false,
      snackbarMessage: "",
    };
  },
  computed: {
    summaryLine() {
      if (!this.summaryMetrics) {
        return "";
      }

      return `Summary: Duration ${this.summaryMetrics.duration} • Total Distance ${this.summaryMetrics.distance} • Avg Speed ${this.summaryMetrics.avgSpeed} • Points ${this.summaryMetrics.pointCount}`;
    },
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
        // Rows and summary come from a single walk of the points; they used to
        // be two passes, each running its own haversine over every point.
        const { rows, summary } = this.buildRowsAndSummary();
        this.dataTableItems = rows;
        this.summaryMetrics = summary;
      }
    },
    /**
     * Builds the table rows and the summary in one walk of the points.
     *
     * These were two methods, each doing its own haversine over every point,
     * and the row builder additionally round-tripped each timestamp through
     * toISOString() and back into a new Date just to format it.
     */
    buildRowsAndSummary() {
      const points = this.gpxPointList;
      if (!points || points.length === 0) {
        return { rows: [], summary: null };
      }

      const rows = new Array(points.length);
      let totalDistanceFt = 0;
      let previous = null;
      let previousBearing = null;

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const { lat, lon } = point;
        const elevation = point.ele ?? point.elevation ?? null;
        // point.time is already a Date; the old code stringified it and reparsed
        // it before formatting.
        const iso = point.time ? point.time.toISOString() : null;

        let speed = null;
        let bearing = point.course || null;
        let streetView = "";

        if (previous) {
          if (lat === previous.lat && lon === previous.lon) {
            speed = 0;
            if (previousBearing !== null && previousBearing !== undefined) {
              bearing = previousBearing;
            }
          } else {
            const distanceFt = this.earthDistance(
              [previous.lat, previous.lon],
              [lat, lon],
              false
            );
            totalDistanceFt += distanceFt;

            const seconds = (point.time.getTime() - previous.time.getTime()) / 1000;
            if (seconds !== 0) {
              speed = (distanceFt / seconds) * 0.681818;
            }
            if (!bearing) {
              bearing = this.calculateBearing(previous.lat, previous.lon, lat, lon);
            }
          }
          streetView =
            `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}` +
            `&heading=${bearing || 0}&pitch=0&fov=80`;
        }

        rows[i] = {
          Timestamp: point.time ? point.time.toLocaleString() : "",
          OGtimestamp: iso,
          Coordinates: `${lat}, ${lon}`,
          speed: speed !== null ? speed.toFixed(2) : null,
          bearing: bearing !== null ? parseFloat(bearing).toFixed(2) : null,
          elevation: elevation ? (elevation * 3.28084).toFixed(2) : null,
          streetView,
        };

        previous = point;
        previousBearing = bearing;
      }

      return { rows, summary: this.summarize(points, totalDistanceFt) };
    },

    /** Formats the totals accumulated while building the rows. */
    summarize(points, totalDistanceFt) {
      if (points.length < 2) return null;

      const startTime = points[0].time?.getTime?.();
      const endTime = points[points.length - 1].time?.getTime?.();
      const totalSeconds = startTime && endTime ? (endTime - startTime) / 1000 : 0;

      let distanceDisplay = `${totalDistanceFt.toFixed(2)} ft`;
      if (totalDistanceFt >= 5280) {
        distanceDisplay = `${(totalDistanceFt / 5280).toFixed(2)} miles`;
      }

      return {
        duration: totalSeconds > 0 ? this.formatDuration(totalSeconds) : "N/A",
        distance: distanceDisplay,
        avgSpeed:
          totalSeconds > 0
            ? `${((totalDistanceFt / totalSeconds) * 0.681818).toFixed(1)} MPH`
            : "N/A",
        pointCount: points.length,
      };
    },

    calculateBearing(lat1, lon1, lat2, lon2) {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const toDeg = (rad) => (rad * 180) / Math.PI;

      const dLon = toRad(lon2 - lon1);
      const y = Math.sin(dLon) * Math.cos(toRad(lat2));
      const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

      let brng = toDeg(Math.atan2(y, x));
      brng = (brng + 360) % 360;
      return brng;
    },
    copyCoordinates(item) {
      if (!item || !item.Coordinates) return;
      const parts = item.Coordinates.split(",");
      if (parts.length < 2) return;
      const lat = parts[0].trim();
      const lon = parts[1].trim();
      const coordString = `${lat},${lon}`;
      navigator.clipboard
        .writeText(coordString)
        .then(() => {
          this.snackbarMessage = `Copied ${coordString}`;
          this.snackbar = true;
        })
        .catch(() => {
          this.snackbarMessage = "Copy failed";
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

.summary-line {
  font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
}
</style>
