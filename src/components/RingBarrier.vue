<template>
  <div class="cycle-length">
    <v-row justify="center">
      <h3>Desired Cycle Length (seconds):</h3>
    </v-row>
    <v-row justify="center">
      <v-col cols="3">
        <v-responsive max-width="200">
          <v-text-field
            class="mt-2"
            auto-grow
            variant="outlined"
            counter="number"
            :rules="[(v) => /^-?\d+$/.test(v)]"
            row-height="15"
            v-model="desiredCL"
            placeholder="desired cycle length (sec)"
          >
          </v-text-field>
        </v-responsive>
      </v-col>
      <v-col cols="4">
        <br />
        <v-slider
          v-model="desiredCL"
          :min="0"
          :max="500"
          :step="1"
          thumb-label
        ></v-slider>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-btn color="primary" variant="outlined" @click="distributeEvenly">
        Evenly Distribute
      </v-btn>

      &nbsp;&nbsp;&nbsp;
      <v-btn color="success" variant="outlined" @click="distribute2080on26">
        20%/80% Distribution
      </v-btn>
    </v-row>
  </div>

  <br />
  <hr />
  <br />
  <br />

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

  <br />
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
  },
  methods: {
    r1p1(phase) {
      this.r1ph1 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r1p2(phase) {
      this.r1ph2 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r1p3(phase) {
      this.r1ph3 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r1p4(phase) {
      this.r1ph4 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r2p1(phase) {
      this.r2ph1 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r2p2(phase) {
      this.r2ph2 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r2p3(phase) {
      this.r2ph3 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    r2p4(phase) {
      this.r2ph4 = phase;
      console.log("changed CL: " + this.cyclelength);
    },
    distributeEvenly() {
      this.r1ph1 = this.r1ph2 = this.r1ph3 = this.r1ph4 = this.desiredCL / 4;
      this.r2ph1 = this.r2ph2 = this.r2ph3 = this.r2ph4 = this.desiredCL / 4;
    },
    distribute2080on26() {
      var cl20 = this.desiredCL * 0.1;
      var cl80 = this.desiredCL * 0.4;
      this.r1ph1 = this.r1ph3 = this.r2ph1 = this.r2ph3 = cl20;
      this.r1ph2 = this.r1ph4 = this.r2ph2 = this.r2ph4 = cl80;
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
</style>
