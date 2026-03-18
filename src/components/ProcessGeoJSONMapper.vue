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
        <v-row align="center" @click="selectLayer(layer.id)">
          <v-col cols="12" md="4">
            <strong>{{ layer.name }}</strong>
          </v-col>
          <v-col cols="6" md="2">
            <v-checkbox
              v-model="layer.visible"
              label="Visible"
              hide-details
              density="compact"
              @update:model-value="onLayerVisibilityChange(layer.id)"
            />
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

    <v-alert
      v-if="layers.length"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Feature-level styling is supported from GeoJSON properties. Use
      <code>stroke</code>, <code>color</code>, <code>lineColor</code>,
      <code>fill</code>, <code>marker-color</code>, <code>marker-size</code>,
      <code>radius</code>, or a nested <code>style</code> object to give
      different features different colors and point sizes inside the same
      GeoJSON file.
    </v-alert>

    <div ref="mapWrapper" class="map-wrapper">
      <l-map ref="mapRef" :zoom="zoom" :center="center" class="leaflet-map">
        <l-tile-layer :url="tileUrl" :attribution="attribution" />
        <l-geo-json
          v-for="layer in visibleLayers"
          :key="layer.id"
          :geojson="layer.geoJson"
          :options="layerOptions(layer)"
          :options-style="layerStyle(layer)"
        />
      </l-map>
    </div>

    <v-row v-if="layerMetrics.length" class="mt-4">
      <v-col cols="12">
        <h3>Layer Metrics Summary</h3>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Features</th>
              <th>Line Length (mi)</th>
              <th>Polygon Perimeter (mi)</th>
              <th>Geometry Types</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="metric in layerMetrics" :key="metric.id">
              <td>{{ metric.name }}</td>
              <td>{{ metric.featureCount }}</td>
              <td>{{ formatMiles(metric.lineMiles) }}</td>
              <td>{{ formatMiles(metric.perimeterMiles) }}</td>
              <td>{{ metric.typeSummary }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="tonal">
          <v-card-title>Visible Layer Totals</v-card-title>
          <v-card-text>
            <div><strong>Total Features:</strong> {{ visibleTotals.featureCount }}</div>
            <div><strong>Total Line Length:</strong> {{ formatMiles(visibleTotals.lineMiles) }} mi</div>
            <div><strong>Total Polygon Perimeter:</strong> {{ formatMiles(visibleTotals.perimeterMiles) }} mi</div>
            <div><strong>Geometry Mix:</strong> {{ visibleTotals.typeSummary }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" v-if="selectedFeatureInfo">
        <v-card variant="outlined">
          <v-card-title>Clicked Feature Details</v-card-title>
          <v-card-text>
            <div><strong>Layer:</strong> {{ selectedFeatureInfo.layerName }}</div>
            <div><strong>Geometry:</strong> {{ selectedFeatureInfo.geometryType }}</div>
            <div><strong>Segment Length:</strong> {{ formatMiles(selectedFeatureInfo.segmentMiles) }} mi</div>
            <div><strong>Properties:</strong></div>
            <pre class="feature-json">{{ selectedFeatureInfo.propertiesText }}</pre>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <h3>GeoJSON Text Viewer / Paste</h3>
        <v-textarea
          v-model="activeLayerText"
          label="Selected layer text (editable for pasted content)"
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
        <v-btn color="primary" block @click="addPastedGeoJson">Add GeoJSON From Viewer</v-btn>
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
      activeLayerText: "",
      pastedLayerColor: "#ff0000",
      pastedLayerWeight: 4,
      selectedLayerId: null,
      selectedFeatureInfo: null,
    };
  },
  computed: {
    visibleLayers() {
      return this.layers.filter((layer) => layer.visible);
    },
    layerMetrics() {
      return this.layers.map((layer) => {
        const metrics = this.computeGeoJsonMetrics(layer.geoJson);
        return {
          id: layer.id,
          name: layer.name,
          ...metrics,
        };
      });
    },
    visibleTotals() {
      const totals = this.visibleLayers.reduce(
        (acc, layer) => {
          const metrics = this.computeGeoJsonMetrics(layer.geoJson);
          acc.featureCount += metrics.featureCount;
          acc.lineMiles += metrics.lineMiles;
          acc.perimeterMiles += metrics.perimeterMiles;
          Object.entries(metrics.typeCounts).forEach(([type, count]) => {
            acc.typeCounts[type] = (acc.typeCounts[type] || 0) + count;
          });
          return acc;
        },
        { featureCount: 0, lineMiles: 0, perimeterMiles: 0, typeCounts: {} }
      );

      return {
        ...totals,
        typeSummary:
          Object.entries(totals.typeCounts)
            .map(([type, count]) => `${type} (${count})`)
            .join(", ") || "None",
      };
    },
  },
  methods: {
    getNextColor() {
      return DEFAULT_COLORS[this.layers.length % DEFAULT_COLORS.length];
    },
    isValidGeoJson(geoJson) {
      return !!(geoJson && geoJson.type);
    },
    normalizeFeatureProperties(feature) {
      if (!feature || typeof feature !== "object") {
        return {};
      }

      const properties =
        feature.type === "Feature" && feature.properties && typeof feature.properties === "object"
          ? feature.properties
          : {};
      const nestedStyle =
        properties.style && typeof properties.style === "object" ? properties.style : {};

      return {
        ...properties,
        ...nestedStyle,
      };
    },
    firstDefinedValue(values) {
      return values.find(
        (value) =>
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value.trim() === "")
      );
    },
    normalizeColor(value, fallback) {
      if (typeof value !== "string") {
        return fallback;
      }

      const trimmed = value.trim();
      return trimmed || fallback;
    },
    normalizeNumber(value, fallback, minimum = 0) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      return Math.max(minimum, numeric);
    },
    normalizeOpacity(value, fallback) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      return Math.min(1, Math.max(0, numeric));
    },
    pointRadiusFromSize(size, fallback) {
      if (typeof size !== "string") {
        return fallback;
      }

      const normalized = size.trim().toLowerCase();
      if (normalized === "small") {
        return 4;
      }
      if (normalized === "medium") {
        return 7;
      }
      if (normalized === "large") {
        return 10;
      }
      return fallback;
    },
    getFeatureStyle(layer, feature) {
      const properties = this.normalizeFeatureProperties(feature);
      const strokeColor = this.normalizeColor(
        this.firstDefinedValue([
          properties.stroke,
          properties.lineColor,
          properties.line_color,
          properties.color,
          properties.outlineColor,
          properties.outline_color,
        ]),
        layer.color
      );
      const fillColor = this.normalizeColor(
        this.firstDefinedValue([
          properties.fill,
          properties.fillColor,
          properties.fill_color,
          properties["marker-color"],
          properties.markerColor,
          properties.marker_color,
          strokeColor,
        ]),
        strokeColor
      );

      return {
        color: strokeColor,
        weight: this.normalizeNumber(
          this.firstDefinedValue([
            properties["stroke-width"],
            properties.strokeWidth,
            properties.weight,
          ]),
          layer.weight,
          1
        ),
        opacity: this.normalizeOpacity(
          this.firstDefinedValue([
            properties["stroke-opacity"],
            properties.strokeOpacity,
            properties.opacity,
          ]),
          1
        ),
        fillColor,
        fillOpacity: this.normalizeOpacity(
          this.firstDefinedValue([
            properties["fill-opacity"],
            properties.fillOpacity,
          ]),
          0.25
        ),
      };
    },
    getPointStyle(layer, feature) {
      const featureStyle = this.getFeatureStyle(layer, feature);
      const properties = this.normalizeFeatureProperties(feature);
      const fallbackRadius = 7;

      return {
        ...featureStyle,
        radius: this.normalizeNumber(
          this.firstDefinedValue([
            properties.radius,
            properties.pointRadius,
            properties.point_radius,
            this.pointRadiusFromSize(
              this.firstDefinedValue([
                properties["marker-size"],
                properties.markerSize,
              ]),
              fallbackRadius
            ),
          ]),
          fallbackRadius,
          1
        ),
      };
    },
    layerStyle(layer) {
      return (feature) => this.getFeatureStyle(layer, feature);
    },
    layerOptions(layer) {
      return {
        pointToLayer: (feature, latLng) => {
          const pointStyle = this.getPointStyle(layer, feature);
          return L.circleMarker(latLng, pointStyle);
        },
        onEachFeature: (feature, leafletLayer) => {
          leafletLayer.on("click", (event) => {
            this.selectLayer(layer.id);
            this.handleFeatureClick(layer, feature, event);
          });
        },
      };
    },
    addLayer(geoJson, name, color = this.getNextColor(), weight = 4) {
      this.layers.push({
        id: this.layerCounter,
        name,
        geoJson,
        color,
        weight,
        visible: true,
      });
      this.selectedLayerId = this.layerCounter;
      this.activeLayerText = JSON.stringify(geoJson, null, 2);
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
      if (!this.activeLayerText.trim()) {
        this.errorMessage = "Paste GeoJSON text before adding.";
        return;
      }

      try {
        const parsedGeoJson = JSON.parse(this.activeLayerText);
        if (!this.isValidGeoJson(parsedGeoJson)) {
          throw new Error("Invalid pasted GeoJSON.");
        }

        this.addLayer(
          parsedGeoJson,
          `Pasted Layer ${this.layerCounter}`,
          this.pastedLayerColor,
          this.pastedLayerWeight
        );
        this.$nextTick(() => this.zoomToAllLayers());
      } catch (error) {
        this.errorMessage =
          "Unable to read pasted text. Please paste valid GeoJSON.";
        console.error(error);
      }
    },
    removeLayer(layerId) {
      this.layers = this.layers.filter((layer) => layer.id !== layerId);
      if (this.selectedLayerId === layerId) {
        this.selectedLayerId = this.layers[0]?.id || null;
        this.activeLayerText = this.layers[0]
          ? JSON.stringify(this.layers[0].geoJson, null, 2)
          : "";
      }
      if (this.layers.length > 0) {
        this.$nextTick(() => this.zoomToAllLayers());
      }
    },
    onLayerVisibilityChange(layerId) {
      this.selectLayer(layerId);
      this.$nextTick(() => this.zoomToAllLayers());
    },
    selectLayer(layerId) {
      this.selectedLayerId = layerId;
      const selectedLayer = this.layers.find((layer) => layer.id === layerId);
      if (selectedLayer) {
        this.activeLayerText = JSON.stringify(selectedLayer.geoJson, null, 2);
      }
    },
    formatMiles(value) {
      return Number.isFinite(value) ? value.toFixed(2) : "0.00";
    },
    computeGeoJsonMetrics(geoJson) {
      const features = geoJson.type === "FeatureCollection" ? geoJson.features || [] : [geoJson];
      const typeCounts = {};
      let lineMiles = 0;
      let perimeterMiles = 0;

      features.forEach((feature) => {
        const geometry = feature.type === "Feature" ? feature.geometry : feature;
        if (!geometry) {
          return;
        }

        typeCounts[geometry.type] = (typeCounts[geometry.type] || 0) + 1;
        lineMiles += this.getLineMiles(geometry);
        perimeterMiles += this.getPolygonPerimeterMiles(geometry);
      });

      return {
        featureCount: features.length,
        lineMiles,
        perimeterMiles,
        typeCounts,
        typeSummary:
          Object.entries(typeCounts)
            .map(([type, count]) => `${type} (${count})`)
            .join(", ") || "None",
      };
    },
    getLineMiles(geometry) {
      if (!geometry || !geometry.coordinates) {
        return 0;
      }
      if (geometry.type === "LineString") {
        return this.coordinatePathDistanceMiles(geometry.coordinates);
      }
      if (geometry.type === "MultiLineString") {
        return geometry.coordinates.reduce(
          (total, line) => total + this.coordinatePathDistanceMiles(line),
          0
        );
      }
      return 0;
    },
    getPolygonPerimeterMiles(geometry) {
      if (!geometry || !geometry.coordinates) {
        return 0;
      }
      if (geometry.type === "Polygon") {
        return geometry.coordinates.reduce(
          (total, ring) => total + this.coordinatePathDistanceMiles(ring),
          0
        );
      }
      if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.reduce(
          (polygonTotal, polygon) =>
            polygonTotal +
            polygon.reduce(
              (ringTotal, ring) => ringTotal + this.coordinatePathDistanceMiles(ring),
              0
            ),
          0
        );
      }
      return 0;
    },
    coordinatePathDistanceMiles(coordinates) {
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return 0;
      }

      let meters = 0;
      for (let i = 0; i < coordinates.length - 1; i += 1) {
        const [lng1, lat1] = coordinates[i];
        const [lng2, lat2] = coordinates[i + 1];
        meters += L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
      }
      return meters / 1609.344;
    },
    handleFeatureClick(layer, feature, event) {
      const geometry = feature?.geometry;
      if (!geometry) {
        return;
      }

      const segmentMiles = this.getClickedSegmentMiles(geometry, event?.latlng);
      const propertiesText = JSON.stringify(feature.properties || {}, null, 2);
      const popupContent = [
        `<strong>${layer.name}</strong>`,
        `Geometry: ${geometry.type}`,
        `Segment length: ${this.formatMiles(segmentMiles)} mi`,
        `<pre style="max-height:120px;overflow:auto;white-space:pre-wrap;">${propertiesText}</pre>`,
      ].join("<br>");

      this.selectedFeatureInfo = {
        layerName: layer.name,
        geometryType: geometry.type,
        segmentMiles,
        propertiesText,
      };

      if (event?.target) {
        event.target.bindPopup(popupContent).openPopup(event.latlng);
      }
    },
    getClickedSegmentMiles(geometry, clickLatLng) {
      const lineGroups = [];
      if (geometry.type === "LineString") {
        lineGroups.push(geometry.coordinates);
      } else if (geometry.type === "MultiLineString") {
        lineGroups.push(...geometry.coordinates);
      } else {
        return 0;
      }

      if (!clickLatLng) {
        return this.coordinatePathDistanceMiles(lineGroups[0] || []);
      }

      let bestDistance = Number.POSITIVE_INFINITY;
      let bestSegmentMiles = 0;
      lineGroups.forEach((line) => {
        for (let i = 0; i < line.length - 1; i += 1) {
          const start = L.latLng(line[i][1], line[i][0]);
          const end = L.latLng(line[i + 1][1], line[i + 1][0]);
          const distance =
            clickLatLng.distanceTo(start) + clickLatLng.distanceTo(end) - start.distanceTo(end);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestSegmentMiles = start.distanceTo(end) / 1609.344;
          }
        }
      });
      return bestSegmentMiles;
    },
    zoomToAllLayers() {
      try {
        if (!this.visibleLayers.length || !this.$refs.mapRef?.leafletObject) {
          return;
        }

        const combinedLayer = L.featureGroup(
          this.visibleLayers.map((layer) => L.geoJSON(layer.geoJson))
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
      const map = this.$refs.mapRef?.leafletObject;
      if (!this.$refs.mapWrapper || !map) {
        return;
      }

      map.invalidateSize(true);
      await new Promise((resolve) => setTimeout(resolve, 250));

      const canvas = await html2canvas(this.$refs.mapWrapper, {
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
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

.feature-json {
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
