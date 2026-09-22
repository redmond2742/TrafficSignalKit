<template>
  <div class="input-box-shell">
    <!--
      The mode switch sits here, top-left above the input, in every tool that
      takes high-resolution data. Some tools used to wrap this in a second
      switch of their own, or show a bare file input beside the textarea.
    -->
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

    <textarea
      v-if="inputMode === 'text'"
      v-model="inputData"
      rows="10"
      class="input-box"
      :placeholder="defaultText"
      :aria-label="defaultText"
      @input="emitInput"
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
  },
  emits: ["update:modelValue"],
  data() {
    return {
      inputMode: "text",
      inputData: this.modelValue || "",
      // what was typed before switching to Upload, so switching back restores it
      textData: this.modelValue || "",
      fileNames: [],
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

.input-box-modes {
  margin-bottom: 8px;
}

.input-box {
  overflow-y: auto;
  width: 100%;
  max-height: 220px;
  min-height: 140px;
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
