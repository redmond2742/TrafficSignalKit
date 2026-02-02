<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->
  </div>
  <div v-if="!hideInput" class="grow-wrap">
    <InputBox v-model="localInputData" :defaultText="textboxDefaultText" />
  </div>
  <div v-if="!hideInput">
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
//mixins
import processPhaseSplits from "../mixins/processPhaseSplits";
import { DateTime } from "luxon";
// components
import InputBox from "./foundational/InputBox.vue";
import TableDisplaySplit from "./foundational/TableDisplaySplit.vue";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
    TableDisplaySplit,
  },
  props: {
    inputData: {
      type: String,
      default: "",
    },
    hideInput: {
      type: Boolean,
      default: false,
    },
    autoProcess: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localInputData: "",
      hdDataObj: [],
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as Text in CSV format",
    };
  },
  created() {
    // Resetting the variable in the created hook
    this.phaseArray = [];
  },
  computed: {},
  watch: {
    inputData: {
      immediate: true,
      handler(value) {
        if (value !== this.localInputData) {
          this.localInputData = value || "";
        }
        if (this.autoProcess && this.localInputData.trim()) {
          this.calculatePhaseDurations();
        }
        if (this.autoProcess && !this.localInputData.trim()) {
          this.rowData = [];
          this.$emit("phaseDurations", this.rowData);
        }
      },
    },
  },
  methods: {
    resetPhaseState() {
      this.phasesInCycle = [];
      this.phaseArray = [];
      this.activePhasesInCycle = [];
      this.cycleCount = 1;
      this.countCycles = 1;
      this.currentCycleLength = 0;
      this.rowData = [];
      this.processedData = [];
      this.eventStates = {};
      this.totalPhaseCalls = [];
      this.resetEventTrackingState();
    },
    calculatePhaseDurations() {
      if (!this.localInputData.trim()) {
        this.rowData = [];
        this.$emit("phaseDurations", this.rowData);
        return;
      }
      this.resetPhaseState();
      this.hdDataObj = this.loadCsv2JsonObj(this.localInputData); //load all the enumerations into JSON obj.
      let allHDData = this.buildCycleItem(this.hdDataObj);
      const patternChanges = this.getPatternChanges(this.hdDataObj);
      const phaseSplitsWithPattern = this.addPatternToPhaseSplits(
        this.rowData,
        patternChanges
      );
      const phaseAggregates = this.aggregatePhaseSplitMetrics(
        phaseSplitsWithPattern,
        this.hdDataObj
      );
      const patternAggregates = this.buildPatternAggregates(
        phaseSplitsWithPattern,
        this.hdDataObj,
        patternChanges
      );
      this.$emit("phaseSplitAggregates", phaseAggregates);
      this.$emit("phaseSplitPatternAggregates", patternAggregates);
      //emit here not necessary because buildCycleItem emit's the phase data
      console.log(allHDData);
      //this.rowData = this.fillInEndTime(this.rowData);
    },
    getPatternChanges(hdData) {
      return hdData
        .filter((event) => event.eventCode === 131)
        .map((event) => ({
          pattern: event.parameterCode,
          timestampMs: event.timestamp?.MillisecFromEpoch,
        }))
        .filter(
          (event) =>
            typeof event.timestampMs === "number" &&
            Number.isFinite(event.pattern)
        )
        .sort((a, b) => a.timestampMs - b.timestampMs);
    },
    getPatternAtTime(patternChanges, timestampMs) {
      if (!patternChanges.length || typeof timestampMs !== "number") {
        return null;
      }
      let selected = null;
      for (const change of patternChanges) {
        if (change.timestampMs <= timestampMs) {
          selected = change.pattern;
        } else {
          break;
        }
      }
      return selected;
    },
    addPatternToPhaseSplits(phaseSplits, patternChanges) {
      if (!patternChanges.length) {
        return phaseSplits.map((split) => ({
          ...split,
          pattern: null,
        }));
      }

      return phaseSplits.map((split) => {
        const timestampMs = split.timestampStartISO
          ? DateTime.fromISO(split.timestampStartISO).toMillis()
          : null;
        const pattern = this.getPatternAtTime(patternChanges, timestampMs);
        return {
          ...split,
          pattern,
        };
      });
    },
    buildPatternAggregates(phaseSplits, hdData, patternChanges) {
      if (!patternChanges.length) {
        return [];
      }

      const patternSegments = [];
      for (let index = 0; index < patternChanges.length; index += 1) {
        const current = patternChanges[index];
        const next = patternChanges[index + 1];
        patternSegments.push({
          pattern: current.pattern,
          startMs: current.timestampMs,
          endMs: next ? next.timestampMs : Number.POSITIVE_INFINITY,
        });
      }

      const patternMap = new Map();
      patternSegments.forEach((segment) => {
        if (!patternMap.has(segment.pattern)) {
          patternMap.set(segment.pattern, []);
        }
        patternMap.get(segment.pattern).push(segment);
      });

      return Array.from(patternMap.entries())
        .map(([pattern, segments]) => {
          const patternSplits = phaseSplits.filter(
            (split) => split.pattern === pattern
          );
          if (!patternSplits.length) {
            return null;
          }
          const patternHdData = hdData.filter((event) => {
            const timestampMs = event.timestamp?.MillisecFromEpoch;
            if (typeof timestampMs !== "number") {
              return false;
            }
            return segments.some(
              (segment) =>
                timestampMs >= segment.startMs && timestampMs < segment.endMs
            );
          });
          return {
            pattern,
            aggregates: this.aggregatePhaseSplitMetrics(
              patternSplits,
              patternHdData
            ),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.pattern - b.pattern);
    },
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
</style>
