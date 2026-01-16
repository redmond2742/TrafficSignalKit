<template>
  <div>
    <div class="grow-wrap">
      <InputBox v-model="inputData" :defaultText="textboxDefaultText" />
    </div>
    <div>
      <v-btn @click="processDetectionEvents" color="primary">
        Process Detection Events
      </v-btn>
    </div>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import convertTime from "../mixins/convertTime";
import enumerationObj from "../data/enumerations.json";

export default {
  mixins: [convertTime],
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, channel)",
    };
  },
  computed: {
    detectionEventCodes() {
      return enumerationObj
        .filter((item) => item.eventDescriptor.toLowerCase().includes("detector"))
        .map((item) => parseInt(item.eventCode, 10));
    },
    phaseEventStates() {
      return enumerationObj.reduce((lookup, item) => {
        if (!item.parameterType || item.parameterType.toLowerCase() !== "phase") {
          return lookup;
        }

        const descriptor = item.eventDescriptor.trim().toLowerCase();
        const eventCode = parseInt(item.eventCode, 10);
        if (Number.isNaN(eventCode)) {
          return lookup;
        }

        if (descriptor.includes("phase begin green")) {
          lookup[eventCode] = "green";
        } else if (descriptor.includes("phase begin yellow clearance")) {
          lookup[eventCode] = "yellow";
        } else if (
          descriptor.includes("phase begin red clearance") ||
          descriptor.includes("phase end yellow clearance")
        ) {
          lookup[eventCode] = "red";
        } else if (
          descriptor.includes("phase end red clearance") ||
          descriptor.includes("phase inactive")
        ) {
          lookup[eventCode] = "inactive";
        }

        return lookup;
      }, {});
    },
    detectionLookup() {
      return enumerationObj.reduce((lookup, item) => {
        const code = parseInt(item.eventCode, 10);
        lookup[code] = item.eventDescriptor.trim();
        return lookup;
      }, {});
    },
  },
  methods: {
    processDetectionEvents() {
      const lines = this.inputData.split("\n");
      const events = [];
      const phaseEvents = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return;
        }

        const [timestamp, eventCodeRaw, parameterRaw] = trimmedLine
          .split(",")
          .map((value) => value.trim());

        const eventCode = parseInt(eventCodeRaw, 10);
        if (Number.isNaN(eventCode)) {
          return;
        }

        const parameterCode = parameterRaw ? parseInt(parameterRaw, 10) : null;
        if (parameterCode === null || Number.isNaN(parameterCode)) {
          return;
        }

        const timestampInfo = this.convertTimestamp(timestamp);
        if (!timestampInfo || Number.isNaN(timestampInfo.MillisecFromEpoch)) {
          return;
        }

        if (this.detectionEventCodes.includes(eventCode)) {
          events.push({
            timestampISO: timestampInfo.iso,
            timestampMs: timestampInfo.MillisecFromEpoch,
            humanReadable: timestampInfo.humanReadable,
            eventCode,
            eventDescriptor: this.detectionLookup[eventCode] ?? `Event ${eventCode}`,
            parameterCode,
          });
        }

        const phaseState = this.phaseEventStates[eventCode];
        if (phaseState) {
          phaseEvents.push({
            timestampISO: timestampInfo.iso,
            timestampMs: timestampInfo.MillisecFromEpoch,
            humanReadable: timestampInfo.humanReadable,
            eventCode,
            eventDescriptor: this.detectionLookup[eventCode] ?? `Event ${eventCode}`,
            parameterCode,
            phaseState,
          });
        }
      });

      events.sort((a, b) => a.timestampMs - b.timestampMs);
      phaseEvents.sort((a, b) => a.timestampMs - b.timestampMs);
      this.$emit("detectionEvents", events);
      this.$emit("phaseEvents", phaseEvents);
    },
  },
};
</script>

<style scoped>
.grow-wrap {
  display: grid;
}

.grow-wrap::after {
  content: attr(data-replicated-value) " ";
  white-space: pre-wrap;
  visibility: hidden;
}

.grow-wrap > textarea {
  resize: none;
  overflow: hidden;
  overflow-y: scroll;
}

.grow-wrap > textarea,
.grow-wrap::after {
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;
  grid-area: 1 / 1 / 2 / 2;
}
</style>
