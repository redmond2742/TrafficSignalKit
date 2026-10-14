<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Unused Green Time</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Unused Green Time" value="about">
          <v-expansion-panel-text>
            <p>
              Green time is only useful while somebody is using it. This looks
              at every green of every phase two ways, one for each end of the
              day, and draws each cycle as a single bar with every phase
              stacked in it, so a bad cycle, a bad phase and a bad hour are all
              easy to pick out.
            </p>
            <ul class="mt-2">
              <li>
                <b>Heavy volume &mdash; wasted green.</b> With traffic waiting
                everywhere, a phase should end as soon as it has nothing left to
                serve. Green that runs on past its last vehicle and past its
                pedestrian phase is green some other movement was queued for.
              </li>
              <li>
                <b>Light volume &mdash; the wait for green.</b> With the roads
                nearly empty, a lone vehicle should get green almost as soon as
                it arrives. This times how long the first vehicle to arrive on
                red waited for it.
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Heavy Volume: Wasted Green" value="heavy">
          <v-expansion-panel-text>
            <p>
              For each green, the tool finds when it was last used: the later
              of the last detector going off (plus the clearance allowance, for
              the vehicle still crossing) and the end of the pedestrian phase
              (solid don't walk). Everything from there to yellow is counted as
              wasted.
            </p>
            <p class="mt-2">
              Gaps in the middle of a green are not counted &mdash; only the
              tail, after the last use. A tail shorter than the
              <i>shortest tail worth counting</i> is how an actuated phase gaps
              out after its last vehicle, and is left out.
            </p>
            <p class="mt-2">
              Where the controller logged it, each green also says how it
              ended: gap out, max out or force off. A long wasted tail ending in
              a force off usually means coordination holding the phase; one
              ending in a max out usually means a detector still calling.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Light Volume: The Wait for Green" value="light">
          <v-expansion-panel-text>
            <p>
              A phase's red starts when its yellow ends (event 9, or the start
              of the yellow if 9 is not logged). The first detector to come on
              after that is the first vehicle to arrive and stop. Its wait runs
              from then until the phase goes green again.
            </p>
            <p class="mt-2">
              If a detector is already occupied when red begins, the wait is
              counted from the start of red and marked
              <i>already waiting</i>: a vehicle that stopped on yellow, or a
              detector stuck on. A phase marked like that every cycle is worth
              a look.
            </p>
            <p class="mt-2">
              A green with no call during the red before it has no wait. Those
              greens are counted separately as <i>no call on red</i>: the phase
              came back on a recall, a pedestrian call or coordination, which
              at low volume is usually green nobody needed.
            </p>
            <p class="mt-2">
              The wait should be short. Coordination holding the main street,
              long minimum greens elsewhere, or a stuck detector calling a
              phase nobody is waiting at all make it long.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What It Cannot Know" value="limits">
          <v-expansion-panel-text>
            <p>
              This estimates. A quiet detector means no vehicle was
              <i>detected</i>, which is not quite the same as no vehicle being
              there: a failed loop, a camera zone that does not reach, or a
              movement with no detection at all will all read as unused when
              they are not.
            </p>
            <p class="mt-2">
              A phase with <b>no channels assigned is left out entirely</b>
              rather than reported as wholly unused. A phase nothing is known
              about is not a phase with no traffic. Its greens still mark where
              each cycle begins.
            </p>
            <p class="mt-2">
              A cycle begins with a green, and the next one begins when a phase
              already served in it goes green again &mdash; the same rule as the
              <router-link to="/delay-estimator">Delay &amp; Count Estimator</router-link>.
              It needs no coordination plan, so free-running signals work too.
            </p>
            <p class="mt-2">
              Stop-bar detection answers both questions best. An advance
              detector fired seconds ago for a vehicle that may already be
              through, so a phase detected only in advance will show more
              wasted green than it really had. A GTSS export records each
              channel's purpose, and the tool says when it is relying on
              advance detection.
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
                <tr><td>4</td><td>Gap out</td><td>phase</td></tr>
                <tr><td>5</td><td>Max out</td><td>phase</td></tr>
                <tr><td>6</td><td>Force off</td><td>phase</td></tr>
                <tr><td>8</td><td>Begin yellow clearance</td><td>phase</td></tr>
                <tr><td>9</td><td>End yellow clearance</td><td>phase</td></tr>
                <tr><td>21</td><td>Ped begin walk</td><td>phase</td></tr>
                <tr><td>22</td><td>Ped begin clearance</td><td>phase</td></tr>
                <tr><td>23</td><td>Ped begin solid don't walk</td><td>phase</td></tr>
                <tr><td>82</td><td>Detector on</td><td>channel</td></tr>
                <tr><td>81</td><td>Detector off</td><td>channel</td></tr>
              </tbody>
            </v-table>
            <p class="mt-2">
              A green runs from 1 to the 8 that ends it, and red from the 9
              after that. The pedestrian phase is over at 23. Everything else
              in the file is discarded as it is read.
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
3/14/2024 07:15:20.0, 23, 2     the ped phase finishes
3/14/2024 07:15:40.0, 8, 2      yellow
3/14/2024 07:15:44.0, 9, 2      red
3/14/2024 07:16:10.0, 82, 5     a vehicle arrives on red
3/14/2024 07:16:30.0, 1, 2      phase 2 goes green again
            </pre>
            With channel 5 on phase 2: under <b>heavy volume</b> the first
            green wasted 20 seconds, from the end of the ped phase to yellow.
            Under <b>light volume</b> the second green kept its first arrival
            waiting 20 seconds.
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
          These are the assumptions, and they apply to every signal below.
          Both shape the heavy-volume count; the light-volume wait is timed
          straight from the detectors and uses neither.
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
          label="Shortest tail worth counting (s)"
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
        Analyze
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

      <div class="mode-row">
        <v-btn-toggle
          v-model="mode"
          mandatory
          divided
          variant="outlined"
          color="primary"
          class="mode-toggle"
        >
          <v-btn value="heavy">Heavy volume<span class="mode-sub">&nbsp;&middot; wasted green</span></v-btn>
          <v-btn value="light">Light volume<span class="mode-sub">&nbsp;&middot; wait for green</span></v-btn>
        </v-btn-toggle>
        <v-select
          v-if="multiSignal"
          v-model="selectedSignal"
          :items="signalOptions"
          label="Signal"
          density="compact"
          variant="outlined"
          hide-details
          class="setting setting--select"
        ></v-select>
      </div>
      <p class="chart-hint">
        <template v-if="heavy">
          Green left over after the last vehicle and the pedestrian phase were
          done with it. When everyone is queued, this is time another movement
          could have had.
        </template>
        <template v-else>
          How long the first vehicle to arrive on red waited for green. On an
          empty road this should be short.
        </template>
      </p>

      <div class="metric-row">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
      </div>

      <h2 class="section-title">
        {{ heavy ? "Wasted green, cycle by cycle" : "Wait for green, cycle by cycle" }}
      </h2>
      <p class="chart-hint">
        One bar per cycle, read top to bottom through the day. Each phase is
        its own colour, with its seconds written on it when there is room, and
        the cycle's total is at the end of the bar. Phases that run together,
        like 2 and 6, each add their own seconds, so a total can be longer
        than the cycle. Click a phase below to hide or show it.
        <template v-if="!heavy">
          An outlined segment had a call already waiting when its red began: a
          vehicle that stopped on yellow, or, every cycle, a detector stuck on.
        </template>
        <span v-if="chartCycles.length < activeCycles.length">
          Showing the first {{ num(chartCycles.length) }} of
          {{ num(activeCycles.length) }} cycles; the tables have them all.
        </span>
      </p>
      <div class="phase-legend" role="group" aria-label="Phases in the chart">
        <button
          v-for="phase in activePhases"
          :key="phase"
          type="button"
          class="phase-chip"
          :class="{ 'phase-chip--off': hiddenPhases.includes(phase) }"
          :aria-pressed="!hiddenPhases.includes(phase)"
          @click="togglePhase(phase)"
        >
          <i class="phase-swatch" :style="{ background: phaseColor(phase) }"></i>
          Phase {{ phase }}
        </button>
      </div>
      <div class="cycle-scroll">
        <div class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
          <Bar :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
        </div>
      </div>

      <h2 class="section-title">Phase summary</h2>
      <p class="chart-hint">Worst first. Click a column to sort.</p>
      <v-data-table
        :headers="phaseHeaders"
        :items="phaseRows"
        :items-per-page="16"
        :sort-by="[{ key: heavy ? 'wasteMs' : 'p85DelayMs', order: 'desc' }]"
        density="compact"
      >
        <template #item.greenMs="{ item }">{{ secs(item.greenMs) }}</template>
        <template #item.wasteMs="{ item }">{{ secs(item.wasteMs) }}</template>
        <template #item.wasteShare="{ item }">
          <div class="share-cell">
            <div class="share-bar" :style="{ width: `${Math.max(item.wasteShare * 100, 1)}%` }"></div>
            <span class="share-text">{{ percent(item.wasteShare) }}</span>
          </div>
        </template>
        <template #item.wastePerGreenMs="{ item }">{{ secs(item.wastePerGreenMs) }}</template>
        <template #item.worstWasteMs="{ item }">{{ secs(item.worstWasteMs) }}</template>
        <template #item.meanDelayMs="{ item }">{{ secs(item.meanDelayMs) }}</template>
        <template #item.p85DelayMs="{ item }">{{ secs(item.p85DelayMs) }}</template>
        <template #item.worstDelayMs="{ item }">{{ secs(item.worstDelayMs) }}</template>
      </v-data-table>

      <h2 class="section-title">Every green</h2>
      <p class="chart-hint">
        {{ num(greenTableRows.length) }} greens. Sort on any column, or narrow
        to one phase to read a single movement straight down.
      </p>
      <div class="chart-controls mb-2">
        <v-select
          v-model="phaseFilter"
          :items="phaseFilterOptions"
          label="Phase"
          density="compact"
          variant="outlined"
          hide-details
          class="setting setting--select"
        ></v-select>
      </div>
      <v-data-table
        :headers="greenHeaders"
        :items="greenTableRows"
        :items-per-page="25"
        :sort-by="[{ key: heavy ? 'wasteMs' : 'delayMs', order: 'desc' }]"
        density="compact"
        class="table-wrapper"
      >
        <template #item.startMs="{ item }"><span class="nowrap">{{ clock(item.startMs) }}</span></template>
        <template #item.redFromMs="{ item }"><span class="nowrap">{{ clock(item.redFromMs) || "—" }}</span></template>
        <template #item.callMs="{ item }"><span class="nowrap">{{ clock(item.callMs) || "—" }}</span></template>
        <template #item.greenMs="{ item }"><span class="nowrap">{{ secs(item.greenMs) }}</span></template>
        <template #item.wasteMs="{ item }"><b class="nowrap">{{ secs(item.wasteMs) }}</b></template>
        <template #item.delayMs="{ item }"><b class="nowrap">{{ item.delayMs === null ? "—" : secs(item.delayMs) }}</b></template>
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
  BarElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import { readZipText } from "../utils/zipReader.js";
import { buildDetectorDirectory } from "../utils/gtss.js";
import { parseDetectorPhaseMap } from "../utils/singleLoopSpeed.js";
import { PHASE_COLORS } from "../utils/phaseDiagram.js";
import {
  DEFAULT_CLEARANCE_SECONDS,
  DEFAULT_MIN_GAP_SECONDS,
  TERMINATIONS,
  analyzeSignal,
  detectLayout,
  scanGreenRows,
} from "../utils/unusedGreen.js";

ChartJS.register(Title, Tooltip, BarElement, LinearScale, CategoryScale);

/** Sentinel for the phase filter, so "every phase" is a real selectable value. */
const ALL_PHASES = "all";
/**
 * Pixels per cycle. A day of 90-second cycles is about 960 bars; at this
 * height that is a long scroll, but every bar keeps room for its numbers.
 */
const ROW_PX = 18;
/**
 * Browsers will not draw a canvas much taller than 32,767 device pixels, and
 * a phone at 3x hits that at about 10,000 CSS pixels. Past this many cycles
 * the chart stops, and the tables carry the rest.
 */
const MAX_CHART_CYCLES = 1600;
const MAX_CANVAS_PX = 30000;

const LAST_USE = { vehicle: "Vehicle", ped: "Ped", nothing: "Nothing" };

/**
 * Seconds written on the chart: on each phase's segment when it is wide
 * enough to hold them, and the cycle's total just past the end of its bar.
 */
const cycleLabelsPlugin = {
  id: "cycleLabels",
  afterDatasetsDraw(chart, args, options) {
    const totals = options && options.totals;
    if (!totals) return;
    const { ctx, scales } = chart;
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = "600 10px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    for (const meta of chart.getSortedVisibleDatasetMetas()) {
      meta.data.forEach((bar, i) => {
        const value = chart.data.datasets[meta.index].data[i];
        if (!value || Math.abs(bar.x - bar.base) < 24) return;
        ctx.fillText(value >= 10 ? value.toFixed(0) : value.toFixed(1), (bar.x + bar.base) / 2, bar.y);
      });
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#1f2937";
    ctx.font = "700 11px Helvetica, Arial, sans-serif";
    totals.forEach((total, i) => {
      if (!(total > 0)) return;
      ctx.fillText(`${total.toFixed(1)} s`, scales.x.getPixelForValue(total) + 4, scales.y.getPixelForValue(i));
    });
    ctx.restore();
  },
};

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
      mode: "heavy",
      selectedSignal: null,
      hiddenPhases: [],
      phaseFilter: ALL_PHASES,
      chartPlugins: [cycleLabelsPlugin],
      gtss: null,
      gtssName: "",
      gtssError: "",
      gtssLoading: false,
    };
  },
  computed: {
    heavy() {
      return this.mode === "heavy";
    },
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
    /** Phases detected only by advance loops, which read as more wasted than they are. */
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
    signalOptions() {
      return this.results.map((result) => ({ title: `Signal ${result.label}`, value: result.label }));
    },
    /** The signal being looked at: cycles belong to one controller, so it is one at a time. */
    activeResult() {
      return this.results.find((result) => result.label === this.selectedSignal) || this.results[0] || null;
    },
    activePhases() {
      return this.activeResult ? this.activeResult.phases.map((entry) => entry.phase) : [];
    },
    visiblePhases() {
      return this.activePhases.filter((phase) => !this.hiddenPhases.includes(phase));
    },
    activeCycles() {
      return this.activeResult ? this.activeResult.cycles : [];
    },
    chartCycles() {
      return this.activeCycles.slice(0, MAX_CHART_CYCLES);
    },
    /** Seconds per phase per cycle, for whichever measure is showing. */
    cycleValues() {
      const key = this.heavy ? "waste" : "delay";
      return this.chartCycles.map((cycle) => {
        const values = {};
        for (const phase of this.activePhases) {
          const ms = cycle[key][phase];
          values[phase] = ms === undefined ? null : ms / 1000;
        }
        return values;
      });
    },
    cycleTotals() {
      return this.cycleValues.map((values) =>
        this.visiblePhases.reduce((sum, phase) => sum + (values[phase] || 0), 0),
      );
    },
    chartHeight() {
      return Math.max(160, this.chartCycles.length * ROW_PX + 56);
    },
    chartData() {
      return {
        labels: this.chartCycles.map((cycle) => `#${cycle.index}  ${this.time(cycle.startMs)}`),
        datasets: this.activePhases.map((phase) => ({
          label: `Phase ${phase}`,
          phase,
          data: this.cycleValues.map((values) => values[phase]),
          backgroundColor: this.phaseColor(phase),
          // Outlined: the call was already there when red began.
          borderColor: "#111827",
          borderWidth: this.chartCycles.map((cycle) =>
            !this.heavy && cycle.greens[phase] && cycle.greens[phase].standingCall ? 2 : 0,
          ),
          stack: "cycle",
          hidden: this.hiddenPhases.includes(phase),
          barPercentage: 0.9,
          categoryPercentage: 0.92,
        })),
      };
    },
    chartOptions() {
      const heavy = this.heavy;
      const cycles = this.chartCycles;
      const totals = this.cycleTotals;
      const secs = this.secs;
      const clock = this.clock;
      const maxTotal = Math.max(1, ...totals);
      const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        devicePixelRatio: Math.min(ratio, MAX_CANVAS_PX / this.chartHeight),
        layout: { padding: { right: 8 } },
        interaction: { mode: "index", axis: "y", intersect: false },
        scales: {
          x: {
            stacked: true,
            position: "top",
            beginAtZero: true,
            // Room past the longest bar for its total.
            suggestedMax: maxTotal * 1.15,
            title: { display: true, text: heavy ? "Seconds of wasted green" : "Seconds waiting for green" },
          },
          y: {
            stacked: true,
            ticks: { autoSkip: false, font: { size: 10 } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          cycleLabels: { totals },
          tooltip: {
            filter: (item) => item.raw !== null && item.raw !== undefined && (item.raw > 0 || !heavy),
            callbacks: {
              title: (items) => {
                const cycle = cycles[items[0].dataIndex];
                if (!cycle) return "";
                return `Cycle ${cycle.index} · ${clock(cycle.startMs)} · ${secs(cycle.endMs - cycle.startMs)} long`;
              },
              label: (item) => {
                const cycle = cycles[item.dataIndex];
                const phase = item.dataset.phase;
                const green = cycle && cycle.greens[phase];
                const value = `${item.raw.toFixed(1)} s`;
                if (!green) return `Phase ${phase}: ${value}`;
                if (heavy) {
                  const ended = TERMINATIONS[green.termination];
                  const notes = [`after ${LAST_USE[green.endedBy].toLowerCase()}`];
                  if (ended) notes.push(ended.toLowerCase());
                  return `Phase ${phase}: ${value} wasted (${notes.join(", ")})`;
                }
                return `Phase ${phase}: waited ${value}${green.standingCall ? " (already waiting when red began)" : ""}`;
              },
              footer: (items) => {
                const total = totals[items[0].dataIndex];
                return total ? `Cycle total: ${total.toFixed(1)} s` : "";
              },
            },
          },
        },
      };
    },
    activeRows() {
      return this.activeResult ? this.activeResult.rows : [];
    },
    metrics() {
      const t = this.activeResult ? this.activeResult.totals : null;
      if (!t) return [];
      const cycles = this.activeCycles.length;
      if (this.heavy) {
        const cycleTotals = this.activeCycles.map((cycle) => cycle.wasteMs);
        return [
          { label: "Cycles", value: this.num(cycles) },
          { label: "Wasted green", value: this.secs(t.wasteMs) },
          { label: "Per cycle", value: this.secs(cycles ? t.wasteMs / cycles : 0) },
          { label: "Worst cycle", value: this.secs(Math.max(0, ...cycleTotals)) },
          { label: "Of all green", value: this.percent(t.wasteShare) },
        ];
      }
      return [
        { label: "Calls on red", value: this.num(t.calls) },
        { label: "Average wait", value: this.secs(t.meanDelayMs) },
        { label: "85th percentile", value: this.secs(t.p85DelayMs) },
        { label: "Longest wait", value: this.secs(t.worstDelayMs) },
        { label: "Already waiting at red", value: this.num(t.standingCalls) },
        { label: "No call on red", value: this.num(t.noCalls) },
      ];
    },
    phaseRows() {
      if (!this.activeResult) return [];
      return this.activeResult.phases.map((entry) => {
        const s = entry.summary;
        const ended = Object.entries(TERMINATIONS)
          .filter(([code]) => s.terminations[code])
          .map(([code, name]) => `${s.terminations[code]} ${name.toLowerCase()}`)
          .join(", ");
        return { phase: entry.phase, ...s, ended: ended || "—" };
      });
    },
    phaseHeaders() {
      const phase = [{ title: "Phase", key: "phase", align: "start" }, { title: "Greens", key: "greens" }];
      if (this.heavy) {
        return phase.concat([
          { title: "Green", key: "greenMs" },
          { title: "Wasted", key: "wasteMs" },
          { title: "Share", key: "wasteShare" },
          { title: "Per green", key: "wastePerGreenMs" },
          { title: "Worst green", key: "worstWasteMs" },
          { title: "Ended by", key: "ended", sortable: false },
        ]);
      }
      return phase.concat([
        { title: "Calls on red", key: "calls" },
        { title: "Average wait", key: "meanDelayMs" },
        { title: "85th percentile", key: "p85DelayMs" },
        { title: "Longest", key: "worstDelayMs" },
        { title: "Already waiting", key: "standingCalls" },
        { title: "No call on red", key: "noCalls" },
      ]);
    },
    phaseFilterOptions() {
      return [{ title: "Every phase", value: ALL_PHASES }].concat(
        this.activePhases.map((phase) => ({ title: `Phase ${phase}`, value: phase })),
      );
    },
    greenTableRows() {
      const rows = this.phaseFilter === ALL_PHASES
        ? this.activeRows
        : this.activeRows.filter((row) => row.phase === this.phaseFilter);
      return rows.map((row) => ({
        ...row,
        ended: TERMINATIONS[row.termination] || "—",
        lastUse: LAST_USE[row.endedBy],
        note: row.standingCall ? "Already waiting at red" : row.noCall ? "No call on red" : "",
      }));
    },
    greenHeaders() {
      const lead = [
        { title: "Phase", key: "phase", align: "start" },
        { title: "Cycle", key: "cycle" },
      ];
      if (this.heavy) {
        return lead.concat([
          { title: "Green started", key: "startMs" },
          { title: "Green", key: "greenMs" },
          { title: "Ended by", key: "ended" },
          { title: "Last used by", key: "lastUse" },
          { title: "Wasted", key: "wasteMs" },
        ]);
      }
      return lead.concat([
        { title: "Red began", key: "redFromMs" },
        { title: "First call", key: "callMs" },
        { title: "Green started", key: "startMs" },
        { title: "Waited", key: "delayMs" },
        { title: "Note", key: "note", sortable: false },
      ]);
    },
    scanNote() {
      if (!this.stats) return "";
      const parts = [
        `Read ${this.num(this.stats.scanned)} rows across ${this.results.length} ${this.results.length === 1 ? "signal" : "signals"} and kept ${this.num(this.stats.kept)} (${this.stats.keptPercent.toFixed(2)}%).`,
      ];
      if (this.skipped.length) {
        parts.push(
          `No channels assigned for ${this.skipped.join(", ")}, so ${this.skipped.length === 1 ? "it was" : "they were"} left out rather than counted as unused.`,
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
  watch: {
    activeResult() {
      // A new signal or a new run: start with every phase showing.
      this.hiddenPhases = [];
      this.phaseFilter = ALL_PHASES;
    },
  },
  methods: {
    num(value) {
      return Number(value || 0).toLocaleString();
    },
    secs(ms) {
      if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
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
    time(ms) {
      return Number.isFinite(ms) ? DateTime.fromMillis(ms).toFormat("HH:mm:ss") : "";
    },
    phaseColor(phase) {
      return PHASE_COLORS[phase] || "#6b7280";
    },
    togglePhase(phase) {
      this.hiddenPhases = this.hiddenPhases.includes(phase)
        ? this.hiddenPhases.filter((p) => p !== phase)
        : [...this.hiddenPhases, phase];
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
          this.selectedSignal = results.length ? results[0].label : null;
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
      const stamp = (ms) => (Number.isFinite(ms) ? DateTime.fromMillis(ms).toFormat("yyyy-LL-dd HH:mm:ss.SSS") : "");
      const s = (ms) => (Number.isFinite(ms) ? (ms / 1000).toFixed(1) : "");
      const header = [
        "signal", "phase", "cycle", "green_start", "green_s", "ended_by",
        "last_used_by", "wasted_s", "red_began", "first_call", "waited_s", "call_note",
      ];
      const lines = [header.join(",")];
      for (const row of this.allRows) {
        lines.push([
          row.signal,
          row.phase,
          row.cycle,
          stamp(row.startMs),
          s(row.greenMs),
          TERMINATIONS[row.termination] || "",
          row.endedBy,
          s(row.wasteMs),
          stamp(row.redFromMs),
          stamp(row.callMs),
          s(row.delayMs),
          row.standingCall ? "already waiting at red" : row.noCall ? "no call on red" : "",
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
}
/*
  A day of cycles is far taller than a screen. The chart scrolls inside its
  own box, so the summary and tables below stay a short scroll away.
*/
.cycle-scroll {
  max-height: 70vh;
  overflow-y: auto;
  margin-top: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  padding: 4px 8px 4px 0;
}
.mode-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
/* On a phone the halves after the dot go; the line under the switch says it. */
@media (max-width: 600px) {
  .mode-sub {
    display: none;
  }
}
.phase-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.phase-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 999px;
  font-size: 0.8rem;
  background: transparent;
  cursor: pointer;
}
.phase-chip--off {
  opacity: 0.4;
  text-decoration: line-through;
}
.phase-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
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
</style>
