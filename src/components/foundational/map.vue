<template>
  <div>
    <l-map style="height: 500px; width: 100%" :zoom="zoom" :center="center">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <l-geo-json
        v-if="gpxData"
        :geojson="gpxData"
        :options-style="geoJsonStyle"
      />
    </l-map>
    <input type="file" @change="loadGpxFile" accept=".gpx" />
  </div>
</template>

<script>
import { LMap, LTileLayer, LGeoJson } from "vue2-leaflet";
import "leaflet/dist/leaflet.css";
//import * as toGeoJSON from "togeojson";

export default {
  components: {
    LMap,
    LTileLayer,
    LGeoJson,
  },
  data() {
    return {
      zoom: 13,
      center: [51.505, -0.09],
      gpxData: null,
    };
  },
  methods: {
    loadGpxFile(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(
            e.target.result,
            "application/xml"
          );
          this.gpxData = toGeoJSON.gpx(gpxDoc);
          // Center the map on the GPX data
          if (this.gpxData.features.length > 0) {
            const coordinates = this.gpxData.features[0].geometry.coordinates;
            const latLngs = coordinates.map((coord) => [coord[1], coord[0]]);
            this.center = latLngs[0];
            this.zoom = 15; // Adjust zoom based on your preferences
          }
        };
        reader.readAsText(file);
      }
    },
    geoJsonStyle() {
      return {
        color: "#FF0000", // GPX track color
        weight: 5,
      };
    },
  },
};
</script>

<style>
/* Optionally add custom styles here */
</style>
