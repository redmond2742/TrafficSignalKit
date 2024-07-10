<template>
  <v-container>
    <div class="form-container">
      <form @submit.prevent="handleSubmit">
        <v-col>
          <v-row>
            <v-col>
              <div class="form-group">
                <v-text-field
                  label="Intersection Name"
                  v-model="signalForm.name"
                  variant="outlined"
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
            <InputBox v-model="signalForm.inputBox" />
          </div>
        </v-col>
        <v-col>
          <v-row>
            <div>
              <v-btn @click="handleClick" :color="buttonColor">Load Data</v-btn>
            </div>

            <v-col>
              <div class="form-group-select">
                <b>Signal Count # </b>
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
export default {
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
      buttonPressed: false,
      buttonColor: "primary",
    };
  },
  methods: {
    handleSubmit() {
      // Handle form submission
      console.log(this.form);
      alert("Form submitted!");
      //TODO: Emit the CardData Object
    },
    loadSignalData() {
      alert("Emitting Signal Data to Parent");
      this.$emit("signal-data", this.cardId, this.signalForm);
      this.buttonPressed = true;
      this.buttonColor = "success";
    },
    handleClick() {
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
</style>
