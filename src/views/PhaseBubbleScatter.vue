<template>
  <div>
    <h1 class="h1-center-text">Phase Bubble Scatter</h1>

    <v-expansion-panels multiple>
      <v-expansion-panel title="About this tool">
        <v-expansion-panel-text>
          Visualizes one bubble per unique phase service cycle. X is cycle index (phase not repeated), Y is
          <b>Time since the last time the phase was ON (s)</b>, bubble size is split, alpha is OFF-transition transparency,
          and fill intensity is normalized OFF count.
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
      <v-col cols="12" md="2"><v-select :items="phaseOptions" v-model="phase" label="Phase" /></v-col>
      <v-col cols="12" md="2"><v-switch v-model="useAllDetectorsForPhase" label="Use all detectors for phase" /></v-col>
      <v-col cols="12" md="2"><v-text-field v-model.number="ignoreFirstMinutes" type="number" label="Ignore first N minutes" /></v-col>
      <v-col cols="12" md="2"><v-select :items="['keep-first','aggregate']" v-model="cycleHandling" label="Within-cycle handling" /></v-col>
      <v-col cols="12" md="2"><v-select :items="['linear','scaled']" v-model="bubbleMode" label="Bubble sizing" /></v-col>
      <v-col cols="12" md="2" v-if="bubbleMode==='scaled'"><v-select :items="['sqrt','log']" v-model="scaledMode" label="Scaled mode" /></v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="2"><v-text-field v-model.number="minAlpha" type="number" step="0.05" label="Min alpha" /></v-col>
      <v-col cols="12" md="2"><v-text-field v-model.number="maxAlpha" type="number" step="0.05" label="Max alpha" /></v-col>
      <v-col cols="12" md="2"><v-switch v-model="capP95" label="Cap size at P95 split" /></v-col>
      <v-col cols="12" md="2"><v-switch v-model="includeFirst" label="Include first (0/NA)" /></v-col>
      <v-col cols="12" md="4" class="d-flex ga-2">
        <v-btn color="primary" :loading="loading" @click="process">Process</v-btn>
        <v-btn color="secondary" :disabled="!points.length" @click="downloadCsv">Download points CSV</v-btn>
        <v-btn color="secondary" :disabled="!points.length" @click="downloadPng">PNG</v-btn>
        <v-btn color="secondary" :disabled="!points.length" @click="downloadSvg">SVG</v-btn>
      </v-col>
    </v-row>

    <div v-if="points.length" class="legend-note">
      <p><b>Legend:</b> size = split, alpha = OFF transitions transparency, fill intensity = normalized OFF transitions.</p>
    </div>
    <div class="chart-wrap" v-if="points.length">
      <Bubble ref="bubbleChart" :data="chartData" :options="chartOptions" />
    </div>

    <v-table density="compact" class="mt-4" v-if="points.length">
      <thead><tr><th>cycle</th><th>start</th><th>split_s</th><th>time_since_last_on_s</th><th>off_count</th><th>alpha</th><th>fill</th></tr></thead>
      <tbody>
        <tr v-for="row in pagedPoints" :key="row.cycle_index + '-' + row.service_start_ts">
          <td>{{ row.cycle_index }}</td><td>{{ row.service_start_iso }}</td><td>{{ row.split_s.toFixed(2) }}</td><td>{{ fmt(row.time_since_last_on_s) }}</td><td>{{ row.off_count }}</td><td>{{ row.alpha.toFixed(2) }}</td><td>{{ row.fill_factor.toFixed(2) }}</td>
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
      csvText: '', detectorText: 'DET 1 1', phase: 1, phaseOptions: Array.from({ length: 16 }, (_, i) => i + 1),
      useAllDetectorsForPhase: true, ignoreFirstMinutes: 0, cycleHandling: 'keep-first', bubbleMode: 'scaled', scaledMode: 'sqrt',
      minAlpha: 0.15, maxAlpha: 0.9, capP95: true, includeFirst: false, points: [], loading: false, page: 1, pageSize: 25,
      worker: null,
    };
  },
  computed: {
    chartData() {
      const splits = this.points.map((p) => p.split_s);
      return {
        datasets: [{
          label: 'Phase service points',
          data: this.points.map((p) => ({ x: p.cycle_index, y: p.time_since_last_on_s ?? 0, r: bubbleRadius(p.split_s, { mode: this.bubbleMode, scaledMode: this.scaledMode, capP95: this.capP95, splits }), meta: p })),
          pointBackgroundColor: this.points.map((p) => `hsla(210, ${20 + p.fill_factor * 70}%, ${80 - p.fill_factor * 40}%, ${p.alpha})`),
          pointBorderColor: '#0d47a1',
        }],
      };
    },
    chartOptions() {
      return {
        responsive: true,
        animation: false,
        parsing: false,
        scales: {
          x: { title: { display: true, text: 'Cycle (unique per cycle, phase not repeated)' } },
          y: { title: { display: true, text: 'Time since the last time the phase was ON (s)' } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const m = ctx.raw.meta;
                return [`cycle: ${m.cycle_index}`, `start: ${m.service_start_iso}`, `split_s: ${m.split_s.toFixed(2)}`, `time_since_last_on_s: ${m.time_since_last_on_s ?? 'NA'}`, `off_count: ${m.off_count}`];
              },
            },
          },
        },
      };
    },
    pagedPoints() {
      const start = (this.page - 1) * this.pageSize;
      return this.points.slice(start, start + this.pageSize);
    },
  },
  methods: {
    fmt(v) { return Number.isFinite(v) ? v.toFixed(2) : 'NA'; },
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
            if (evt.data.payload.phases.length) this.phaseOptions = evt.data.payload.phases;
            this.page = 1;
            this.loading = false;
          }
          if (evt.data.type === 'error') {
            this.loading = false;
          }
        };
      }
      this.worker.postMessage({ type: 'process', payload: { csvText: this.csvText, detectorText: this.detectorText, phase: this.phase, useAllDetectorsForPhase: this.useAllDetectorsForPhase, cycleHandling: this.cycleHandling, includeFirst: this.includeFirst, minAlpha: this.minAlpha, maxAlpha: this.maxAlpha, ignoreFirstMinutes: this.ignoreFirstMinutes } });
    },
    downloadCsv() {
      const header = 'cycle_index,service_start_iso,service_start_ts,split_s,time_since_last_on_s,off_count,assigned_detectors,alpha,fill_factor';
      const rows = this.points.map((p) => [p.cycle_index, p.service_start_iso, p.service_start_ts, p.split_s, p.time_since_last_on_s ?? '', p.off_count, `"${p.assigned_detectors.join('|')}"`, p.alpha, p.fill_factor].join(','));
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
      const circles = this.chartData.datasets[0].data.map((pt, idx) => `<circle cx="${pt.x * 12 + 40}" cy="${400 - pt.y * 4}" r="${pt.r}" fill="${this.chartData.datasets[0].pointBackgroundColor[idx]}" stroke="#0d47a1"/>`).join('');
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
</style>
