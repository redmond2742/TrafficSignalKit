<template>
  <div class="simulator">
    <v-card class="control-card" elevation="3">
      <v-card-title>Signal Controls</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <h5>Minimum Green Time (Seconds)</h5>
            <v-number-input
              control-variant="stacked"
              :min="1"
              v-model.number="minGreen"
            />
          </v-col>

          <v-col cols="12" md="6">
            <h5>Maximum Green Time (Seconds)</h5>
            <v-number-input
              control-variant="stacked"
              :min="1"
              v-model.number="maxGreen"
            />
          </v-col>
        </v-row>
        <v-row class="sim-actions" align="center">
          <v-col cols="12" md="8">
            <div class="button-row">
              <v-btn
                @click="addVehicleEB"
                color="light-blue-lighten-3"
                variant="elevated"
              >
                Add Vehicle EB
              </v-btn>
              <v-btn
                @click="addVehicleSB"
                color="brown-lighten-3"
                variant="elevated"
              >
                Add Vehicle SB
              </v-btn>
              <v-btn
                @click="toggleLights(true)"
                color="light-green-lighten-3"
                variant="elevated"
              >
                Toggle Lights
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="chip-row">
              <v-chip color="primary" variant="tonal">
                Active Phase: {{ getActive("phaseDir") }}
              </v-chip>
              <v-chip color="secondary" variant="tonal">
                Cycle {{ cycleCount }}
              </v-chip>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row class="stats-row" dense>
      <v-col cols="12" md="4">
        <v-card class="stat-card" elevation="2">
          <v-card-title>Phase Clock</v-card-title>
          <v-card-text class="stat-card__value">
            <span v-if="isRunning">{{ phClock }}s</span>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="stat-card" elevation="2">
          <v-card-title>Cycle Clock</v-card-title>
          <v-card-text class="stat-card__value">
            <span v-if="isRunning">{{ cycleClock }}s</span>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="stat-card" elevation="2">
          <v-card-title>Extension Gap</v-card-title>
          <v-card-text class="stat-card__value">
            <span>{{ phGap }}s</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="sim-layout" dense>
      <v-col cols="12" md="7">
        <v-card class="stage-card" elevation="3">
          <v-card-title>Intersection View</v-card-title>
          <v-card-text>
            <div class="intersection-stage">
              <div class="road road--horizontal"></div>
              <div class="road road--vertical"></div>
              <div class="crosswalk crosswalk--horizontal"></div>
              <div class="crosswalk crosswalk--vertical"></div>
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
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card class="log-card" elevation="3">
          <v-card-title>Event History</v-card-title>
          <v-card-text>
            <EventLogger ref="eventLogger" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
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

.simulator {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-card,
.stage-card,
.log-card,
.stat-card {
  border-radius: 18px;
}

.sim-actions {
  margin-top: 8px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.chip-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.stats-row {
  margin-top: 4px;
}

.stat-card__value {
  font-size: 1.6rem;
  font-weight: 600;
}

.intersection-stage {
  position: relative;
  background: linear-gradient(180deg, #f4f7fb 0%, #e7edf5 100%);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;
  min-height: 320px;
}

.road {
  position: absolute;
  background: #3b3f46;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.05);
}

.road--horizontal {
  top: 50%;
  left: -10%;
  width: 120%;
  height: 90px;
  transform: translateY(-50%);
  border-radius: 8px;
}

.road--vertical {
  left: 50%;
  top: -10%;
  width: 90px;
  height: 120%;
  transform: translateX(-50%);
  border-radius: 8px;
}

.crosswalk {
  position: absolute;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0.8) 10px,
    transparent 10px,
    transparent 18px
  );
  opacity: 0.6;
}

.crosswalk--horizontal {
  width: 120px;
  height: 16px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60px);
}

.crosswalk--vertical {
  width: 16px;
  height: 120px;
  top: 50%;
  left: 50%;
  transform: translate(45px, -50%);
}
</style>
