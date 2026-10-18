<template>
  <div class="input-box-shell">
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

    <p v-if="sampleShown" class="input-box-note" role="status">
      {{ sampleNote }}
    </p>
  </div>
</template>

<script>
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
    };
  },
  computed: {
    fileSummary() {
      if (!this.fileNames.length) return "No file chosen";
      if (this.fileNames.length === 1) return this.fileNames[0];
      return `${this.fileNames.length} files`;
    },
  },
  watch: {
    modelValue(value) {
      if (value === this.inputData) return;
      this.inputData = value;
    },
    inputMode(mode) {
      if (mode === "file") {
        this.textData = this.inputData;
        this.inputData = "";
      } else {
        this.fileNames = [];
        this.inputData = this.textData;
      }
      this.emitInput();
    },
  },
  methods: {
    emitInput() {
      this.$emit("update:modelValue", this.inputData);
    },
    onType() {
      this.sampleShown = false;
      this.emitInput();
    },
    loadSample() {
      const text = this.sample();
      // a file upload in progress gives way to the sample
      this.inputMode = "text";
      this.fileNames = [];
      this.$nextTick(() => {
        this.inputData = text;
        this.textData = text;
        this.sampleShown = true;
        this.emitInput();
        this.$emit("sample", text);
      });
    },
    handleFileChange(event) {
      const files = Array.from(event.target.files || []);
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

.input-box-upload {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 140px;
  padding: 16px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.28);
  border-radius: 6px;
}

/* the button above opens this; it is never shown itself */
.input-box-file-native {
  display: none;
}

.input-box-files {
  color: rgba(var(--v-theme-on-surface), 0.7);
  word-break: break-all;
}
</style>
