<template>
  <v-container class="pa-4 split-calculator">
    <v-card class="mb-6" elevation="3">
      <v-card-title class="d-flex flex-column flex-md-row align-start">
        <div class="flex-grow-1">
          <h2 class="text-h5 mb-1">Cycle Controls</h2>
          <div class="text-subtitle-2">
            Set the desired cycle length and review ring totals at a glance.
          </div>
        </div>
        <v-chip
          class="mt-3 mt-md-0"
          color="primary"
          variant="tonal"
          size="large"
        >
          Full Cycle: {{ fullCycleLength }}s
        </v-chip>
      </v-card-title>
      <v-card-text>
        <v-row align="center" justify="center" class="mb-4">
          <v-col cols="12" md="3">
            <v-text-field
              class="mt-2"
              auto-grow
              variant="outlined"
              counter="number"
              :rules="[(v) => /^-?\\d+$/.test(v)]"
              row-height="15"
              v-model="desiredCL"
              label="Desired cycle length (sec)"
            >
            </v-text-field>
          </v-col>
          <v-col cols="12" md="5">
            <v-slider
              v-model="desiredCL"
              :min="0"
              :max="500"
              :step="1"
              thumb-label
            ></v-slider>
          </v-col>
          <v-col cols="12" md="4" class="text-center">
            <v-btn
              color="primary"
              variant="outlined"
              class="ma-1"
              @click="distributeEvenly"
            >
              Evenly Distribute
            </v-btn>
            <v-btn
              color="success"
              variant="outlined"
              class="ma-1"
              @click="distribute2080on26"
            >
              20%/80% Distribution
            </v-btn>
            <v-btn
              color="info"
              variant="outlined"
              class="ma-1"
              @click="syncDesiredToFullCycle"
            >
              Use Full Cycle
            </v-btn>
          </v-col>
        </v-row>
        <v-row class="text-center">
          <v-col cols="12" md="3">
            <v-sheet class="pa-3 summary-tile">
              <div class="text-caption">Ring 1 Total</div>
              <div class="text-h6">{{ ring1CL }}s</div>
            </v-sheet>
          </v-col>
          <v-col cols="12" md="3">
            <v-sheet class="pa-3 summary-tile">
              <div class="text-caption">Ring 2 Total</div>
              <div class="text-h6">{{ ring2CL }}s</div>
            </v-sheet>
          </v-col>
          <v-col cols="12" md="3">
            <v-sheet class="pa-3 summary-tile">
              <div class="text-caption">Full Cycle Difference</div>
              <div class="text-h6">
                {{ fullCycleDifference }}s
              </div>
            </v-sheet>
          </v-col>
          <v-col cols="12" md="3">
            <v-sheet class="pa-3 summary-tile">
              <div class="text-caption">Desired Cycle</div>
              <div class="text-h6">{{ desiredCL }}s</div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-6" elevation="2">
      <v-card-title>
        <div>
          <h3 class="text-h6 mb-1">Current Status</h3>
          <div class="text-subtitle-2">
            Paste split values to load the current state, then set the baseline
            to start logging changes.
          </div>
        </div>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="7">
            <v-textarea
              v-model="currentStatusInput"
              label="Paste current status values (ex: 10 15 10 15 10 15 10 15)"
              rows="2"
              auto-grow
              variant="outlined"
            ></v-textarea>
          </v-col>
          <v-col cols="12" md="5" class="d-flex flex-column justify-center">
            <v-btn
              color="primary"
              variant="outlined"
              class="mb-2"
              @click="applyCurrentStatus"
            >
              Apply Pasted Status
            </v-btn>
            <v-btn
              color="success"
              variant="outlined"
              @click="setCurrentStatus"
            >
              Set Current Status &amp; Start Log
            </v-btn>
          </v-col>
        </v-row>
        <v-alert
          v-if="statusError"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ statusError }}
        </v-alert>
        <v-alert v-if="statusMessage" type="success" variant="tonal">
          {{ statusMessage }}
        </v-alert>
        <div class="mt-4 text-subtitle-2">
          Current Snapshot:
          <span class="font-weight-medium">{{ currentSnapshot }}</span>
        </div>
        <div class="text-subtitle-2">
          Baseline Snapshot:
          <span class="font-weight-medium">{{ baselineSnapshot }}</span>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-6" elevation="2">
      <v-card-title>
        <h3 class="text-h6">Change Log</h3>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-left">Step</th>
              <th class="text-left">Time</th>
              <th class="text-left">Change</th>
              <th class="text-left">From</th>
              <th class="text-left">To</th>
              <th class="text-left">Ring 1</th>
              <th class="text-left">Ring 2</th>
              <th class="text-left">Full Cycle</th>
              <th class="text-left">Snapshot</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="statusLog.length === 0">
              <td colspan="9" class="text-center text-medium-emphasis">
                Set the current status to begin logging updates.
              </td>
            </tr>
            <tr v-for="entry in statusLog" :key="entry.id">
              <td>{{ entry.id }}</td>
              <td>{{ entry.time }}</td>
              <td>{{ entry.label }}</td>
              <td>{{ entry.from }}</td>
              <td>{{ entry.to }}</td>
              <td>{{ entry.ring1CL }}</td>
              <td>{{ entry.ring2CL }}</td>
              <td>{{ entry.fullCycleLength }}</td>
              <td>{{ entry.snapshot }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

  <!-- First Ring-->
  <v-table density="compact">
    <thead>
      <tr>
        <th colspan="6" class="text-center add-border table-blue-background">
          Ring 1
        </th>

        <th colspan="1" class="text-center add-border table-grey-background">
          Totals
        </th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r1p1"
            :propSplitCount="r1ph1"
          ></PhaseBox>
        </td>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r1p2"
            :propSplitCount="r1ph2"
          ></PhaseBox>
        </td>
        <td class="black add-slim"></td>

        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r1p3"
            :propSplitCount="r1ph3"
          ></PhaseBox>
        </td>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r1p4"
            :propSplitCount="r1ph4"
          ></PhaseBox>
        </td>
        <td class="black add-slim"></td>

        <td
          class="add-border add-display-text text-center table-grey-background"
        >
          <h2 v-if="r1clDifference > 0">
            {{ ring1CL }} / +{{ r1clDifference }}
          </h2>
          <h2 v-else-if="r1clDifference < 0">
            {{ ring1CL }} / {{ r1clDifference }}
          </h2>
          <h2 v-else>{{ ring1CL }}</h2>
        </td>
      </tr>
      <tr>
        <td colspan="2" class="text-center add-border table-grey-background">
          <h3>{{ r1b1Sum }}</h3>
        </td>
        <td colspan="1" class="black add-slim"></td>
        <td colspan="2" class="text-center add-border table-grey-background">
          <h3>{{ r1b2Sum }}</h3>
        </td>
        <td colspan="1" class="black add-slim"></td>
      </tr>
    </tbody>
  </v-table>

  <!-- Second Ring-->
  <v-table density="compact">
    <thead>
      <tr>
        <th colspan="6" class="text-center add-border table-blue-background">
          Ring 2
        </th>

        <th colspan="1" class="text-center add-border table-grey-background">
          Totals
        </th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r2p1"
            :propSplitCount="r2ph1"
          ></PhaseBox>
        </td>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r2p2"
            :propSplitCount="r2ph2"
          ></PhaseBox>
        </td>
        <td class="black add-slim"></td>

        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r2p3"
            :propSplitCount="r2ph3"
          ></PhaseBox>
        </td>
        <td class="add-border">
          <PhaseBox
            v-model="propSplitCount"
            @changedCL="r2p4"
            :propSplitCount="r2ph4"
          ></PhaseBox>
        </td>
        <td class="black add-slim"></td>

        <td
          class="add-border add-display-text text-center table-grey-background"
        >
          <h2 v-if="r2clDifference > 0">
            {{ ring2CL }} / +{{ r2clDifference }}
          </h2>
          <h2 v-else-if="r2clDifference < 0">
            {{ ring2CL }} / {{ r2clDifference }}
          </h2>
          <h2 v-else>{{ ring2CL }}</h2>
        </td>
      </tr>
    </tbody>
  </v-table>

  <!-- Second Ring-->
  <v-table density="compact">
    <tbody>
      <tr>
        <td colspan="2" class="text-center add-border table-grey-background">
          <h3>{{ r2b1Sum }}</h3>
        </td>

        <td colspan="1" class="black add-slim"></td>

        <td colspan="2" class="text-center add-border table-grey-background">
          <h3>{{ r2b2Sum }}</h3>
        </td>

        <td class="black add-slim"></td>

        <td class="add-border add-display-text text-center">
          <h3>{{ r1r2Difference }}</h3>
        </td>
      </tr>
    </tbody>
  </v-table>

  </v-container>
</template>

<script>
export default {
  name: "app",
  data() {
    return {
      propSplitCount: 10,
      desiredCL: 80,
      r1ph1: 20,
      r1ph2: 20,
      r1ph3: 20,
      r1ph4: 20,
      r2ph1: 20,
      r2ph2: 20,
      r2ph3: 20,
      r2ph4: 20,
      minValue: 0,
      maxValue: 0,
      cl20: 0,
      cl80: 0,
      currentStatusInput: "",
      currentStatusSet: false,
      baselineStatus: null,
      statusLog: [],
      statusMessage: "",
      statusError: "",
    };
  },
  computed: {
    cyclelength() {
      return this.r1ph1 + this.r1ph2 + this.r1ph3 + this.r1ph4;
    },
    ring1CL() {
      return this.r1ph1 + this.r1ph2 + this.r1ph3 + this.r1ph4;
    },
    ring2CL() {
      return this.r2ph1 + this.r2ph2 + this.r2ph3 + this.r2ph4;
    },
    r1clDifference() {
      return this.ring1CL - this.desiredCL;
    },
    r2clDifference() {
      return this.ring2CL - this.desiredCL;
    },
    r1b1Sum() {
      return this.r1ph1 + this.r1ph2;
    },
    r1b2Sum() {
      return this.r1ph3 + this.r1ph4;
    },
    r2b1Sum() {
      return this.r2ph1 + this.r2ph2;
    },
    r2b2Sum() {
      return this.r2ph3 + this.r2ph4;
    },
    r1r2Difference() {
      this.minValue = Math.min(this.r1clDifference, this.r2clDifference);
      this.maxValue = Math.max(this.r1clDifference, this.r2clDifference);
      if (Math.abs(this.minValue) <= Math.abs(this.maxValue)) {
        return this.maxValue;
        console.log(this.minValue);
      } else {
        return this.minValue;
      }
    },
    fullCycleLength() {
      return Math.max(this.ring1CL, this.ring2CL);
    },
    fullCycleDifference() {
      return this.fullCycleLength - this.desiredCL;
    },
    currentSnapshot() {
      return this.snapshotString();
    },
    baselineSnapshot() {
      if (!this.baselineStatus) {
        return "Not set";
      }
      return this.formatSnapshot(this.baselineStatus);
    },
  },
  methods: {
    r1p1(phase) {
      this.setPhaseValue("r1ph1", phase, "Ring 1 - Phase 1");
    },
    r1p2(phase) {
      this.setPhaseValue("r1ph2", phase, "Ring 1 - Phase 2");
    },
    r1p3(phase) {
      this.setPhaseValue("r1ph3", phase, "Ring 1 - Phase 3");
    },
    r1p4(phase) {
      this.setPhaseValue("r1ph4", phase, "Ring 1 - Phase 4");
    },
    r2p1(phase) {
      this.setPhaseValue("r2ph1", phase, "Ring 2 - Phase 5");
    },
    r2p2(phase) {
      this.setPhaseValue("r2ph2", phase, "Ring 2 - Phase 6");
    },
    r2p3(phase) {
      this.setPhaseValue("r2ph3", phase, "Ring 2 - Phase 7");
    },
    r2p4(phase) {
      this.setPhaseValue("r2ph4", phase, "Ring 2 - Phase 8");
    },
    distributeEvenly() {
      const value = this.desiredCL / 4;
      this.setPhaseValue("r1ph1", value, "Ring 1 - Phase 1");
      this.setPhaseValue("r1ph2", value, "Ring 1 - Phase 2");
      this.setPhaseValue("r1ph3", value, "Ring 1 - Phase 3");
      this.setPhaseValue("r1ph4", value, "Ring 1 - Phase 4");
      this.setPhaseValue("r2ph1", value, "Ring 2 - Phase 5");
      this.setPhaseValue("r2ph2", value, "Ring 2 - Phase 6");
      this.setPhaseValue("r2ph3", value, "Ring 2 - Phase 7");
      this.setPhaseValue("r2ph4", value, "Ring 2 - Phase 8");
    },
    distribute2080on26() {
      const cl20 = this.desiredCL * 0.1;
      const cl80 = this.desiredCL * 0.4;
      this.setPhaseValue("r1ph1", cl20, "Ring 1 - Phase 1");
      this.setPhaseValue("r1ph3", cl20, "Ring 1 - Phase 3");
      this.setPhaseValue("r2ph1", cl20, "Ring 2 - Phase 5");
      this.setPhaseValue("r2ph3", cl20, "Ring 2 - Phase 7");
      this.setPhaseValue("r1ph2", cl80, "Ring 1 - Phase 2");
      this.setPhaseValue("r1ph4", cl80, "Ring 1 - Phase 4");
      this.setPhaseValue("r2ph2", cl80, "Ring 2 - Phase 6");
      this.setPhaseValue("r2ph4", cl80, "Ring 2 - Phase 8");
    },
    syncDesiredToFullCycle() {
      this.desiredCL = this.fullCycleLength;
    },
    setPhaseValue(key, value, label) {
      const previous = this[key];
      if (previous === value) {
        return;
      }
      this[key] = value;
      this.recordStatusChange(label, previous, value);
    },
    applyCurrentStatus() {
      this.statusError = "";
      this.statusMessage = "";
      const values = this.parseSplitValues(this.currentStatusInput);
      if (values.length < 8) {
        this.statusError =
          "Please paste 8 numeric values to populate both rings.";
        return;
      }
      const [r1ph1, r1ph2, r1ph3, r1ph4, r2ph1, r2ph2, r2ph3, r2ph4] =
        values.slice(0, 8);
      this.r1ph1 = r1ph1;
      this.r1ph2 = r1ph2;
      this.r1ph3 = r1ph3;
      this.r1ph4 = r1ph4;
      this.r2ph1 = r2ph1;
      this.r2ph2 = r2ph2;
      this.r2ph3 = r2ph3;
      this.r2ph4 = r2ph4;
      this.currentStatusSet = false;
      this.baselineStatus = null;
      this.statusLog = [];
      this.statusMessage = "Current status values applied.";
    },
    setCurrentStatus() {
      this.currentStatusSet = true;
      this.baselineStatus = this.captureStatus();
      this.statusLog = [];
      this.statusMessage = "Current status set. Logging new changes.";
      this.statusError = "";
    },
    recordStatusChange(label, from, to) {
      if (!this.currentStatusSet) {
        return;
      }
      this.statusLog.push({
        id: this.statusLog.length + 1,
        time: new Date().toLocaleTimeString(),
        label,
        from,
        to,
        ring1CL: this.ring1CL,
        ring2CL: this.ring2CL,
        fullCycleLength: this.fullCycleLength,
        snapshot: this.snapshotString(),
      });
    },
    parseSplitValues(input) {
      return input
        .split(/[\s,]+/)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));
    },
    captureStatus() {
      return {
        r1ph1: this.r1ph1,
        r1ph2: this.r1ph2,
        r1ph3: this.r1ph3,
        r1ph4: this.r1ph4,
        r2ph1: this.r2ph1,
        r2ph2: this.r2ph2,
        r2ph3: this.r2ph3,
        r2ph4: this.r2ph4,
      };
    },
    formatSnapshot(status) {
      return [
        status.r1ph1,
        status.r1ph2,
        status.r1ph3,
        status.r1ph4,
        status.r2ph1,
        status.r2ph2,
        status.r2ph3,
        status.r2ph4,
      ].join(" / ");
    },
    snapshotString() {
      return this.formatSnapshot(this.captureStatus());
    },
  },
};
</script>

<style>
.h1-center-text {
  text-align: center;
}
.text-green {
  color: green;
}

.text-red {
  color: red;
}
.text-column {
  margin-top: 92px; /* Adjust the value as needed */
}

table {
  border-collapse: collapse;
  border: 1px solid black;
}
.add-border {
  padding: 20px;
  border: 2px solid black;
}
.add-slim {
  width: 20px;
  border: 2px solid black;
}
.add-display-text {
  width: 100px;
}
.black {
  background-color: #000000;
}
.yellow {
  background-color: #ffdb64;
}
.orange {
  background-color: #f58326;
}
.blue {
  background-color: #85b1de;
}
.table-blue-background {
  background-color: #d2e2f3;
}
.table-grey-background {
  background-color: #d0d0d0;
}
.split-calculator .summary-tile {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
</style>
