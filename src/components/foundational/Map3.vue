<template>
  <div style="height: 600px; width: 800px">
    <l-map ref="map" :zoom="zoom" :center="center">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
      <l-geo-json :geojson="geojson" :options="geoJsonStyles" />
    </l-map>
  </div>
</template>

<script>
// DON'T load Leaflet components here!
// Its CSS is needed though, if not imported elsewhere in your application.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LGeoJson } from "@vue-leaflet/vue-leaflet";
import * as toGeoJSON from "togeojson";

//sat image
//https://stackoverflow.com/questions/9394190/leaflet-map-api-with-google-satellite-layer
//https://github.com/wandersoncs/leaflet-tilelayer-here?tab=readme-ov-file

export default {
  components: {
    L,
    LMap,
    LTileLayer,
    LGeoJson,
  },
  data() {
    return {
      zoom: 13,
      center: [37.899074228876366, -122.0617524032553],
      gpxData: null,
      geojson: {
        type: "FeatureCollection",
        features: [
          // ...
        ],
      },
      processGPX(d) {
        //todo
      },

      geoJsonStyle() {
        return {
          color: "#FF0000", // GPX track color
          weight: 5,
        };
      },
    };
  },
  /*async beforeMount() {
    // HERE is where to load Leaflet components!
    const { circleMarker } = await import("leaflet/dist/leaflet-src.esm");

    // And now the Leaflet circleMarker function can be used by the options:
    this.geojsonOptions.pointToLayer = (feature, latLng) =>
      circleMarker(latLng, { radius: 8 });
    this.mapIsReady = true;
  },*/
};
</script>
