<template>
  <div>
    <div class="delay-inputs">
      <div class="grow-wrap">
        <InputBox v-model="inputData" :defaultText="dataDefaultText" />
      </div>
      <div class="grow-wrap">
        <InputBox
          v-model="detectorMapInput"
          :defaultText="detectorDefaultText"
        />
      </div>
    </div>
    <div class="actions">
      <v-btn-toggle
        v-model="timeReference"
        class="time-toggle"
        mandatory
        divided
      >
        <v-btn value="detector">Detector On → Phase On</v-btn>
        <v-btn value="phaseCall">Phase Call Registered → Phase On</v-btn>
      </v-btn-toggle>
      <v-btn @click="processDelays" color="primary">Process</v-btn>
    </div>

    <div v-if="tableRows.length" class="delay-table-wrapper">
      <table class="delay-table summary-table">
        <thead>
          <tr>
            <th>Summary</th>
            <th v-for="phase in phaseColumns" :key="`summary-phase-${phase}`">
              Phase {{ phase }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Average Delay</td>
            <td
              v-for="phase in phaseColumns"
              :key="`summary-average-${phase}`"
            >
              <span v-if="averageDelayByPhase[phase] !== null">
                {{ formatDelay(averageDelayByPhase[phase]) }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <table class="delay-table">
        <thead>
          <tr>
            <th>Cycle #</th>
            <th>Cycle Start</th>
            <th>Cycle Length</th>
            <th v-for="phase in phaseColumns" :key="`phase-${phase}`">
              Phase {{ phase }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="`cycle-${row.cycle}`">
            <td>{{ row.cycle }}</td>
            <td>{{ row.startTime }}</td>
            <td>{{ formatDelay(row.cycleLengthSeconds) }}</td>
            <td
              v-for="phase in phaseColumns"
              :key="`cycle-${row.cycle}-phase-${phase}`"
              :title="cellTitle(row.phases[phase])"
            >
              <span v-if="row.phases[phase]">
                <span v-if="row.phases[phase].skipped">
                  Skipped ({{ formatDelay(row.phases[phase].delaySeconds) }})
                </span>
                <span v-else>
                  {{ formatDelay(row.phases[phase].delaySeconds) }}
                </span>
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import convertTime from "../mixins/convertTime";
import InputBox from "./foundational/InputBox.vue";

const DISPLAY_FORMAT = "ccc, MMM d yyyy h:mm:ss.S a";

export default {
  mixins: [convertTime],
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
      detectorMapInput: "",
      timeReference: "detector",
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
      detectorDefaultText:
        "Det 1\t6\nDet 2\t2\nDet 3\t0\nDet 4\t0\nDet 5\t0",
      phaseColumns: [],
      tableRows: [],
    };
  },
  computed: {
    averageDelayByPhase() {
      const averages = {};
      this.phaseColumns.forEach((phase) => {
        const delays = this.tableRows
          .map((row) => row.phases[phase])
          .filter((cell) => cell && !cell.skipped && cell.delaySeconds !== null)
          .map((cell) => cell.delaySeconds);
        if (!delays.length) {
          averages[phase] = null;
          return;
        }
        const sum = delays.reduce((total, value) => total + value, 0);
        averages[phase] = sum / delays.length;
      });
      return averages;
    },
  },
  watch: {
    timeReference() {
      if (this.tableRows.length) {
        this.processDelays();
      }
    },
  },
  methods: {
    processDelays() {
      const { detectorToPhase, phaseColumns } = this.parseDetectorMapping(
        this.detectorMapInput
      );
      this.phaseColumns = phaseColumns;
      const events = this.parseHighResData(this.inputData);
      if (!events.length || !phaseColumns.length) {
        this.tableRows = [];
        return;
      }

      const cycles = this.buildCycles(events);
      this.tableRows = cycles.map((cycle) => {
        const cycleEvents = events.filter(
          (event) => event.millis >= cycle.start && event.millis <= cycle.end
        );

        const row = {
          cycle: cycle.index,
          startTime: this.formatMillis(cycle.start),
          cycleLengthSeconds: (cycle.end - cycle.start) / 1000,
          phases: {},
        };

        phaseColumns.forEach((phase) => {
          const detectorsForPhase = Object.entries(detectorToPhase)
            .filter(([, mappedPhase]) => mappedPhase === phase)
            .map(([detector]) => Number(detector));

          const callEvent = this.findCallEvent(
            cycleEvents,
            phase,
            detectorsForPhase
          );

          if (!callEvent) {
            return;
          }

          const tCall = callEvent.millis;
          const servedEvent = this.findPhaseServedEvent(
            cycleEvents,
            phase,
            tCall
          );

          if (servedEvent) {
            row.phases[phase] = {
              delaySeconds: (servedEvent.millis - tCall) / 1000,
              skipped: false,
              tCallStart: tCall,
              tServed: servedEvent.millis,
            };
            return;
          }

          const skippedEvent = this.findPhaseEvent(
            cycleEvents,
            14,
            phase,
            tCall
          );
          if (skippedEvent) {
            row.phases[phase] = {
              delaySeconds: (skippedEvent.millis - tCall) / 1000,
              skipped: true,
              tCallStart: tCall,
              tSkipped: skippedEvent.millis,
            };
          }
        });

        return row;
      });
    },
    parseDetectorMapping(text) {
      const detectorToPhase = {};
      const phases = new Set();

      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .forEach((line) => {
          const matches = line.match(/\d+/g);
          if (!matches || matches.length < 2) {
            return;
          }
          const detector = Number(matches[0]);
          const phase = Number(matches[1]);
          if (!Number.isNaN(detector) && phase > 0) {
            detectorToPhase[detector] = phase;
            phases.add(phase);
          }
        });

      return {
        detectorToPhase,
        phaseColumns: Array.from(phases).sort((a, b) => a - b),
      };
    },
    parseHighResData(text) {
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const [timestamp, eventCode, parameter] = line.split(","
          );
          const converted = this.convertTimestamp(timestamp?.trim() || "");
          if (!converted?.MillisecFromEpoch) {
            return null;
          }
          return {
            millis: converted.MillisecFromEpoch,
            eventCode: Number(eventCode),
            parameterCode: Number(parameter),
          };
        })
        .filter((event) => event && !Number.isNaN(event.eventCode))
        .sort((a, b) => a.millis - b.millis);
    },
    buildCycles(events) {
      if (!events.length) {
        return [];
      }
      const barrierEvents = events
        .filter((event) => event.eventCode === 31)
        .map((event) => event.millis)
        .sort((a, b) => a - b);

      const firstMillis = events[0].millis;
      const lastMillis = events[events.length - 1].millis;

      if (!barrierEvents.length) {
        return [
          {
            index: 1,
            start: firstMillis,
            end: lastMillis,
          },
        ];
      }

      const cycles = [];
      let start = firstMillis;
      let index = 1;

      barrierEvents.forEach((boundary) => {
        if (boundary <= start) {
          return;
        }
        cycles.push({ index, start, end: boundary });
        start = boundary;
        index += 1;
      });

      if (start < lastMillis) {
        cycles.push({ index, start, end: lastMillis });
      }

      return cycles;
    },
    findPhaseServedEvent(events, phase, tCall) {
      const phaseOn = this.findPhaseEvent(events, 0, phase, tCall);
      if (phaseOn) {
        return phaseOn;
      }
      return this.findPhaseEvent(events, 1, phase, tCall);
    },
    findCallEvent(events, phase, detectorsForPhase) {
      if (this.timeReference === "phaseCall") {
        return this.findPhaseEvent(events, 43, phase, -Infinity);
      }
      return events.find(
        (event) =>
          event.eventCode === 82 &&
          detectorsForPhase.includes(event.parameterCode)
      );
    },
    findPhaseEvent(events, eventCode, phase, minMillis) {
      return events.find(
        (event) =>
          event.eventCode === eventCode &&
          event.parameterCode === phase &&
          event.millis >= minMillis
      );
    },
    formatMillis(millis) {
      return DateTime.fromMillis(millis).toFormat(DISPLAY_FORMAT);
    },
    formatDelay(seconds) {
      if (seconds === null || seconds === undefined) {
        return "-";
      }
      const rounded = Math.round(seconds * 10) / 10;
      return `${rounded.toFixed(1)} sec`;
    },
    cellTitle(cell) {
      if (!cell) {
        return "";
      }
      const callStart = cell.tCallStart
        ? this.formatMillis(cell.tCallStart)
        : "";
      if (cell.skipped) {
        const skippedAt = cell.tSkipped ? this.formatMillis(cell.tSkipped) : "";
        return `Call start: ${callStart}\nSkipped at: ${skippedAt}`;
      }
      const servedAt = cell.tServed ? this.formatMillis(cell.tServed) : "";
      return `Call start: ${callStart}\nServed at: ${servedAt}`;
    },
  },
};
</script>

<style scoped>
.delay-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0;
}

.delay-table-wrapper {
  overflow-x: auto;
}

.delay-table {
  width: 100%;
  border-collapse: collapse;
}

.delay-table th,
.delay-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.summary-table {
  margin-bottom: 16px;
}

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
