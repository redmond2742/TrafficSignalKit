<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Preemption Evaluator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Preemption Evaluator" value="about">
          <v-expansion-panel-text>
            Paste or upload high-resolution controller data and this tool pulls
            out the preemption sequences: when each one ran, how long it lasted,
            and which preempt channel served it. Everything that is not a
            preemption event is discarded as the file is read, so a full day of
            data is handled without waiting on the phase and detector rows that
            make up the bulk of it.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>A bar for every preemption event, on its own channel row</li>
              <li>
                Each event broken into the time waiting on entry, track
                clearance, dwell and exit
              </li>
              <li>Per-channel counts, along with shortest, median and longest durations</li>
              <li>
                Calls that were registered but <b>never served</b>, which are
                easy to miss when scrolling raw data
              </li>
              <li>A downloadable CSV of every event</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Which Events Are Used" value="codes">
          <v-expansion-panel-text>
            <p>
              Only these enumerations are read. The event parameter carries the
              preempt channel number.
            </p>
            <v-table density="compact" class="code-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="code in codeList" :key="code.code">
                  <td>{{ code.code }}</td>
                  <td>{{ code.label }}</td>
                </tr>
              </tbody>
            </v-table>
            <p class="mt-2">
              TSP events (112&ndash;115, 117&ndash;119) are priority rather than
              preemption and are handled by the
              <router-link to="/tsp-dashboard">TSP Dashboard</router-link>.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high-resolution data as CSV lines of
            <code>timestamp, enumeration, channel</code>. A leading signal ID
            column is detected and skipped automatically.
            <pre>
3/14/2024 14:01:40.0, 101, 1
3/14/2024 14:01:45.0, 102, 1
3/14/2024 14:01:46.0, 105, 1
3/14/2024 14:01:48.0, 106, 1
3/14/2024 14:02:05.0, 107, 1
3/14/2024 14:04:40.0, 104, 1
3/14/2024 14:04:42.0, 111, 1
            </pre>
            Click <b>Evaluate Preemption</b> to build the table and chart.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <InputBox
      v-model="inputData"
      defaultText="Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, channel)"
      accept=".csv,.txt,text/csv,text/plain"
    />

    <div class="action-row">
      <v-btn
        color="primary"
        :loading="processing"
        :disabled="!inputData"
        @click="evaluate"
      >
        Evaluate Preemption
      </v-btn>
      <v-text-field
        v-model.number="maxEventSeconds"
        type="number"
        label="Split events after (seconds)"
        density="compact"
        variant="outlined"
        hide-details
        min="10"
        class="gap-field"
      ></v-text-field>
      <v-btn v-if="events.length" variant="tonal" @click="downloadCsv">
        Download CSV
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
      {{ error }}
    </v-alert>

    <v-alert
      v-else-if="ranOnce && !events.length"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      No preemption events found. {{ scanNote }}
    </v-alert>

    <template v-if="events.length">
      <v-alert type="success" variant="tonal" density="compact" class="mt-4">
        {{ scanNote }}
      </v-alert>

      <div class="metric-row">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
      </div>

      <div v-if="unservedCount" class="mt-4">
        <v-alert type="warning" variant="tonal" density="compact">
          {{ unservedCount }}
          {{ unservedCount === 1 ? "call was" : "calls were" }} registered but
          never entered preemption.
        </v-alert>
      </div>

      <h2 class="section-title">Events by channel</h2>
      <div class="chart-controls">
        <v-btn-toggle
          v-model="chartMode"
          mandatory
          divided
          density="compact"
          variant="outlined"
          color="primary"
          aria-label="Choose how to plot the events"
        >
          <v-btn value="timeline" size="small">Timeline</v-btn>
          <v-btn value="durations" size="small">Durations</v-btn>
        </v-btn-toggle>
        <v-chip-group v-model="visibleChannels" multiple column>
          <v-chip
            v-for="channel in allChannels"
            :key="channel"
            :value="channel"
            filter
            variant="outlined"
            size="small"
          >
            Preempt {{ channel }}
          </v-chip>
        </v-chip-group>
        <v-btn size="small" variant="text" @click="resetZoom">Reset zoom</v-btn>
      </div>
      <p class="chart-hint">
        <template v-if="chartMode === 'timeline'">
          Every event on its channel, at the time it happened. Scroll to zoom
          the time axis &mdash; events are short next to a whole day of data.
        </template>
        <template v-else>
          Every event lined up from its own start, so the durations compare
          directly.
          <span v-if="durationEvents.length < filteredEvents.length">
            Showing the {{ durationEvents.length }} longest of
            {{ filteredEvents.length }}.
          </span>
        </template>
      </p>
      <div class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
        <Bar ref="gantt" :data="chartData" :options="chartOptions" />
      </div>

      <h2 class="section-title">Channel summary</h2>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Events</th>
              <th>Shortest</th>
              <th>Median</th>
              <th>Longest</th>
              <th>Total</th>
              <th>Median call&nbsp;&rarr;&nbsp;entry</th>
              <th>Never served</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in viewSummary.channels" :key="channel.channel">
              <td>Preempt {{ channel.channel }}</td>
              <td>{{ channel.count }}</td>
              <td>{{ secs(channel.minMs) }}</td>
              <td>{{ secs(channel.medianMs) }}</td>
              <td>{{ secs(channel.maxMs) }}</td>
              <td>{{ secs(channel.totalMs) }}</td>
              <td>{{ secs(channel.medianEntryDelayMs) }}</td>
              <td>{{ channel.statuses.callOnly || "—" }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <h2 class="section-title">
        Event detail
        <span v-if="shownEvents.length < filteredEvents.length" class="muted">
          (first {{ shownEvents.length }} of {{ filteredEvents.length }})
        </span>
      </h2>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Call&nbsp;&rarr;&nbsp;entry</th>
              <th>Track clear</th>
              <th>Dwell</th>
              <th>Codes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(event, index) in shownEvents"
              :key="index"
              :class="{ 'row-unserved': event.status === 'callOnly' }"
            >
              <td>{{ event.channel }}</td>
              <td class="nowrap">{{ clockTime(event.startMs) }}</td>
              <td>{{ secs(event.durationMs) }}</td>
              <td>{{ statusLabels[event.status] }}</td>
              <td>{{ secs(event.segments.callToEntry) }}</td>
              <td>{{ secs(event.segments.trackClearance) }}</td>
              <td>{{ secs(event.segments.dwell) }}</td>
              <td class="codes">{{ event.codes.map((c) => c.code).join(" ") }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </div>
</template>

<script>
import { Bar } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import {
  PREEMPT_CODES,
  STATUS_LABELS,
  DEFAULT_MAX_EVENT_SECONDS,
  evaluatePreemption,
  eventsToCsv,
  summarizePreemption,
  toSeconds,
} from "../utils/preemptionEvaluator.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, CategoryScale, zoom);

/**
 * The intervals drawn inside each event bar, in the order they occur. Each
 * runs from its own mark to the first of the marks that follow it, so a
 * sequence missing a code still draws as one continuous bar.
 */
const SEGMENTS = [
  { key: "call", label: "Waiting on entry", color: "#F9A825", from: null, next: ["entry", "trackClear", "dwell", "exit", "forceOff"] },
  { key: "entry", label: "Entry", color: "#26A69A", from: "entry", next: ["trackClear", "dwell", "exit", "forceOff"] },
  { key: "trackClear", label: "Track clearance", color: "#EF6C00", from: "trackClear", next: ["dwell", "exit", "forceOff"] },
  { key: "dwell", label: "Dwell", color: "#00695C", from: "dwell", next: ["exit", "forceOff"] },
  { key: "exit", label: "Exit interval", color: "#78909C", from: "exit", next: [] },
];

const UNSERVED_COLOR = "#C62828";
/** Rendering every row of a very large result set is not worth the stall. */
const MAX_TABLE_ROWS = 500;
/** The durations view gives every event its own row, so it needs a ceiling. */
const MAX_CHART_ROWS = 40;

export default {
  name: "PreemptionEvaluator",
  components: { InputBox, Bar },
  data() {
    return {
      panel: [],
      inputData: "",
      maxEventSeconds: DEFAULT_MAX_EVENT_SECONDS,
      processing: false,
      ranOnce: false,
      error: "",
      events: [],
      summary: { channels: [], totals: {} },
      stats: null,
      visibleChannels: [],
      chartMode: "timeline",
      statusLabels: STATUS_LABELS,
    };
  },
  computed: {
    codeList() {
      return Object.entries(PREEMPT_CODES).map(([code, meta]) => ({
        code: Number(code),
        label: meta.label,
      }));
    },
    /** Always the full set, so a filter can never hide the chip that undoes it. */
    allChannels() {
      return this.summary.channels.map((channel) => channel.channel);
    },
    /**
     * What the tables and tiles report. Recomputed from the filtered events so
     * a channel filter applies to the whole page, not just the chart.
     */
    viewSummary() {
      if (!this.visibleChannels.length) return this.summary;
      return summarizePreemption(this.filteredEvents);
    },
    filteredEvents() {
      if (!this.visibleChannels.length) return this.events;
      const wanted = new Set(this.visibleChannels);
      return this.events.filter((event) => wanted.has(event.channel));
    },
    shownEvents() {
      return this.filteredEvents.slice(0, MAX_TABLE_ROWS);
    },
    unservedCount() {
      return this.viewSummary.totals.statuses
        ? this.viewSummary.totals.statuses.callOnly
        : 0;
    },
    scanNote() {
      if (!this.stats) return "";
      const { scanned, kept, keptPercent, malformed } = this.stats;
      const parts = [
        `Read ${this.num(scanned)} rows and kept ${this.num(kept)} preemption rows (${keptPercent.toFixed(2)}%).`,
      ];
      if (malformed) parts.push(`${this.num(malformed)} rows could not be read.`);
      return parts.join(" ");
    },
    metrics() {
      const totals = this.viewSummary.totals;
      return [
        { label: "Events", value: this.num(totals.events || 0) },
        { label: "Channels", value: this.num(totals.channels || 0) },
        { label: "Median duration", value: this.secs(totals.medianMs) },
        { label: "Longest", value: this.secs(totals.maxMs) },
      ];
    },
    /** One row per channel, so the chart grows with the data rather than squashing. */
    chartChannels() {
      const channels = new Set(this.filteredEvents.map((event) => event.channel));
      return [...channels].sort((a, b) => a - b);
    },
    /** Longest first, capped, so the durations view stays readable. */
    durationEvents() {
      return this.filteredEvents
        .slice()
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, MAX_CHART_ROWS);
    },
    chartHeight() {
      if (this.chartMode === "durations") {
        return Math.max(240, this.durationEvents.length * 30 + 120);
      }
      return Math.max(240, this.chartChannels.length * 64 + 110);
    },
    chartData() {
      return this.chartMode === "durations"
        ? this.durationChartData
        : this.timelineChartData;
    },
    /** Absolute time on the x axis: when each event happened, and any overlap. */
    timelineChartData() {
      const labels = this.chartChannels.map((channel) => `Preempt ${channel}`);
      const buckets = new Map();
      for (const event of this.filteredEvents) {
        const label = `Preempt ${event.channel}`;
        for (const segment of this.segmentsFor(event)) {
          if (!buckets.has(segment.key)) buckets.set(segment.key, []);
          buckets.get(segment.key).push({
            x: [segment.from, segment.to],
            y: label,
            event,
            segment: segment.label,
          });
        }
      }
      return { labels, datasets: this.datasetsFrom(buckets) };
    },
    /**
     * Elapsed seconds on the x axis, every event starting at zero. A three
     * minute event is a sliver against a whole day, so this view is what makes
     * the durations, and the split between intervals, actually comparable.
     */
    durationChartData() {
      const events = this.durationEvents;
      // A category axis resolves a point's y by looking the value up in labels,
      // so the row has to be addressed by its label and every label has to be
      // distinct -- a repeat would silently stack two events on one row.
      const seen = new Map();
      const labels = events.map((event) => {
        const base = `Preempt ${event.channel} · ${this.clockTime(event.startMs)}`;
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        return count === 1 ? base : `${base} (${count})`;
      });
      const buckets = new Map();
      events.forEach((event, index) => {
        for (const segment of this.segmentsFor(event)) {
          if (!buckets.has(segment.key)) buckets.set(segment.key, []);
          buckets.get(segment.key).push({
            x: [(segment.from - event.startMs) / 1000, (segment.to - event.startMs) / 1000],
            y: labels[index],
            event,
            segment: segment.label,
          });
        }
      });
      return { labels, datasets: this.datasetsFrom(buckets) };
    },
    /**
     * The visible time window. Without an explicit min/max a bar chart anchors
     * its value axis at zero, which here is 1970 -- a three minute event then
     * renders under a thousandth of a pixel wide.
     */
    chartExtent() {
      if (this.chartMode === "durations") {
        const longest = this.durationEvents.reduce(
          (max, event) => Math.max(max, event.durationMs / 1000),
          0,
        );
        return { min: 0, max: Math.max(longest * 1.02, 10) };
      }
      let min = Infinity;
      let max = -Infinity;
      for (const event of this.filteredEvents) {
        if (event.startMs < min) min = event.startMs;
        if (event.endMs > max) max = event.endMs;
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: undefined, max: undefined };
      // Keep a floor on the span so a single short event is not drawn edge to edge.
      const pad = Math.max((max - min) * 0.02, 30000);
      return { min: min - pad, max: max + pad };
    },
    chartOptions() {
      const clock = this.clockTime;
      const secs = this.secs;
      const extent = this.chartExtent;
      const durations = this.chartMode === "durations";
      // Durations plots elapsed seconds; timeline plots absolute epoch ms.
      const axisValue = (value) => (durations ? secs(value * 1000) : clock(value));
      const spanOf = (raw) => (durations ? (raw.x[1] - raw.x[0]) * 1000 : raw.x[1] - raw.x[0]);
      return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            min: extent.min,
            max: extent.max,
            beginAtZero: false,
            ticks: {
              callback: (value) => axisValue(value),
              maxRotation: 0,
              autoSkipPadding: 20,
            },
            title: {
              display: true,
              text: durations ? "Elapsed from start of event" : "Time of day",
            },
          },
          y: {
            type: "category",
            title: { display: true, text: durations ? "Event" : "Preempt channel" },
            ticks: { autoSkip: false },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => {
                const raw = items[0].raw;
                return `Preempt ${raw.event.channel} — ${clock(raw.event.startMs)}`;
              },
              label: (item) => `${item.raw.segment}: ${secs(spanOf(item.raw))}`,
              afterBody: (items) => {
                const event = items[0].raw.event;
                return [
                  `Event duration: ${secs(event.durationMs)}`,
                  `Status: ${STATUS_LABELS[event.status]}`,
                  `Codes: ${event.codes.map((c) => c.code).join(" ")}`,
                ];
              },
            },
          },
          zoom: {
            pan: { enabled: !durations, mode: "x" },
            zoom: {
              wheel: { enabled: !durations },
              pinch: { enabled: !durations },
              drag: { enabled: false },
              mode: "x",
            },
          },
        },
      };
    },
  },
  methods: {
    /**
     * The intervals inside one event, as absolute times. Each runs from its own
     * mark to the first mark that follows it, so a sequence that is missing a
     * code still draws as one continuous bar rather than springing a gap.
     */
    segmentsFor(event) {
      if (event.status === "callOnly") {
        return [
          {
            key: "unserved",
            label: "Call never served",
            color: UNSERVED_COLOR,
            from: event.startMs,
            // A call and its drop in the same second still needs a visible bar.
            to: Math.max(event.endMs, event.startMs + 1000),
          },
        ];
      }
      const out = [];
      for (const segment of SEGMENTS) {
        const from = segment.from === null ? event.startMs : event.marks[segment.from];
        if (from === undefined) continue;
        let to;
        for (const candidate of segment.next) {
          if (event.marks[candidate] !== undefined) {
            to = event.marks[candidate];
            break;
          }
        }
        if (to === undefined) to = event.endMs;
        if (!(to > from)) continue;
        out.push({ key: segment.key, label: segment.label, color: segment.color, from, to });
      }
      return out;
    },
    /** One dataset per interval type, in sequence order, drawn on one row. */
    datasetsFrom(buckets) {
      const order = [...SEGMENTS, { key: "unserved", label: "Call never served", color: UNSERVED_COLOR }];
      return order
        .filter((segment) => buckets.has(segment.key))
        .map((segment) => ({
          label: segment.label,
          data: buckets.get(segment.key),
          backgroundColor: segment.color,
          borderWidth: 0,
          // Overlap the datasets on one category row instead of stacking them
          // side by side, which is what makes this read as a Gantt chart.
          grouped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.9,
        }));
    },
    num(value) {
      return Number(value || 0).toLocaleString();
    },
    secs(ms) {
      const value = toSeconds(ms);
      if (value === null) return "—";
      if (value < 60) return `${value}s`;
      const minutes = Math.floor(value / 60);
      const remainder = Math.round(value - minutes * 60);
      return `${minutes}m ${remainder}s`;
    },
    clockTime(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("HH:mm:ss");
    },
    fullTime(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("yyyy-LL-dd HH:mm:ss.S");
    },
    evaluate() {
      this.error = "";
      this.processing = true;
      // Let the button paint its spinner before the parse takes the thread.
      setTimeout(() => {
        try {
          const result = evaluatePreemption(this.inputData, {
            maxEventSeconds: this.maxEventSeconds || DEFAULT_MAX_EVENT_SECONDS,
          });
          if (!result.layout.confident && !result.events.length) {
            this.error =
              "Could not read this as high-resolution data. Expecting CSV lines of timestamp, enumeration, channel.";
          }
          this.events = result.events;
          this.summary = result.summary;
          this.stats = result.stats;
          this.visibleChannels = [];
          this.ranOnce = true;
        } catch (err) {
          this.error = `Could not process this data: ${err.message}`;
          this.events = [];
          this.summary = { channels: [], totals: {} };
        } finally {
          this.processing = false;
        }
      }, 0);
    },
    resetZoom() {
      const chart = this.$refs.gantt && this.$refs.gantt.chart;
      if (chart) chart.resetZoom();
    },
    downloadCsv() {
      const csv = eventsToCsv(this.filteredEvents, (ms) => this.fullTime(ms));
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "preemption-events.csv";
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.gap-field {
  max-width: 220px;
}
.section-title {
  text-align: left;
  font-size: 1.15rem;
  font-weight: 600;
  margin: 28px 0 8px;
}
.muted {
  font-weight: 400;
  font-size: 0.85rem;
  opacity: 0.7;
}
.metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.metric-tile {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 12px;
}
.metric-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
.metric-label {
  font-size: 0.8rem;
  opacity: 0.75;
}
.chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.chart-hint {
  text-align: left;
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 8px;
}
.chart-wrapper {
  position: relative;
  width: 100%;
}
.table-wrapper {
  overflow-x: auto;
}
.code-table {
  max-width: 420px;
}
.nowrap {
  white-space: nowrap;
}
.codes {
  font-family: monospace;
  font-size: 0.8rem;
  white-space: nowrap;
}
.row-unserved td {
  background: rgba(198, 40, 40, 0.08);
}
</style>
