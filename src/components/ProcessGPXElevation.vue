<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="gpxTextboxDefaultText" />
  </div>
  <br />
  <v-btn color="primary" @click="btnPlot">Plot</v-btn>
  <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>
  <br />
  <v-card v-if="metrics" class="metrics-card">
    <v-card-title>GPX Summary Metrics</v-card-title>
    <v-card-text>
      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-label">Total Distance</span>
          <span class="metric-value">{{ formatDistance(metrics.totalDistanceMiles) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Elevation Gain</span>
          <span class="metric-value">{{ formatFeet(metrics.totalElevationGainFeet) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Elevation Loss</span>
          <span class="metric-value">{{ formatFeet(metrics.totalElevationLossFeet) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Speed</span>
          <span class="metric-value">{{ formatSpeed(metrics.averageSpeedMph) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Uphill Speed</span>
          <span class="metric-value">{{ formatSpeed(metrics.averageUphillSpeedMph) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Downhill Speed</span>
          <span class="metric-value">{{ formatSpeed(metrics.averageDownhillSpeedMph) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min Elevation</span>
          <span class="metric-value">{{ formatFeet(metrics.minElevationFeet) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Max Elevation</span>
          <span class="metric-value">{{ formatFeet(metrics.maxElevationFeet) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Max Grade Ascended</span>
          <span class="metric-value">{{ formatPercent(metrics.maxUphillGradePercent) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Elapsed Time</span>
          <span class="metric-value">{{ formatDuration(metrics.totalTimeSeconds) }}</span>
        </div>
      </div>
    </v-card-text>
  </v-card>
  <canvas ref="scatterPlotCanvas"></canvas>
  <br />

  <table v-if="hoveredPoints.length">

    <thead>
      <tr>
        <th>Distance (ft)</th>
        <th>Elevation (ft)</th>
        <th>Latitude</th>
        <th>Longitude</th>

        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(point, index) in hoveredPoints" :key="index">
        <td>{{ point.distance.toFixed(1) }}</td>
        <td>{{ point.elevation.toFixed(1) }}</td>
        <td>{{ point.lat.toFixed(5) }}</td>
        <td>{{ point.lon.toFixed(5) }}</td>
        <td>
          <v-btn size="x-small" color="primary" @click="copyLatLon(point)">
            Copy
          </v-btn>
        </td>

      </tr>
    </tbody>
  </table>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import processElevation from "../mixins/processElevation";

export default {
  mixins: [processElevation],
  components: { InputBox },
  data() {
    return {
      gpxTextboxDefaultText: "Paste in GPX file in XML format",
      inputData: "",
      metrics: null
    };
  },
  methods: {
    btnPlot() {
      const result = this.processGPXElevation(this.inputData);
      this.metrics = result.metrics;
      this.renderElevationChart(result.dataset);
    },
    copyLatLon(point) {
      const text = `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
      navigator.clipboard?.writeText(text)
    },
    formatDistance(distanceMiles) {
      if (distanceMiles === null || distanceMiles === undefined) {
        return "—";
      }
      return `${distanceMiles.toFixed(2)} mi`;
    },
    formatFeet(value) {
      if (value === null || value === undefined) {
        return "—";
      }
      return `${value.toFixed(0)} ft`;
    },
    formatSpeed(value) {
      if (value === null || value === undefined) {
        return "—";
      }
      return `${value.toFixed(1)} mph`;
    },
    formatPercent(value) {
      if (value === null || value === undefined) {
        return "—";
      }
      return `${value.toFixed(1)}%`;
    },
    formatDuration(totalSeconds) {
      if (!totalSeconds) {
        return "—";
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const parts = [];
      if (hours > 0) {
        parts.push(`${hours}h`);
      }
      if (minutes > 0 || hours > 0) {
        parts.push(`${minutes}m`);
      }
      parts.push(`${seconds}s`);
      return parts.join(" ");
    }
  }
};
</script>

<style scoped>
.grow-wrap > textarea {
  height: 200px;
}

.metrics-card {
  margin: 16px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 24px;
}

.metric {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(30, 139, 195, 0.08);
}

.metric-label {
  font-size: 0.85rem;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin-top: 4px;
}
</style>
