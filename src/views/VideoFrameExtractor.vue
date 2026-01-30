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

      <div class="file-info" :class="{ empty: !videoSrc }">
        <div class="file-info-item">
          <span class="file-info-label">Duration</span>
          <strong class="file-info-value">{{ formattedVideoDuration }}</strong>
        </div>
        <div class="file-info-item">
          <span class="file-info-label">Frame rate</span>
          <strong class="file-info-value">{{ fps }} fps</strong>
        </div>
        <div class="file-info-item">
          <span class="file-info-label">File size</span>
          <strong class="file-info-value">{{ formattedFileSize }}</strong>
        </div>
      </div>

      <div class="sync-card">
        <div class="sync-header">
          <div>
            <h2>Sync Time</h2>
            <p>Calculated from the reference frame and FPS.</p>
          </div>
          <div class="sync-actions">
            <p class="sync-value">{{ formattedSyncTime }}</p>
            <button
              class="collapse-toggle"
              type="button"
              :aria-expanded="!isSyncCollapsed"
              @click="isSyncCollapsed = !isSyncCollapsed"
            >
              {{ isSyncCollapsed ? "Expand" : "Collapse" }}
            </button>
          </div>
        </div>

        <div class="sync-controls" v-show="!isSyncCollapsed">
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

        <label class="control" v-show="!isSyncCollapsed">
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

      <details class="csv-card">
        <summary>Timestamp CSV</summary>
        <p class="csv-description">
          Upload a CSV with ISO 8601 timestamps to extract frames using the sync time. The
          file should include columns for signal ID, name, phase, light state, and the
          timestamp.
        </p>
        <label class="control">
          <span>CSV file</span>
          <input type="file" accept=".csv,text/csv" @change="handleCsvFileChange" />
        </label>
        <label class="control">
          <span>Generate GIF downloads</span>
          <input v-model="enableGifDownloads" type="checkbox" />
        </label>
        <p class="csv-hint" v-if="csvFileName">
          Loaded: <strong>{{ csvFileName }}</strong>
        </p>
        <p class="csv-error" v-if="csvError">{{ csvError }}</p>
      </details>

      <div class="frame-card">
        <div class="frame-header">
          <div class="control">
            <span>Frame number</span>
            <div class="frame-stepper">
              <button
                class="stepper-button"
                type="button"
                :disabled="!canExtract || frameNumber <= 0"
                @click="updateFrameNumber(-1)"
              >
                −
              </button>
              <input
                v-model.number="frameNumber"
                class="frame-stepper-input"
                type="number"
                min="0"
                :max="maxFrameNumber"
              />
              <button
                class="stepper-button"
                type="button"
                :disabled="!canExtract || frameNumber >= maxFrameNumber"
                @click="updateFrameNumber(1)"
              >
                +
              </button>
            </div>
          </div>

          <div class="control info">
            <p>
              Time in video (FPS-based):
              <strong>{{ formattedTargetTime }}</strong>
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
    </section>

    <video ref="video" :src="videoSrc" class="visually-hidden" preload="metadata"></video>
    <canvas ref="canvas" class="frame-canvas"></canvas>

    <section class="preview" v-if="frameDataUrl">
      <div class="preview-controls" role="group" aria-label="Download button position">
        <span class="preview-controls-label">Download button position</span>
        <label class="preview-radio">
          <input
            v-model="downloadButtonPosition"
            type="radio"
            value="top-left"
          />
          Top left
        </label>
        <label class="preview-radio">
          <input
            v-model="downloadButtonPosition"
            type="radio"
            value="top-right"
          />
          Top right
        </label>
        <label class="preview-radio">
          <input
            v-model="downloadButtonPosition"
            type="radio"
            value="bottom-left"
          />
          Bottom left
        </label>
        <label class="preview-radio">
          <input
            v-model="downloadButtonPosition"
            type="radio"
            value="bottom-right"
          />
          Bottom right
        </label>
      </div>
      <div class="preview-image">
        <a
          class="download-button"
          :class="downloadButtonPosition"
          :href="frameDataUrl"
          :download="downloadFilename"
        >
          Download frame
        </a>
        <img :src="frameDataUrl" alt="Extracted video frame preview" />
      </div>
      <div class="csv-output" v-if="csvFrames.length">
        <div class="csv-output-header">
          <h2>Extracted CSV Frames</h2>
          <p v-if="csvProcessing">Processing CSV frames…</p>
        </div>
        <div class="csv-table-wrapper">
          <table class="csv-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Signal</th>
                <th>Phase</th>
                <th>Light State</th>
                <th>Video Time</th>
                <th>Downloads</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="frame in csvFrames" :key="frame.rowId">
                <td>{{ frame.timestamp }}</td>
                <td>{{ frame.signalId }} · {{ frame.signalName }}</td>
                <td>Phase {{ frame.phase }}</td>
                <td>{{ frame.lightState }}</td>
                <td>{{ frame.formattedVideoTime }}</td>
                <td>
                  <span v-if="frame.error" class="csv-error">{{ frame.error }}</span>
                  <div v-else class="csv-downloads">
                    <a
                      class="csv-download"
                      :href="frame.dataUrl"
                      :download="frame.filename"
                    >
                      Download PNG
                    </a>
                    <span
                      v-if="!enableGifDownloads"
                      class="csv-download disabled"
                      aria-disabled="true"
                    >
                      GIF downloads disabled
                    </span>
                    <span
                      v-else-if="frame.gifError"
                      class="csv-error"
                    >
                      {{ frame.gifError }}
                    </span>
                    <a
                      v-else-if="frame.gifUrl"
                      class="csv-download"
                      :href="frame.gifUrl"
                      :download="frame.gifFilename"
                    >
                      Download GIF
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import gifshot from "gifshot";

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
      videoFileSize: 0,
      syncReferenceFrame: 0,
      syncInputMode: "clock",
      syncClockTime: "00:00:00.000",
      syncIsoTime: "",
      isSyncCollapsed: false,
      csvFileName: "",
      csvRows: [],
      csvFrames: [],
      csvError: "",
      csvProcessing: false,
      csvJobId: 0,
      enableGifDownloads: false,
      downloadButtonPosition: "top-right",
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
      if (!this.fps) {
        return "—";
      }
      return this.formatSecondsToClock(this.targetTime);
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
    formattedVideoDuration() {
      if (!this.videoDuration) {
        return "—";
      }
      return this.formatSecondsToClock(this.videoDuration);
    },
    formattedFileSize() {
      if (!this.videoFileSize) {
        return "—";
      }
      return this.formatFileSize(this.videoFileSize);
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
      this.revokeCsvGifUrls();

      const newUrl = URL.createObjectURL(file);
      this.videoSrc = newUrl;
      this.objectUrl = newUrl;
      this.videoFileName = file.name.replace(/\.[^/.]+$/, "");
      this.videoFileSize = file.size || 0;
      this.frameDataUrl = "";
      this.csvFrames = [];
      this.csvError = "";
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
          this.queueCsvExtraction();
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.load();
      });
    },
    handleCsvFileChange(event) {
      const [file] = event.target.files || [];
      if (!file) {
        return;
      }
      this.csvFileName = file.name;
      this.csvError = "";

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const { rows, error } = this.parseCsvContent(text);
        if (error) {
          this.csvError = error;
          this.csvRows = [];
          return;
        }
        this.csvRows = rows;
        this.queueCsvExtraction();
      };
      reader.onerror = () => {
        this.csvError = "Unable to read the CSV file.";
        this.csvRows = [];
      };
      reader.readAsText(file);
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
    extractFrameAtTime(targetTime) {
      return new Promise((resolve) => {
        const video = this.$refs.video;
        const canvas = this.$refs.canvas;
        if (!video || !canvas || !this.canExtract) {
          resolve("");
          return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
          resolve("");
          return;
        }

        const onSeeked = () => {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };

        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = Math.min(Math.max(targetTime, 0), video.duration || targetTime);
      });
    },
    extractFrameIfReady() {
      const video = this.$refs.video;
      if (!video || !this.isMetadataLoaded || !this.canExtract) {
        return;
      }
      this.extractFrame();
    },
    parseCsvContent(text) {
      if (!text) {
        return { rows: [], error: "CSV file is empty." };
      }
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (!lines.length) {
        return { rows: [], error: "CSV file is empty." };
      }

      let startIndex = 0;
      const header = lines[0].toLowerCase();
      if (header.includes("iso") && header.includes("signal id")) {
        startIndex = 1;
      }

      const rows = [];
      for (let index = startIndex; index < lines.length; index += 1) {
        const parts = lines[index].split(",").map((part) => part.trim());
        if (parts.length < 7) {
          return { rows: [], error: "CSV rows must include 7 columns." };
        }
        const [
          timestamp,
          signalId,
          signalName,
          phase,
          detectorChannel,
          lightState,
          secondsIntoState,
        ] = parts;
        rows.push({
          rowId: `${index}-${timestamp}`,
          timestamp,
          signalId,
          signalName,
          phase,
          detectorChannel,
          lightState,
          secondsIntoState,
        });
      }

      return { rows, error: "" };
    },
    queueCsvExtraction() {
      if (!this.csvRows.length) {
        this.revokeCsvGifUrls();
        this.csvFrames = [];
        return;
      }
      if (!this.canExtract || !this.isMetadataLoaded) {
        this.revokeCsvGifUrls();
        this.csvFrames = [];
        return;
      }
      this.extractCsvFrames();
    },
    async extractCsvFrames() {
      const jobId = this.csvJobId + 1;
      this.csvJobId = jobId;
      this.csvProcessing = true;
      this.revokeCsvGifUrls();
      this.csvFrames = [];
      this.csvError = "";

      const referenceTimeSeconds = this.syncReferenceFrame / (this.fps || 1);
      const syncBase = this.getSyncBase();
      if (!syncBase) {
        this.csvError = "Enter a valid sync time before extracting CSV frames.";
        this.csvProcessing = false;
        return;
      }

      for (const row of this.csvRows) {
        const targetTime = this.calculateCsvTargetTime(row, syncBase, referenceTimeSeconds);
        if (jobId !== this.csvJobId) {
          return;
        }
        if (targetTime === null || !Number.isFinite(targetTime)) {
          this.csvFrames.push({
            ...row,
            formattedVideoTime: "—",
            error: "Invalid timestamp.",
          });
          continue;
        }
        if (targetTime < 0 || targetTime > this.videoDuration) {
          this.csvFrames.push({
            ...row,
            formattedVideoTime: this.formatSecondsToClock(targetTime),
            error: "Out of video range.",
          });
          continue;
        }
        const dataUrl = await this.extractFrameAtTime(targetTime);
        if (jobId !== this.csvJobId) {
          return;
        }
        let gifResult = { gifUrl: "", gifFilename: "", gifError: "" };
        if (this.enableGifDownloads && dataUrl) {
          gifResult = await this.extractGifClipAtTime(targetTime, row);
        } else if (this.enableGifDownloads && !dataUrl) {
          gifResult = { gifUrl: "", gifFilename: "", gifError: "Unable to generate GIF." };
        }
        if (jobId !== this.csvJobId) {
          if (gifResult.gifUrl) {
            URL.revokeObjectURL(gifResult.gifUrl);
          }
          return;
        }
        this.csvFrames.push({
          ...row,
          targetTime,
          formattedVideoTime: this.formatSecondsToClock(targetTime),
          dataUrl,
          filename: this.buildCsvFilename(row),
          gifUrl: gifResult.gifUrl,
          gifFilename: gifResult.gifFilename,
          gifError: gifResult.gifError,
          error: dataUrl ? "" : "Unable to extract frame.",
        });
      }

      this.csvProcessing = false;
    },
    getSyncBase() {
      if (this.syncInputMode === "iso") {
        const baseDate = this.parseIsoDate(this.syncIsoTime);
        if (!baseDate) {
          return null;
        }
        return { mode: "iso", baseDate };
      }
      const baseSeconds = this.parseClockToSeconds(this.syncClockTime);
      if (baseSeconds === null) {
        return null;
      }
      return { mode: "clock", baseSeconds };
    },
    calculateCsvTargetTime(row, syncBase, referenceTimeSeconds) {
      const csvDate = this.parseIsoDate(row.timestamp);
      if (!csvDate) {
        return null;
      }
      if (syncBase.mode === "iso") {
        const offsetSeconds = (csvDate.getTime() - syncBase.baseDate.getTime()) / 1000;
        return referenceTimeSeconds + offsetSeconds;
      }
      const csvSeconds =
        csvDate.getUTCHours() * 3600 +
        csvDate.getUTCMinutes() * 60 +
        csvDate.getUTCSeconds() +
        csvDate.getUTCMilliseconds() / 1000;
      const offsetSeconds = csvSeconds - syncBase.baseSeconds;
      return referenceTimeSeconds + offsetSeconds;
    },
    buildCsvFilename(row) {
      const signalId = row.signalId || "Signal";
      const signalName = row.signalName || "Unknown";
      const phase = row.phase || "X";
      const lightState = row.lightState || "State";
      const timestamp = row.timestamp || "Unknown";
      const fileName = `${signalId}.${signalName}-Phase${phase}-${lightState}_UTC-${timestamp}`;
      return `${this.sanitizeFilename(fileName)}.png`;
    },
    buildCsvGifFilename(row) {
      const baseName = this.buildCsvFilename(row).replace(/\.png$/i, "");
      return `${baseName}.gif`;
    },
    async extractGifClipAtTime(targetTime, row) {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      if (!video || !canvas || !this.canExtract) {
        return { gifUrl: "", gifFilename: "", gifError: "Video unavailable." };
      }

      const startTime = Math.max(targetTime - 1, 0);
      const endTime = Math.min(targetTime + 1, this.videoDuration || targetTime + 1);
      if (endTime <= startTime) {
        return { gifUrl: "", gifFilename: "", gifError: "Invalid clip range." };
      }

      const maxFps = 12;
      const clipFps = Math.max(1, Math.min(this.fps || maxFps, maxFps));
      const frameInterval = 1 / clipFps;
      const frameTimes = [];
      for (let time = startTime; time <= endTime + frameInterval / 2; time += frameInterval) {
        frameTimes.push(time);
      }

      const frames = [];
      for (const time of frameTimes) {
        const dataUrl = await this.extractFrameAtTime(time);
        if (!dataUrl) {
          return { gifUrl: "", gifFilename: "", gifError: "Unable to capture GIF frames." };
        }
        frames.push(dataUrl);
      }

      const gifDataUrl = await new Promise((resolve) => {
        gifshot.createGIF(
          {
            images: frames,
            gifWidth: canvas.width,
            gifHeight: canvas.height,
            interval: frameInterval,
            numFrames: frames.length,
          },
          (result) => {
            if (!result || result.error) {
              resolve("");
              return;
            }
            resolve(result.image);
          }
        );
      });

      if (!gifDataUrl) {
        return { gifUrl: "", gifFilename: "", gifError: "GIF encoding failed." };
      }

      const gifBlob = await fetch(gifDataUrl).then((response) => response.blob());
      const gifUrl = URL.createObjectURL(gifBlob);
      return {
        gifUrl,
        gifFilename: this.buildCsvGifFilename(row),
        gifError: "",
      };
    },
    updateFrameNumber(delta) {
      const nextValue = this.frameNumber + delta;
      if (Number.isNaN(nextValue)) {
        return;
      }
      this.frameNumber = Math.min(
        Math.max(nextValue, 0),
        this.maxFrameNumber || 0
      );
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
    revokeCsvGifUrls() {
      this.csvFrames.forEach((frame) => {
        if (frame.gifUrl) {
          URL.revokeObjectURL(frame.gifUrl);
        }
      });
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
    formatFileSize(value) {
      if (!Number.isFinite(value) || value <= 0) {
        return "—";
      }
      const units = ["B", "KB", "MB", "GB", "TB"];
      let size = value;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
      }
      const decimals = unitIndex === 0 ? 0 : 1;
      return `${size.toFixed(decimals)} ${units[unitIndex]}`;
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
      this.queueCsvExtraction();
    },
    syncInputMode() {
      this.queueCsvExtraction();
    },
    syncReferenceFrame() {
      this.normalizeSyncReferenceFrame();
      this.queueCsvExtraction();
    },
    syncClockTime() {
      this.queueCsvExtraction();
    },
    syncIsoTime() {
      this.queueCsvExtraction();
    },
    csvRows() {
      this.queueCsvExtraction();
    },
    enableGifDownloads() {
      this.queueCsvExtraction();
    },
  },
  beforeUnmount() {
    this.revokeObjectUrl();
    this.revokeCsvGifUrls();
  },
};
</script>

<style scoped>
.video-frame-extractor {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.video-frame-extractor h1 {
  text-align: center;
  margin: 0;
}

.controls {
  display: grid;
  gap: 16px;
  width: min(880px, 100%);
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

.file-info {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  background: rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.file-info.empty {
  opacity: 0.6;
}

.file-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-info-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4a5d5b;
}

.file-info-value {
  font-size: 1rem;
  color: #1f2d2a;
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
  align-items: flex-end;
  text-align: right;
}

.control.info p {
  margin: 0;
  font-weight: 500;
  color: #2b3b39;
}

.frame-stepper {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.frame-stepper-input {
  text-align: center;
}

.stepper-button {
  border: none;
  background: rgba(0, 150, 136, 0.16);
  color: #005f56;
  font-weight: 700;
  font-size: 1.25rem;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  min-width: 56px;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 12px rgba(0, 150, 136, 0.18);
}

.stepper-button:hover:not(:disabled) {
  background: rgba(0, 150, 136, 0.28);
  transform: translateY(-1px);
}

.stepper-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.frame-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.1);
  display: grid;
  gap: 12px;
}

.sync-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.08);
  display: grid;
  gap: 12px;
}

.csv-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.08);
}

.csv-card summary {
  font-weight: 700;
  cursor: pointer;
  color: #005f56;
  margin-bottom: 8px;
}

.csv-description {
  margin: 0 0 12px;
  color: #4a5d5b;
  font-weight: 500;
}

.csv-hint {
  margin: 8px 0 0;
  color: #2b3b39;
}

.csv-error {
  color: #b42318;
  font-weight: 600;
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

.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.collapse-toggle {
  border: none;
  background: rgba(0, 150, 136, 0.12);
  color: #005f56;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.collapse-toggle:hover {
  background: rgba(0, 150, 136, 0.2);
}

.sync-controls {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
  width: min(880px, 100%);
}

.preview-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.preview-controls-label {
  font-weight: 600;
  color: #335250;
}

.preview-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  color: #2f3f3d;
}

.preview-radio input {
  accent-color: #00796b;
}

.preview-image {
  position: relative;
  display: block;
}

.preview img {
  max-width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.download-button {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 8px 14px;
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

.download-button.top-left {
  top: 12px;
  right: auto;
  bottom: auto;
  left: 12px;
}

.download-button.top-right {
  top: 12px;
  right: 12px;
  bottom: auto;
  left: auto;
}

.download-button.bottom-left {
  top: auto;
  right: auto;
  bottom: 12px;
  left: 12px;
}

.download-button.bottom-right {
  top: auto;
  right: 12px;
  bottom: 12px;
  left: auto;
}

.csv-output {
  margin-top: 20px;
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 1px rgba(0, 150, 136, 0.08);
}

.csv-output-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.csv-output h2 {
  margin: 0;
  font-size: 1.1rem;
}

.csv-table-wrapper {
  margin-top: 12px;
  overflow-x: auto;
}

.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.csv-table th,
.csv-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.csv-table th {
  color: #4a5d5b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
}

.csv-download {
  color: #00796b;
  font-weight: 600;
  text-decoration: none;
}

.csv-download:hover {
  text-decoration: underline;
}

.csv-download.disabled {
  color: #8a9b98;
  cursor: not-allowed;
  text-decoration: none;
}

.csv-downloads {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 720px) {
  .frame-header {
    grid-template-columns: 1fr;
  }

  .download-button {
    position: static;
    margin: 8px 0;
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
