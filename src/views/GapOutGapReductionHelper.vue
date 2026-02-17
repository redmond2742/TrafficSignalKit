<template>
  <div class="gap-helper-tool">
    <h1 class="h1-center-text">Gap-Out &amp; Gap Reduction Helper</h1>

    <v-card class="mt-4" variant="outlined">
      <v-card-text>
        <div class="layout-grid">
          <div>
            <h3>High-Resolution CSV Input</h3>
            <v-switch
              v-model="useFileUpload"
              color="primary"
              inset
              :label="useFileUpload ? 'Input Mode: File Upload' : 'Input Mode: Text Paste'"
              class="mb-3"
            />

            <InputBox
              v-if="!useFileUpload"
              v-model="hrCsvText"
              :default-text="csvPlaceholder"
            />
            <v-file-input
              v-else
              v-model="uploadedFile"
              label="Upload HR CSV"
              accept=".csv,text/csv,.txt"
              prepend-icon="mdi-file-upload"
              variant="outlined"
              density="comfortable"
              @update:model-value="onFileSelected"
            />

            <h3 class="mt-4">Detector Mapping</h3>
            <v-textarea
              v-model="mappingText"
              label="One per line (DET detector phase)"
              placeholder="DET 1 1\nDET 2 6"
              variant="outlined"
              rows="7"
              auto-grow
            />

            <v-select
              v-model.number="selectedPhase"
              :items="phaseOptions"
              label="Movement / Phase"
              variant="outlined"
              density="comfortable"
              class="mt-2"
            />

            <div class="action-row">
              <v-btn color="primary" :disabled="!canProcess" @click="processData">
                Compute Recommendations
              </v-btn>
            </div>
            <p v-if="errorMessage" class="error-message mt-2">{{ errorMessage }}</p>
          </div>

          <div>
            <h3>Recommendation Profile</h3>
            <v-btn-toggle v-model="profile" mandatory color="primary" class="mb-4">
              <v-btn value="conservative">Conservative</v-btn>
              <v-btn value="balanced">Balanced</v-btn>
              <v-btn value="aggressive">Aggressive</v-btn>
            </v-btn-toggle>

            <v-card variant="tonal" v-if="results">
              <v-card-text>
                <div class="result-grid">
                  <div><strong>Minimum Green</strong><br />{{ fmt(results.minimumGreen) }} sec</div>
                  <div><strong>Passage / Unit Extension</strong><br />{{ fmt(results.passageTime) }} sec</div>
                  <div><strong>Max Gap (start gap)</strong><br />{{ fmt(results.maxGap) }} sec</div>
                  <div><strong>Reduce After</strong><br />{{ fmt(results.reduceAfter) }} sec</div>
                  <div><strong>Reduce Duration</strong><br />{{ fmt(results.reduceDuration) }} sec</div>
                  <div><strong>Min Gap (end gap)</strong><br />{{ fmt(results.minGap) }} sec</div>
                </div>

                <pre class="settings-block mt-4">{{ controllerSettingsBlock }}</pre>
                <div class="action-row">
                  <v-btn size="small" color="secondary" @click="copySettings">Copy Settings</v-btn>
                  <v-btn size="small" variant="outlined" @click="downloadJson">Download JSON</v-btn>
                </div>
              </v-card-text>
            </v-card>
            <div v-else class="muted">Run the helper to see recommendations.</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="results" class="mt-6" variant="outlined">
      <v-card-text>
        <h2>Gap Reduction Curve</h2>
        <div class="chart-wrapper">
          <Line :data="curveData" :options="curveOptions" />
        </div>
        <p class="muted mt-3">
          Samples: {{ stats.totalHeadways }} headways (startup {{ stats.startupCount }}, steady {{ stats.steadyCount }}).
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
} from "chart.js";
import InputBox from "../components/foundational/InputBox.vue";

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale);

const EVENT_CODES = {
  BEGIN_GREEN: 1,
  BEGIN_YELLOW: 8,
  BEGIN_RED: 10,
  DETECTOR_ON: 82,
};

export default {
  name: "GapOutGapReductionHelper",
  components: { Line, InputBox },
  data() {
    return {
      useFileUpload: false,
      uploadedFile: null,
      hrCsvText: "",
      csvPlaceholder:
        "Paste high-resolution CSV rows: timestamp, event code, parameter\n2024-03-14T08:00:00.100, 1, 6\n2024-03-14T08:00:02.200, 82, 1",
      mappingText: "DET 1 1\nDET 2 6",
      selectedPhase: null,
      profile: "balanced",
      errorMessage: "",
      results: null,
      stats: {
        totalHeadways: 0,
        startupCount: 0,
        steadyCount: 0,
      },
    };
  },
  computed: {
    canProcess() {
      return this.hrCsvText.trim().length > 0 && this.mappingText.trim().length > 0;
    },
    phaseOptions() {
      const phases = Array.from(this.parseMapping(this.mappingText).phaseToDetectors.keys()).sort(
        (a, b) => a - b,
      );
      return phases;
    },
    profileScale() {
      if (this.profile === "conservative") {
        return { gap: 1.15, minGreen: 1.1 };
      }
      if (this.profile === "aggressive") {
        return { gap: 0.9, minGreen: 0.9 };
      }
      return { gap: 1, minGreen: 1 };
    },
    controllerSettingsBlock() {
      if (!this.results) {
        return "";
      }
      return [
        `Phase ${this.selectedPhase} Recommended Settings`,
        `Minimum Green: ${this.fmt(this.results.minimumGreen)} s`,
        `Passage (Unit Extension): ${this.fmt(this.results.passageTime)} s`,
        `Gap Reduction: ENABLED`,
        `  Max Gap: ${this.fmt(this.results.maxGap)} s`,
        `  Reduce After: ${this.fmt(this.results.reduceAfter)} s`,
        `  Reduce Duration: ${this.fmt(this.results.reduceDuration)} s`,
        `  Min Gap: ${this.fmt(this.results.minGap)} s`,
      ].join("\n");
    },
    curveData() {
      if (!this.results) {
        return { datasets: [] };
      }
      const endTime = this.results.reduceAfter + this.results.reduceDuration + 8;
      return {
        datasets: [
          {
            label: "Recommended Gap (sec)",
            data: [
              { x: 0, y: this.results.maxGap },
              { x: this.results.reduceAfter, y: this.results.maxGap },
              {
                x: this.results.reduceAfter + this.results.reduceDuration,
                y: this.results.minGap,
              },
              { x: endTime, y: this.results.minGap },
            ],
            showLine: true,
            borderColor: "#1565c0",
            backgroundColor: "#1565c0",
            tension: 0,
          },
        ],
      };
    },
    curveOptions() {
      return {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Time Into Green (sec)" },
          },
          y: {
            title: { display: true, text: "Gap Setting (sec)" },
          },
        },
      };
    },
  },
  watch: {
    phaseOptions: {
      immediate: true,
      handler(options) {
        if (options.length && (this.selectedPhase === null || !options.includes(this.selectedPhase))) {
          this.selectedPhase = options[0];
        }
      },
    },
  },
  methods: {
    async onFileSelected(file) {
      const picked = Array.isArray(file) ? file[0] : file;
      this.uploadedFile = picked || null;
      this.hrCsvText = picked ? await picked.text() : "";
    },
    processData() {
      const events = this.parseEvents(this.hrCsvText);
      const { phaseToDetectors } = this.parseMapping(this.mappingText);
      if (!events.length) {
        this.errorMessage = "No valid high-resolution rows found in the uploaded CSV.";
        this.results = null;
        return;
      }
      const detectors = phaseToDetectors.get(this.selectedPhase);
      if (!detectors || !detectors.size) {
        this.errorMessage = "Selected movement has no detector mappings. Use lines like: DET 1 1";
        this.results = null;
        return;
      }

      const greenIntervals = this.buildGreenIntervals(events, this.selectedPhase);
      const headwaySamples = this.collectHeadways(events, greenIntervals, detectors);
      if (!headwaySamples.length) {
        this.errorMessage = "No detector actuations during green were found for the selected movement.";
        this.results = null;
        return;
      }

      const startup = headwaySamples.filter((h) => h.timeIntoGreen <= 8).map((h) => h.headwaySec);
      const steady = headwaySamples.filter((h) => h.timeIntoGreen > 8).map((h) => h.headwaySec);
      const steadyFallback = headwaySamples.map((h) => h.headwaySec);

      const baseMinGap = this.clamp(this.percentile(steady.length ? steady : steadyFallback, 0.7), 1.5, 4.0);
      const baseMaxGap = this.clamp(this.percentile(startup.length ? startup : steadyFallback, 0.85), 2.0, 6.0);

      const convergenceTime = this.findConvergenceTime(headwaySamples, baseMinGap);
      const reduceAfter = this.clamp(convergenceTime ?? 5, 4, 6);
      const reduceDuration = this.clamp(Math.max(3, (baseMaxGap - baseMinGap) * 2.5), 3, 8);

      const timeToNth = this.collectTimeToNthActuation(events, greenIntervals, detectors, 3);
      const secondThird = timeToNth.filter((v) => Number.isFinite(v));
      const p80Actuation = secondThird.length ? this.percentile(secondThird, 0.8) : 4;
      const baseMinGreen = this.clamp(Math.max(6, p80Actuation + 2), 5, 12);

      const scaled = {
        minimumGreen: this.clamp(baseMinGreen * this.profileScale.minGreen, 5, 15),
        minGap: this.clamp(baseMinGap * this.profileScale.gap, 1.5, 4.5),
        maxGap: this.clamp(baseMaxGap * this.profileScale.gap, 2.0, 6.5),
        reduceAfter,
        reduceDuration,
      };

      scaled.passageTime = scaled.minGap;

      this.results = scaled;
      this.stats = {
        totalHeadways: headwaySamples.length,
        startupCount: startup.length,
        steadyCount: steady.length,
      };
      this.errorMessage = "";
    },
    parseEvents(csvText) {
      return csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/[\t,]/).map((cell) => cell.trim()))
        .filter((parts) => parts.length >= 3)
        .map(([timestamp, eventCodeRaw, parameterRaw]) => {
          const eventCode = Number(eventCodeRaw);
          const parameter = Number(parameterRaw);
          const millis = this.parseTimestampMillis(timestamp);
          if (!Number.isFinite(eventCode) || !Number.isFinite(parameter) || !Number.isFinite(millis)) {
            return null;
          }
          return { millis, eventCode, parameter };
        })
        .filter(Boolean)
        .sort((a, b) => a.millis - b.millis);
    },
    parseTimestampMillis(input) {
      if (/^\d{10,}$/.test(input)) {
        return Number(input) * 100;
      }
      const fromISO = DateTime.fromISO(input);
      if (fromISO.isValid) {
        return fromISO.toMillis();
      }
      const fromSlash = DateTime.fromFormat(input, "M/d/yyyy HH:mm:ss.S");
      if (fromSlash.isValid) {
        return fromSlash.toMillis();
      }
      return Number.NaN;
    },
    parseMapping(text) {
      const phaseToDetectors = new Map();
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const match = line.match(/^DET\s+(\d+)\s+(\d+)$/i);
          if (!match) {
            return;
          }
          const detector = Number(match[1]);
          const phase = Number(match[2]);
          if (!phaseToDetectors.has(phase)) {
            phaseToDetectors.set(phase, new Set());
          }
          phaseToDetectors.get(phase).add(detector);
        });
      return { phaseToDetectors };
    },
    buildGreenIntervals(events, phase) {
      const phaseEvents = events.filter((e) => e.parameter === phase);
      const intervals = [];
      for (let i = 0; i < phaseEvents.length; i += 1) {
        if (phaseEvents[i].eventCode !== EVENT_CODES.BEGIN_GREEN) {
          continue;
        }
        const start = phaseEvents[i].millis;
        let end = null;
        for (let j = i + 1; j < phaseEvents.length; j += 1) {
          const code = phaseEvents[j].eventCode;
          if (code === EVENT_CODES.BEGIN_YELLOW || code === EVENT_CODES.BEGIN_RED || code === EVENT_CODES.BEGIN_GREEN) {
            end = phaseEvents[j].millis;
            break;
          }
        }
        if (end && end > start) {
          intervals.push({ start, end });
        }
      }
      return intervals;
    },
    collectHeadways(events, intervals, detectors) {
      const detectorActs = events
        .filter((e) => e.eventCode === EVENT_CODES.DETECTOR_ON && detectors.has(e.parameter))
        .map((e) => e.millis)
        .sort((a, b) => a - b);

      const samples = [];
      intervals.forEach((interval) => {
        const inGreen = detectorActs.filter((t) => t >= interval.start && t <= interval.end);
        for (let i = 1; i < inGreen.length; i += 1) {
          const headwaySec = (inGreen[i] - inGreen[i - 1]) / 1000;
          const timeIntoGreen = (inGreen[i] - interval.start) / 1000;
          if (headwaySec > 0 && headwaySec < 20) {
            samples.push({ headwaySec, timeIntoGreen });
          }
        }
      });
      return samples;
    },
    collectTimeToNthActuation(events, intervals, detectors, nth) {
      const detectorActs = events
        .filter((e) => e.eventCode === EVENT_CODES.DETECTOR_ON && detectors.has(e.parameter))
        .map((e) => e.millis)
        .sort((a, b) => a - b);

      return intervals.map((interval) => {
        const inGreen = detectorActs.filter((t) => t >= interval.start && t <= interval.end);
        const index = Math.min(nth - 1, inGreen.length - 1);
        if (index < 1) {
          return Number.NaN;
        }
        return (inGreen[index] - interval.start) / 1000;
      });
    },
    findConvergenceTime(samples, steadyGap) {
      const startup = samples
        .filter((s) => s.timeIntoGreen <= 10)
        .sort((a, b) => a.timeIntoGreen - b.timeIntoGreen);
      const match = startup.find((s) => s.headwaySec <= steadyGap * 1.15);
      return match ? Math.max(1, match.timeIntoGreen - 1) : null;
    },
    percentile(values, p) {
      if (!values.length) {
        return 0;
      }
      const sorted = [...values].sort((a, b) => a - b);
      const idx = (sorted.length - 1) * p;
      const low = Math.floor(idx);
      const high = Math.ceil(idx);
      if (low === high) {
        return sorted[low];
      }
      return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
    },
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },
    fmt(value) {
      return Number(value).toFixed(2);
    },
    async copySettings() {
      if (!this.controllerSettingsBlock) {
        return;
      }
      await navigator.clipboard.writeText(this.controllerSettingsBlock);
    },
    downloadJson() {
      if (!this.results) {
        return;
      }
      const payload = {
        phase: this.selectedPhase,
        profile: this.profile,
        recommendations: this.results,
        stats: this.stats,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gap-reduction-phase-${this.selectedPhase}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.settings-block {
  background: #0b0f18;
  color: #d6f7e8;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}
.chart-wrapper {
  min-height: 320px;
}
.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.error-message {
  color: #b71c1c;
}
.muted {
  color: #5f6368;
}
</style>
