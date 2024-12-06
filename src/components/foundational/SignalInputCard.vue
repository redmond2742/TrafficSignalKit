<template>
  <v-container>
    <div class="form-container">
      <form @submit.prevent="handleSubmit">
        <v-col>
          <v-row>
            <v-col>
              <div class="form-group">
                <v-text-field
                  label="Descriptive Name"
                  v-model="signalForm.name"
                  variant="outlined"
                ></v-text-field>
              </div>
            </v-col>
            <v-col sm="3">
              <div class="form-group-select">
                <v-select
                  label="Static Object"
                  :items="['Traffic Signal', 'Bus Stop', 'Other']"
                  variant="outlined"
                  v-model="typeStaticObject"
                ></v-select>
              </div>
            </v-col>
            <v-col sm="1">
              <div>
                <h6>Line Color</h6>
                <input type="color" v-model="selectedColor" />
              </div>
            </v-col>
            <v-col sm="2">
              <div>
                <h6>Line Thickness</h6>
                <v-text-field
                  v-model.number="lineThickness"
                  label="Enter a number"
                  type="number"
                  @input="emitNumber"
                  outlined
                ></v-text-field>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col sm="6">
              <div class="form-group-input">
                <v-text-field
                  label="Latitude, Longitude"
                  prepend-icon="mdi-map-marker"
                  variant="outlined"
                  v-model="signalForm.latlon"
                ></v-text-field>
              </div>
            </v-col>
            <v-col sm="3">
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
                  v-model="signalForm.phase"
                ></v-select>
              </div>
            </v-col>
            <v-col sm="3">
              <div class="form-group-select">
                <v-select
                  label="TSP LP #"
                  :items="['TSP 1', 'TSP 2', 'TSP 3', 'TSP 4']"
                  variant="outlined"
                  v-model="signalForm.tsp"
                ></v-select>
              </div>
            </v-col>
          </v-row>
        </v-col>
        <v-col
          ><div class="grow-wrap">
            <InputBox
              v-model="signalForm.inputData"
              :defaultText="textboxDefaultText"
            />
          </div>
        </v-col>
        <v-col>
          <v-row>
            <div>
              <v-btn @click="handleClick" :color="buttonColor">Load Data</v-btn>
            </div>

            <v-col>
              <div class="form-group-select">
                <b>#</b>
                {{ cardId + 1 }}
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
import processPhaseSplits from "../../mixins/processPhaseSplits";

export default {
  mixins: [processPhaseSplits],
  components: {
    InputBox,
  },
  props: {
    cardId: {
      type: Number,
      required: true,
    },
    signalData: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      signalForm: { ...this.cardData },
      typeStaticObject: "Traffic Signal",
      selectedColor: "#A020F0", // Default color
      lineThickness: 2, // Default value
      buttonPressed: false,
      buttonColor: "primary",
      hdDataObj: [],
      textboxDefaultText:
        "Paste in High-Resolution Traffic Signal Data as Text in CSV format",
    };
  },
  methods: {
    handleSubmit() {
      // Handle form submission
      //console.log(this.form);
    },
    loadSignalData() {
      this.$emit("signal-data", this.cardId + 1, this.signalForm);
      this.buttonPressed = true;
      this.buttonColor = "success";
      //console.log(this.signalForm);
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
    phaseToNumber(formInputPhase) {
      if (formInputPhase) {
        const match = formInputPhase.match(/\d+/);
        return match ? Number(match[0]) : null;
      }
    },
    tspToNumber(formInputTSP) {
      if (formInputTSP) {
        const match = formInputTSP.match(/\d+/);
        return match ? Number(match[0]) : null;
      }
    },
    handleClick() {
      this.updateLatLon(this.signalForm.latlon);
      this.signalForm.typeStaticObject = this.typeStaticObject;
      this.signalForm.color = this.selectedColor;
      this.signalForm.lineThickness = this.lineThickness;
      this.signalForm.phaseValue = this.phaseToNumber(this.signalForm.phase);
      this.signalForm.tspValue = this.tspToNumber(this.signalForm.tsp);
      if (this.signalForm.inputData) {
        this.signalForm.hdData = this.loadCsv2JsonObj(
          this.signalForm.inputData
        ); //load all the enumerations into JSON obj.
        this.signalForm.phaseData = this.buildCycleItem(this.signalForm.hdData);
        // it tsp channel is selected (& hd data available), calculate tsp events in hd data
        if (this.signalForm.tspValue) {
          this.signalForm.tspEvents = this.calcTSPevents(
            this.signalForm.hdData
          );
        }
      }

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
