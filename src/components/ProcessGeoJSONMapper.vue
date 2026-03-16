<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="7">
        <v-file-input
          multiple
          chips
          accept=".geojson,.json,application/geo+json,application/json"
          label="Upload one or more GeoJSON files"
          prepend-icon="mdi-map"
          show-size
          @update:model-value="onGeoJsonUpload"
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-btn color="secondary" block :disabled="!layers.length" @click="zoomToAllLayers">
          Zoom to Data
        </v-btn>
      </v-col>
      <v-col cols="12" md="2" class="d-flex align-center">
        <v-btn color="primary" block :disabled="!layers.length" @click="exportMapImage">
          Export Image
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3">
      {{ errorMessage }}
    </v-alert>

    <v-row v-if="layers.length" class="mb-2">
      <v-col cols="12">
        <h3>Layer Styles</h3>
      </v-col>
      <v-col v-for="layer in layers" :key="layer.id" cols="12" class="layer-row">
        <v-row align="center">
          <v-col cols="12" md="4">
            <strong>{{ layer.name }}</strong>
          </v-col>
          <v-col cols="6" md="3">
            <v-text-field
              v-model="layer.color"
              type="color"
              label="Color"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-slider
              v-model="layer.weight"
              :min="1"
              :max="12"
              :step="1"
              label="Line Thickness"
              thumb-label
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex justify-end">
            <v-btn color="error" variant="text" @click="removeLayer(layer.id)">
              Remove
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <div ref="mapWrapper" class="map-wrapper">
      <l-map ref="mapRef" :zoom="zoom" :center="center" class="leaflet-map">
        <l-tile-layer :url="tileUrl" :attribution="attribution" />
        <l-geo-json
          v-for="layer in layers"
          :key="layer.id"
          :geojson="layer.geoJson"
          :options-style="layerStyle(layer)"
        />
      </l-map>
    </div>

    <v-row class="mt-4">
      <v-col cols="12">
        <h3>Paste GeoJSON Text</h3>
        <v-textarea
          v-model="pastedGeoJson"
          label="Paste GeoJSON text below the map"
          rows="8"
          auto-grow
          clearable
        />
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-text-field v-model="pastedLayerColor" type="color" label="Color" hide-details />
      </v-col>
      <v-col cols="12" sm="8" md="3">
        <v-slider
          v-model="pastedLayerWeight"
          :min="1"
          :max="12"
          :step="1"
          label="Line Thickness"
          thumb-label
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-btn color="primary" block @click="addPastedGeoJson">Add Pasted GeoJSON</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import html2canvas from "html2canvas";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LGeoJson } from "@vue-leaflet/vue-leaflet";

const DEFAULT_COLORS = [
  "#ff0000",
  "#0066ff",
  "#00a86b",
  "#ff8c00",
  "#8a2be2",
  "#e91e63",
  "#795548",
];

export default {
  name: "ProcessGeoJSONMapper",
  components: {
    LMap,
    LTileLayer,
    LGeoJson,
  },
  data() {
    return {
      layers: [],
      layerCounter: 1,
      center: [39.5, -98.35],
      zoom: 4,
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      errorMessage: "",
      pastedGeoJson: "",
      pastedLayerColor: "#ff0000",
      pastedLayerWeight: 4,
    };
  },
  methods: {
    getNextColor() {
      return DEFAULT_COLORS[this.layers.length % DEFAULT_COLORS.length];
    },
    isValidGeoJson(geoJson) {
      return !!(geoJson && geoJson.type);
    },
    layerStyle(layer) {
      return {
        color: layer.color,
        weight: layer.weight,
        fillColor: layer.color,
        fillOpacity: 0.25,
      };
    },
    addLayer(geoJson, name, color = this.getNextColor(), weight = 4) {
      this.layers.push({
        id: this.layerCounter,
        name,
        geoJson,
        color,
        weight,
      });
      this.layerCounter += 1;
    },
    async onGeoJsonUpload(fileOrFiles) {
      this.errorMessage = "";
      const files = Array.isArray(fileOrFiles)
        ? fileOrFiles
        : fileOrFiles
        ? [fileOrFiles]
        : [];

      if (!files.length) {
        return;
      }

      let successfulAdds = 0;
      for (const file of files) {
        try {
          const text = await file.text();
          const parsedGeoJson = JSON.parse(text);
          if (!this.isValidGeoJson(parsedGeoJson)) {
            throw new Error(`Invalid GeoJSON in ${file.name}`);
          }
          this.addLayer(parsedGeoJson, file.name);
          successfulAdds += 1;
        } catch (error) {
          this.errorMessage = `Could not parse ${file.name}. Please upload valid GeoJSON.`;
          console.error(error);
        }
      }

      if (successfulAdds > 0) {
        this.$nextTick(() => this.zoomToAllLayers());
      }
    },
    addPastedGeoJson() {
      this.errorMessage = "";
      if (!this.pastedGeoJson.trim()) {
        this.errorMessage = "Paste GeoJSON text before adding.";
        return;
      }

      try {
        const parsedGeoJson = JSON.parse(this.pastedGeoJson);
        if (!this.isValidGeoJson(parsedGeoJson)) {
          throw new Error("Invalid pasted GeoJSON.");
        }

        this.addLayer(
          parsedGeoJson,
          `Pasted Layer ${this.layerCounter}`,
          this.pastedLayerColor,
          this.pastedLayerWeight
        );
        this.pastedGeoJson = "";
        this.$nextTick(() => this.zoomToAllLayers());
      } catch (error) {
        this.errorMessage =
          "Unable to read pasted text. Please paste valid GeoJSON.";
        console.error(error);
      }
    },
    removeLayer(layerId) {
      this.layers = this.layers.filter((layer) => layer.id !== layerId);
      if (this.layers.length > 0) {
        this.$nextTick(() => this.zoomToAllLayers());
      }
    },
    zoomToAllLayers() {
      try {
        if (!this.layers.length || !this.$refs.mapRef?.leafletObject) {
          return;
        }

        const combinedLayer = L.featureGroup(
          this.layers.map((layer) => L.geoJSON(layer.geoJson))
        );
        const bounds = combinedLayer.getBounds();

        if (bounds.isValid()) {
          this.$refs.mapRef.leafletObject.fitBounds(bounds.pad(0.15));
        }
      } catch (error) {
        this.errorMessage = "Could not fit map bounds to loaded GeoJSON layers.";
        console.error(error);
      }
    },
    async exportMapImage() {
      if (!this.$refs.mapWrapper) {
        return;
      }

      const canvas = await html2canvas(this.$refs.mapWrapper, {
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = "geojson-map.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
  },
};
</script>

<style scoped>
.map-wrapper {
  height: 600px;
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
}

.leaflet-map {
  height: 100%;
  width: 100%;
}

.layer-row {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
}
</style>
