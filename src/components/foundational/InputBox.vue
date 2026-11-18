<template>
  <div
    class="input-box-shell"
    @dragenter="onDragOver"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!--
      The whole box takes a dropped file, in either mode. Dropped on the text
      box, a file would otherwise replace the page, so it switches to Upload
      and loads instead; the pasted text comes back on switching to Paste.
    -->
    <!--
      The mode switch sits here, top-left above the input, in every tool that
      takes high-resolution data. Some tools used to wrap this in a second
      switch of their own, or show a bare file input beside the textarea.
    -->
    <div class="input-box-bar">
      <v-btn-toggle
        v-model="inputMode"
        mandatory
        divided
        density="compact"
        variant="outlined"
        color="primary"
        class="input-box-modes"
        aria-label="Choose how to provide data"
      >
        <v-btn value="text" size="small" prepend-icon="mdi-clipboard-text-outline">
          Paste
        </v-btn>
        <v-btn value="file" size="small" prepend-icon="mdi-tray-arrow-up">
          Upload
        </v-btn>
      </v-btn-toggle>

      <!--
        For anyone without a controller log to hand: fills the box with the
        tool's sample and tells the tool, which can then fill in its settings
        and run.
      -->
      <v-btn
        v-if="sample"
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-flask-outline"
        class="input-box-sample"
        @click="loadSample"
      >
        Try with sample data
      </v-btn>
    </div>

    <div class="input-box-area">
      <textarea
        v-if="inputMode === 'text'"
        v-model="inputData"
        rows="10"
        class="input-box"
        :placeholder="defaultText"
        :aria-label="defaultText"
        @input="onType"
        @blur="emitInput"
      ></textarea>

      <div v-else class="input-box-upload">
        <v-icon icon="mdi-tray-arrow-up" size="28" aria-hidden="true"></v-icon>
        <!-- no dragging on a touch screen, so the wording goes with it -->
        <p class="input-box-drop-text">
          Drag and drop file{{ multiple ? "s" : "" }} here, or
        </p>
        <!--
          A real button rather than the browser's bare file input, so the
          control is in the same place and the same shape on every tool.
        -->
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-paperclip"
          @click="$refs.fileInput.click()"
        >
          Choose file{{ multiple ? "s" : "" }}
        </v-btn>
        <input
          ref="fileInput"
          type="file"
          class="input-box-file-native"
          :multiple="multiple"
          :accept="accept"
          @change="handleFileChange"
        />
        <span class="input-box-files">{{ fileSummary }}</span>
      </div>

      <div v-if="dragging" class="input-box-drop-hint">
        Drop file{{ multiple ? "s" : "" }} to load
      </div>
    </div>

    <!--
      Which layout the log is in, and the proof: its first rows as they are in
      the file beside how the tool reads them. Only for something that reads
      as a controller log; a GPX file or a detector map shows nothing here.
    -->
    <div v-if="detected" class="input-box-format" role="status">
      <p class="input-box-format__line">
        <v-icon icon="mdi-check-circle-outline" size="16" aria-hidden="true"></v-icon>
        Detected format: <strong>{{ detected.name }}</strong>
        ({{ detected.columns.join(", ") }}). {{ detectedSummary }}
        <button
          v-if="detected.sample.length"
          type="button"
          class="input-box-format__toggle"
          :aria-expanded="String(showProof)"
          @click="showProof = !showProof"
        >
          {{ showProof ? "Hide" : "Show" }} the first rows
        </button>
      </p>
      <table v-if="showProof && detected.sample.length" class="input-box-format__proof">
        <thead>
          <tr>
            <th scope="col">In the file</th>
            <th scope="col">As the tool reads it</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in detected.sample" :key="index">
            <td><code>{{ row.raw }}</code></td>
            <td><code>{{ row.converted }}</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="fileError" class="input-box-error" role="alert">{{ fileError }}</p>

    <p v-if="sampleShown && inputMode === 'text'" class="input-box-note" role="status">
      {{ sampleNote }}
    </p>
  </div>
</template>

<script>
import { dragHasFiles, pickDroppedFiles, rejectedMessage } from "../../utils/fileDrop.js";
import { normalizeHighResText } from "../../utils/highResFormats.js";

export default {
  name: "InputBox",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    /** Shown as the textarea's placeholder, and used as its accessible name. */
    defaultText: {
      type: String,
      default: "Paste in text for processing",
    },
    accept: {
      type: String,
      default: "",
    },
    multiple: {
      type: Boolean,
      default: true,
    },
    /**
     * Returns the text "Try with sample data" puts in the box. A function, so
     * a large sample is only built when someone asks for it. No button
     * without one.
     */
    sample: {
      type: Function,
      default: null,
    },
    /** Says what the sample is, under the box once it is loaded. */
    sampleNote: {
      type: String,
      default: "Sample data: a simulated log from a made-up intersection, not a real one.",
    },
  },
  emits: ["update:modelValue", "sample"],
  data() {
    return {
      inputMode: "text",
      inputData: this.modelValue || "",
      // what was typed before switching to Upload, so switching back restores it
      textData: this.modelValue || "",
      fileNames: [],
      // true from loading the sample until the text is changed by hand
      sampleShown: false,
      // a file is being dragged over this box
      dragging: false,
      fileError: "",
      // what was last handed to the tool, which may be the log reordered
      lastEmitted: null,
      showProof: true,
    };
  },
  computed: {
    /**
     * The box's text in the layout the tools read. A log in another layout,
     * such as D4's, is reordered here, so every tool takes it; the box keeps
     * showing what was pasted or uploaded.
     */
    normalized() {
      return normalizeHighResText(this.inputData);
    },
    detected() {
      return this.normalized.detection;
    },
    detectedSummary() {
      const d = this.detected;
      if (!d) return "";
      const rows = `${d.rows.toLocaleString()} row${d.rows === 1 ? "" : "s"}`;
      if (!d.converted) return `${rows}, read as they are.`;
      const notes = [`${rows} reordered to timestamp, event code, parameter for this tool`];
      if (d.ignored.length) notes.push(`${d.ignored.join(", ")} ignored`);
      if (d.skipped) notes.push(`${d.skipped.toLocaleString()} line${d.skipped === 1 ? "" : "s"} that did not read skipped`);
      return `${notes.join("; ")}.`;
    },
    fileSummary() {
      if (!this.fileNames.length) return "No file chosen";
      if (this.fileNames.length === 1) return this.fileNames[0];
      return `${this.fileNames.length} files`;
    },
  },
  watch: {
    modelValue(value) {
      // the reordered log coming back is not a new value from the tool
      if (value === this.inputData || value === this.lastEmitted) return;
      this.inputData = value;
    },
    inputMode(mode) {
      if (mode === "file") {
        this.textData = this.inputData;
        this.inputData = "";
      } else {
        this.fileNames = [];
        this.fileError = "";
        this.inputData = this.textData;
      }
      this.emitInput();
    },
  },
  /**
   * A box invites dropping, so a near miss gets likelier, and a file dropped
   * anywhere else on the page would replace the page and lose the work on it.
   */
  mounted() {
    window.addEventListener("dragover", this.refusePageDrop);
    window.addEventListener("drop", this.refusePageDrop);
  },
  beforeUnmount() {
    window.removeEventListener("dragover", this.refusePageDrop);
    window.removeEventListener("drop", this.refusePageDrop);
  },
  methods: {
    onDragOver(event) {
      if (!dragHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      this.dragging = true;
    },
    onDragLeave(event) {
      // leaving for a child of the box is still inside it
      if (!event.currentTarget.contains(event.relatedTarget)) this.dragging = false;
    },
    onDrop(event) {
      if (!dragHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      this.dragging = false;
      const { accepted, rejected } = pickDroppedFiles(event.dataTransfer.files, {
        accept: this.accept,
        multiple: this.multiple,
      });
      if (accepted.length) {
        this.inputMode = "file";
        this.readFiles(accepted);
      }
      this.fileError = rejected.length ? rejectedMessage(rejected, this.accept) : "";
    },
    /** Runs after the box's own handlers; a drop zone that took it has said so. */
    refusePageDrop(event) {
      if (event.defaultPrevented || !dragHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
    },
    emitInput() {
      const text = this.normalized.text;
      this.lastEmitted = text;
      this.$emit("update:modelValue", text);
    },
    onType() {
      this.sampleShown = false;
      this.fileError = "";
      this.emitInput();
    },
    loadSample() {
      const text = this.sample();
      // a file upload in progress gives way to the sample
      this.inputMode = "text";
      this.fileNames = [];
      this.fileError = "";
      this.$nextTick(() => {
        this.inputData = text;
        this.textData = text;
        this.sampleShown = true;
        this.emitInput();
        this.$emit("sample", text);
      });
    },
    handleFileChange(event) {
      this.fileError = "";
      this.readFiles(Array.from(event.target.files || []));
    },
    readFiles(files) {
      this.fileNames = files.map((file) => file.name);
      if (files.length === 0) {
        this.inputData = "";
        this.emitInput();
        return;
      }
      Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result || "");
              reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
              reader.readAsText(file);
            }),
        ),
      )
        .then((contents) => {
          this.inputData = contents.filter(Boolean).join("\n");
          this.emitInput();
        })
        .catch(() => {
          this.inputData = "";
          this.fileNames = [];
          // what a dropped folder comes to, since it arrives looking like a file
          this.fileError = "Could not read that. A folder can't be loaded; drop the files inside it.";
          this.emitInput();
        });
    },
  },
};
</script>

<style scoped>
.input-box-shell {
  display: block;
}

.input-box-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.input-box-note {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

/*
  The textarea had no border at all, so in 34 tools the place to paste data
  read as a line of grey placeholder text floating on the page.
*/
.input-box {
  box-sizing: border-box;
  overflow-y: auto;
  width: 100%;
  max-height: 220px;
  min-height: 140px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.28);
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  /* CSV columns line up in a monospace face */
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.45;
  resize: vertical;
}
.input-box:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.5);
}
.input-box:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.input-box-area {
  position: relative;
}

.input-box-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 140px;
  padding: 16px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.28);
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.input-box-drop-text {
  margin: 0;
}
@media (hover: none) {
  .input-box-drop-text {
    display: none;
  }
}

/*
 * Over the box while a file is held above it, and lets the drag events through.
 * Opaque, so its one line does not land on top of the text and button beneath.
 */
.input-box-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgb(var(--v-theme-primary));
  border-radius: 6px;
  background:
    linear-gradient(rgba(var(--v-theme-primary), 0.12), rgba(var(--v-theme-primary), 0.12)),
    rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  pointer-events: none;
}

.input-box-format {
  margin-top: 6px;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.input-box-format__line {
  margin: 0;
}
.input-box-format__line .v-icon {
  color: rgb(var(--v-theme-success));
  vertical-align: -3px;
}
.input-box-format__toggle {
  margin-left: 4px;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  cursor: pointer;
}
.input-box-format__proof {
  margin-top: 6px;
  border-collapse: collapse;
  max-width: 100%;
  display: block;
  overflow-x: auto;
}
.input-box-format__proof th,
.input-box-format__proof td {
  padding: 3px 12px 3px 0;
  text-align: left;
  white-space: pre;
  vertical-align: top;
}
.input-box-format__proof th {
  font-weight: 600;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.input-box-format__proof code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
}

.input-box-error {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-error));
}

/* the button above opens this; it is never shown itself */
.input-box-file-native {
  display: none;
}

.input-box-files {
  word-break: break-all;
}
</style>
