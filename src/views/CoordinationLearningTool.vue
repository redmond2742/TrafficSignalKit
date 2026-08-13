<template>
  <main class="coordination-tool">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Interactive signal timing lab</p>
        <h1>Traffic Signal Coordination Learning Tool</h1>
        <p class="hero-copy">
          Adjust cycle length, split times, offsets, scheduler start time, and coordinated phases to see how multiple signals align their green bands along a corridor.
        </p>
      </div>
      <div class="hero-stat">
        <strong>{{ progressionBandwidth }}s</strong>
        <span>platoon green window</span>
      </div>
    </section>

    <v-container fluid class="tool-grid">
      <v-row>
        <v-col cols="12" lg="4">
          <v-card class="control-card" variant="outlined">
            <v-card-title>Timing controls</v-card-title>
            <v-card-text>
              <div class="control-group">
                <label>Cycle length: {{ cycleLength }} seconds</label>
                <v-slider v-model="cycleLength" :min="60" :max="150" :step="5" color="primary" thumb-label></v-slider>
              </div>
              <div class="control-group">
                <label>Coordinated phase split: {{ coordinatedSplit }} seconds</label>
                <v-slider v-model="coordinatedSplit" :min="20" :max="maxCoordinatedSplit" :step="5" color="green" thumb-label></v-slider>
              </div>
              <div class="control-group">
                <label>Side-street split: {{ sideStreetSplit }} seconds</label>
                <v-slider v-model="sideStreetSplit" :min="10" :max="maxSideStreetSplit" :step="5" color="orange" thumb-label></v-slider>
              </div>
              <div class="control-group">
                <label>Scheduler time of day: {{ formattedClock }}</label>
                <v-slider v-model="schedulerMinute" :min="0" :max="1439" :step="15" color="indigo" thumb-label></v-slider>
              </div>
              <v-select
                v-model="signalCount"
                :items="signalCountOptions"
                item-title="label"
                item-value="value"
                label="Number of coordinated signals"
                variant="outlined"
                density="compact"
              ></v-select>
              <v-select
                v-model="coordinatedPhase"
                :items="phaseOptions"
                label="Coordinated movement"
                variant="outlined"
                density="compact"
              ></v-select>
              <v-switch v-model="showVehicles" color="primary" label="Show progression vehicles"></v-switch>
              <div class="playback-controls">
                <v-btn
                  color="primary"
                  variant="flat"
                  :prepend-icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
                  @click="togglePlayback"
                >
                  {{ isPlaying ? "Pause cars" : "Play cars" }}
                </v-btn>
                <v-select
                  v-model="playbackSpeed"
                  :items="playbackSpeedOptions"
                  item-title="label"
                  item-value="value"
                  label="Playback speed"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-select>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="control-card concept-card" variant="outlined">
            <v-card-title>Concept legend</v-card-title>
            <v-card-text>
              <div v-for="item in conceptLegend" :key="item.term" class="concept-row">
                <span class="legend-dot" :style="{ background: item.color }"></span>
                <div><strong>{{ item.term }}</strong><p>{{ item.description }}</p></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="8">
          <v-card class="visual-card" variant="outlined">
            <v-card-title class="visual-title">
              <span>Coordinated corridor timeline</span>
              <v-chip color="green" variant="tonal">{{ coordinationQuality }}</v-chip>
            </v-card-title>
            <v-card-text>
              <div class="timeline-axis">
                <span v-for="tick in timelineTicks" :key="tick">{{ tick }}s</span>
              </div>
              <div class="signal-row" v-for="signal in activeSignals" :key="signal.name">
                <div class="signal-label">
                  <strong>{{ signal.name }}</strong>
                  <small>{{ signal.distance }} ft · offset {{ signal.offset }}s</small>
                  <v-slider v-model="signal.offset" :min="0" :max="cycleLength - 1" :step="1" color="blue" density="compact" hide-details thumb-label></v-slider>
                </div>
                <div class="cycle-track">
                  <div class="offset-marker" :style="{ left: percent(signal.offset) + '%' }">offset</div>
                  <div
                    v-for="band in getBands(signal)"
                    :key="`${signal.name}-${band.start}-${band.color}`"
                    class="phase-band"
                    :class="band.color"
                    :style="{ left: percent(band.start) + '%', width: percent(band.duration) + '%' }"
                  >{{ band.label }}</div>
                </div>
              </div>
              <div class="progression-window" :style="progressionStyle">
                platoon green window
              </div>
            </v-card-text>
          </v-card>

          <v-card class="visual-card corridor-card" variant="outlined">
            <v-card-title>Street view progression</v-card-title>
            <v-card-text>
              <div class="corridor">
                <div class="road-line"></div>
                <div
                  v-for="signal in activeSignals"
                  :key="signal.name"
                  class="signal-mast"
                  :style="{ left: signal.position + '%' }"
                >
                  <div class="signal-head" :class="isGreen(signal) ? 'go' : 'stop'"></div>
                  <span>{{ signal.name }}</span>
                </div>
                <div v-if="showVehicles" class="vehicle-platoon" :style="vehicleStyle">🚗 🚙 🚕</div>
              </div>
              <p class="insight-text">{{ insightText }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </main>
</template>

<script>
export default {
  name: "CoordinationLearningTool",
  data() {
    return {
      cycleLength: 100,
      coordinatedSplit: 45,
      sideStreetSplit: 25,
      schedulerMinute: 480,
      coordinatedPhase: "Main Street through phases 2 + 6",
      signalCount: 4,
      showVehicles: true,
      isPlaying: false,
      playbackSpeed: 1,
      animationSecond: 0,
      vehicleRouteStart: 6,
      vehicleRouteEnd: 94,
      vehicleStopBuffer: 2.4,
      vehicleCurrentPosition: 6,
      lastFrameTime: null,
      animationFrameId: null,
      playbackSpeedOptions: [
        { label: "1x", value: 1 },
        { label: "2x", value: 2 },
        { label: "4x", value: 4 },
        { label: "8x", value: 8 },
        { label: "16x", value: 16 },
      ],
      signalCountOptions: [
        { label: "1 signal (basic cycle)", value: 1 },
        { label: "2 signals", value: 2 },
        { label: "3 signals", value: 3 },
        { label: "4 signals (full corridor)", value: 4 },
      ],
      phaseOptions: ["Main Street through phases 2 + 6", "Cross street phases 4 + 8"],
      signals: [
        { name: "Signal A", distance: 0, offset: 0, position: 8 },
        { name: "Signal B", distance: 900, offset: 8, position: 38 },
        { name: "Signal C", distance: 1800, offset: 16, position: 68 },
        { name: "Signal D", distance: 2600, offset: 24, position: 90 },
      ],
    };
  },
  computed: {
    activeSignals() { return this.signals.slice(0, this.signalCount); },
    maxCoordinatedSplit() { return this.cycleLength - 20; },
    maxSideStreetSplit() { return this.cycleLength - this.coordinatedSplit - 5; },
    clearanceTime() { return Math.max(5, this.cycleLength - this.coordinatedSplit - this.sideStreetSplit); },
    formattedClock() {
      const hours = Math.floor(this.schedulerMinute / 60).toString().padStart(2, "0");
      const minutes = (this.schedulerMinute % 60).toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    },
    timelineTicks() { return [0, Math.round(this.cycleLength / 4), Math.round(this.cycleLength / 2), Math.round(this.cycleLength * 0.75), this.cycleLength]; },
    progressionBandwidth() {
      return Math.max(0, this.progressionWindowEnd - this.progressionWindowStart);
    },
    progressionWindowStart() {
      return Math.max(...this.activeSignals.map((signal) => signal.offset));
    },
    progressionWindowEnd() {
      return Math.min(
        ...this.activeSignals.map((signal) => signal.offset + this.coordinatedSplit)
      );
    },
    coordinationQuality() {
      if (this.progressionBandwidth >= 20) return "Strong progression";
      if (this.progressionBandwidth >= 10) return "Partial progression";
      return "Adjust offsets";
    },
    progressionStyle() {
      return {
        left: this.percent(this.progressionWindowStart) + "%",
        width: this.percent(this.progressionBandwidth) + "%",
      };
    },
    currentCycleSecond() {
      return this.isPlaying ? this.animationSecond : this.schedulerMinute % this.cycleLength;
    },
    vehicleStyle() {
      return { left: `${this.vehiclePosition}%` };
    },
    vehiclePosition() {
      return this.vehicleCurrentPosition;
    },
    insightText() {
      return `At ${this.formattedClock}, the scheduler runs a ${this.cycleLength}s cycle for ${this.signalCount} signal${this.signalCount === 1 ? "" : "s"}. ${this.coordinatedPhase} receives ${this.coordinatedSplit}s of green; the displayed window starts at the first coordinated green and ends when the limiting signal turns red, giving a ${this.progressionBandwidth}s minimum shared green window.`;
    },
    conceptLegend() {
      return [
        { term: "Cycle length", color: "#263238", description: "One complete repeat of all signal indications." },
        { term: "Split time", color: "#43a047", description: "Seconds assigned to a phase within the cycle." },
        { term: "Offset", color: "#1e88e5", description: "Time shift from the master clock to the coordinated green." },
        { term: "Scheduler", color: "#5e35b1", description: "Time-of-day plan that selects cycle, splits, and offsets." },
      ];
    },
  },
  watch: {
    cycleLength() {
      this.signals.forEach((signal) => { signal.offset = Math.min(signal.offset, this.cycleLength - 1); });
      this.coordinatedSplit = Math.min(this.coordinatedSplit, this.maxCoordinatedSplit);
      this.sideStreetSplit = Math.min(this.sideStreetSplit, this.maxSideStreetSplit);
      this.animationSecond = this.animationSecond % this.cycleLength;
    },
  },
  beforeUnmount() {
    this.stopPlayback();
  },
  methods: {
    percent(value) { return (value / this.cycleLength) * 100; },
    getBands(signal) {
      return [
        { start: signal.offset, duration: this.coordinatedSplit, color: "green", label: "coordinated green" },
        { start: signal.offset + this.coordinatedSplit, duration: this.clearanceTime, color: "yellow", label: "change" },
        { start: signal.offset + this.coordinatedSplit + this.clearanceTime, duration: this.sideStreetSplit, color: "red", label: "side street" },
      ].filter((band) => band.start < this.cycleLength).map((band) => ({ ...band, duration: Math.min(band.duration, this.cycleLength - band.start) }));
    },
    togglePlayback() {
      if (this.isPlaying) {
        this.stopPlayback();
        return;
      }

      this.isPlaying = true;
      this.animationSecond = this.schedulerMinute % this.cycleLength;
      this.vehicleCurrentPosition = this.vehicleRouteStart;
      this.lastFrameTime = null;
      this.animationFrameId = requestAnimationFrame(this.advancePlayback);
    },
    stopPlayback() {
      this.isPlaying = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.lastFrameTime = null;
    },
    advancePlayback(timestamp) {
      if (!this.isPlaying) return;

      if (this.lastFrameTime === null) {
        this.lastFrameTime = timestamp;
      }

      const elapsedSeconds = ((timestamp - this.lastFrameTime) / 1000) * this.playbackSpeed;
      this.animationSecond = (this.animationSecond + elapsedSeconds) % this.cycleLength;
      this.advanceVehicles(elapsedSeconds);
      this.lastFrameTime = timestamp;
      this.animationFrameId = requestAnimationFrame(this.advancePlayback);
    },
    advanceVehicles(elapsedSeconds) {
      if (!this.showVehicles) return;

      const travelSeconds = this.cycleLength;
      const travelPercentPerSecond = (this.vehicleRouteEnd - this.vehicleRouteStart) / travelSeconds;
      const candidatePosition = Math.min(
        this.vehicleRouteEnd,
        this.vehicleCurrentPosition + elapsedSeconds * travelPercentPerSecond
      );
      const nextStop = this.activeSignals.find((signal) => {
        const stopPosition = signal.position - this.vehicleStopBuffer;
        return (
          this.vehicleCurrentPosition < stopPosition &&
          candidatePosition >= stopPosition &&
          !this.isGreen(signal)
        );
      });

      this.vehicleCurrentPosition = nextStop
        ? nextStop.position - this.vehicleStopBuffer
        : candidatePosition;

      if (this.vehicleCurrentPosition >= this.vehicleRouteEnd) {
        this.vehicleCurrentPosition = this.vehicleRouteStart;
      }
    },
    isGreen(signal) {
      const cyclePosition = (this.currentCycleSecond - signal.offset + this.cycleLength) % this.cycleLength;
      return cyclePosition < this.coordinatedSplit;
    },
  },
};
</script>

<style scoped>
.coordination-tool { padding: 20px; background: linear-gradient(180deg, #f5fbff 0%, #ffffff 48%); }
.hero-panel { display: flex; justify-content: space-between; gap: 24px; max-width: 1180px; margin: 0 auto 18px; padding: 28px; border-radius: 24px; background: #0f2f3f; color: white; }
.eyebrow { color: #9be7c7; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
h1 { font-size: clamp(2rem, 4vw, 3.6rem); line-height: 1.05; margin: 0 0 12px; }
.hero-copy { max-width: 760px; font-size: 1.1rem; line-height: 1.55; }
.hero-stat { min-width: 180px; display: grid; place-items: center; text-align: center; border: 1px solid rgba(255,255,255,.25); border-radius: 18px; padding: 16px; }
.hero-stat strong { font-size: 2.7rem; color: #72e08f; }
.tool-grid { max-width: 1220px; }
.control-card, .visual-card { border-radius: 18px; margin-bottom: 18px; background: rgba(255,255,255,.94); }
.control-group label { display: block; font-weight: 700; margin: 14px 0 0; color: #244050; }
.playback-controls { display: grid; grid-template-columns: minmax(130px, auto) 1fr; gap: 12px; align-items: center; margin-top: 8px; }
.concept-row { display: flex; gap: 12px; margin-bottom: 14px; }
.concept-row p { margin: 2px 0 0; color: #52636e; line-height: 1.35; }
.legend-dot { width: 14px; height: 14px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto; }
.visual-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.timeline-axis { display: flex; justify-content: space-between; color: #607d8b; font-size: .85rem; padding-left: 158px; margin-bottom: 8px; }
.signal-row { display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center; margin: 18px 0; }
.signal-label small { display: block; color: #607d8b; }
.cycle-track { position: relative; height: 58px; background: repeating-linear-gradient(90deg, #edf3f7 0, #edf3f7 12px, #f8fbfd 12px, #f8fbfd 24px); border-radius: 12px; overflow: hidden; border: 1px solid #d8e5ec; }
.phase-band { position: absolute; top: 10px; height: 38px; color: white; font-size: .76rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
.phase-band.green { background: #2eaf5d; }
.phase-band.yellow { background: #f9a825; color: #263238; }
.phase-band.red { background: #d95c5c; }
.offset-marker { position: absolute; z-index: 2; top: 0; bottom: 0; border-left: 3px solid #1e88e5; color: #1565c0; font-size: .7rem; padding-left: 4px; font-weight: 700; }
.progression-window { position: relative; height: 30px; margin-left: 162px; border-radius: 999px; background: rgba(46, 175, 93, .18); border: 2px dashed #2eaf5d; color: #1b5e20; text-align: center; font-weight: 700; }
.corridor { position: relative; height: 210px; border-radius: 18px; background: linear-gradient(#cfe8d4 0 38%, #4a4f55 38% 68%, #cfe8d4 68%); overflow: hidden; }
.road-line { position: absolute; left: 4%; right: 4%; top: 52%; border-top: 5px dashed #f7e27a; }
.signal-mast { position: absolute; top: 33%; transform: translateX(-50%); text-align: center; font-weight: 700; color: #17313f; }
.signal-head { width: 34px; height: 34px; margin: 0 auto 58px; border-radius: 50%; border: 5px solid #263238; box-shadow: 0 0 0 5px #455a64; }
.signal-head.go { background: #22c55e; }
.signal-head.stop { background: #ef4444; }
.vehicle-platoon { position: absolute; top: 47%; transform: translateX(-50%) scaleX(-1); font-size: 1.8rem; transition: left .08s linear; white-space: nowrap; z-index: 3; }
.insight-text { margin: 14px 0 0; color: #37474f; line-height: 1.55; }
@media (max-width: 760px) { .hero-panel { flex-direction: column; } .signal-row { grid-template-columns: 1fr; } .timeline-axis, .progression-window { margin-left: 0; padding-left: 0; } .playback-controls { grid-template-columns: 1fr; } }
</style>
