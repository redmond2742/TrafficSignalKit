<template>
  <div>
    <div>
      <EventLogger ref="eventLogger" />

      <v-container>
        <v-row>
          <v-col cols="12" md="6" sm="4">
            <h5>Minimum Green Time (Seconds)</h5>

            <v-number-input
              control-variant="stacked"
              :min="1"
              v-model.number="minGreen"
            >
            </v-number-input>
          </v-col>

          <v-col cols="12" md="6" sm="4">
            <h5>Maximum Green Time (Seconds)</h5>

            <v-number-input
              control-variant="stacked"
              :min="1"
              v-model.number="maxGreen"
            >
            </v-number-input>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6" sm="4">
            <h5>Phase Clock:</h5>
            <h2>
              <div v-if="isRunning">{{ phClock }}s</div>
            </h2>
          </v-col>
          <v-col cols="12" md="4" sm="4">
            <h5>Cycle Clock:</h5>
            <h2>
              <div v-if="isRunning">{{ cycleClock }}s</div>
            </h2>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
  <v-btn @click="addVehicleEB" color="light-blue-lighten-3"
    >Add Vehicle EB</v-btn
  >&nbsp;
  <v-btn @click="addVehicleSB" color="brown-lighten-3">Add Vehicle SB</v-btn
  >&nbsp;
  <v-btn @click="toggleLights(true)" color="light-green-lighten-3"
    >Toggle Lights</v-btn
  >
  <div class="intersection">
    <TrafficLight
      :adjustL="shift350px"
      :adjustT="shift270px"
      :position="posAbsolute"
      :state="sbLightState"
    />
    <VehicleLane :vehicles="vehiclesEB" />

    <TrafficLight
      :rotate="rotate90"
      :adjustL="shift410px"
      :adjustT="shift211px"
      :position="posAbsolute"
      :state="ebLightState"
    />
    <VehicleLaneVert :vehicles="vehiclesSB" />
  </div>
  <div class="large-gap"></div>
</template>

<script>
import TrafficLight from "./trafficSim/TrafficLight.vue";
import VehicleLane from "./trafficSim/VehicleLane.vue";
import VehicleLaneVert from "./trafficSim/VehicleLaneVert.vue";
import EventLogger from "./trafficSim/EventLogger.vue";

export default {
  name: "App",
  components: {
    TrafficLight,
    VehicleLane,
    VehicleLaneVert,
    EventLogger,
  },
  data() {
    return {
      isRunning: true,
      ebLightState: "red",
      sbLightState: "green",
      vehiclesEB: [],
      vehiclesSB: [],
      vehicleId: 0,
      lightInterval: null,
      vehicleInterval: null,
      vehicleVertInterval: null,
      rotate90: "rotate(90deg)",
      shift800px: "800px",
      shift300px: "300px",
      shift350px: "350px",
      shift410px: "410px",
      shift270px: "270px",
      shift211px: "211px",
      posAbsolute: "absolute",
      minGreen: 4, // Min Green of Signal
      countdown: 6, //default - not used
      timer: null,
      approachEBLightDist: 320,
      approachSBLightDist: 70,
      maxGreen: 10,
      phClock: 0,
      bothPhInCycle: false,
      cycleClock: 0,
      cycleCount: 1,
      exClock: 0,
      phExtension: 3,
      phGap: 2,
    };
  },
  methods: {
    handleInput(event) {
      this.$refs.eventLogger.addLog(
        `Terminated ${this.getActive("phaseDir")} @ ${this.phClock}: ${event}`
      );
    },
    logCycle() {
      this.$refs.eventLogger.addLog(
        `Completed Cycle ${this.cycleCount} in ${this.cycleClock} Seconds`
      );
    },
    addVehicleHV() {
      this.addVehicle();
    },
    flipFlop() {
      this.bothPhInCycle = !this.bothPhInCycle;
      return this.bothPhInCycle;
    },
    toggleLights(btn) {
      if (btn) {
        this.handleInput("Force Toggle Light Button");
      }
      this.flipFlop();
      this.toggleEBLights();
      this.toggleSBLights();

      this.resetCountdown();
    },
    getActive(element) {
      if (element === "phase") {
        if (this.phActive(this.sbLightState)) {
          return this.sbLightState;
        } else {
          return this.ebLightState;
        }
      } else if (element === "vehicles") {
        if (this.phActive(this.sbLightState)) {
          return this.vehiclesSB;
        } else {
          return this.vehiclesEB;
        }
      } else if (element === "phaseDir") {
        if (this.phActive(this.sbLightState)) {
          return "SB";
        } else {
          return "EB";
        }
      }
    },

    phActive(lightState) {
      if (lightState === "green") {
        return true;
      } else {
        return false;
      }
    },
    updateCountdown() {
      if (this.minGreen <= this.phClock) {
        if (this.exClock > 0) {
          this.phClock++;
          this.cycleClock++;
          this.exClock--;
        } else if (
          (this.phActive(this.sbLightState) &&
            this.vehiclePresent(this.vehiclesEB)) ||
          (this.phActive(this.ebLightState) &&
            this.vehiclePresent(this.vehiclesSB))
        ) {
          if (this.phClock < this.maxGreen) {
            if (this.vehiclePresent(this.getActive("vehicles"))) {
              this.phClock++;
              this.cycleClock++;
            } else {
              console.log("GAPPING OUT");
              this.handleInput("gapping out");
              this.toggleLights();
            }
          } else {
            console.log("MAXING OUT");
            this.handleInput("Maxing out");
            this.toggleLights();
          }
        } else {
          this.phClock++;
          this.cycleClock++;
        }
      } else {
        this.phClock++;
        this.cycleClock++;
      }
    },
    resetCountdown() {
      this.countdown = this.minGreen;
      this.phClock = 0;
      if (this.bothPhInCycle) {
        this.logCycle();
        this.cycleClock = 0;
        this.cycleCount++;
      }
    },
    toggleEBLights() {
      this.ebLightState = this.ebLightState === "red" ? "green" : "red";
    },
    toggleSBLights() {
      this.sbLightState = this.sbLightState === "red" ? "green" : "red";
    },
    addVehicleEB() {
      this.vehiclesEB.push({ id: this.vehicleId++, position: 0, appr: true });
    },
    addVehicleSB() {
      this.vehiclesSB.push({ id: this.vehicleId++, position: 0, appr: true });
    },
    vehiclePresent(vehList) {
      let presentVeh = false;
      vehList.forEach((v) => {
        presentVeh = v.appr;
      });
      return presentVeh;
    },
    //EB vehicles
    moveVehicles() {
      setInterval(() => {
        this.vehiclesEB.forEach((vehicle) => {
          if (
            this.ebLightState === "green" &&
            vehicle.position < this.approachEBLightDist
          ) {
            vehicle.position += 5;
          } else if (vehicle.position >= this.approachEBLightDist) {
            vehicle.position += 5;
            if (vehicle.appr) {
              vehicle.appr = false;
            }
          }
        });
        this.vehiclesEB = this.vehiclesEB.filter(
          (vehicle) => vehicle.position < this.approachEBLightDist * 2
        );
      }, 100);
    },
    //SB Vehicles
    moveVehiclesVert() {
      setInterval(() => {
        this.vehiclesSB.forEach((vehicle) => {
          if (
            this.sbLightState === "green" &&
            vehicle.position < this.approachSBLightDist
          ) {
            vehicle.position += 5;
          } else if (vehicle.position >= this.approachSBLightDist) {
            vehicle.position += 5;
            if (vehicle.appr) {
              vehicle.appr = false;
            }
          }
        });

        this.vehiclesSB = this.vehiclesSB.filter(
          (vehicle) => vehicle.position < 450
        );
      }, 100);
    },
  },
  mounted() {
    this.timer = setInterval(this.updateCountdown, 1000);

    this.moveVehicles();
    this.moveVehiclesVert();
  },
  beforeUpdate() {
    clearInterval(this.lightInterval);
    clearInterval(this.vehicleInterval);
    clearInterval(this.vehicleVertInterval);
  },
};
</script>

<style>
#app {
  text-align: center;
  padding: 20px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.intersection {
  position: relative;
  width: 500px;
  height: 200px;
  margin: 0 auto;
}

#app {
  background-color: rgb(255, 255, 255);
}

#input-usage .v-input__prepend-outer,
#input-usage .v-input__append-outer,
#input-usage .v-input__slot,
#input-usage .v-messages {
  border: 1px dashed rgba(0, 0, 0, 0.4);
}
.large-gap {
  margin-top: 500px; /* Adjust the value as needed */
}
</style>
