<template>
  <v-container>
    <div class="form-container">
      <form @submit.prevent="handleSubmit">
        <h2>Intersection Input</h2>
        <v-col>
          <v-row>
            <v-col sm="6">
              <div class="form-group">
                <v-text-field
                  label="Descriptive Name"
                  v-model="localIntersectionName"
                  variant="outlined"
                  @input="updateIntersectionNameData"
                ></v-text-field>
              </div>
            </v-col>

            <v-col sm="6">
              <div class="form-grou-location">
                <v-text-field
                  label="Latitude, Longitude"
                  v-model="localIntersectionLatLon"
                  prepend-icon="mdi-map-marker"
                  variant="outlined"
                  @change="updateIntersectionLatLonData"
                ></v-text-field>
              </div>
            </v-col>
          </v-row>
        </v-col>

        <v-col
          ><div class="grow-wrap">
            <InputBox v-model="localHdData" :defaultText="textboxDefaultText" />
          </div>
        </v-col>

        <v-col>
          <div v-for="(item, index) in detectors" :key="index">
            <detector-input-card
              :cardID="item"
              @detector-data="handleDetectorData"
            />
          </div>
          <v-btn @click="addDetector"
            >Add New Detector ({{ detectors.length }})</v-btn
          >
        </v-col>
        <v-col>
          <v-row>
            <div>
              <v-btn @click="handleLoadData" :color="buttonColor"
                >Load Intersection Data</v-btn
              >
            </div>
          </v-row>
        </v-col>
      </form>
    </div>
  </v-container>
</template>

<script>
import InputBox from "./InputBox.vue";
import DetectorInputCard from "./DetectorInputCard.vue";
import { ref } from "vue";

import processPhaseSplits from "../../mixins/processPhaseSplits";
import { mapState } from "pinia";
import { mapActions } from "pinia";
import { useDataStore } from "../../stores/data";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
    DetectorInputCard,
  },
  setup() {
    const dataStore = useDataStore();
    const detectors = ref([]);
    const addDetector = () => {
      console.log("trying to add detector", detectors.length);
      detectors.value.push(`ID #${detectors.value.length + 1}`);
    };

    return { dataStore, detectors, addDetector };
  },
  props: {
    signalData: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localIntersectionName: "",
      localIntersectionLatLon: "",
      localHdData: "",

      detectorDataArray: [],

      cardID: "",
      signalForm: { ...this.cardData },
      buttonPressed: false,
      buttonColor: "primary",
      hdDataObj: [],
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as Text in CSV format (timestamp, enumeration, phase/channel)",
      rlrEventsArray: [],
    };
  },
  computed: {
    ...mapState(useDataStore, [
      "intersectionName",
      "intersectionLatLon",
      "hdData",
    ]),
  },
  methods: {
    ...mapActions(useDataStore, {
      updateIntersectionName: "updateIntersectionName",
      updateIntersectionLatLon: "updateIntersectionLatLon",
      updateHdData: "updateHdData",
    }),
    updateIntersectionNameData() {
      this.updateIntersectionName(this.localIntersectionName);
      this.localIntersectionName = this.intersectionName;
    },
    updateIntersectionLatLonData() {
      this.updateIntersectionLatLon(this.localIntersectionLatLon);
      this.localIntersectionLatLon = this.IntersectionLatLon;
    },
    updateHdData() {
      this.updateHdData(this.localHdData);
      this.localHdData = this.hdData;
    },

    handleSubmit() {
      // Handle form submission
      console.log(this.form);
    },
    loadSignalData() {
      //this.$emit("signal-data", this.cardId + 1, this.signalForm);
      this.buttonPressed = true;
      this.buttonColor = "success";

      if (this.signalForm.hdData != null && this.detectorDataArray.length > 0) {
        for (let i = 0; i < this.detectorDataArray.length - 1; i++) {
          this.rlrEventsArray[i] = this.detectYRCrossings(
            this.signalForm.hdData,
            this.detectorDataArray[i + 1].detChannel,
            this.detectorDataArray[i + 1].phase
          );

          console.log("Item:", i, this.detectorDataArray[i + 1]);
          console.log(this.rlrEventsArray);

          this.$emit("rlr-events", this.rlrEventsArray);
        }
      }

      // TODO: emit the data to plot
    },

    handleDetectorData(detID, detData) {
      console.log("handling emitted detector data");

      this.detectorDataArray[detID] = detData;

      console.log("emitted data :", detID, detData);
      console.log("loaded: ", this.detectorDataArray);
    },
    updateLatLon(formInputLatLon) {
      if (formInputLatLon) {
        const [latitude, longitude] = formInputLatLon
          .split(",")
          .map((coord) => coord.trim());
        this.signalForm.latitude = Number(latitude) || "";
        this.signalForm.longitude = Number(longitude) || "";
      }
    },

    handleLoadData() {
      this.updateLatLon(this.localIntersectionLatLon);
      this.signalForm.intersectionName = this.localIntersectionName;

      if (this.localHdData) {
        this.signalForm.hdData = this.loadCsv2JsonObj(this.localHdData); //load all the enumerations into JSON obj.
        this.signalForm.phaseData = this.buildCycleItem(this.signalForm.hdData);
        console.log("Processig hd data");
      }
      //console.log(this.signalForm);

      this.loadSignalData();
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

.right-align {
  display: flex;
  justify-content: flex-end;
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
