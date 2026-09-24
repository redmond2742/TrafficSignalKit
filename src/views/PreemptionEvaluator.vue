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
            <p class="mt-2">
              Add a block per signal to compare intersections side by side.
              Each block is identified by its <b>signal number</b>, which is
              the same number a GTSS export uses, so naming the channels is
              automatic. Data that already leads with a signal ID column brings
              its own numbers and ignores the field.
            </p>
            <p class="mt-2">
              Load a <b>GTSS export</b> and each channel is named by what it
              actually serves &mdash; "Preempt 3" becomes "Ygnacio Valley Road
              from the ESE (WB)" &mdash; so a pattern points at a direction
              rather than a channel number.
            </p>
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
              <li>
                A <b>kit screen</b>: every event plotted by date and time of
                day, coloured per signal and channel
              </li>
              <li>
                A <b>weekly pattern</b> heatmap per channel, hour against day
                of week
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Screening for Unauthorised Emitters"
          value="kits"
        >
          <v-expansion-panel-text>
            <p>
              Switch the chart to <b>Kit screen</b>. Each dot is one preemption
              event, placed by the date it happened and the time of day it
              started.
            </p>
            <p class="mt-2">
              A vehicle carrying an unauthorised emitter triggers preemption on
              its driver's own commute, so its events land at close to the same
              minute of the day, on weekdays, again and again. That reads as a
              near-horizontal row of dots. Genuine emergency calls follow no
              such schedule and scatter across the chart. Weekend events are
              drawn as crosses, because the pattern being hunted is a weekday
              one.
            </p>
            <p class="mt-2">
              <b>Weekly pattern</b> asks the other half of the question: not
              "the same time every day" but "only on working days". Each
              channel gets an hour-by-weekday grid, and the signal picker
              switches between intersections. A commute rides Monday to Friday
              and leaves the weekend rows empty. Apparatus answering real calls
              fills the whole week, because emergencies keep no office hours.
              The percentage beside each grid is the share of that channel's
              events falling on a weekday.
            </p>
            <p class="mt-2">
              A flat row or a weekday-only block is a lead, not a finding:
              scheduled transit, a shift change at a nearby station, or a
              recurring delivery can all look similar. Confirm against the
              channel the calls arrive on and the times in the event table
              before drawing conclusions.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Naming Channels from a GTSS Export" value="gtss">
          <v-expansion-panel-text>
            <p>
              A preempt channel number means nothing on its own. A GTSS export
              carries the chain that gives it meaning:
            </p>
            <pre>
preempt.txt     preempt_channel, signalID, type, phase, maxTime
phases.txt      phase, signal_id, movement_type, approach_id
approaches.txt  approach_id, signal_id, street_name, compass_bearing
            </pre>
            <p>
              Channel 3 at signal 1 serves phases 1 and 6; both belong to
              approach 1-2, which is Ygnacio Valley Road lying 120&deg; from
              the intersection. So the channel is the <b>ESE approach</b>, and
              the traffic on it is <b>westbound</b>.
            </p>
            <p class="mt-2">
              Load the zip with <b>Load GTSS export</b>. If preempt.txt ships
              separately, select it at the same time. The signal field on each
              block then becomes a picker over the signals the export actually
              contains, listed by number and cross street, so there is no
              separate linking step: the number is the link.
            </p>
            <p class="mt-2">
              <b>On direction:</b> compass_bearing is the bearing of the
              approach leg from the intersection &mdash; where the vehicles
              come from &mdash; so the travel direction shown is its
              reciprocal. A channel serving phases on two different approaches
              gets no direction at all rather than an arbitrary one.
            </p>
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

    <!--
      One block per signal. Comparing signals is the point of the kit screen,
      and a single box could not say which data came from where. A file that
      already leads with a signal ID column keeps its own names instead.
    -->
    <div v-for="(source, index) in sources" :key="source.id" class="source-block">
      <div class="source-head">
        <!--
          The signal number, not a free-text name: it is the key the GTSS
          export uses, so typing it here is what links the two. When an export
          is loaded this becomes a picker over the signals it actually has.
        -->
        <v-select
          v-if="gtssSignalOptions.length"
          v-model="source.signalId"
          :items="gtssSignalOptions"
          label="Signal"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="source-name"
        ></v-select>
        <v-text-field
          v-else
          v-model="source.signalId"
          :placeholder="`${index + 1}`"
          label="Signal number"
          density="compact"
          variant="outlined"
          hide-details
          class="source-name source-name--narrow"
        ></v-text-field>
        <v-btn
          v-if="sources.length > 1"
          variant="text"
          size="small"
          prepend-icon="mdi-close"
          @click="removeSource(index)"
        >
          Remove
        </v-btn>
      </div>
      <InputBox
        v-model="source.text"
        defaultText="Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, channel)"
        accept=".csv,.txt,text/csv,text/plain"
      />
    </div>

    <!--
      A channel number alone says nothing. A GTSS export carries
      preempt.txt -> phases.txt -> approaches.txt, which is what turns
      "Preempt 3" into "Ygnacio Valley Road from the ESE".
    -->
    <div class="gtss-row">
      <v-btn
        variant="tonal"
        prepend-icon="mdi-map-marker-distance"
        :loading="gtssLoading"
        @click="$refs.gtssInput.click()"
      >
        Load GTSS export
      </v-btn>
      <input
        ref="gtssInput"
        type="file"
        class="gtss-file"
        multiple
        accept=".zip,.txt"
        @change="loadGtssFiles"
      />
      <span v-if="gtssName" class="gtss-name">
        {{ gtssName }}
        <v-btn size="x-small" variant="text" @click="clearGtss">Clear</v-btn>
      </span>
      <span v-else class="gtss-hint">
        Optional: the zip, plus preempt.txt if it ships separately
      </span>
    </div>

    <v-alert v-if="gtssError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ gtssError }}
    </v-alert>
    <v-alert
      v-else-if="gtssWarnings.length"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      {{ gtssWarnings.join(" ") }}
    </v-alert>

    <div class="action-row">
      <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addSource">
        Add another signal
      </v-btn>
      <v-btn
        color="primary"
        :loading="processing"
        :disabled="!hasInput"
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

      <template v-if="gtss">
        <h2 class="section-title">Preempt channels</h2>
        <v-alert
          v-if="unmatchedSignals.length"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          The export has nothing for
          {{ unmatchedSignals.map((s) => `signal ${s}`).join(", ") }}. Set the
          signal number on each block above to match the export.
        </v-alert>

        <div v-if="directoryRows.length" class="table-wrapper">
          <v-table density="compact">
            <thead>
              <tr>
                <th v-if="multiSignal">Signal</th>
                <th>Channel</th>
                <th>Serves</th>
                <th>Phases</th>
                <th>Type</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in directoryRows" :key="`${row.name}-${row.channel}`">
                <td v-if="multiSignal" class="nowrap">
                  {{ row.name }}
                  <span v-if="row.crossStreets" class="muted">
                    {{ row.crossStreets }}
                  </span>
                </td>
                <td>Preempt {{ row.channel }}</td>
                <td>{{ row.serves || "—" }}</td>
                <td class="nowrap">{{ row.phases || "—" }}</td>
                <td>{{ row.type || "—" }}</td>
                <td class="nowrap">{{ row.maxTime === null ? "—" : `${row.maxTime}s` }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <p v-else class="chart-hint">
          Set the signal number on each block above to match the export, and
          each channel will be named by what it serves.
        </p>
      </template>

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
          <v-btn value="scatter" size="small">Kit screen</v-btn>
          <v-btn value="weekly" size="small">Weekly pattern</v-btn>
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
        <v-btn
          v-if="chartMode !== 'weekly'"
          size="small"
          variant="text"
          @click="resetZoom"
        >
          Reset zoom
        </v-btn>
      </div>
      <p class="chart-hint">
        <template v-if="chartMode === 'timeline'">
          Every event on its channel, at the time it happened. Scroll to zoom
          the time axis &mdash; events are short next to a whole day of data.
        </template>
        <template v-if="chartMode === 'weekly'">
          Events by hour and day of week, one grid per channel. A vehicle
          riding a commute concentrates into a few cells in the Monday-to-Friday
          rows. Apparatus answering real calls spreads across the whole week,
          because emergencies keep no office hours.
        </template>
        <template v-else-if="chartMode === 'scatter'">
          Each dot is one event, placed by date and time of day. A vehicle
          carrying an emitter calls on its own commute, so its dots form a
          near-horizontal row on weekdays; genuine emergency calls scatter.
          Weekends are drawn as crosses. Scroll to zoom, drag to pan.
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
      <!-- A CSS grid rather than a canvas: no charting library has a matrix
           type built in, and this stays legible and selectable at any size. -->
      <div v-if="chartMode === 'weekly'" class="heatmaps">
        <v-select
          v-if="heatmapSignalOptions.length > 1"
          v-model="heatmapSignal"
          :items="heatmapSignalOptions"
          label="Signal"
          density="compact"
          variant="outlined"
          hide-details
          class="heatmap-signal"
        ></v-select>

        <div v-for="grid in heatmaps" :key="`${grid.signal}-${grid.channel}`" class="heatmap">
          <div class="heatmap-head">
            <h3 class="heatmap-title">
              Preempt {{ grid.channel }}
              <span v-if="servesLabel(grid.signal, grid.channel)" class="heatmap-serves">
                — {{ servesLabel(grid.signal, grid.channel) }}
              </span>
            </h3>
            <span class="heatmap-facts">
              {{ grid.total }} {{ grid.total === 1 ? "event" : "events" }} ·
              {{ Math.round(grid.weekdayShare * 100) }}% on weekdays
              <template v-if="grid.peak">
                · busiest {{ grid.peak.weekday }}
                {{ hourLabel(grid.peak.hour) }}:00
              </template>
            </span>
          </div>

          <div class="heatmap-grid" role="img" :aria-label="`Preempt ${grid.channel}: ${grid.total} events by hour and day of week`">
            <div class="heatmap-corner"></div>
            <div v-for="hour in hourCount" :key="`h${hour}`" class="heatmap-hour">
              {{ hour - 1 }}
            </div>
            <template v-for="(row, rowIndex) in grid.counts" :key="`r${rowIndex}`">
              <div class="heatmap-day" :class="{ 'heatmap-day--weekend': rowIndex > 4 }">
                {{ weekdayLabels[rowIndex] }}
              </div>
              <div
                v-for="(count, hour) in row"
                :key="`c${rowIndex}-${hour}`"
                class="heatmap-cell"
                :style="cellStyle(count, grid.max)"
                :title="cellTitle(weekdayLabels[rowIndex], hour, count)"
              >
                {{ count || "" }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-else class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
        <Scatter
          v-if="chartMode === 'scatter'"
          ref="gantt"
          :data="chartData"
          :options="chartOptions"
        />
        <Bar v-else ref="gantt" :data="chartData" :options="chartOptions" />
      </div>

      <h2 class="section-title">Channel summary</h2>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th v-if="multiSignal">Signal</th>
              <th>Channel</th>
              <th v-if="hasDirections">Serves</th>
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
            <tr
              v-for="channel in viewSummary.channels"
              :key="`${channel.signal}-${channel.channel}`"
            >
              <td v-if="multiSignal">{{ channel.signal || "—" }}</td>
              <td>Preempt {{ channel.channel }}</td>
              <td v-if="hasDirections">
                {{ servesLabel(channel.signal, channel.channel) || "—" }}
              </td>
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
              <th v-if="multiSignal">Signal</th>
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
              <td v-if="multiSignal">{{ event.signal || "—" }}</td>
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
import { Bar, Scatter } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import { readZipText } from "../utils/zipReader.js";
import { buildPreemptDirectory, describeChannel } from "../utils/gtss.js";
import {
  PREEMPT_CODES,
  STATUS_LABELS,
  DEFAULT_MAX_EVENT_SECONDS,
  MINUTES_PER_DAY,
  WEEKDAY_LABELS,
  HOURS_PER_DAY,
  buildHourWeekdayGrids,
  evaluateSources,
  buildScatterPoints,
  seriesKey,
  eventsToCsv,
  summarizePreemption,
  toSeconds,
} from "../utils/preemptionEvaluator.js";

ChartJS.register(
  Title, Tooltip, Legend, BarElement, PointElement, LinearScale, CategoryScale, zoom,
);

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

/**
 * One colour per signal-and-channel series on the kit screen. Chosen to stay
 * distinguishable against each other rather than to match the interval
 * palette above, which encodes something different.
 */
const SERIES_COLORS = [
  "#00695C", "#C62828", "#1565C0", "#EF6C00", "#6A1B9A", "#2E7D32",
  "#AD1457", "#00838F", "#5D4037", "#37474F", "#9E9D24", "#4527A0",
];
/** Rendering every row of a very large result set is not worth the stall. */
const MAX_TABLE_ROWS = 500;
/** The durations view gives every event its own row, so it needs a ceiling. */
const MAX_CHART_ROWS = 40;

export default {
  name: "PreemptionEvaluator",
  components: { InputBox, Bar, Scatter },
  data() {
    return {
      panel: [],
      sources: [{ id: 1, signalId: "", text: "" }],
      nextSourceId: 2,
      maxEventSeconds: DEFAULT_MAX_EVENT_SECONDS,
      processing: false,
      ranOnce: false,
      error: "",
      events: [],
      summary: { channels: [], totals: {} },
      stats: null,
      visibleChannels: [],
      signals: [],
      chartMode: "timeline",
      heatmapSignal: null,
      gtss: null,
      gtssName: "",
      gtssWarnings: [],
      gtssError: "",
      gtssLoading: false,
      weekdayLabels: WEEKDAY_LABELS,
      hourCount: HOURS_PER_DAY,
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
    hasInput() {
      return this.sources.some((source) => (source.text || "").trim());
    },
    /** Whether the data spans more than one signal, which changes what is worth showing. */
    multiSignal() {
      return this.signals.length > 1;
    },
    gtssSignalOptions() {
      if (!this.gtss) return [];
      return this.gtss.signals.map((signal) => ({
        title: signal.crossStreets
          ? `${signal.id} — ${signal.crossStreets}`
          : `Signal ${signal.id}`,
        value: signal.id,
      }));
    },
    /** GTSS entries keyed by signal id, for quick lookup while rendering. */
    gtssById() {
      const map = {};
      for (const signal of this.gtss ? this.gtss.signals : []) map[signal.id] = signal;
      return map;
    },
    /**
     * True once any signal in the data is one the export knows about.
     * The signal name in the data is the GTSS id, so this is a direct lookup.
     */
    hasDirections() {
      return this.signals.some((name) => this.gtssById[name]);
    },
    /** Every channel the export knows about, for the signals actually loaded. */
    directoryRows() {
      const rows = [];
      for (const name of this.signals) {
        const signal = this.gtssById[name];
        if (!signal) continue;
        for (const entry of signal.channels) {
          rows.push({
            name,
            crossStreets: signal.crossStreets,
            channel: entry.channel,
            serves: describeChannel(entry),
            phases: entry.phases.join(", "),
            type: entry.type,
            maxTime: entry.maxTime,
          });
        }
      }
      return rows;
    },
    /** Signals in the data that the export has nothing for. */
    unmatchedSignals() {
      if (!this.gtss) return [];
      return this.signals.filter((name) => !this.gtssById[name]);
    },
    /** Every grid for the data, before the signal picker narrows it. */
    allHeatmaps() {
      return buildHourWeekdayGrids(this.filteredEvents);
    },
    /** The signal the heatmaps are showing, defaulting to the first available. */
    activeHeatmapSignal() {
      const available = [...new Set(this.allHeatmaps.map((grid) => grid.signal))];
      if (this.heatmapSignal !== null && available.includes(this.heatmapSignal)) {
        return this.heatmapSignal;
      }
      return available[0] ?? null;
    },
    heatmapSignalOptions() {
      return [...new Set(this.allHeatmaps.map((grid) => grid.signal))].map((signal) => ({
        title: signal || "Unnamed signal",
        value: signal,
      }));
    },
    /** One heatmap per channel, for the selected signal. */
    heatmaps() {
      const signal = this.activeHeatmapSignal;
      return this.allHeatmaps.filter((grid) => grid.signal === signal);
    },
    /**
     * Date against time of day, one point per event.
     *
     * A vehicle carrying an unauthorised emitter calls the signal on its own
     * commute, so its points sit at nearly the same minute of the day, on
     * weekdays, across many dates -- a near-horizontal row. Real emergency
     * calls have no such structure.
     */
    scatterChartData() {
      const points = buildScatterPoints(this.filteredEvents);
      const bySeries = new Map();
      for (const point of points) {
        const key = seriesKey(point.signal, point.channel);
        if (!bySeries.has(key)) bySeries.set(key, []);
        bySeries.get(key).push({ x: point.dateMs, y: point.minuteOfDay, point });
      }
      const datasets = [...bySeries.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([label, data], index) => {
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          return {
            label,
            data,
            backgroundColor: color,
            borderColor: color,
            // Weekends hollowed out: the pattern being hunted is a weekday one.
            pointStyle: data.map((d) => (d.point.isWeekend ? "crossRot" : "circle")),
            pointRadius: 4,
            pointHoverRadius: 7,
          };
        });
      return { datasets };
    },
    /**
     * Always the full set, so a filter can never hide the chip that undoes it.
     * Deduplicated: the summary now has a row per signal and channel, so the
     * same channel number appears once for each signal that has one.
     */
    allChannels() {
      return [...new Set(this.summary.channels.map((channel) => channel.channel))].sort(
        (a, b) => a - b,
      );
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
      if (this.chartMode === "scatter") return 480;
      if (this.chartMode === "durations") {
        return Math.max(240, this.durationEvents.length * 30 + 120);
      }
      return Math.max(240, this.chartChannels.length * 64 + 110);
    },
    chartData() {
      if (this.chartMode === "scatter") return this.scatterChartData;
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
    /** Date across, minute of day up, both in local time. */
    scatterOptions() {
      const clock = this.clockTime;
      const secs = this.secs;
      const minuteLabel = (minute) => {
        const h = Math.floor(minute / 60);
        const m = Math.round(minute % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            ticks: {
              callback: (value) => new Date(value).toLocaleDateString(),
              maxRotation: 0,
              autoSkipPadding: 24,
            },
            title: { display: true, text: "Date" },
          },
          y: {
            type: "linear",
            min: 0,
            max: MINUTES_PER_DAY,
            // Midnight at the bottom, so the day reads upward like a clock face.
            ticks: { stepSize: 120, callback: (value) => minuteLabel(value) },
            title: { display: true, text: "Time of day" },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => items[0].raw.point.signal || "Signal",
              label: (item) => {
                const p = item.raw.point;
                return `Preempt ${p.channel} — ${new Date(p.startMs).toLocaleString()}`;
              },
              afterBody: (items) => {
                const p = items[0].raw.point;
                return [
                  `Time of day: ${minuteLabel(p.minuteOfDay)}`,
                  `Duration: ${secs(p.durationMs)}`,
                  p.isWeekend ? "Weekend" : "Weekday",
                ];
              },
            },
          },
          zoom: {
            pan: { enabled: true, mode: "xy" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
          },
        },
      };
    },
    chartOptions() {
      if (this.chartMode === "scatter") return this.scatterOptions;
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
          const result = evaluateSources(
            this.sources.map((source, index) => ({
              // The label becomes the event's signal, and the signal is the
              // GTSS key, so no separate linking step is needed.
              label: String(source.signalId ?? "").trim() || String(index + 1),
              text: source.text,
            })),
            { maxEventSeconds: this.maxEventSeconds || DEFAULT_MAX_EVENT_SECONDS },
          );
          if (!result.events.length) {
            this.error =
              "No preemption events found. Expecting CSV lines of timestamp, enumeration, channel.";
          }
          this.events = result.events;
          this.summary = result.summary;
          this.stats = result.stats;
          this.signals = result.signals;
          this.visibleChannels = [];
          this.ranOnce = true;
        } catch (err) {
          this.error = `Could not process this data: ${err.message}`;
          this.events = [];
          this.summary = { channels: [], totals: {} };
          this.signals = [];
        } finally {
          this.processing = false;
        }
      }, 0);
    },
    /**
     * Cell shading. Scaled against the busiest cell in that channel's own grid,
     * so a quiet channel is still readable next to a busy one -- the shape of
     * the week is the point here, not the absolute count.
     */
    cellStyle(count, max) {
      if (!count) return { background: "rgba(var(--v-theme-on-surface), 0.04)" };
      const intensity = 0.18 + 0.82 * (count / (max || 1));
      return { background: `rgba(0, 105, 92, ${intensity.toFixed(3)})`, color: intensity > 0.55 ? "#fff" : "inherit" };
    },
    hourLabel(hour) {
      return String(hour).padStart(2, "0");
    },
    cellTitle(weekday, hour, count) {
      const plural = count === 1 ? "event" : "events";
      return `${weekday} ${this.hourLabel(hour)}:00 — ${count} ${plural}`;
    },
    /**
     * What a channel serves, from the GTSS export. Empty when nothing is
     * loaded or the signal is not linked, so every caller can print it
     * unconditionally.
     */
    servesLabel(signalName, channel) {
      const signal = this.gtssById[signalName];
      if (!signal) return "";
      return describeChannel(signal.channels.find((c) => c.channel === channel));
    },
    async loadGtssFiles(event) {
      const files = [...(event.target.files || [])];
      if (!files.length) return;
      this.gtssError = "";
      this.gtssLoading = true;
      try {
        const collected = {};
        for (const file of files) {
          if (/\.zip$/i.test(file.name)) {
            Object.assign(collected, await readZipText(await file.arrayBuffer()));
          } else {
            // preempt.txt often ships alongside the archive rather than inside it.
            collected[file.name.split("/").pop()] = await file.text();
          }
        }
        const directory = buildPreemptDirectory(collected);
        if (!directory.signals.length) {
          this.gtssError =
            "No preempt channels found. The export needs preempt.txt, plus phases.txt and approaches.txt for directions.";
          this.gtss = null;
        } else {
          this.gtss = directory;
          this.gtssWarnings = directory.warnings;
          this.gtssName = files.map((f) => f.name).join(", ");
        }
      } catch (err) {
        this.gtssError = `Could not read that export: ${err.message}`;
        this.gtss = null;
      } finally {
        this.gtssLoading = false;
        event.target.value = "";
      }
    },
    clearGtss() {
      this.gtss = null;
      this.gtssName = "";
      this.gtssWarnings = [];
      this.gtssError = "";
    },
    addSource() {
      this.sources.push({ id: this.nextSourceId, signalId: "", text: "" });
      this.nextSourceId += 1;
    },
    removeSource(index) {
      this.sources.splice(index, 1);
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
.source-block {
  margin-bottom: 20px;
}
.source-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.source-name {
  max-width: 320px;
}
.source-name--narrow {
  max-width: 160px;
}
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
.gtss-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 8px 0 12px;
}
.gtss-file {
  display: none;
}
.gtss-name,
.gtss-hint {
  font-size: 0.82rem;
  opacity: 0.75;
}
.heatmap-serves {
  font-weight: 400;
  font-size: 0.85rem;
  opacity: 0.75;
}
.heatmaps {
  margin-top: 8px;
}
.heatmap-signal {
  max-width: 280px;
  margin-bottom: 16px;
}
.heatmap {
  margin-bottom: 24px;
  overflow-x: auto;
}
.heatmap-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.heatmap-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.heatmap-facts {
  font-size: 0.8rem;
  opacity: 0.75;
}
.heatmap-grid {
  display: grid;
  /* A day label, then one column per hour. */
  grid-template-columns: 38px repeat(24, minmax(22px, 1fr));
  gap: 2px;
  min-width: 600px;
}
.heatmap-corner {
  /* empty cell above the day labels */
}
.heatmap-hour {
  font-size: 0.65rem;
  text-align: center;
  opacity: 0.6;
  padding-bottom: 2px;
}
.heatmap-day {
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  opacity: 0.85;
}
.heatmap-day--weekend {
  opacity: 0.5;
}
.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  line-height: 1;
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
