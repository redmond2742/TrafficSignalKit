<template>
  <div class="video-frame-extractor">
    <h1>Video Frame Extractor</h1>

    <section class="controls">
      <div class="control-row">
        <label class="control grow">
          <span>Select a video</span>
          <input type="file" accept="video/*" @change="handleFileChange" />
        </label>

        <label class="control fps-control">
          <span>FPS</span>
          <input v-model.number="fps" type="number" min="1" step="1" />
        </label>
      </div>

      <div class="frame-card">
        <div class="frame-header">
          <label class="control">
            <span>Frame number</span>
            <input
              v-model.number="frameNumber"
              type="number"
              min="0"
              :max="maxFrameNumber"
            />
          </label>

          <div class="control info">
            <p>
              Time in video (based on FPS):
              <strong>{{ formattedTargetTime }}</strong>
            </p>
            <p v-if="maxFrameNumber">
              Max frame: <strong>{{ maxFrameNumber }}</strong>
            </p>
          </div>
        </div>

        <input
          v-model.number="frameNumber"
          class="frame-slider"
          type="range"
          min="0"
          :max="maxFrameNumber"
          step="1"
          :disabled="!canExtract || maxFrameNumber === 0"
        />
        <div class="frame-slider-meta">
          <span>0</span>
          <span>{{ maxFrameNumber }}</span>
        </div>
      </div>

      <div class="sync-card">
        <div class="sync-header">
          <div>
            <h2>Sync Time</h2>
            <p>Calculated from the reference frame and FPS.</p>
          </div>
          <p class="sync-value">{{ formattedSyncTime }}</p>
        </div>

        <div class="sync-controls">
          <label class="control">
            <span>Reference frame</span>
            <input
              v-model.number="syncReferenceFrame"
              type="number"
              min="0"
              :max="maxFrameNumber"
            />
          </label>

          <div class="control">
            <span>Time format</span>
            <div class="toggle">
              <button
                type="button"
                :class="{ active: syncInputMode === 'clock' }"
                @click="syncInputMode = 'clock'"
              >
                Clock
              </button>
              <button
                type="button"
                :class="{ active: syncInputMode === 'iso' }"
                @click="syncInputMode = 'iso'"
              >
                ISO 8601
              </button>
            </div>
          </div>
        </div>

        <label class="control">
          <span>Time for reference frame</span>
          <input
            v-if="syncInputMode === 'clock'"
            v-model="syncClockTime"
            type="text"
            placeholder="HH:MM:SS.mmm"
          />
          <input
            v-else
            v-model="syncIsoTime"
            type="text"
            placeholder="2024-03-18T15:20:45.123Z"
          />
        </label>
      </div>
    </section>

    <video ref="video" :src="videoSrc" class="visually-hidden" preload="metadata"></video>
    <canvas ref="canvas" class="frame-canvas"></canvas>

    <section class="preview" v-if="frameDataUrl">
      <h2>Preview</h2>
      <a class="download-button" :href="frameDataUrl" :download="downloadFilename">
        Download frame
      </a>
      <img :src="frameDataUrl" alt="Extracted video frame preview" />
    </section>
  </div>
</template>

<script>
export default {
  name: "VideoFrameExtractor",
  data() {
    return {
      videoSrc: "",
      frameNumber: 0,
      fps: 30,
      frameDataUrl: "",
      objectUrl: null,
      isMetadataLoaded: false,
      videoDuration: 0,
      videoFileName: "",
      syncReferenceFrame: 0,
      syncInputMode: "clock",
      syncClockTime: "00:00:00.000",
      syncIsoTime: "",
    };
  },
  computed: {
    targetTime() {
      if (!this.fps) {
        return 0;
      }
      return this.frameNumber / this.fps;
    },
    formattedTargetTime() {
      return `${this.targetTime.toFixed(2)}s`;
    },
    canExtract() {
      return Boolean(this.videoSrc) && this.fps > 0;
    },
    maxFrameNumber() {
      if (!this.videoDuration || !this.fps) {
        return 0;
      }
      return Math.max(0, Math.floor(this.videoDuration * this.fps));
    },
    syncOffsetSeconds() {
      if (!this.fps) {
        return 0;
      }
      return (this.frameNumber - this.syncReferenceFrame) / this.fps;
    },
    formattedSyncTime() {
      if (!this.fps) {
        return "—";
      }

      if (this.syncInputMode === "iso") {
        const baseDate = this.parseIsoDate(this.syncIsoTime);
        if (!baseDate) {
          return "—";
        }
        const syncedDate = new Date(
          baseDate.getTime() + this.syncOffsetSeconds * 1000
        );
        return syncedDate.toISOString();
      }

      const baseSeconds = this.parseClockToSeconds(this.syncClockTime);
      if (baseSeconds === null) {
        return "—";
      }
      return this.formatSecondsToClock(baseSeconds + this.syncOffsetSeconds);
    },
    downloadFilename() {
      const baseName = this.videoFileName || "frame";
      const safeBaseName = this.sanitizeFilename(baseName);
      const syncLabel =
        this.formattedSyncTime && this.formattedSyncTime !== "—"
          ? this.sanitizeFilename(this.formattedSyncTime)
          : "Unknown";
      return `${safeBaseName} -Frame ${this.frameNumber}-${syncLabel}.png`;
    },
  },
  methods: {
    handleFileChange(event) {
      const [file] = event.target.files || [];
      if (!file) {
        return;
      }

      this.revokeObjectUrl();

      const newUrl = URL.createObjectURL(file);
      this.videoSrc = newUrl;
      this.objectUrl = newUrl;
      this.videoFileName = file.name.replace(/\.[^/.]+$/, "");
      this.frameDataUrl = "";
      this.isMetadataLoaded = false;
      this.videoDuration = 0;

      this.$nextTick(() => {
        const video = this.$refs.video;
        if (!video) {
          return;
        }

        const onLoadedMetadata = () => {
          this.updateCanvasSize();
          this.isMetadataLoaded = true;
          this.videoDuration = video.duration || 0;
          this.normalizeFrameNumber();
          this.extractFrameIfReady();
          this.estimateVideoFps();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.load();
      });
    },
    updateCanvasSize() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas) {
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    },
    extractFrame() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.canExtract) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const onSeeked = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.frameDataUrl = canvas.toDataURL("image/png");
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = this.targetTime;
    },
    extractFrameIfReady() {
      const video = this.$refs.video;
      if (!video || !this.isMetadataLoaded || !this.canExtract) {
        return;
      }
      this.extractFrame();
    },
    normalizeFrameNumber() {
      if (!this.maxFrameNumber) {
        return;
      }
      if (this.frameNumber > this.maxFrameNumber) {
        this.frameNumber = this.maxFrameNumber;
      }
      if (this.frameNumber < 0) {
        this.frameNumber = 0;
      }
    },
    normalizeSyncReferenceFrame() {
      if (!this.maxFrameNumber) {
        return;
      }
      if (this.syncReferenceFrame > this.maxFrameNumber) {
        this.syncReferenceFrame = this.maxFrameNumber;
      }
      if (this.syncReferenceFrame < 0) {
        this.syncReferenceFrame = 0;
      }
    },
    estimateVideoFps() {
      const video = this.$refs.video;
      if (!video || typeof video.requestVideoFrameCallback !== "function") {
        return;
      }

      video.muted = true;
      video.playsInline = true;

      const maxSamples = 5;
      const deltas = [];
      let lastMediaTime = null;

      const finish = () => {
        if (!deltas.length) {
          return;
        }
        const averageDelta =
          deltas.reduce((total, delta) => total + delta, 0) / deltas.length;
        const estimatedFps = Math.round(1 / averageDelta);
        if (Number.isFinite(estimatedFps) && estimatedFps > 0) {
          this.fps = estimatedFps;
        }
        video.pause();
        video.currentTime = 0;
      };

      const captureFrame = (now, metadata) => {
        if (lastMediaTime !== null) {
          const delta = metadata.mediaTime - lastMediaTime;
          if (delta > 0) {
            deltas.push(delta);
          }
        }
        lastMediaTime = metadata.mediaTime;

        if (deltas.length >= maxSamples) {
          finish();
          return;
        }

        video.requestVideoFrameCallback(captureFrame);
      };

      const startSampling = () => {
        video.currentTime = 0;
        video.requestVideoFrameCallback(captureFrame);
      };

      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(startSampling).catch(startSampling);
      } else {
        startSampling();
      }
    },
    revokeObjectUrl() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
    },
    parseClockToSeconds(value) {
      if (!value) {
        return null;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const segments = trimmed.split(":");
      if (segments.length < 1 || segments.length > 3) {
        return null;
      }
      const numbers = segments.map((segment) => Number(segment));
      if (numbers.some((number) => Number.isNaN(number))) {
        return null;
      }
      const [first, second, third] = numbers;
      if (segments.length === 3) {
        return first * 3600 + second * 60 + third;
      }
      if (segments.length === 2) {
        return first * 60 + second;
      }
      return first;
    },
    formatSecondsToClock(value) {
      if (!Number.isFinite(value)) {
        return "—";
      }
      const isNegative = value < 0;
      const totalSeconds = Math.abs(value);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const secondsString = seconds.toFixed(3).padStart(6, "0");
      const prefix = isNegative ? "-" : "";
      if (hours > 0) {
        return `${prefix}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}:${secondsString}`;
      }
      return `${prefix}${String(minutes).padStart(2, "0")}:${secondsString}`;
    },
    parseIsoDate(value) {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed;
    },
    sanitizeFilename(value) {
      return String(value)
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
    },
  },
  watch: {
    frameNumber() {
      this.extractFrameIfReady();
    },
    fps() {
      this.normalizeFrameNumber();
      this.normalizeSyncReferenceFrame();
      this.extractFrameIfReady();
    },
    syncReferenceFrame() {
      this.normalizeSyncReferenceFrame();
    },
  },
  beforeUnmount() {
    this.revokeObjectUrl();
  },
};
</script>

<style scoped>
.video-frame-extractor {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.video-frame-extractor h1 {
  text-align: center;
  margin: 0;
}

.controls {
  display: grid;
  gap: 20px;
  width: min(720px, 100%);
  padding: 20px;
  border-radius: 16px;
  background: rgba(0, 150, 136, 0.08);
  border: 1px solid rgba(0, 150, 136, 0.35);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.control-row .grow {
  flex: 1 1 320px;
}

.fps-control {
  flex: 0 0 140px;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: #1f2d2a;
}

.control input[type="file"],
.control input[type="number"],
.control input[type="text"] {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #ffffff;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.control input[type="file"]:focus,
.control input[type="number"]:focus,
.control input[type="text"]:focus,
.frame-slider:focus {
  outline: none;
  border-color: #009688;
  box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.2);
}

.control.info {
  justify-content: space-between;
  gap: 12px;
}

.control.info p {
  margin: 0;
  font-weight: 500;
  color: #2b3b39;
}

.frame-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.1);
  display: grid;
  gap: 16px;
}

.sync-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.08);
  display: grid;
  gap: 16px;
}

.sync-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.sync-header h2 {
  margin: 0 0 6px;
  font-size: 1.1rem;
}

.sync-header p {
  margin: 0;
  color: #4a5d5b;
  font-weight: 500;
}

.sync-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #00796b;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(0, 150, 136, 0.08);
  border: 1px solid rgba(0, 150, 136, 0.25);
  word-break: break-all;
}

.sync-controls {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 150, 136, 0.08);
  padding: 6px;
  border-radius: 999px;
  border: 1px solid rgba(0, 150, 136, 0.2);
}

.toggle button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 600;
  color: #2b3b39;
  cursor: pointer;
}

.toggle button.active {
  background: #009688;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(0, 150, 136, 0.25);
}

.frame-header {
  display: grid;
  grid-template-columns: minmax(180px, 220px) 1fr;
  gap: 16px;
  align-items: center;
}

.frame-slider {
  width: 100%;
  appearance: none;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(0, 150, 136, 0.35), rgba(0, 121, 107, 0.7));
  outline: none;
}

.frame-slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.frame-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #009688;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 12px rgba(0, 150, 136, 0.35);
  cursor: pointer;
}

.frame-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #009688;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 12px rgba(0, 150, 136, 0.35);
  cursor: pointer;
}

.frame-slider-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #4a5d5b;
}

.action-button {
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #009688, #00796b);
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(0, 150, 136, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.action-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(0, 150, 136, 0.35);
}

.frame-canvas {
  display: none;
}

.preview {
  display: grid;
  gap: 12px;
  width: min(720px, 100%);
}

.preview img {
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.download-button {
  justify-self: start;
  padding: 10px 18px;
  border-radius: 999px;
  text-decoration: none;
  background: #ffffff;
  border: 1px solid rgba(0, 150, 136, 0.5);
  color: #00796b;
  font-weight: 600;
  box-shadow: 0 8px 16px rgba(0, 150, 136, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.download-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(0, 150, 136, 0.2);
}

@media (max-width: 720px) {
  .frame-header {
    grid-template-columns: 1fr;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
