<template>
  <div class="video-frame-extractor">
    <h1>Video Frame Extractor</h1>

    <section class="controls">
      <label class="control full-width">
        <span>Select a video</span>
        <input type="file" accept="video/*" @change="handleFileChange" />
      </label>

      <label class="control">
        <span>Frame number</span>
        <input v-model.number="frameNumber" type="number" min="0" />
      </label>

      <label class="control">
        <span>FPS</span>
        <input v-model.number="fps" type="number" min="1" step="1" />
      </label>

      <div class="control info">
        <p>
          Target time:
          <strong>{{ formattedTargetTime }}</strong>
        </p>
        <button
          class="action-button"
          type="button"
          @click="extractFrame"
          :disabled="!canExtract"
        >
          Extract frame
        </button>
      </div>
    </section>

    <video ref="video" :src="videoSrc" class="visually-hidden" preload="metadata"></video>
    <canvas ref="canvas" class="frame-canvas"></canvas>

    <section class="preview" v-if="frameDataUrl">
      <h2>Preview</h2>
      <img :src="frameDataUrl" alt="Extracted video frame preview" />
      <a class="download-button" :href="frameDataUrl" download="frame.png">
        Download frame
      </a>
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
      this.frameDataUrl = "";

      this.$nextTick(() => {
        const video = this.$refs.video;
        if (!video) {
          return;
        }

        const onLoadedMetadata = () => {
          this.updateCanvasSize();
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
  },
  beforeUnmount() {
    this.revokeObjectUrl();
  },
};
</script>

<style scoped>
.video-frame-extractor {
  padding: 24px;
}

.controls {
  display: grid;
  gap: 16px;
  max-width: 640px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(0, 150, 136, 0.08);
  border: 1px solid rgba(0, 150, 136, 0.35);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: #1f2d2a;
}

.control input[type="file"],
.control input[type="number"] {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #ffffff;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.control input[type="file"]:focus,
.control input[type="number"]:focus {
  outline: none;
  border-color: #009688;
  box-shadow: 0 0 0 3px rgba(0, 150, 136, 0.2);
}

.control.full-width {
  grid-column: 1 / -1;
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
  margin-top: 24px;
  display: grid;
  gap: 12px;
  max-width: 640px;
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
