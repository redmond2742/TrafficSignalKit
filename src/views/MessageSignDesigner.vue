<template>
  <v-container class="message-sign-page">
    <h1 class="h1-center-text">Changeable Message Sign Designer</h1>
    <p class="intro-copy">
      Type your message below to preview it on a realistic changeable message sign.
      Font sizing adjusts based on line count and characters so the layout feels like
      a real full-matrix display.
    </p>

    <v-card class="pa-4 mb-6">
      <v-row>
        <v-col cols="12" md="5">
          <v-select
            v-model="selectedDevice"
            :items="devices"
            item-title="label"
            item-value="id"
            label="Select device"
            variant="outlined"
            density="comfortable"
          ></v-select>

          <div class="device-details">
            <h3>{{ activeDevice.name }}</h3>
            <ul>
              <li>Full matrix display</li>
              <li>Open size: {{ activeDevice.heightIn }}&quot; x {{ activeDevice.widthIn }}&quot;</li>
              <li>Recommended max lines: {{ activeDevice.maxLines }}</li>
              <li>Character sizing auto-adjusts with line length</li>
            </ul>
          </div>
        </v-col>
        <v-col cols="12" md="7">
          <div class="sign-frame">
            <canvas
              ref="signCanvas"
              :width="canvasWidth"
              :height="canvasHeight"
            ></canvas>
          </div>
          <v-btn color="primary" class="mt-4" @click="downloadImage">
            Download sign image
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-card class="pa-4">
      <v-textarea
        v-model="message"
        label="Message (use Enter for new line)"
        auto-grow
        rows="4"
        variant="outlined"
        counter
        persistent-hint
        hint="Up to 3 lines recommended for this sign size."
      ></v-textarea>
      <div class="message-stats">
        Lines: <strong>{{ lineCount }}</strong> | Longest line:
        <strong>{{ maxLineLength }}</strong> characters
      </div>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "MessageSignDesigner",
  data() {
    return {
      devices: [
        {
          id: "speedalert-24",
          label: 'SpeedAlert 24 Radar Message Sign (24" x 60")',
          name: "SpeedAlert 24 Radar Message Sign",
          widthIn: 60,
          heightIn: 24,
          maxLines: 3,
        },
      ],
      selectedDevice: "speedalert-24",
      message: "THANK YOU\nFOR DRIVING\nSAFELY",
      canvasWidth: 900,
      canvasHeight: 360,
    };
  },
  computed: {
    activeDevice() {
      return (
        this.devices.find((device) => device.id === this.selectedDevice) ||
        this.devices[0]
      );
    },
    lines() {
      return this.message
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, this.activeDevice.maxLines);
    },
    lineCount() {
      return this.lines.length || 1;
    },
    maxLineLength() {
      if (!this.lines.length) {
        return 0;
      }
      return Math.max(...this.lines.map((line) => line.length));
    },
  },
  watch: {
    message() {
      this.renderSign();
    },
    selectedDevice() {
      this.renderSign();
    },
  },
  mounted() {
    this.renderSign();
  },
  methods: {
    renderSign() {
      const canvas = this.$refs.signCanvas;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const framePadding = Math.round(width * 0.06);
      const signArea = {
        x: framePadding,
        y: framePadding,
        width: width - framePadding * 2,
        height: height - framePadding * 2,
      };

      ctx.clearRect(0, 0, width, height);

      const frameGradient = ctx.createLinearGradient(0, 0, width, height);
      frameGradient.addColorStop(0, "#2c3439");
      frameGradient.addColorStop(1, "#1d2429");
      ctx.fillStyle = frameGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#5d6a70";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, width - 6, height - 6);

      const faceGradient = ctx.createLinearGradient(0, signArea.y, 0, height);
      faceGradient.addColorStop(0, "#0e1011");
      faceGradient.addColorStop(1, "#060708");
      ctx.fillStyle = faceGradient;
      ctx.fillRect(signArea.x, signArea.y, signArea.width, signArea.height);

      this.drawLedMatrix(ctx, signArea);
      this.drawMessage(ctx, signArea);
      this.drawHighlight(ctx, signArea);
    },
    drawLedMatrix(ctx, signArea) {
      const spacing = Math.max(10, Math.round(signArea.width / 70));
      const radius = spacing * 0.18;
      ctx.save();
      ctx.fillStyle = "#1f130b";
      for (let y = signArea.y + spacing / 2; y < signArea.y + signArea.height; y += spacing) {
        for (let x = signArea.x + spacing / 2; x < signArea.x + signArea.width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    drawMessage(ctx, signArea) {
      const lines = this.lines.length ? this.lines : [""];
      const targetWidth = signArea.width * 0.9;
      let fontSize = Math.floor(signArea.height / (this.lineCount * 1.3));
      fontSize = Math.min(fontSize, signArea.height * 0.55);

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      for (let size = fontSize; size > 12; size -= 1) {
        ctx.font = `700 ${size}px "Roboto Mono", "Courier New", monospace`;
        const fits = lines.every((line) => ctx.measureText(line).width <= targetWidth);
        if (fits) {
          fontSize = size;
          break;
        }
      }

      const lineHeight = fontSize * 1.22;
      const totalHeight = lineHeight * lines.length;
      let startY = signArea.y + (signArea.height - totalHeight) / 2 + fontSize;

      ctx.fillStyle = "#ff9f1c";
      ctx.shadowColor = "rgba(255, 140, 20, 0.8)";
      ctx.shadowBlur = 14;

      lines.forEach((line, index) => {
        ctx.fillText(line.toUpperCase(), signArea.x + signArea.width / 2, startY + lineHeight * index);
      });

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    },
    drawHighlight(ctx, signArea) {
      const highlight = ctx.createLinearGradient(
        signArea.x,
        signArea.y,
        signArea.x + signArea.width,
        signArea.y + signArea.height
      );
      highlight.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      highlight.addColorStop(0.4, "rgba(255, 255, 255, 0)");
      highlight.addColorStop(1, "rgba(255, 255, 255, 0.12)");
      ctx.fillStyle = highlight;
      ctx.fillRect(signArea.x, signArea.y, signArea.width, signArea.height);
    },
    downloadImage() {
      const canvas = this.$refs.signCanvas;
      if (!canvas) {
        return;
      }
      const link = document.createElement("a");
      link.download = `${this.activeDevice.id}-preview.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
  },
};
</script>

<style scoped>
.message-sign-page {
  max-width: 1200px;
}

.intro-copy {
  font-size: 1.05rem;
  margin-bottom: 1.5rem;
}

.sign-frame {
  background: radial-gradient(circle at top, #40484f, #1f2529);
  border-radius: 12px;
  padding: 18px;
  box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.4), 0 12px 24px rgba(0, 0, 0, 0.25);
}

.sign-frame canvas {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
}

.device-details {
  margin-top: 1rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 1rem;
  border-radius: 10px;
}

.device-details ul {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
}

.message-stats {
  margin-top: 0.75rem;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
