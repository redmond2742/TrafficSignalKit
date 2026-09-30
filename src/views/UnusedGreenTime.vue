<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Unused Green Time</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Unused Green Time" value="about">
          <v-expansion-panel-text>
            <p>
              A phase is green and nothing is over its detectors. Nothing is
              crossing, nothing is waiting, and every second of it is time
              some other movement could have had. This finds those seconds,
              cycle by cycle and phase by phase, so the ones worth changing
              are easy to pick out.
            </p>
            <p class="mt-2">
              Two shapes of it are counted, and the second usually goes
              unnoticed:
            </p>
            <ul>
              <li>
                <b>Quiet green</b> &mdash; a gap in the platoon, an over-long
                minimum, a phase served with no demand behind it.
              </li>
              <li>
                <b>Green held past a finished pedestrian phase</b> &mdash; the
                walk and clearance are over, the don't-walk is solid, and the
                green runs on with nothing on the detectors until yellow.
                Those seconds have a cause and usually a fix.
              </li>
            </ul>
            <p class="mt-2">
              The second is part of the first, not a separate total: it is the
              share of the same idle time that fell after the ped phase
              finished.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What It Cannot Know" value="limits">
          <v-expansion-panel-text>
            <p>
              This estimates. A quiet detector means no vehicle was
              <i>detected</i>, which is not quite the same as no vehicle being
              there: a failed loop, a camera zone that does not reach, or a
              movement with no detection at all will all read as idle when
              they are not.
            </p>
            <p class="mt-2">
              A phase with <b>no channels assigned is left out entirely</b>
              rather than reported as wholly idle. A phase nothing is known
              about is not a phase with no traffic.
            </p>
            <p class="mt-2">
              The two settings are the assumptions, and they are on the page
              rather than buried in the code:
            </p>
            <ul>
              <li>
                <b>Clearance allowance</b> &mdash; a detector releases as the
                rear bumper leaves the loop, and the vehicle is still in the
                intersection for a second or two after. Without this every
                platoon reads as a string of tiny idle gaps.
              </li>
              <li>
                <b>Shortest gap worth counting</b> &mdash; the spacing inside
                a platoon is idle in the arithmetic but is not time anyone can
                reclaim. Raising this counts only gaps long enough to matter.
              </li>
            </ul>
            <p class="mt-2">
              Stop-bar detection answers this question best. An advance
              detector fired seconds ago for a vehicle that may already be
              through, so a phase detected only in advance will read as idler
              than it is. A GTSS export records each channel's purpose, and
              the tool says when it is relying on advance detection.
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
                <tr><td>1</td><td>Begin green</td><td>phase</td></tr>
                <tr><td>8</td><td>Begin yellow clearance</td><td>phase</td></tr>
                <tr><td>21</td><td>Ped begin walk</td><td>phase</td></tr>
                <tr><td>22</td><td>Ped begin clearance</td><td>phase</td></tr>
                <tr><td>23</td><td>Ped begin solid don't walk</td><td>phase</td></tr>
                <tr><td>82</td><td>Detector on</td><td>channel</td></tr>
                <tr><td>81</td><td>Detector off</td><td>channel</td></tr>
              </tbody>
            </v-table>
            <p class="mt-2">
              A green runs from 1 to the 8 that ends it. The pedestrian phase
              is over at 23. Everything else in the file is discarded as it is
              read.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste CSV lines of <code>timestamp, enumeration, parameter</code>
            for one signal, and tell it which channels serve which phase.
            <pre>
3/14/2024 07:15:00.0, 1, 2      phase 2 goes green
3/14/2024 07:15:02.0, 82, 5     a vehicle arrives
3/14/2024 07:15:03.0, 81, 5     and leaves
3/14/2024 07:15:04.0, 23, 2     the ped phase finishes
3/14/2024 07:15:40.0, 8, 2      yellow, 33 seconds later
            </pre>
            With channel 5 on phase 2, that cycle reports roughly 33 seconds
            of unused green, nearly all of it after the ped phase ended.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <!--
      Assignments come from one of two places, and the tabs say which is in
      use rather than letting a half-filled table and a loaded export fight
      over the same phase.
    -->
    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">Detector assignments</h2>
        <p class="setup-card__hint">
          Which channels serve which phase. Nothing can be found without
          this: a phase with no channels is left out rather than counted as
          idle.
        </p>
      </div>
      <v-tabs v-model="assignmentTab" density="compact" color="primary">
        <v-tab value="manual">Type them in</v-tab>
        <v-tab value="gtss">Load a GTSS export</v-tab>
      </v-tabs>
      <v-window v-model="assignmentTab" class="mt-3">
        <v-window-item value="manual">
          <p class="setup-card__hint mb-2">
            Two numbers a line, channel first, then the phase it serves. The
            same table the
            <router-link to="/detection-plotter">Detection Channel Plotter</router-link>
            takes. Per signal, below.
          </p>
        </v-window-item>
        <v-window-item value="gtss">
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
              <v-icon icon="mdi-check" size="small" class="gtss-tick" />
              {{ gtssName }}
              <span class="muted">— {{ gtssSummary }}</span>
              <v-btn size="x-small" variant="text" @click="clearGtss">Clear</v-btn>
            </span>
            <span v-else class="gtss-hint">
              detectors.txt gives every channel its phase, for every signal at
              once.
            </span>
          </div>
          <v-alert v-if="gtssError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ gtssError }}
          </v-alert>
          <v-alert
            v-else-if="gtss && gtss.warnings.length"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ gtss.warnings.join(" ") }}
          </v-alert>
          <p v-if="advanceOnlyPhases.length" class="setup-card__hint mt-2">
            Detected only in advance on
            {{ advanceOnlyPhases.join(", ") }}. An advance detector fired
            seconds ago for a vehicle that may already be through, so those
            phases will read idler than they are.
          </p>
        </v-window-item>
      </v-window>
    </v-card>

    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">Settings</h2>
        <p class="setup-card__hint">
          These are the assumptions. Both apply to every signal below.
        </p>
      </div>
      <div class="settings-row">
        <v-text-field
          v-model.number="clearanceSeconds"
          type="number"
          label="Clearance allowance (s)"
          min="0"
          step="0.5"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-text-field>
        <v-text-field
          v-model.number="minGapSeconds"
          type="number"
          label="Shortest gap worth counting (s)"
          min="0"
          step="0.5"
          density="compact"
          variant="outlined"
          hide-details
          class="setting"
        ></v-text-field>
      </div>
    </v-card>

    <!-- One card per signal, so it is obvious which data belongs to which. -->
    <v-card
      v-for="(source, index) in sources"
      :key="source.id"
      class="setup-card source-card"
      variant="outlined"
    >
      <div class="source-head">
        <v-combobox
          v-if="gtssSignalOptions.length"
          v-model="source.signalId"
          :items="gtssSignalOptions"
          :return-object="false"
          label="Signal"
          placeholder="Pick one, or type any number"
          persistent-placeholder
          hint="From the export, or type any signal number"
          persistent-hint
          density="compact"
          variant="outlined"
          clearable
          class="source-name"
        ></v-combobox>
        <v-text-field
          v-else
          v-model="source.signalId"
          :placeholder="`${index + 1}`"
          label="Signal"
          density="compact"
          variant="outlined"
          hide-details
          class="source-name source-name--narrow"
        ></v-text-field>
        <span v-if="assignmentNote(source)" class="signal-note">
          {{ assignmentNote(source) }}
        </span>
        <v-spacer />
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
      <v-textarea
        v-if="assignmentTab === 'manual'"
        v-model="source.assignments"
        placeholder="Ch 5&#9;2&#10;Ch 6&#9;2&#10;Ch 9&#9;6"
        label="Channel-to-phase table"
        rows="3"
        density="compact"
        variant="outlined"
        hide-details
        class="mapping-textarea mb-3"
      ></v-textarea>
      <InputBox
        v-model="source.text"
        defaultText="Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, parameter)"
        accept=".csv,.txt,text/csv,text/plain"
      />
    </v-card>

    <div class="action-row">
      <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addSource">
        Add another signal
      </v-btn>
      <v-btn color="primary" :loading="processing" :disabled="!hasInput" @click="evaluate">
        Find Unused Green
      </v-btn>
      <v-btn v-if="allRows.length" variant="tonal" @click="downloadCsv">
        Download CSV
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{ error }}</v-alert>
    <v-alert v-else-if="ranOnce && !allRows.length" type="info" variant="tonal" class="mt-4">
      {{ emptyReason }}
    </v-alert>

    <template v-if="allRows.length">
      <v-alert type="success" variant="tonal" density="compact" class="mt-4">
        {{ scanNote }}
      </v-alert>

      <div class="metric-row">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
      </div>

      <h2 class="section-title">Where the green goes</h2>
      <div class="chart-controls">
        <v-btn-toggle
          v-model="chartMode"
          mandatory
          divided
          density="compact"
          variant="outlined"
          color="primary"
        >
          <v-btn value="phase" size="small">By phase</v-btn>
          <v-btn value="cycle" size="small">Cycle by cycle</v-btn>
        </v-btn-toggle>
        <v-select
          v-if="chartMode === 'cycle' && seriesOptions.length > 1"
          v-model="selectedSeries"
          :items="seriesOptions"
          label="Signal and phase"
          density="compact"
          variant="outlined"
          hide-details
          class="setting setting--select"
        ></v-select>
      </div>
      <p class="chart-hint">
        <template v-if="chartMode === 'phase'">
          Each bar is one phase at one signal, split into the green that was
          used and the green that was not. The darker part of the unused
          share is the time that ran on after a pedestrian phase had already
          finished.
        </template>
        <template v-else>
          One bar per cycle, so a phase that wastes a little every cycle is
          told apart from one that wastes a lot occasionally. The two are
          different problems with different fixes.
          <span v-if="cycleRows.length < seriesCycleCount">
            Showing the first {{ num(cycleRows.length) }} of
            {{ num(seriesCycleCount) }} cycles; the table below has them all.
          </span>
        </template>
      </p>
      <div class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
        <Bar ref="chart" :data="chartData" :options="chartOptions" />
      </div>

      <h2 class="section-title">Phase summary</h2>
      <p class="chart-hint">Worst first. Click a column to sort.</p>
      <v-data-table
        :headers="phaseHeaders"
        :items="phaseRows"
        :items-per-page="15"
        density="compact"
      >
        <template #item.idleMs="{ item }">{{ secs(item.idleMs) }}</template>
        <template #item.idleShare="{ item }">
          <div class="share-cell">
            <div class="share-bar" :style="{ width: `${Math.max(item.idleShare * 100, 1)}%` }"></div>
            <span class="share-text">{{ percent(item.idleShare) }}</span>
          </div>
        </template>
        <template #item.perCycleMs="{ item }">{{ secs(item.perCycleMs) }}</template>
        <template #item.idleAfterPedMs="{ item }">
          {{ item.idleAfterPedMs ? secs(item.idleAfterPedMs) : "—" }}
        </template>
        <template #item.worstIdleMs="{ item }">{{ secs(item.worstIdleMs) }}</template>
        <template #item.greenMs="{ item }">{{ secs(item.greenMs) }}</template>
      </v-data-table>

      <h2 class="section-title">Every cycle</h2>
      <p class="chart-hint">
        {{ num(allRows.length) }} greens across every phase. Sort on any
        column, or narrow to one phase to read a single movement straight
        down.
      </p>
      <div class="chart-controls mb-2">
        <v-select
          v-model="cyclePhaseFilter"
          :items="cyclePhaseOptions"
          label="Phase"
          density="compact"
          variant="outlined"
          hide-details
          class="setting setting--select"
        ></v-select>
        <v-btn
          v-if="cyclePhaseFilter !== ALL_PHASES"
          variant="text"
          size="small"
          @click="cyclePhaseFilter = ALL_PHASES"
        >
          Show every phase
        </v-btn>
      </div>
      <v-data-table
        :headers="cycleHeaders"
        :items="cycleTableRows"
        :items-per-page="25"
        :sort-by="[{ key: 'idleMs', order: 'desc' }]"
        density="compact"
        class="table-wrapper"
      >
        <template #item.startMs="{ item }">
          <span class="nowrap">{{ clock(item.startMs) }}</span>
        </template>
        <template #item.greenMs="{ item }">
          <span class="nowrap">{{ secs(item.greenMs) }}</span>
        </template>
        <template #item.idleMs="{ item }">
          <span class="nowrap">{{ secs(item.idleMs) }}</span>
        </template>
        <template #item.idleShare="{ item }">
          <div class="share-cell">
            <div
              class="share-bar"
              :style="{ width: `${Math.max(item.idleShare * 100, 1)}%` }"
            ></div>
            <span class="share-text">{{ percent(item.idleShare) }}</span>
          </div>
        </template>
        <template #item.longestIdleMs="{ item }">
          <span class="nowrap">{{ secs(item.longestIdleMs) }}</span>
        </template>
        <template #item.idleAfterPedMs="{ item }">
          <span class="nowrap">
            {{ item.pedServed ? secs(item.idleAfterPedMs) : "—" }}
          </span>
        </template>
      </v-data-table>
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
import { readZipText } from "../utils/zipReader.js";
import { buildDetectorDirectory } from "../utils/gtss.js";
import { parseDetectorPhaseMap } from "../utils/singleLoopSpeed.js";
import {
  DEFAULT_CLEARANCE_SECONDS,
  DEFAULT_MIN_GAP_SECONDS,
  analyzeSignal,
  detectLayout,
  scanGreenRows,
  summarizePhase,
} from "../utils/unusedGreen.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, CategoryScale);

const USED_COLOR = "#00695C";
const IDLE_COLOR = "#F9A825";
const PED_COLOR = "#C62828";
/** Sentinel for the phase filter, so "every phase" is a real selectable value. */
const ALL_PHASES = "\u0000all";
const MAX_CHART_CYCLES = 200;

export default {
  name: "UnusedGreenTime",
  components: { InputBox, Bar },
  data() {
    return {
      panel: [],
      assignmentTab: "manual",
      sources: [{ id: 1, signalId: "", assignments: "", text: "" }],
      nextSourceId: 2,
      clearanceSeconds: DEFAULT_CLEARANCE_SECONDS,
      minGapSeconds: DEFAULT_MIN_GAP_SECONDS,
      processing: false,
      ranOnce: false,
      error: "",
      results: [],
      stats: null,
      skipped: [],
      chartMode: "phase",
      selectedSeries: null,
      cyclePhaseFilter: ALL_PHASES,
      ALL_PHASES,
      gtss: null,
      gtssName: "",
      gtssError: "",
      gtssLoading: false,
    };
  },
  computed: {
    hasInput() {
      return this.sources.some((source) => (source.text || "").trim());
    },
    gtssSignalOptions() {
      if (!this.gtss) return [];
      return this.gtss.signals.map((id) => ({ title: `Signal ${id}`, value: id }));
    },
    gtssSummary() {
      if (!this.gtss) return "";
      const signals = this.gtss.signals.length;
      const channels = [...this.gtss.bySignal.values()]
        .reduce((sum, byPhase) => sum + [...byPhase.values()].reduce((n, list) => n + list.length, 0), 0);
      const extra = this.gtss.unassigned
        ? `, ${this.gtss.unassigned} with no phase`
        : "";
      return `${channels} assigned channels across ${signals} ${signals === 1 ? "signal" : "signals"}${extra}`;
    },
    /** Phases detected only by advance loops, which read idler than they are. */
    advanceOnlyPhases() {
      if (!this.gtss) return [];
      const out = [];
      for (const [signalId, byPhase] of this.gtss.bySignal) {
        for (const [phase, channels] of byPhase) {
          const purposes = channels.map((channel) =>
            (this.gtss.purposes.get(`${signalId}\u0000${channel}`) || "").toLowerCase(),
          );
          if (purposes.length && purposes.every((p) => p && !p.includes("stop"))) {
            out.push(`signal ${signalId} phase ${phase}`);
          }
        }
      }
      return out;
    },
    multiSignal() {
      return this.results.length > 1;
    },
    allRows() {
      return this.results.flatMap((result) => result.rows);
    },
    /**
     * Every cycle, filtered to one phase if asked.
     *
     * Uncapped: this is a paged data table, so a day of eight phases is
     * thousands of rows the reader walks a page at a time rather than a wall
     * of them printed at once. The cap that used to sit here silently cut the
     * list off at 500, which put the answer out of reach on any real file.
     */
    cycleTableRows() {
      if (this.cyclePhaseFilter === ALL_PHASES) return this.allRows;
      return this.allRows.filter(
        (row) => this.seriesKey(row.signal, row.phase) === this.cyclePhaseFilter,
      );
    },
    cyclePhaseOptions() {
      return [{ title: "Every phase", value: ALL_PHASES }].concat(
        this.phaseRows.map((row) => ({
          title: this.multiSignal ? `${row.signal} · phase ${row.phase}` : `Phase ${row.phase}`,
          value: this.seriesKey(row.signal, row.phase),
        })),
      );
    },
    cycleHeaders() {
      const headers = [];
      if (this.multiSignal) headers.push({ title: "Signal", key: "signal", align: "start" });
      return headers.concat([
        { title: "Phase", key: "phase", align: "start" },
        { title: "Cycle", key: "cycle" },
        { title: "Green started", key: "startMs" },
        { title: "Green", key: "greenMs" },
        { title: "Unused", key: "idleMs" },
        { title: "Share", key: "idleShare" },
        { title: "Longest gap", key: "longestIdleMs" },
        { title: "After ped", key: "idleAfterPedMs" },
      ]);
    },
    phaseRows() {
      const rows = [];
      for (const result of this.results) {
        for (const entry of result.phases) {
          rows.push({
            signal: result.label,
            phase: entry.phase,
            cycles: entry.summary.cycles,
            greenMs: entry.summary.greenMs,
            idleMs: entry.summary.idleMs,
            idleShare: entry.summary.idleShare,
            perCycleMs: entry.summary.cycles ? entry.summary.idleMs / entry.summary.cycles : 0,
            idleAfterPedMs: entry.summary.idleAfterPedMs,
            worstIdleMs: entry.summary.worstIdleMs,
            pedCycles: entry.summary.pedCycles,
          });
        }
      }
      return rows.sort((a, b) => b.idleMs - a.idleMs);
    },
    phaseHeaders() {
      const headers = [];
      if (this.multiSignal) headers.push({ title: "Signal", key: "signal", align: "start" });
      return headers.concat([
        { title: "Phase", key: "phase", align: "start" },
        { title: "Cycles", key: "cycles" },
        { title: "Green", key: "greenMs", value: (row) => row.greenMs },
        { title: "Unused", key: "idleMs", value: (row) => row.idleMs },
        { title: "Share", key: "idleShare" },
        { title: "Per cycle", key: "perCycleMs", value: (row) => row.perCycleMs },
        { title: "After ped", key: "idleAfterPedMs", value: (row) => row.idleAfterPedMs },
        { title: "Worst cycle", key: "worstIdleMs", value: (row) => row.worstIdleMs },
      ]);
    },
    totals() {
      return summarizePhase(this.allRows);
    },
    metrics() {
      const t = this.totals;
      return [
        { label: "Cycles examined", value: this.num(t.cycles) },
        { label: "Unused green", value: this.secs(t.idleMs) },
        { label: "Of all green", value: this.percent(t.idleShare) },
        { label: "After a ped phase", value: this.secs(t.idleAfterPedMs) },
      ];
    },
    seriesOptions() {
      return this.phaseRows.map((row) => ({
        title: this.multiSignal ? `${row.signal} · phase ${row.phase}` : `Phase ${row.phase}`,
        value: this.seriesKey(row.signal, row.phase),
      }));
    },
    activeSeries() {
      const available = this.seriesOptions.map((option) => option.value);
      if (this.selectedSeries && available.includes(this.selectedSeries)) return this.selectedSeries;
      return available[0] ?? null;
    },
    /** Every cycle of the selected series, before the chart cap. */
    seriesCycles() {
      if (!this.activeSeries) return [];
      const [signal, phase] = this.activeSeries.split("\u0000");
      return this.allRows.filter(
        (row) => row.signal === signal && String(row.phase) === phase,
      );
    },
    seriesCycleCount() {
      return this.seriesCycles.length;
    },
    cycleRows() {
      // Capped: a day of 100-second cycles is 800-odd bars, which stops being
      // a chart and becomes a texture. The count it was cut from is printed
      // above rather than left for the reader to notice.
      return this.seriesCycles.slice(0, MAX_CHART_CYCLES);
    },
    chartHeight() {
      const count = this.chartMode === "phase" ? this.phaseRows.length : this.cycleRows.length;
      return Math.max(280, Math.min(count, 40) * 26 + 150);
    },
    chartData() {
      if (this.chartMode === "phase") {
        const rows = this.phaseRows;
        const labels = rows.map((row) =>
          this.multiSignal ? `${row.signal} · P${row.phase}` : `Phase ${row.phase}`,
        );
        return {
          labels,
          datasets: [
            {
              label: "Green used",
              data: rows.map((row) => (row.greenMs - row.idleMs) / 1000),
              backgroundColor: USED_COLOR,
              stack: "green",
            },
            {
              label: "Unused",
              data: rows.map((row) => (row.idleMs - row.idleAfterPedMs) / 1000),
              backgroundColor: IDLE_COLOR,
              stack: "green",
            },
            {
              label: "Unused after a ped phase",
              data: rows.map((row) => row.idleAfterPedMs / 1000),
              backgroundColor: PED_COLOR,
              stack: "green",
            },
          ],
        };
      }
      const rows = this.cycleRows;
      return {
        labels: rows.map((row) => `${row.cycle}`),
        datasets: [
          {
            label: "Green used",
            data: rows.map((row) => (row.greenMs - row.idleMs) / 1000),
            backgroundColor: USED_COLOR,
            stack: "green",
          },
          {
            label: "Unused",
            data: rows.map((row) => (row.idleMs - row.idleAfterPedMs) / 1000),
            backgroundColor: IDLE_COLOR,
            stack: "green",
          },
          {
            label: "Unused after a ped phase",
            data: rows.map((row) => row.idleAfterPedMs / 1000),
            backgroundColor: PED_COLOR,
            stack: "green",
          },
        ],
      };
    },
    chartOptions() {
      const byPhase = this.chartMode === "phase";
      const rows = byPhase ? this.phaseRows : this.cycleRows;
      const secs = this.secs;
      const percent = this.percent;
      const clock = this.clock;
      return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: "Seconds of green" },
          },
          y: {
            stacked: true,
            ticks: { autoSkip: true, maxTicksLimit: 40 },
            title: { display: true, text: byPhase ? "Phase" : "Cycle" },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const row = rows[items[0].dataIndex];
                if (!row) return [];
                const lines = [
                  `Green: ${secs(row.greenMs)}`,
                  `Unused: ${secs(row.idleMs)} (${percent(row.idleShare)})`,
                ];
                if (byPhase) {
                  lines.push(`Over ${row.cycles} ${row.cycles === 1 ? "cycle" : "cycles"}`);
                  if (row.pedCycles) lines.push(`${row.pedCycles} served a ped phase`);
                } else {
                  lines.push(`Green began ${clock(row.startMs)}`);
                  lines.push(`Longest single gap: ${secs(row.longestIdleMs)}`);
                }
                return lines;
              },
            },
          },
        },
      };
    },
    scanNote() {
      if (!this.stats) return "";
      const parts = [
        `Read ${this.num(this.stats.scanned)} rows across ${this.results.length} ${this.results.length === 1 ? "signal" : "signals"} and kept ${this.num(this.stats.kept)} (${this.stats.keptPercent.toFixed(2)}%).`,
      ];
      if (this.skipped.length) {
        parts.push(
          `No channels assigned for ${this.skipped.join(", ")}, so ${this.skipped.length === 1 ? "it was" : "they were"} left out rather than counted as idle.`,
        );
      }
      return parts.join(" ");
    },
    emptyReason() {
      if (this.skipped.length) {
        return `No phase had channels assigned to it. Give each phase its detector channels, either by typing them in or by loading a GTSS export.`;
      }
      return "No complete greens found. Expecting codes 1 and 8 for the phases, and 82/81 for the detectors.";
    },
  },
  methods: {
    /** One signal-and-phase, as a single string the selects can carry. */
    seriesKey(signal, phase) {
      return `${signal}\u0000${phase}`;
    },
    num(value) {
      return Number(value || 0).toLocaleString();
    },
    secs(ms) {
      if (!Number.isFinite(ms)) return "—";
      const seconds = ms / 1000;
      if (seconds < 90) return `${seconds.toFixed(1)}s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes - hours * 60}m`;
    },
    percent(value) {
      return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
    },
    clock(ms) {
      return Number.isFinite(ms) ? DateTime.fromMillis(ms).toFormat("LL/dd HH:mm:ss") : "";
    },
    /**
     * Where a signal's channel assignments come from. The tab decides, so a
     * half-typed table and a loaded export never quietly fight over a phase.
     */
    phaseChannelsFor(source) {
      const byPhase = new Map();
      if (this.assignmentTab === "gtss") {
        const id = String(source.signalId ?? "").trim();
        const fromExport = this.gtss && this.gtss.bySignal.get(id);
        if (fromExport) for (const [phase, channels] of fromExport) byPhase.set(phase, [...channels]);
        return byPhase;
      }
      // The manual table is channel -> phase; this needs phase -> channels.
      for (const [channel, phase] of parseDetectorPhaseMap(source.assignments)) {
        if (phase === null) continue;
        if (!byPhase.has(phase)) byPhase.set(phase, []);
        byPhase.get(phase).push(channel);
      }
      for (const channels of byPhase.values()) channels.sort((a, b) => a - b);
      return byPhase;
    },
    assignmentNote(source) {
      const byPhase = this.phaseChannelsFor(source);
      if (!byPhase.size) {
        return this.assignmentTab === "gtss"
          ? "no channels in the export for this signal"
          : "no channels assigned yet";
      }
      const channels = [...byPhase.values()].reduce((sum, list) => sum + list.length, 0);
      return `${channels} channels over ${byPhase.size} ${byPhase.size === 1 ? "phase" : "phases"}`;
    },
    addSource() {
      this.sources.push({ id: this.nextSourceId, signalId: "", assignments: "", text: "" });
      this.nextSourceId += 1;
    },
    removeSource(index) {
      this.sources.splice(index, 1);
    },
    evaluate() {
      this.error = "";
      this.processing = true;
      setTimeout(() => {
        try {
          const results = [];
          const skipped = [];
          let scanned = 0;
          let kept = 0;
          this.sources.forEach((source, index) => {
            if (!(source.text || "").trim()) return;
            const label = String(source.signalId ?? "").trim() || String(index + 1);
            const scan = scanGreenRows(source.text, detectLayout(source.text));
            scanned += scan.stats.scanned;
            kept += scan.stats.kept;
            const phaseChannels = this.phaseChannelsFor(source);
            if (!phaseChannels.size) {
              skipped.push(`signal ${label}`);
              return;
            }
            results.push(
              analyzeSignal({
                signalRows: scan.signal,
                detectorRows: scan.detector,
                phaseChannels,
                clearanceSeconds: this.clearanceSeconds,
                minGapSeconds: this.minGapSeconds,
                label,
              }),
            );
          });
          this.results = results;
          this.skipped = skipped;
          this.stats = { scanned, kept, keptPercent: scanned ? (kept / scanned) * 100 : 0 };
          this.selectedSeries = null;
          this.ranOnce = true;
        } catch (err) {
          this.error = `Could not process this data: ${err.message}`;
          this.results = [];
        } finally {
          this.processing = false;
        }
      }, 0);
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
            collected[file.name.split("/").pop()] = await file.text();
          }
        }
        const directory = buildDetectorDirectory(collected);
        if (!directory.signals.length) {
          this.gtssError =
            directory.warnings[0] || "No detector-to-phase assignments found in that export.";
          this.gtss = null;
        } else {
          this.gtss = directory;
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
      this.gtssError = "";
    },
    downloadCsv() {
      const header = [
        "signal", "phase", "cycle", "green_start", "green_s", "unused_s",
        "unused_share", "longest_gap_s", "ped_served", "unused_after_ped_s",
      ];
      const lines = [header.join(",")];
      for (const row of this.allRows) {
        lines.push([
          row.signal,
          row.phase,
          row.cycle,
          DateTime.fromMillis(row.startMs).toFormat("yyyy-LL-dd HH:mm:ss"),
          (row.greenMs / 1000).toFixed(1),
          (row.idleMs / 1000).toFixed(1),
          (row.idleShare * 100).toFixed(1),
          (row.longestIdleMs / 1000).toFixed(1),
          row.pedServed ? "yes" : "no",
          (row.idleAfterPedMs / 1000).toFixed(1),
        ].join(","));
      }
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "unused-green-time.csv";
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
.settings-row,
.source-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}
.source-head {
  margin-bottom: 10px;
}
.setting {
  max-width: 250px;
  flex: 0 0 auto;
}
/*
  A number field has an intrinsic width; a select does not, so `flex: 0 0 auto`
  shrinks it to a bare caret with neither its label nor its value visible.
*/
.setting--select {
  flex: 0 1 260px;
  min-width: 220px;
  max-width: 320px;
}
.source-name {
  max-width: 320px;
}
.source-name--narrow {
  max-width: 200px;
}
.signal-note {
  font-size: 0.78rem;
  opacity: 0.7;
  padding-top: 10px;
}
.gtss-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.gtss-file {
  display: none;
}
.gtss-name,
.gtss-hint {
  font-size: 0.82rem;
  opacity: 0.8;
}
.gtss-tick {
  color: rgb(var(--v-theme-primary));
}
.mapping-textarea :deep(textarea) {
  font-family: monospace;
  font-size: 0.85rem;
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
  max-width: 480px;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  font-size: 0.8rem;
  font-weight: 400;
  opacity: 0.7;
}
.share-cell {
  position: relative;
  min-width: 90px;
  padding: 2px 0;
}
.share-bar {
  position: absolute;
  inset: 2px auto 2px 0;
  background: rgba(249, 168, 37, 0.35);
  border-radius: 3px;
}
.share-text {
  position: relative;
}
.row-bad td {
  background: rgba(198, 40, 40, 0.07);
}
</style>
