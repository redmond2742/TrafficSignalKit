<template>
  <textarea
    type="text"
    rows="20"
    v-model="inputData"
    @blur="emitInput"
    @focus="clearText"
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
      inputData: this.defaultText,
      hasFocused: false,
    };
  },
  methods: {
    emitInput() {
      this.$emit("update:inputData", this.inputData);
    },
    clearText() {
      if (!this.hasFocused) {
        this.inputData = "";
        this.hasFocused = true;
      }
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

textarea {
  overflow-y: scroll;
  height: 100px;
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
