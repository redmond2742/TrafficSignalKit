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
      <!-- :lat-lng="mapMarkerToPt()"
    :lat-lng="coordinate" -->
      <l-marker
        v-for="(locData, index) in this.inputLocation"
        :key="index"
        :lat-lng="checkLocationInput(locData)"
      >
        <l-popup>{{ markerInfo }}</l-popup>
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
      required: false,
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
    ptToMarker(location) {
      console.log(this.inputLocation, location);
      let lat = location.split(",")[0];
      let lon = location.split(",")[1];
      let updatedLocation = [parseFloat(lat), parseFloat(lon)];
      return updatedLocation;
    },
    mapMarkerToPt() {
      let allMarkers = [];
      if (this.inputLocation != null) {
        console.log(this.inputLocation, this.inputLocation.length);
        for (let i = 0; i < this.inputLocation.length; i++) {
          if (true) {
            console.log("GPX info", i, this.inputLocation[i]);
            //allMarkers.push(this.inputLocation[i]);
            allMarkers.push([
              this.inputLocation[i][0],
              this.inputLocation[i][1],
            ]);
          } else {
            const latString = this.inputLocation[i].Coordinates.split(",")[0];
            const lngString = this.inputLocation[i].Coordinates.split(",")[1];
            allMarkers.push([parseFloat(latString), parseFloat(lngString)]);
            this.markerInfo = this.inputLocation[i];
          }

          //console.log(outLocation);
          //this.zoomUpdated(18);
          //this.centerUpdated(outLocation[i]);
        }
      }
      console.log(allMarkers);
      return allMarkers;
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
      center: [0, 0],
      bounds: null,
      geojson: this.mapData,
      markerLocation: [],

      geoJsonStyles() {
        return {
          color: "#FF0000", // GPX track color
          weight: 5,
        };
      },
    };
  },
  methods: {
    checkLocationInput(loc) {
      console.log("input:", loc, typeof loc, loc.length, loc?.Coordinates);
      if (loc === null || loc.length == 0) {
        console.log("no markers found");
      } else if (loc?.Coordinates === undefined) {
        //basic array of locations (default locations)
        console.log("basic pt");
        return loc;
      } else {
        console.log("gpx data");
        const latitude = loc.Coordinates.split(",")[0];
        const longitude = loc.Coordinates.split(",")[1];
        const newMarker = [parseFloat(latitude), parseFloat(longitude)];
        this.markerInfo = loc;

        //this.centerUpdated(newMarker);

        this.zoomUpdated(16);

        return newMarker;
      }
    },
    markerUpdate(location) {
      console.log(location);
      this.latLng = location;
    },
    centerUpdated(center) {
      this.center = center;
    },
    zoomUpdated(zoom) {
      this.zoom = zoom;
    },
    boundsUpdated(bounds) {
      this.bounds = bounds;
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
