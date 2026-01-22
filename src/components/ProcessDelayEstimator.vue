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
      <v-btn @click="processDelays" color="primary">Process</v-btn>
      <div class="vehicle-count-controls">
        <div class="vehicle-count-toggle">
          <span class="control-label">Vehicle count events</span>
          <v-btn-toggle
            v-model="vehicleCountMode"
            color="primary"
            mandatory
            density="compact"
          >
            <v-btn value="off">Off (81)</v-btn>
            <v-btn value="on">On (82)</v-btn>
          </v-btn-toggle>
        </div>
        <div class="vehicle-count-toggle">
          <v-switch
            v-model="useExperimentalEstimate"
            color="primary"
            label="Experimental estimate (active time)"
            density="compact"
          ></v-switch>
          <v-text-field
            v-if="useExperimentalEstimate"
            v-model.number="secondsPerVehicle"
            label="Seconds per vehicle"
            type="number"
            min="0.1"
            step="0.1"
            hide-details
            density="compact"
          ></v-text-field>
        </div>
      </div>
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
            <td>Vehicle Avg Delay</td>
            <td
              v-for="phase in phaseColumns"
              :key="`summary-vehicle-average-${phase}`"
            >
              <span v-if="averageVehicleDelayByPhase[phase] !== null">
                {{ formatDelay(averageVehicleDelayByPhase[phase]) }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
          <tr>
            <td>{{ vehicleCountLabel }}</td>
            <td
              v-for="phase in phaseColumns"
              :key="`summary-vehicle-count-${phase}`"
            >
              <span v-if="vehicleCountsByPhase[phase] !== null">
                {{ vehicleCountsByPhase[phase] }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Vehicle Phase Delays</h3>
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

      <div v-if="hasPedestrianData" class="delay-table-wrapper">
        <h3>Pedestrian Phase Delays</h3>
        <table class="delay-table">
          <thead>
            <tr>
              <th>Cycle #</th>
              <th>Cycle Start</th>
              <th>Cycle Length</th>
              <th v-for="phase in phaseColumns" :key="`ped-phase-${phase}`">
                Ped Phase {{ phase }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pedTableRows" :key="`ped-cycle-${row.cycle}`">
              <td>{{ row.cycle }}</td>
              <td>{{ row.startTime }}</td>
              <td>{{ formatDelay(row.cycleLengthSeconds) }}</td>
              <td
                v-for="phase in phaseColumns"
                :key="`ped-cycle-${row.cycle}-phase-${phase}`"
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
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
      detectorDefaultText:
        "Det 1\t6\nDet 2\t2\nDet 3\t0\nDet 4\t0\nDet 5\t0",
      phaseColumns: [],
      tableRows: [],
      pedTableRows: [],
      vehicleCountsByPhase: {},
      vehicleCountMode: "off",
      useExperimentalEstimate: false,
      secondsPerVehicle: 2,
    };
  },
  computed: {
    vehicleCountLabel() {
      const eventLabel =
        this.vehicleCountMode === "on" ? "Detector On (82)" : "Detector Off (81)";
      if (this.useExperimentalEstimate) {
        return `Estimated Vehicles (Experimental, ${eventLabel})`;
      }
      return `Estimated Vehicles (${eventLabel})`;
    },
    averageVehicleDelayByPhase() {
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
    hasPedestrianData() {
      return this.pedTableRows.some((row) =>
        Object.values(row.phases).some((cell) => cell)
      );
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
        this.pedTableRows = [];
        this.vehicleCountsByPhase = {};
        return;
      }

      const cycles = this.buildCycles(events, phaseColumns);
      const vehicleRows = [];
      const pedRows = [];
      const lastMillis = events[events.length - 1].millis;

      const vehicleCountsByPhase = {};

      const lastCycle = cycles[cycles.length - 1];

      cycles.forEach((cycle) => {
        const cycleEvents = events.filter(
          (event) => event.millis >= cycle.start && event.millis <= cycle.end
        );
        const filteredCycleEvents =
          cycle === lastCycle
            ? cycleEvents
            : cycleEvents.filter((event) => event.millis < cycle.end);

        const vehicleRow = {
          cycle: cycle.index,
          startTime: this.formatMillis(cycle.start),
          cycleLengthSeconds: (cycle.end - cycle.start) / 1000,
          phases: {},
        };

        const pedRow = {
          cycle: cycle.index,
          startTime: this.formatMillis(cycle.start),
          cycleLengthSeconds: (cycle.end - cycle.start) / 1000,
          phases: {},
        };

        phaseColumns.forEach((phase) => {
          const detectorsForPhase = Object.entries(detectorToPhase)
            .filter(([, mappedPhase]) => mappedPhase === phase)
            .map(([detector]) => Number(detector));

          this.populateDelayCell(
            vehicleRow.phases,
            phase,
            this.findDetectorCallEvent(
              filteredCycleEvents,
              detectorsForPhase,
              82
            ),
            filteredCycleEvents
          );

          this.populateDelayCell(
            pedRow.phases,
            phase,
            this.findDetectorCallEvent(
              filteredCycleEvents,
              detectorsForPhase,
              90
            ),
            filteredCycleEvents
          );

          if (vehicleCountsByPhase[phase] === undefined) {
            const vehicleCountEventCode =
              this.vehicleCountMode === "on" ? 82 : 81;
            vehicleCountsByPhase[phase] = detectorsForPhase.length
              ? this.calculateVehicleCounts(
                  events,
                  detectorsForPhase,
                  this.buildGreenIntervals(events, phase, lastMillis),
                  vehicleCountEventCode,
                  lastMillis
                )
              : null;
          }
        });

        vehicleRows.push(vehicleRow);
        pedRows.push(pedRow);
      });

      this.tableRows = vehicleRows;
      this.pedTableRows = pedRows;
      this.vehicleCountsByPhase = vehicleCountsByPhase;
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
          const [timestamp, eventCode, parameter] = line.split(",");
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
    buildCycles(events, phaseColumns) {
      if (!events.length) {
        return [];
      }
      const firstMillis = events[0].millis;
      const lastMillis = events[events.length - 1].millis;
      const phases = new Set(phaseColumns);

      const phaseServiceEvents = events
        .filter(
          (event) =>
            phases.has(event.parameterCode) &&
            [0, 1].includes(event.eventCode)
        )
        .sort((a, b) => a.millis - b.millis);

      if (!phaseServiceEvents.length) {
        return [
          {
            index: 1,
            start: firstMillis,
            end: lastMillis,
          },
        ];
      }

      const preferredEventCode = phaseServiceEvents.some(
        (event) => event.eventCode === 1
      )
        ? 1
        : 0;

      const filteredServiceEvents = phaseServiceEvents.filter(
        (event) => event.eventCode === preferredEventCode
      );

      if (!filteredServiceEvents.length) {
        return [
          {
            index: 1,
            start: firstMillis,
            end: lastMillis,
          },
        ];
      }

      const cycles = [];
      let index = 1;
      let start = filteredServiceEvents[0].millis;
      let servedPhases = new Set([filteredServiceEvents[0].parameterCode]);

      filteredServiceEvents.slice(1).forEach((event) => {
        if (servedPhases.has(event.parameterCode)) {
          if (event.millis > start) {
            cycles.push({ index, start, end: event.millis });
            index += 1;
            start = event.millis;
            servedPhases = new Set([event.parameterCode]);
          }
          return;
        }
        servedPhases.add(event.parameterCode);
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
    findDetectorCallEvent(events, detectorsForPhase, eventCode) {
      if (!detectorsForPhase.length) {
        return null;
      }
      return events.find(
        (event) =>
          event.eventCode === eventCode &&
          detectorsForPhase.includes(event.parameterCode)
      );
    },
    populateDelayCell(phaseCells, phase, callEvent, cycleEvents) {
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
        phaseCells[phase] = {
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
        phaseCells[phase] = {
          delaySeconds: (skippedEvent.millis - tCall) / 1000,
          skipped: true,
          tCallStart: tCall,
          tSkipped: skippedEvent.millis,
        };
      }
    },
    findPhaseEvent(events, eventCode, phase, minMillis) {
      return events.find(
        (event) =>
          event.eventCode === eventCode &&
          event.parameterCode === phase &&
          event.millis >= minMillis
      );
    },
    buildGreenIntervals(events, phase, fallbackEnd) {
      const phaseEvents = events.filter(
        (event) => event.parameterCode === phase
      );
      const intervals = [];

      phaseEvents
        .filter((event) => event.eventCode === 1)
        .forEach((startEvent) => {
          const endEvent = phaseEvents.find(
            (event) =>
              event.millis > startEvent.millis &&
              [7, 8, 12].includes(event.eventCode)
          );
          const end = endEvent ? endEvent.millis : fallbackEnd;
          if (end !== undefined && end >= startEvent.millis) {
            intervals.push({ start: startEvent.millis, end });
          }
        });

      return intervals;
    },
    calculateVehicleCounts(
      events,
      detectorsForPhase,
      intervals,
      eventCode,
      lastMillis
    ) {
      if (this.useExperimentalEstimate) {
        return this.estimateVehiclesByActiveTime(
          events,
          detectorsForPhase,
          intervals,
          eventCode,
          lastMillis,
          this.secondsPerVehicle
        );
      }
      return this.countDetectorEventsDuringGreen(
        events,
        detectorsForPhase,
        intervals,
        eventCode
      );
    },
    countDetectorEventsDuringGreen(events, detectorsForPhase, intervals, eventCode) {
      if (!intervals.length) {
        return 0;
      }
      return detectorsForPhase.reduce((total, detector) => {
        const detectorEvents = events.filter(
          (event) =>
            event.eventCode === eventCode && event.parameterCode === detector
        );

        const detectorTotal = detectorEvents.reduce(
          (count, event) =>
            count +
            (intervals.some(
              (interval) =>
                event.millis >= interval.start && event.millis <= interval.end
            )
              ? 1
              : 0),
          0
        );
        return total + detectorTotal;
      }, 0);
    },
    estimateVehiclesByActiveTime(
      events,
      detectorsForPhase,
      greenIntervals,
      startEventCode,
      lastMillis,
      secondsPerVehicle
    ) {
      if (!greenIntervals.length || !secondsPerVehicle) {
        return 0;
      }
      const endEventCode = startEventCode === 82 ? 81 : 82;
      const totalActiveMillis = detectorsForPhase.reduce((total, detector) => {
        let activeStart = null;
        const activeIntervals = [];

        events
          .filter(
            (event) =>
              event.parameterCode === detector &&
              [startEventCode, endEventCode].includes(event.eventCode)
          )
          .forEach((event) => {
            if (event.eventCode === startEventCode) {
              activeStart = event.millis;
              return;
            }
            if (activeStart !== null && event.millis >= activeStart) {
              activeIntervals.push({ start: activeStart, end: event.millis });
              activeStart = null;
            }
          });

        if (activeStart !== null) {
          activeIntervals.push({ start: activeStart, end: lastMillis });
        }

        const detectorActiveMillis = activeIntervals.reduce((sum, interval) => {
          const overlap = greenIntervals.reduce((greenSum, greenInterval) => {
            const overlapStart = Math.max(interval.start, greenInterval.start);
            const overlapEnd = Math.min(interval.end, greenInterval.end);
            return (
              greenSum +
              (overlapEnd > overlapStart ? overlapEnd - overlapStart : 0)
            );
          }, 0);
          return sum + overlap;
        }, 0);

        return total + detectorActiveMillis;
      }, 0);

      const totalActiveSeconds = totalActiveMillis / 1000;
      return Math.round(totalActiveSeconds / secondsPerVehicle);
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

.vehicle-count-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.vehicle-count-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.control-label {
  font-weight: 600;
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
