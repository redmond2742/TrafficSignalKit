<template>
  <v-container>
    <div class="form-container background-color">
      <form @submit.prevent="handleSubmit">
        <h3>Detector Channel Input Data</h3>
        <v-col>
          <v-row>
            <v-col>
              <div class="form-group">
                <v-text-field
                  label="Descriptive Name"
                  v-model="localDetName"
                  variant="outlined"
                  @input="updateDetNameData"
                ></v-text-field>
              </div>
            </v-col>

            <v-col sm="3">
              <div class="form-group-select">
                <v-select
                  label="Approach Direction"
                  :items="['NB', 'SB', 'EB', 'WB']"
                  variant="outlined"
                  v-model="localHeading"
                  @update:modelValue="updateHeadingData"
                ></v-select>
              </div>
            </v-col>
            <v-col sm="3">
              <div class="form-group-select">
                <v-select
                  label="Posted Speed (MPH)"
                  :items="[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]"
                  variant="outlined"
                  v-model="localPostedSpeed"
                  @update:modelValue="updateSpeedData"
                ></v-select>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col sm="6">
              <div class="form-grou-location">
                <v-text-field
                  label="Latitude, Longitude"
                  prepend-icon="mdi-map-marker"
                  v-model="localDetLatLon"
                  variant="outlined"
                  @change="updateDetLatLon"
                ></v-text-field>
              </div>
            </v-col>
            <v-col sm="4">
              <div class="form-group-select">
                <v-select
                  label="Phase Select"
                  :items="[
                    'Phase 1',
                    'Phase 2',
                    'Phase 3',
                    'Phase 4',
                    'Phase 5',
                    'Phase 6',
                    'Phase 7',
                    'Phase 8',
                  ]"
                  variant="outlined"
                  v-model="localPhase"
                  @update:modelValue="updatePhaseData"
                ></v-select>
              </div>
            </v-col>
            <v-col sm="2">
              <div>
                <h6>Detector Channel</h6>
                <v-text-field
                  v-model="localDetectorChannel"
                  label="Channel #"
                  type="number"
                  @input="updateDetData"
                  variant="outlined"
                ></v-text-field>
              </div>
            </v-col>
          </v-row>
        </v-col>

        <v-col>
          <v-row>
            <div>
              <v-btn @click="handleClick" :color="buttonColor"
                >Load Detector Data</v-btn
              >
            </div>

            <v-col>
              <div class="form-group-select">
                {{ cardID }}
              </div>
            </v-col>
          </v-row>
        </v-col>
      </form>
    </div>
  </v-container>
</template>

<script>
import InputBox from "./InputBox.vue";
import { ref } from "vue";

import processPhaseSplits from "../../mixins/processPhaseSplits";
import { mapState } from "pinia";
import { mapActions } from "pinia";
import { useDataStore } from "../../stores/data";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
  },
  setup() {
    const dataStore = useDataStore();

    return { dataStore };
  },
  props: {
    cardID: {
      type: String,
      required: true,
    },
    detectorData: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localDetName: "",
      localDetectorChannel: 1,
      localPostedSpeed: 25,
      localHeading: "",
      localDetLatLon: "",
      localPhase: "",
      localHdData: "",

      cardID: this.cardID,
      detectorID: 0,
      detectorForm: { ...this.cardData },
      detectorData: [],
      location: {
        loaded: false,
        lat: 0,
        lon: 0,
      },
      buttonPressed: false,
      buttonColor: "primary",
      hdDataObj: [],
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as Text in CSV format",
    };
  },
  computed: {
    ...mapState(useDataStore, [
      "detChannel",
      "postedSpeed",
      "heading",
      "detName",
      "detLatLon",
      "phase",
      "hdData",
      "detectorID",
    ]),
  },
  methods: {
    ...mapActions(useDataStore, {
      updateSpeed: "updateSpeed",
      updateDetChannel: "updateDetChannel",
      updateHeading: "updateHeading",
      updateDetName: "updateDetName",
      updateDetLatLon: "updateDetLatLon",
      updatePhase: "updatePhase",
      updateHdData: "updateHdData",
    }),
    updateDetData() {
      this.updateDetChannel(this.localDetectorChannel);
      this.localDetectorChannel = this.detChannel;
    },
    updateSpeedData() {
      this.updateSpeed(this.localPostedSpeed);
      this.localPostedSpeed = this.postedSpeed;
    },
    updateHeadingData() {
      this.updateHeading(this.localHeading);
      this.localHeading = this.heading;
    },
    updateDetNameData() {
      this.updateDetName(this.localDetName);
      this.localDetName = this.detName;
    },
    updateLatLonData() {
      this.updateDetLatLon(this.localDetLatLon);
      this.localDetLatLon = this.detLatLon;
    },
    updatePhaseData() {
      this.updatePhase(this.localPhase);
      this.localPhase = this.phase;
    },
    updateHdData() {
      this.updateHdData(this.localHdData);
      this.localHdData = this.hdData;
    },

    //update HD data

    handleSubmit() {
      // Handle form submission
      //console.log(this.form);
    },
    loadDetectorData() {
      this.$emit("detector-data", this.detectorID, this.detectorData);
      this.buttonPressed = true;
      this.buttonColor = "success";
      console.log("Detector Form loading the following", this.detectorData);
    },

    phaseToNumber(formInputPhase) {
      if (formInputPhase) {
        const match = formInputPhase.match(/\d+/);
        return match ? Number(match[0]) : null;
      }
    },
    cardIDToNumber(cardIDString) {
      return parseInt(cardIDString.replace(/[^0-9]/g, ""), 10);
    },
    handleClick() {
      //this.updateLatLon(this.detectorForm.latlon);
      const detLatLonString = this.localDetLatLon;
      if (detLatLonString.length > 0) {
        [this.location.lat, this.location.lon] = detLatLonString
          .split(",")
          .map(Number);
        this.location.loaded = true;
      }

      this.detectorID = this.cardIDToNumber(this.cardID);

      //create object that removes all the form specific data and prepares data as we want
      this.detectorData = {
        detectorID: this.detectorID,
        detName: this.detName,
        heading: this.heading,
        postedSpeed: this.postedSpeed,
        detLatLon: this.location,
        phase: this.phaseToNumber(this.phase),
        detChannel: parseInt(this.detChannel, 10),
      };

      this.loadDetectorData();
    },
  },
};
</script>

<style scoped>
.form-container {
  min-width: 400px;
  margin: auto;
  padding: 5px;
  border: 3px solid #ccc;
  border-radius: 10px;
}

.form-group-input {
  width: 100%;
  padding: 5px;
}
.form-group-select {
  width: 100%;
  padding: 5px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.background-color {
  background-color: #fbe7b33e;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:hover {
  background-color: #0056b3;
}
/* Simple styling for the color input */
input[type="color"] {
  border: none;
  width: 50px;
  height: 50px;
  padding: 0;
  cursor: pointer;
}
</style>
