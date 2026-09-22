<template>
  <div class="d-flex align-center flex-column">
    <v-card width="100%" min-width="100">
      <v-card-title>
        <v-combobox
          v-model="label"
          clearable
          :items="phases"
          density="compact"
          hide-details
          label="Phase"
        ></v-combobox>
      </v-card-title>
      <v-card-subtitle>
        <v-radio-group v-model="radioDirection" hide-details inline>
          <v-radio label="NB" value="NB"></v-radio>
          <v-radio label="SB" value="SB"></v-radio>
          <v-radio label="EB" value="EB"></v-radio>
          <v-radio label="WB" value="WB"></v-radio>
        </v-radio-group>
        <v-radio-group v-model="radioMovement" hide-details inline>
          <v-radio label="Through" value="T"></v-radio>
          <v-radio label="Left" value="L"></v-radio>
        </v-radio-group>
      </v-card-subtitle>

      <v-card-text class="pt-2">
        <div class="split-row">
          <v-btn
            density="compact"
            icon="mdi-minus"
            :aria-label="`Decrease ${labelText} split`"
            @click="step(-1)"
          ></v-btn>

          <!--
            The split used to be a read-only number that could only be changed
            one second per click, so setting 20 -> 45 meant 25 clicks. It is a
            field now; the buttons stay for nudging.
          -->
          <v-text-field
            v-model="draft"
            class="split-field"
            type="number"
            min="0"
            density="compact"
            variant="outlined"
            hide-details
            :aria-label="`${labelText} split, seconds`"
            @change="commitDraft"
            @blur="commitDraft"
            @keydown.enter="commitDraft"
          ></v-text-field>

          <v-btn
            density="compact"
            icon="mdi-plus"
            :aria-label="`Increase ${labelText} split`"
            @click="step(1)"
          ></v-btn>

          <img
            :src="arrowSrc"
            :style="imageStyle"
            class="rotated-image"
            :alt="arrowAlt"
          />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import arrowUp from "../assets/Arrow-Up.png";
import arrowLeft from "../assets/Arrow-Left.png";

/** Which way the arrow points for each approach direction. */
const DIRECTION_ANGLES = { NB: 0, SB: 180, EB: 90, WB: 270 };

export default {
  name: "PhaseBox",
  props: {
    propSplitCount: {
      type: Number,
      required: true,
    },
    /** Pre-fills the phase name, so the grid is usable without 8 manual entries. */
    defaultLabel: {
      type: String,
      default: "",
    },
  },
  emits: ["changedCL"],
  data() {
    return {
      // the field's working copy; committed on change/blur/Enter rather than
      // per keystroke, so typing "45" logs one change instead of two
      draft: String(this.propSplitCount),
      phases: ["Ph1", "Ph2", "Ph3", "Ph4", "Ph5", "Ph6", "Ph7", "Ph8"],
      label: this.defaultLabel,
      radioDirection: "NB",
      radioMovement: "T",
    };
  },
  computed: {
    labelText() {
      return this.label || "phase";
    },
    arrowSrc() {
      return this.radioMovement === "L" ? arrowLeft : arrowUp;
    },
    arrowAlt() {
      return this.radioMovement === "L" ? "Left turn arrow" : "Through movement arrow";
    },
    imageStyle() {
      return { transform: `rotate(${DIRECTION_ANGLES[this.radioDirection] || 0}deg)` };
    },
  },
  watch: {
    // the parent owns the value; keep the field in step when it changes from
    // elsewhere, such as the distribute buttons
    propSplitCount(value) {
      this.draft = String(value);
    },
  },
  methods: {
    step(delta) {
      this.commit(this.propSplitCount + delta);
    },
    commitDraft() {
      this.commit(this.draft);
    },
    commit(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        this.draft = String(this.propSplitCount);
        return;
      }
      const seconds = Math.max(0, Math.round(parsed));
      this.draft = String(seconds);
      if (seconds !== this.propSplitCount) {
        this.$emit("changedCL", seconds);
      }
    },
  },
};
</script>

<style scoped>
.split-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.split-field {
  max-width: 76px;
}
/* the spinner arrows duplicate the +/- buttons */
.split-field :deep(input[type="number"]) {
  -moz-appearance: textfield;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
}
.split-field :deep(input[type="number"]::-webkit-outer-spin-button),
.split-field :deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
.rotated-image {
  width: 28px;
  height: 28px;
}
</style>
