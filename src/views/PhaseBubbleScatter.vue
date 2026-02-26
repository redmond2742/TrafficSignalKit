<template>
  <div>
    <h1 class="h1-center-text">Phase Bubble Scatter</h1>

    <v-expansion-panels multiple>
      <v-expansion-panel title="About this tool">
        <v-expansion-panel-text>
          Visualizes one bubble per unique phase service cycle. Use the controls below to select which available
          phase-cycle metrics drive the X/Y axes, bubble size, and transparency.
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel title="Cycle rule used (no-repeat in same cycle)">
        <v-expansion-panel-text>
          Preferred method: code 150 (coord cycle state change) defines cycle boundaries. Fallback method: infer cycle breaks when
          service-start gap exceeds 0.6 × median service-start gap. Within-cycle handling can Keep first or Aggregate services.
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <v-textarea v-model="csvText" label="HR CSV input (timestamp,event_code,event_param)" rows="8" />
        <input type="file" accept=".csv,text/csv" @change="onFile" />
      </v-col>
      <v-col cols="12" md="6">
        <v-textarea v-model="detectorText" label="Phase-detector assignment (e.g., DET 1 1)" rows="8" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="2"><v-text-field v-model.number="ignoreFirstMinutes" type="number" label="Ignore first N minutes" /></v-col>
      <v-col cols="12" md="2"><v-select :items="['keep-first','aggregate']" v-model="cycleHandling" label="Within-cycle handling" /></v-col>
      <v-col cols="12" md="3"><v-select :items="bubbleSizingOptions" item-title="title" item-value="value" v-model="bubbleSizing" label="Bubble sizing mode" /></v-col>
      <v-col cols="12" md="3"><v-select :items="numericFieldOptions" item-title="title" item-value="value" v-model="xAxisField" label="X-axis field" /></v-col>
      <v-col cols="12" md="3"><v-select :items="numericFieldOptions" item-title="title" item-value="value" v-model="yAxisField" label="Y-axis field" /></v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="3"><v-select :items="numericFieldOptions" item-title="title" item-value="value" v-model="bubbleSizeField" label="Bubble size field" /></v-col>
      <v-col cols="12" md="3"><v-select :items="numericFieldOptions" item-title="title" item-value="value" v-model="transparencyField" label="Transparency field" /></v-col>
      <v-col cols="12" md="3"><v-switch v-model="invertTransparency" label="High value = darker" /></v-col>
      <v-col cols="12" md="2"><v-text-field v-model.number="minAlpha" type="number" step="0.05" label="Min alpha" /></v-col>
      <v-col cols="12" md="2"><v-text-field v-model.number="maxAlpha" type="number" step="0.05" label="Max alpha" /></v-col>
      <v-col cols="12" md="2"><v-switch v-model="capP95" label="Cap size at P95 split" /></v-col>
      <v-col cols="12" md="2"><v-switch v-model="includeFirst" label="Include first (0/NA)" /></v-col>
      <v-col cols="12" md="4" class="d-flex ga-2">
        <v-btn color="primary" :loading="loading" @click="process">Process</v-btn>
        <v-select :items="downloadFormats" item-title="title" item-value="value" v-model="downloadFormat" label="Download format" density="compact" hide-details class="download-format" :disabled="!points.length" />
        <v-btn color="secondary" :disabled="!points.length" @click="download">Download</v-btn>
      </v-col>
    </v-row>

    <div v-if="points.length" class="legend-note">
      <p><b>Legend:</b> x = {{ fieldLabel(xAxisField) }}, y = {{ fieldLabel(yAxisField) }}, size = {{ fieldLabel(bubbleSizeField) }}, alpha/fill = {{ fieldLabel(transparencyField) }}.</p>
    </div>
    <div class="chart-wrap" v-if="points.length">
      <Bubble ref="bubbleChart" :data="chartData" :options="chartOptions" />
    </div>

    <v-table density="compact" class="mt-4" v-if="points.length">
      <thead><tr><th>phase</th><th>cycle</th><th>start</th><th>split_s</th><th>time_since_last_on_s</th><th>detector_delay_s</th><th>off_count</th><th>off_per_split</th><th>delay_per_split</th><th>alpha</th><th>fill</th></tr></thead>
      <tbody>
        <tr v-for="row in pagedPoints" :key="row.phase + '-' + row.cycle_index + '-' + row.service_start_ts">
          <td>{{ row.phase }}</td><td>{{ row.cycle_index }}</td><td>{{ row.service_start_iso }}</td><td>{{ row.split_s.toFixed(2) }}</td><td>{{ fmt(row.time_since_last_on_s) }}</td><td>{{ fmt(row.detector_delay_s) }}</td><td>{{ row.off_count }}</td><td>{{ fmt(row.off_per_split) }}</td><td>{{ fmt(row.delay_per_split) }}</td><td>{{ row.alpha.toFixed(2) }}</td><td>{{ row.fill_factor.toFixed(2) }}</td>
        </tr>
      </tbody>
    </v-table>
    <v-pagination v-if="points.length" v-model="page" :length="Math.ceil(points.length / pageSize)" />
  </div>
</template>

<script>
import { Bubble } from 'vue-chartjs';
import { Chart as ChartJS, PointElement, LinearScale, Tooltip, Legend } from 'chart.js';
import { bubbleRadius } from '../utils/phaseBubbleScatter';

ChartJS.register(PointElement, LinearScale, Tooltip, Legend);

export default {
  name: 'PhaseBubbleScatter',
  components: { Bubble },
  data() {
    return {
      csvText: '', detectorText: 'DET 1 1',
      ignoreFirstMinutes: 0, cycleHandling: 'keep-first', bubbleSizing: 'scaled-sqrt', downloadFormat: 'csv',
      xAxisField: 'cycle_index', yAxisField: 'off_count', bubbleSizeField: 'split_s', transparencyField: 'off_count', invertTransparency: false,
      minAlpha: 0.15, maxAlpha: 0.9, capP95: true, includeFirst: false, points: [], loading: false, page: 1, pageSize: 25,
      worker: null,
    };
  },
  computed: {
    bubbleSizingOptions() {
      return [
        { title: 'Linear', value: 'linear' },
        { title: 'Scaled - Sqrt', value: 'scaled-sqrt' },
        { title: 'Scaled - Log', value: 'scaled-log' },
      ];
    },
    downloadFormats() {
      return [
        { title: 'CSV', value: 'csv' },
        { title: 'PNG', value: 'png' },
        { title: 'SVG', value: 'svg' },
      ];
    },
    numericFieldOptions() {
      return [
        { title: 'Cycle Index', value: 'cycle_index' },
        { title: 'Split (s)', value: 'split_s' },
        { title: 'Time Since Last Service (s)', value: 'time_since_last_on_s' },
        { title: 'Detector Delay (s)', value: 'detector_delay_s' },
        { title: 'Detector OFF Count', value: 'off_count' },
        { title: 'OFF per Split', value: 'off_per_split' },
        { title: 'Delay per Split', value: 'delay_per_split' },
      ];
    },
    pointsWithStyle() {
      const transparencyValues = this.points.map((point) => this.fieldValue(point, this.transparencyField)).filter((value) => Number.isFinite(value));
      const minMetric = transparencyValues.length ? Math.min(...transparencyValues) : 0;
      const maxMetric = transparencyValues.length ? Math.max(...transparencyValues) : 0;
      const metricSpan = maxMetric - minMetric;

      const bubbleValues = this.points.map((point) => this.fieldValue(point, this.bubbleSizeField));
      return this.points.map((point) => {
        const metric = this.fieldValue(point, this.transparencyField);
        const normalized = metricSpan > 0 && Number.isFinite(metric) ? (metric - minMetric) / metricSpan : 0;
        const fillFactor = this.invertTransparency ? normalized : 1 - normalized;
        const alpha = this.minAlpha + fillFactor * (this.maxAlpha - this.minAlpha);
        return {
          ...point,
          alpha,
          fill_factor: fillFactor,
          bubble_metric: this.fieldValue(point, this.bubbleSizeField),
          radius: bubbleRadius(this.fieldValue(point, this.bubbleSizeField), this.bubbleRadiusOptions(bubbleValues)),
        };
      });
    },
    chartData() {
      const pointsByPhase = this.pointsWithStyle.reduce((acc, point) => {
        if (!acc.has(point.phase)) acc.set(point.phase, []);
        acc.get(point.phase).push(point);
        return acc;
      }, new Map());

      const datasets = [...pointsByPhase.entries()].sort((a, b) => a[0] - b[0]).map(([phase, phasePoints]) => {
        const hue = (phase * 43) % 360;
        return {
          label: `Phase ${phase}`,
          data: phasePoints.map((p) => ({ x: this.fieldValue(p, this.xAxisField), y: this.fieldValue(p, this.yAxisField), r: p.radius, meta: p })),
          pointBackgroundColor: phasePoints.map((p) => `hsla(${hue}, ${35 + p.fill_factor * 50}%, ${72 - p.fill_factor * 28}%, ${p.alpha})`),
          pointBorderColor: `hsl(${hue}, 75%, 35%)`,
        };
      });

      return {
        datasets,
      };
    },
    chartOptions() {
      return {
        responsive: true,
        animation: false,
        scales: {
          x: { title: { display: true, text: this.fieldLabel(this.xAxisField) } },
          y: { title: { display: true, text: this.fieldLabel(this.yAxisField) } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const m = ctx.raw.meta;
                return [`phase: ${m.phase}`, `cycle: ${m.cycle_index}`, `start: ${m.service_start_iso}`, `split_s: ${m.split_s.toFixed(2)}`, `time_since_last_on_s: ${m.time_since_last_on_s ?? 'NA'}`, `detector_delay_s: ${m.detector_delay_s ?? 'NA'}`, `off_count: ${m.off_count}`, `off_per_split: ${this.fmt(m.off_per_split)}`, `delay_per_split: ${this.fmt(m.delay_per_split)}`];
              },
            },
          },
        },
      };
    },
    pagedPoints() {
      const start = (this.page - 1) * this.pageSize;
      return this.pointsWithStyle.slice(start, start + this.pageSize);
    },
  },
  methods: {
    fmt(v) { return Number.isFinite(v) ? v.toFixed(2) : 'NA'; },
    fieldValue(point, field) {
      const value = point[field];
      return Number.isFinite(value) ? value : 0;
    },
    fieldLabel(field) {
      return this.numericFieldOptions.find((option) => option.value === field)?.title || field;
    },
    onFile(event) {
      const [file] = event.target.files || [];
      if (!file) return;
      file.text().then((txt) => { this.csvText = txt; });
    },
    process() {
      this.loading = true;
      if (!this.worker) {
        this.worker = new Worker(new URL('../workers/phaseBubbleScatterWorker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = (evt) => {
          if (evt.data.type === 'result') {
            this.points = evt.data.payload.points;
            this.page = 1;
            this.loading = false;
          }
          if (evt.data.type === 'error') {
            this.loading = false;
          }
        };
      }
      this.worker.postMessage({ type: 'process', payload: { csvText: this.csvText, detectorText: this.detectorText, cycleHandling: this.cycleHandling, includeFirst: this.includeFirst, minAlpha: this.minAlpha, maxAlpha: this.maxAlpha, ignoreFirstMinutes: this.ignoreFirstMinutes } });
    },
    bubbleRadiusOptions(splits) {
      if (this.bubbleSizing === 'linear') return { mode: 'linear', scaledMode: 'sqrt', capP95: this.capP95, splits };
      if (this.bubbleSizing === 'scaled-log') return { mode: 'scaled', scaledMode: 'log', capP95: this.capP95, splits };
      return { mode: 'scaled', scaledMode: 'sqrt', capP95: this.capP95, splits };
    },
    download() {
      if (this.downloadFormat === 'png') return this.downloadPng();
      if (this.downloadFormat === 'svg') return this.downloadSvg();
      return this.downloadCsv();
    },
    downloadCsv() {
      const header = 'phase,cycle_index,service_start_iso,service_start_ts,split_s,time_since_last_on_s,detector_delay_s,off_count,off_per_split,delay_per_split,assigned_detectors,alpha,fill_factor';
      const rows = this.pointsWithStyle.map((p) => [p.phase, p.cycle_index, p.service_start_iso, p.service_start_ts, p.split_s, p.time_since_last_on_s ?? '', p.detector_delay_s ?? '', p.off_count, p.off_per_split ?? '', p.delay_per_split ?? '', `"${p.assigned_detectors.join('|')}"`, p.alpha, p.fill_factor].join(','));
      this.downloadBlob([header, ...rows].join('\n'), 'phase-bubble-scatter-points.csv', 'text/csv');
    },
    downloadPng() {
      const chart = this.$refs.bubbleChart?.chart;
      if (!chart) return;
      const url = chart.toBase64Image('image/png', 1);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'phase-bubble-scatter.png';
      link.click();
    },
    downloadSvg() {
      const circles = this.chartData.datasets.map((dataset) => dataset.data.map((pt, idx) => `<circle cx="${pt.x * 12 + 40}" cy="${400 - pt.y * 4}" r="${pt.r}" fill="${dataset.pointBackgroundColor[idx]}" stroke="${dataset.pointBorderColor}"/>`).join('')).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><rect width="100%" height="100%" fill="white"/>${circles}</svg>`;
      this.downloadBlob(svg, 'phase-bubble-scatter.svg', 'image/svg+xml');
    },
    downloadBlob(content, name, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.chart-wrap { min-height: 480px; }
.legend-note { margin-top: 8px; }
.download-format { max-width: 180px; }
</style>
