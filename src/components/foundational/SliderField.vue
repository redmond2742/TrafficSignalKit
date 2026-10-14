<template>
  <div class="slider-field">
    <label :for="inputId" class="slider-field__label">{{ label }}</label>
    <div class="slider-field__row">
      <v-slider
        :model-value="sliderValue"
        :min="min"
        :max="max"
        :step="step"
        :aria-label="label"
        color="primary"
        density="compact"
        hide-details
        class="slider-field__slider"
        @update:model-value="$emit('update:modelValue', $event)"
      ></v-slider>
      <v-text-field
        :id="inputId"
        :model-value="modelValue"
        type="number"
        :min="min"
        :step="step"
        :suffix="unit"
        density="compact"
        variant="outlined"
        hide-details
        class="slider-field__input"
        @update:model-value="onType"
      ></v-text-field>
    </div>
    <p v-if="hint" class="slider-field__hint">{{ hint }}</p>
  </div>
</template>

<script>
let counter = 0;

/**
 * A slider for getting close, and a number field for getting exact.
 *
 * The field is not limited to the slider's range: the slider covers the
 * usual values, and anything else can still be typed. A cleared field emits
 * an empty string rather than 0, so it can be retyped without the value
 * jumping, and whatever reads it treats empty as missing.
 */
export default {
  name: "SliderField",
  props: {
    modelValue: { type: [Number, String], default: null },
    label: { type: String, required: true },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    unit: { type: String, default: "" },
    hint: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  data() {
    counter += 1;
    return { inputId: `slider-field-${counter}` };
  },
  computed: {
    sliderValue() {
      const value = Number(this.modelValue);
      if (this.modelValue === "" || this.modelValue === null || !Number.isFinite(value)) return this.min;
      return Math.min(this.max, Math.max(this.min, value));
    },
  },
  methods: {
    onType(value) {
      this.$emit("update:modelValue", value === "" || value === null ? "" : Number(value));
    },
  },
};
</script>

<style scoped>
.slider-field {
  text-align: left;
}
.slider-field__label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 2px;
}
.slider-field__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.slider-field__slider {
  flex: 1 1 auto;
  min-width: 120px;
}
.slider-field__input {
  flex: 0 0 116px;
}
.slider-field__hint {
  margin: 2px 0 0;
  font-size: 0.78rem;
  opacity: 0.7;
}
</style>
