<template>
  <div class="input-toggle" role="group" aria-label="Input mode">
    <span class="toggle-label" :class="{ active: inputMode === 'text' }">Text</span>
    <label class="switch">
      <input
        type="checkbox"
        :checked="inputMode === 'file'"
        @change="setInputMode($event.target.checked ? 'file' : 'text')"
        aria-label="Toggle between text and file input"
      />
      <span class="slider"></span>
    </label>
    <span class="toggle-label" :class="{ active: inputMode === 'file' }">Files</span>
  </div>
  <input
    v-if="inputMode === 'file'"
    type="file"
    class="input-box input-file"
    multiple
    @change="handleFileChange"
  />
  <textarea
    v-else
    type="text"
    rows="10"
    v-model="inputData"
    @blur="emitInput"
    @focus="clearText"
    class="input-box"
  />
</template>

<script>
export default {
  props: {
    defaultText: {
      type: String,
      default: "Paste in text for processing",
    },
  },
  data() {
    return {
      inputMode: "text",
      inputData: this.defaultText,
      textData: this.defaultText,
      hasFocused: false,
    };
  },
  methods: {
    emitInput() {
      this.$emit("update:inputData", this.inputData);
    },
    clearText() {
      if (this.inputMode !== "text") {
        return;
      }
      if (!this.hasFocused) {
        this.inputData = "";
        this.hasFocused = true;
      }
    },
    setInputMode(mode) {
      if (this.inputMode === mode) {
        return;
      }
      if (mode === "file") {
        this.textData = this.inputData;
        this.inputData = "";
        this.hasFocused = true;
      } else {
        this.inputData = this.textData || this.defaultText;
        this.hasFocused = this.inputData !== this.defaultText;
      }
      this.inputMode = mode;
      this.emitInput();
    },
    handleFileChange(event) {
      const files = Array.from(event.target.files || []);
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
          this.emitInput();
        });
    },
  },
  onChange() {
    this.emitInput();
  },
};
</script>

<style scoped>
.grow-wrap {
  /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
  display: grid;
}
.grow-wrap::after {
  /* Note the weird space! Needed to preventy jumpy behavior */
  content: attr(data-replicated-value) " ";

  /* This is how textarea text behaves */
  white-space: pre-wrap;

  /* Hidden from view, clicks, and screen readers */
  visibility: hidden;
}
.grow-wrap > textarea {
  /* You could leave this, but after a user resizes, then it ruins the auto sizing */
  resize: none;

  /* Firefox shows scrollbar on growth, you can hide like this. */
  overflow: hidden;
  overflow-y: scroll;
}
.grow-wrap > textarea,
.grow-wrap::after {
  /* Identical styling required!! */
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;

  /* Place on top of each other */
  grid-area: 1 / 1 / 2 / 2;
}

.input-box {
  overflow-y: auto;
  max-height: 220px;
  min-height: 140px;
}

.input-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.toggle-label {
  color: #666;
  font-weight: 500;
}

.toggle-label.active {
  color: #222;
  font-weight: 600;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cfcfcf;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}

.slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.switch input:checked + .slider {
  background-color: #4caf50;
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.input-file {
  min-height: auto;
  padding: 8px;
}

input[type="text"],
select {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  margin-top: 25px;
}
</style>
