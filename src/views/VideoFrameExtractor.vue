<template>
  <div class="video-frame-extractor">
    <h1>Video Frame Extractor</h1>

    <section class="controls">
      <label class="control">
        <span>Select a video</span>
        <input type="file" accept="video/*" @change="handleFileChange" />
      </label>

      <div class="control">
        <label>
          Frame number
          <input v-model.number="frameNumber" type="number" min="0" />
        </label>
      </div>

      <div class="control">
        <label>
          FPS
          <input v-model.number="fps" type="number" min="1" step="1" />
        </label>
      </div>

      <div class="control">
        <p>
          Target time:
          <strong>{{ formattedTargetTime }}</strong>
        </p>
        <button type="button" @click="extractFrame" :disabled="!canExtract">
          Extract frame
        </button>
      </div>
    </section>

    <video ref="video" :src="videoSrc" class="visually-hidden" preload="metadata"></video>
    <canvas ref="canvas" class="frame-canvas"></canvas>

    <section class="preview" v-if="frameDataUrl">
      <h2>Preview</h2>
      <img :src="frameDataUrl" alt="Extracted video frame preview" />
      <a :href="frameDataUrl" download="frame.png">Download frame</a>
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
  max-width: 480px;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.frame-canvas {
  margin-top: 16px;
  max-width: 100%;
  border: 1px solid #ccc;
}

.preview {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.preview img {
  max-width: 100%;
  border: 1px solid #ccc;
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
