<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Single Loop Speed Estimator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Single Loop Speed Estimator" value="about">
          <v-expansion-panel-text>
            <p>
              A single inductive loop cannot measure speed. It knows only that
              something was over it, and for how long. But the distance a
              vehicle covers while it holds the loop down is its own length
              plus the loop's &mdash; the detector picks up as the front
              bumper enters the zone and drops as the rear bumper clears it:
            </p>
            <pre>speed = (loop length + vehicle length) / occupancy time</pre>
            <p class="mt-2">
              Paste high-resolution data, pick the detector channel, and every
              <b>82 / 81</b> pair on it becomes an occupancy and an estimated
              speed. Everything that is not a detector or phase-colour row is
              discarded as the file is read, so a full day for one signal is
              handled without waiting on the rest of it.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>A bar per time bucket, its length the time the loop was held down</li>
              <li>
                Buckets by <b>minute, hour or day</b>, or every event on its
                own row &mdash; the same data from one vehicle to one week
              </li>
              <li>
                An estimated speed on every bar, from the lengths set at the
                top of the page
              </li>
              <li>
                A filter for the colour showing when each vehicle arrived,
                which is what separates a stop-bar loop's queue from its
                moving traffic
              </li>
              <li>Median, fastest and slowest across everything kept</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="On the Assumption" value="assumption">
          <v-expansion-panel-text>
            <p>
              The vehicle length is the whole method, and it is an assumption
              about a <b>stream</b> of traffic rather than a measurement of
              any one vehicle. A lane of trucks reads slow and a motorcycle
              reads fast, because the arithmetic credits both with the length
              you typed.
            </p>
            <p class="mt-2">
              So read the median, not the individual rows. A single bar is one
              vehicle's occupancy divided by an average length, and its speed
              can be wrong by the ratio of the real vehicle to the assumed
              one. Across a few hundred vehicles the errors are mostly
              symmetric and the median is worth something.
            </p>
            <p class="mt-2">
              17&nbsp;ft is a common passenger-car default and 6&nbsp;ft a
              common loop. Both should be set to what is actually in the
              ground and on the road &mdash; a 6&nbsp;ft loop entered as zero
              understates every speed by about a quarter.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Stop Bar Loops and the Colour Filter" value="colour">
          <v-expansion-panel-text>
            <p>
              A stop-bar loop holds down for as long as a vehicle waits on it,
              which at red is minutes rather than seconds. Those occupancies
              are real, but they are not speeds: a queued vehicle is not
              travelling at 0.2&nbsp;mph, it is stopped.
            </p>
            <p class="mt-2">
              Set the <b>phase</b> the loop serves and filter to
              <b>green</b>, and what is left is vehicles crossing the loop
              while the signal was running. That is the set worth estimating
              speed from. The occupancy cap does related work from the other
              end, dropping anything held longer than the time you set.
            </p>
            <p class="mt-2">
              An advance or mid-block loop needs neither: traffic crosses it
              at speed whatever the signal is doing, so leave all three
              colours on.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Which Events Are Used" value="codes">
          <v-expansion-panel-text>
            <v-table density="compact" class="code-table">
              <thead>
                <tr><th>Code</th><th>Meaning</th><th>Parameter</th></tr>
              </thead>
              <tbody>
                <tr><td>82</td><td>Detector on</td><td>detector channel</td></tr>
                <tr><td>81</td><td>Detector off</td><td>detector channel</td></tr>
                <tr><td>1</td><td>Begin green</td><td>phase</td></tr>
                <tr><td>8</td><td>Begin yellow clearance</td><td>phase</td></tr>
                <tr><td>10</td><td>Begin red clearance</td><td>phase</td></tr>
              </tbody>
            </v-table>
            <p class="mt-2">
              Green runs from 1 until 8, yellow from 8 until 10, and red from
              10 until the next 1. Codes 9 and 11 fall inside those spans and
              would not move the colour, so they are not collected.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste CSV lines of <code>timestamp, enumeration, parameter</code>.
            A leading signal ID column is detected and skipped.
            <pre>
3/14/2024 07:15:02.1, 1, 2
3/14/2024 07:15:11.4, 82, 5
3/14/2024 07:15:11.9, 81, 5
3/14/2024 07:15:14.2, 82, 5
3/14/2024 07:15:14.8, 81, 5
3/14/2024 07:15:38.0, 8, 2
3/14/2024 07:15:41.6, 10, 2
            </pre>
            Two vehicles crossed channel 5 during phase 2's green, holding the
            loop 0.5s and 0.6s.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">Loop and vehicle</h2>
        <p class="setup-card__hint">
          These two lengths are the estimate. Set them to what is in the
          ground and on the road.
        </p>
      </div>
      <div class="settings-row">
        <v-text-field
          v-model.number="loopFeet"
          type="number"
          label="Loop length (ft)"
          min="0"
          step="0.5"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-text-field>
        <v-text-field
          v-model.number="vehicleFeet"
          type="number"
          label="Average vehicle length (ft)"
          min="0"
          step="0.5"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-text-field>
        <v-text-field
          v-model.number="maxOccupancySeconds"
          type="number"
          label="Ignore occupancies over (s)"
          min="0"
          step="1"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-text-field>
        <div class="setting-note">
          A vehicle at
          <b>{{ referenceSpeed }} mph</b>
          holds this loop for {{ referenceOccupancy }}.
        </div>
      </div>
    </v-card>

    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">High-resolution data</h2>
        <p class="setup-card__hint">
          One signal's worth. Detector and phase-colour rows are kept and
          everything else is dropped as the file is read.
        </p>
      </div>
      <InputBox
        v-model="text"
        defaultText="Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, parameter)"
        accept=".csv,.txt,text/csv,text/plain"
      />
    </v-card>

    <div class="action-row">
      <v-btn color="primary" :loading="processing" :disabled="!text.trim()" @click="evaluate">
        Estimate Speeds
      </v-btn>
      <v-btn v-if="occupancies.length" variant="tonal" @click="downloadCsv">
        Download CSV
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{ error }}</v-alert>

    <v-alert v-else-if="ranOnce && !channels.length" type="info" variant="tonal" class="mt-4">
      No detector events found. {{ scanNote }}
    </v-alert>

    <template v-if="channels.length">
      <v-alert type="success" variant="tonal" density="compact" class="mt-4">
        {{ scanNote }}
      </v-alert>

      <v-card class="setup-card" variant="outlined">
        <div class="settings-row">
          <v-select
            v-model="channel"
            :items="channelOptions"
            label="Detector channel"
            density="compact"
            variant="outlined"
            hide-details
            class="setting"
          ></v-select>
          <v-select
            v-if="phases.length"
            v-model="phase"
            :items="phaseOptions"
            label="Phase for the colour filter"
            density="compact"
            variant="outlined"
            hide-details
            class="setting"
          ></v-select>
          <v-chip-group v-model="states" multiple column>
            <v-chip
              v-for="option in stateOptions"
              :key="option.value"
              :value="option.value"
              filter
              variant="outlined"
              size="small"
              :class="`state-chip state-chip--${option.value}`"
            >
              {{ option.title }} ({{ stateCounts[option.value] || 0 }})
            </v-chip>
          </v-chip-group>
        </div>
        <p v-if="!phases.length" class="setup-card__hint mt-2">
          No phase-colour rows in this data, so the colour of each arrival is
          unknown and the filter is not offered.
        </p>
        <p v-else-if="unknownStateCount" class="setup-card__hint mt-2">
          {{ unknownStateCount }} arrivals fall outside phase {{ phase }}'s
          recorded colours &mdash; before its first change, or in a gap
          &mdash; and are shown whatever the filter says.
        </p>
      </v-card>

      <div class="metric-row">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
      </div>

      <h2 class="section-title">Occupancy over time</h2>
      <div class="chart-controls">
        <v-select
          v-model="bucket"
          :items="bucketOptions"
          label="Group by"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-select>
        <span class="chart-note">
          Hover any bar for its estimated speed.
        </span>
      </div>
      <p class="chart-hint">
        <template v-if="bucket === 'event'">
          One bar per vehicle, its length the time that vehicle held the loop.
          A short bar is a fast vehicle.
          <span v-if="chartRows.length < filteredOccupancies.length">
            Showing the first {{ chartRows.length }} of
            {{ filteredOccupancies.length }}.
          </span>
        </template>
        <template v-else>
          One bar per {{ bucket }}, its length the total time the loop was held
          down in that {{ bucket }}. The speed on each is for the typical
          vehicle in it, from the median occupancy rather than the mean, so one
          vehicle stopping on the loop cannot drag an otherwise free-flowing
          {{ bucket }} down to walking pace.
        </template>
      </p>

      <div v-if="!chartRows.length" class="chart-hint">
        Nothing matches these filters.
      </div>
      <div v-else class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
        <Bar ref="chart" :data="chartData" :options="chartOptions" />
      </div>

      <h2 class="section-title">
        {{ bucket === "event" ? "Every vehicle" : bucketHeading }}
        <span v-if="shownRows.length < totalRows" class="muted">
          (first {{ num(shownRows.length) }} of {{ num(totalRows) }})
        </span>
      </h2>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th>{{ bucket === "event" ? "Arrived" : "Starting" }}</th>
              <th v-if="bucket !== 'event'">Vehicles</th>
              <th>{{ bucket === "event" ? "Occupancy" : "Total occupancy" }}</th>
              <th v-if="bucket !== 'event'">Median occupancy</th>
              <th v-if="bucket !== 'event'">Occupied</th>
              <th v-if="bucket === 'event' && phases.length">Colour</th>
              <th>Estimated speed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rowItem in shownRows" :key="rowItem.key">
              <td class="nowrap">{{ rowLabel(rowItem) }}</td>
              <td v-if="bucket !== 'event'">{{ num(rowItem.count) }}</td>
              <td class="nowrap">{{ secs(rowItem.totalMs) }}</td>
              <td v-if="bucket !== 'event'" class="nowrap">{{ secs(rowItem.medianMs) }}</td>
              <td v-if="bucket !== 'event'" class="nowrap">{{ share(rowItem.occupiedShare) }}</td>
              <td v-if="bucket === 'event' && phases.length">
                <span v-if="rowItem.state" :class="`state-dot state-dot--${rowItem.state}`"></span>
                {{ rowItem.state || "—" }}
              </td>
              <td class="nowrap">{{ mph(rowItem.medianMph) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </div>
</template>

<script>
import { Bar } from "vue-chartjs";
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
  DEFAULT_LOOP_FEET,
  DEFAULT_MAX_OCCUPANCY_SECONDS,
  DEFAULT_VEHICLE_FEET,
  SIGNAL_STATES,
  TIME_BUCKETS,
  bucketOccupancies,
  buildOccupancies,
  buildPhaseIntervals,
  detectLayout,
  estimateSpeedMph,
  occupancySecondsForSpeed,
  scanLoopRows,
  stateAt,
  summarizeOccupancies,
} from "../utils/singleLoopSpeed.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, CategoryScale);

/** Colour per signal state, used on the chips, the dots and the bars. */
const STATE_COLORS = { green: "#2E7D32", yellow: "#F9A825", red: "#C62828" };
const BUCKET_COLOR = "#00695C";
/** A speed to anchor the settings note, so the numbers mean something. */
const REFERENCE_MPH = 30;
/** Rendering every row of a very large result set is not worth the stall. */
const MAX_TABLE_ROWS = 500;
/** One bar per vehicle stops being readable long before this. */
const MAX_CHART_ROWS = 300;

export default {
  name: "SingleLoopSpeedEstimator",
  components: { InputBox, Bar },
  data() {
    return {
      panel: [],
      text: "",
      loopFeet: DEFAULT_LOOP_FEET,
      vehicleFeet: DEFAULT_VEHICLE_FEET,
      maxOccupancySeconds: DEFAULT_MAX_OCCUPANCY_SECONDS,
      processing: false,
      ranOnce: false,
      error: "",
      detectorRows: [],
      phaseRows: [],
      channels: [],
      phases: [],
      stats: null,
      pairing: { unmatchedOn: 0, unmatchedOff: 0, overlong: 0 },
      channel: null,
      phase: null,
      states: [...SIGNAL_STATES],
      bucket: "hour",
      bucketOptions: TIME_BUCKETS,
      stateOptions: SIGNAL_STATES.map((value) => ({
        value,
        title: value[0].toUpperCase() + value.slice(1),
      })),
    };
  },
  computed: {
    channelOptions() {
      return this.channels.map((value) => ({ title: `Channel ${value}`, value }));
    },
    phaseOptions() {
      return this.phases.map((value) => ({ title: `Phase ${value}`, value }));
    },
    /** The colour timeline for the selected phase, built once per change. */
    phaseIntervals() {
      if (this.phase === null) return [];
      return buildPhaseIntervals(this.phaseRows, this.phase);
    },
    /**
     * Every occupancy on the selected channel, each tagged with the colour
     * showing when it arrived. Tagged here rather than in the util because the
     * phase to look up is a choice made on this page.
     */
    occupancies() {
      const onChannel = this.detectorRows.filter((row) => row.channel === this.channel);
      const { occupancies } = buildOccupancies(onChannel, {
        maxOccupancySeconds: this.maxOccupancySeconds,
      });
      const intervals = this.phaseIntervals;
      if (!intervals.length) return occupancies;
      return occupancies.map((row) => ({ ...row, state: stateAt(intervals, row.onMs) }));
    },
    stateCounts() {
      const counts = {};
      for (const row of this.occupancies) {
        if (row.state) counts[row.state] = (counts[row.state] || 0) + 1;
      }
      return counts;
    },
    /** Arrivals the colour timeline cannot place, which no filter should hide. */
    unknownStateCount() {
      if (!this.phaseIntervals.length) return 0;
      return this.occupancies.filter((row) => !row.state).length;
    },
    filteredOccupancies() {
      if (!this.phaseIntervals.length) return this.occupancies;
      if (!this.states.length || this.states.length === SIGNAL_STATES.length) {
        return this.occupancies;
      }
      const wanted = new Set(this.states);
      // An arrival with no known colour is shown whatever the filter says:
      // hiding it would quietly drop data for a reason the reader cannot see.
      return this.occupancies.filter((row) => !row.state || wanted.has(row.state));
    },
    summary() {
      return summarizeOccupancies(this.filteredOccupancies, this.loopFeet, this.vehicleFeet);
    },
    allRows() {
      return bucketOccupancies(
        this.filteredOccupancies, this.bucket, this.loopFeet, this.vehicleFeet,
      );
    },
    chartRows() {
      return this.bucket === "event" ? this.allRows.slice(0, MAX_CHART_ROWS) : this.allRows;
    },
    shownRows() {
      return this.chartRows.slice(0, MAX_TABLE_ROWS);
    },
    /**
     * Everything the table could have shown, not what the chart cap left it.
     * Comparing against the capped list would report "300 of 300" while 1,600
     * rows sat outside it, which is the kind of truncation a reader has no
     * way to notice.
     */
    totalRows() {
      return this.bucket === "event" ? this.filteredOccupancies.length : this.allRows.length;
    },
    metrics() {
      const s = this.summary;
      return [
        { label: "Vehicles", value: this.num(s.count) },
        { label: "Median speed", value: this.mph(s.medianMph) },
        { label: "Fastest", value: this.mph(s.fastestMph) },
        { label: "Slowest", value: this.mph(s.slowestMph) },
      ];
    },
    referenceSpeed() {
      return REFERENCE_MPH;
    },
    bucketHeading() {
      const found = TIME_BUCKETS.find((item) => item.value === this.bucket);
      return found ? found.title.replace(/^By /, "Every ") : "Every bucket";
    },
    referenceOccupancy() {
      const seconds = occupancySecondsForSpeed(REFERENCE_MPH, this.loopFeet, this.vehicleFeet);
      return seconds === null ? "—" : `${seconds.toFixed(2)}s`;
    },
    scanNote() {
      if (!this.stats) return "";
      const parts = [
        `Read ${this.num(this.stats.scanned)} rows and kept ${this.num(this.stats.kept)} detector and phase rows (${this.stats.keptPercent.toFixed(2)}%).`,
      ];
      const { unmatchedOn, unmatchedOff, overlong } = this.pairing;
      if (unmatchedOn || unmatchedOff) {
        parts.push(
          `${this.num(unmatchedOn + unmatchedOff)} detector events on this channel had no pair and were dropped.`,
        );
      }
      if (overlong) {
        parts.push(
          `${this.num(overlong)} were held longer than ${this.maxOccupancySeconds}s and were excluded.`,
        );
      }
      return parts.join(" ");
    },
    chartHeight() {
      return Math.max(260, Math.min(this.chartRows.length, 60) * 22 + 140);
    },
    chartData() {
      const rows = this.chartRows;
      const labels = rows.map((row) => this.rowLabel(row));
      return {
        labels,
        datasets: [
          {
            label: this.bucket === "event" ? "Occupancy" : "Total occupancy",
            data: rows.map((row) => ({ x: row.totalMs / 1000, y: this.rowLabel(row), row })),
            backgroundColor: rows.map((row) =>
              row.state ? STATE_COLORS[row.state] || BUCKET_COLOR : BUCKET_COLOR,
            ),
            borderWidth: 0,
          },
        ],
      };
    },
    chartOptions() {
      const secs = this.secs;
      const mph = this.mph;
      const num = this.num;
      const share = this.share;
      const bucket = this.bucket;
      return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            beginAtZero: true,
            title: { display: true, text: "Time the loop was occupied (seconds)" },
          },
          y: {
            type: "category",
            ticks: { autoSkip: true, maxTicksLimit: 40 },
            title: {
              display: true,
              text: bucket === "event" ? "Vehicle, by arrival" : `Each ${bucket}`,
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => items[0].label,
              label: (item) => {
                const row = item.raw.row;
                // The speed is the reason the chart exists, so it leads.
                return `Estimated speed: ${mph(row.medianMph)}`;
              },
              afterBody: (items) => {
                const row = items[0].raw.row;
                const lines = [];
                if (bucket === "event") {
                  lines.push(`Occupancy: ${secs(row.totalMs)}`);
                  if (row.state) lines.push(`Signal was ${row.state}`);
                } else {
                  lines.push(
                    `${num(row.count)} ${row.count === 1 ? "vehicle" : "vehicles"}`,
                    `Total occupancy: ${secs(row.totalMs)}`,
                    `Median occupancy: ${secs(row.medianMs)}`,
                    `Loop occupied ${share(row.occupiedShare)} of the ${bucket}`,
                  );
                }
                return lines;
              },
            },
          },
        },
      };
    },
  },
  methods: {
    num(value) {
      return Number(value || 0).toLocaleString();
    },
    secs(ms) {
      if (!Number.isFinite(ms)) return "—";
      const seconds = ms / 1000;
      if (seconds < 10) return `${seconds.toFixed(2)}s`;
      if (seconds < 120) return `${seconds.toFixed(1)}s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
    },
    mph(value) {
      return Number.isFinite(value) ? `${value.toFixed(1)} mph` : "—";
    },
    share(value) {
      return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
    },
    rowLabel(row) {
      if (!Number.isFinite(row.startMs)) return "";
      const when = DateTime.fromMillis(row.startMs);
      if (this.bucket === "day") return when.toFormat("yyyy-LL-dd");
      if (this.bucket === "hour") return when.toFormat("LL/dd HH:00");
      if (this.bucket === "minute") return when.toFormat("LL/dd HH:mm");
      return when.toFormat("LL/dd HH:mm:ss.S");
    },
    evaluate() {
      this.error = "";
      this.processing = true;
      // Let the button paint its spinner before the parse takes the thread.
      setTimeout(() => {
        try {
          const layout = detectLayout(this.text);
          const result = scanLoopRows(this.text, layout);
          this.detectorRows = result.detector;
          this.phaseRows = result.phase;
          this.channels = result.channels;
          this.phases = result.phases;
          this.stats = result.stats;
          if (!result.channels.length) {
            this.error = result.stats.scanned
              ? ""
              : "Could not read any rows. Expecting CSV lines of timestamp, enumeration, parameter.";
          }
          // Default to the busiest channel rather than the lowest numbered:
          // it is the one most likely to be the through lane being asked about.
          this.channel = this.busiestChannel(result.detector, result.channels);
          this.phase = result.phases.length ? result.phases[0] : null;
          this.states = [...SIGNAL_STATES];
          this.ranOnce = true;
        } catch (err) {
          this.error = `Could not process this data: ${err.message}`;
          this.detectorRows = [];
          this.phaseRows = [];
          this.channels = [];
          this.phases = [];
        } finally {
          this.processing = false;
        }
      }, 0);
    },
    busiestChannel(rows, channels) {
      if (!channels.length) return null;
      const counts = new Map();
      for (const row of rows) counts.set(row.channel, (counts.get(row.channel) || 0) + 1);
      return channels.reduce(
        (best, ch) => ((counts.get(ch) || 0) > (counts.get(best) || 0) ? ch : best),
        channels[0],
      );
    },
    downloadCsv() {
      const header = ["on", "off", "occupancy_s", "channel", "state", "estimated_mph"];
      const lines = [header.join(",")];
      for (const row of this.filteredOccupancies) {
        const speed = estimateSpeedMph(row.occupancyMs, this.loopFeet, this.vehicleFeet);
        lines.push(
          [
            DateTime.fromMillis(row.onMs).toFormat("yyyy-LL-dd HH:mm:ss.S"),
            DateTime.fromMillis(row.offMs).toFormat("yyyy-LL-dd HH:mm:ss.S"),
            (row.occupancyMs / 1000).toFixed(2),
            row.channel,
            row.state || "",
            speed === null ? "" : speed.toFixed(1),
          ].join(","),
        );
      }
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "single-loop-speeds.csv";
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.setup-card {
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
}
.setup-card__head {
  margin-bottom: 12px;
}
.setup-card__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: left;
}
.setup-card__hint {
  margin: 4px 0 0;
  font-size: 0.82rem;
  opacity: 0.75;
  text-align: left;
}
.settings-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.setting {
  max-width: 230px;
  flex: 0 0 auto;
}
.setting-note {
  font-size: 0.82rem;
  opacity: 0.8;
  text-align: left;
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.metric-tile {
  flex: 1 1 160px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 12px;
  padding: 12px 16px;
  text-align: left;
}
.metric-value {
  font-size: 1.4rem;
  font-weight: 600;
}
.metric-label {
  font-size: 0.78rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.section-title {
  text-align: left;
  font-size: 1.1rem;
  margin: 24px 0 8px;
}
.chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.chart-note,
.chart-hint {
  text-align: left;
  font-size: 0.82rem;
  opacity: 0.75;
}
.chart-wrapper {
  position: relative;
  margin-top: 8px;
}
.table-wrapper {
  overflow-x: auto;
}
.code-table {
  max-width: 460px;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  font-size: 0.8rem;
  font-weight: 400;
  opacity: 0.7;
}
.state-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 5px;
}
.state-dot--green { background: #2e7d32; }
.state-dot--yellow { background: #f9a825; }
.state-dot--red { background: #c62828; }
</style>
