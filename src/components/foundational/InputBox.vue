<template>
  <div class="input-toggle">
    <button
      type="button"
      class="toggle-button"
      :class="{ active: inputMode === 'text' }"
      @click="setInputMode('text')"
    >
      Text
    </button>
    <button
      type="button"
      class="toggle-button"
      :class="{ active: inputMode === 'file' }"
      @click="setInputMode('file')"
    >
      File
    </button>
  </div>
  <input
    v-if="inputMode === 'file'"
    type="file"
    class="input-box input-file"
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
      const [file] = event.target.files;
      if (!file) {
        this.inputData = "";
        this.emitInput();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.inputData = reader.result || "";
        this.emitInput();
      };
      reader.readAsText(file);
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
  gap: 8px;
  margin-bottom: 8px;
}

.toggle-button {
  border: 1px solid #ccc;
  background: #f7f7f7;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}

.toggle-button.active {
  background: #e0e0e0;
  font-weight: 600;
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
