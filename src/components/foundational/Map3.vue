<template>
  <div style="height: 600px; width: 100%">
    <l-map
      ref="map"
      :zoom="zoom"
      :center="center"
      @update:zoom="zoomUpdated"
      @update:center="centerUpdated"
      @update:bounds="boundsUpdated"
    >
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
      <l-geo-json
        v-if="mapData"
        :geojson="updateGeoJSON"
        :options="geoJsonStyles"
      />
      <l-marker :lat-lng="mapMarkerToPt">
        <l-popup>{{ markerLocation }}</l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script>
// DON'T load Leaflet components here!
// Its CSS is needed though, if not imported elsewhere in your application.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LMap,
  LTileLayer,
  LGeoJson,
  LMarker,
  LPopup,
} from "@vue-leaflet/vue-leaflet"; //https://github.com/vue-leaflet/vue-leaflet

//sat image
//https://stackoverflow.com/questions/9394190/leaflet-map-api-with-google-satellite-layer
//https://github.com/wandersoncs/leaflet-tilelayer-here?tab=readme-ov-file

export default {
  components: {
    L,
    LMap,
    LTileLayer,
    LGeoJson,
    LMarker,
    LPopup,
  },
  props: {
    mapData: {
      type: Object,
      required: true,
      value: null,
    },
    inputLocation: {
      type: Object,
      required: false,
      value: null,
    },
    latLng: {
      type: Object,
      required: false,
      value: null,
    },
  },
  computed: {
    mapMarkerToPt() {
      console.log(this.inputLocation[0].Coordinates.split(","));
      const latString = this.inputLocation[0].Coordinates.split(",")[0];
      const lngString = this.inputLocation[0].Coordinates.split(",")[1];
      const outLocation = [parseFloat(latString), parseFloat(lngString)];
      this.markerLocation = this.inputLocation[0];
      console.log(outLocation);
      this.zoomUpdated(18);
      this.centerUpdated(outLocation);

      return outLocation;
    },
    updateGeoJSON() {
      console.log("Map data trying to plot:", this.mapData);
      if (this.mapData.features.length > 0) {
        const coordinates = this.mapData.features[0].geometry.coordinates;
        const latLngs = coordinates.map((coord) => [coord[1], coord[0]]);

        const { center, zoom } = this.getCenterAndZoomFromGeoJson(
          LMap,
          this.mapData
        );

        this.center = center; //latLngs[0];
        this.zoom = zoom; //15;
      }
      return this.mapData;
    },
  },
  data() {
    return {
      zoom: 4,
      center: [40.17029, -105.095],
      bounds: null,
      geojson: this.mapData,
      markerLocation: null,

      geoJsonStyles() {
        return {
          color: "#FF0000", // GPX track color
          weight: 5,
        };
      },
    };
  },
  methods: {
    latLonUpdate(location) {
      console.log(location);
      this.latLng = location;
    },
    zoomUpdated(zoom) {
      this.zoom = zoom;
    },
    boundsUpdated(bounds) {
      this.bounds = bounds;
    },
    centerUpdated(center) {
      this.center = center;
    },
    getCenterAndZoomFromGeoJson(map, geoJsonData) {
      // Create a GeoJSON layer from the data
      const geoJsonLayer = L.geoJSON(geoJsonData);

      // Get the bounds of the GeoJSON layer
      const bounds = geoJsonLayer.getBounds();

      this.boundsUpdated(bounds);

      // Calculate the center of the bounds
      const center = bounds.getCenter();

      //console.log(this.zoom, ":", this.bounds);

      const zoom = 13;

      return {
        center: center,
        zoom: zoom,
      };
    },
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
