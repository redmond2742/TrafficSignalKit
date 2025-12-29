<template>
  <div>
    <div class="grow-wrap">
      <InputBox v-model="inputData" :defaultText="textboxDefaultText" />
    </div>
    <div>
      <v-btn @click="processPreemptionEvents" color="primary">
        Process Preemption Events
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
  methods: {
    getEventDescriptor(eventCode) {
      const match = enumerationObj.find(
        (item) => parseInt(item.eventCode, 10) === eventCode
      );
      return match ? match.eventDescriptor.trim() : `Event ${eventCode}`;
    },
    processPreemptionEvents() {
      const lines = this.inputData.split("\n");
      const events = [];

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

        const timestampInfo = this.convertTimestamp(timestamp);
        if (!timestampInfo || Number.isNaN(timestampInfo.MillisecFromEpoch)) {
          return;
        }

        events.push({
          timestampISO: timestampInfo.iso,
          timestampMs: timestampInfo.MillisecFromEpoch,
          humanReadable: timestampInfo.humanReadable,
          eventCode,
          eventDescriptor: this.getEventDescriptor(eventCode),
          parameterCode: parameterRaw ? parseInt(parameterRaw, 10) : null,
        });
      });

      events.sort((a, b) => a.timestampMs - b.timestampMs);
      this.$emit("preemptionEvents", events);
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
