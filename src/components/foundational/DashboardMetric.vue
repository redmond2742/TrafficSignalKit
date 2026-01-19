<template>
  <v-container class="dashboard">
    <v-row justify="center" align="center">
      <v-col cols="12" md="3">
        <v-card class="yellow-runner-card" outlined>
          <v-card-title class="title-container">
            <v-icon class="yellow-circle-icon">mdi-circle</v-icon>
            <div class="title">
              Yellow Light <br />
              Runners
            </div>
          </v-card-title>
          <v-card-text justify="center">
            <div class="display-2" aria-live="polite">{{ yellowRunners }}</div>
            <p class="average-text">Average Time: {{ yAverageSeconds }}s</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="red-clear-runner-card" outlined>
          <v-card-title class="title-container">
            <v-icon class="red-circle-icon">mdi-circle</v-icon>
            <div class="title">
              Red Clear Light <br />
              Runners
            </div>
          </v-card-title>
          <v-card-text justify="center">
            <div class="display-2" aria-live="polite">{{ redClearRunners }}</div>
            <p class="average-text">Average Time: {{ rcAverageSeconds }}s</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="red-runner-card" outlined>
          <v-card-title class="title-container">
            <v-icon class="red-circle-icon">mdi-circle</v-icon>
            <div class="title">
              Movement on <br />
              Red
            </div>
          </v-card-title>
          <v-card-text justify="center">
            <div class="display-2" aria-live="polite">{{ redRunners }}</div>
            <p class="average-text">Average Time: {{ rAverageSeconds }}s</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "YellowLightRunnerCard",
  props: {
    yellowRunners: {
      type: Number,
      default: 0, // Total count of yellow light runners
    },
    yAverageSeconds: {
      type: Number,
      default: 0, // Average time in seconds
    },
    redClearRunners: {
      type: Number,
      default: 0, // Total count of red clear light runners
    },
    rcAverageSeconds: {
      type: Number,
      default: 0, // Average time in seconds
    },
    redRunners: {
      type: Number,
      default: 0, // Total count of red light runners
    },
    rAverageSeconds: {
      type: Number,
      default: 0, // Average time in seconds
    },
  },
});
</script>

<style scoped>
.dashboard {
  background-color: #f4f4f9;
  padding: 2rem;
  border-radius: 10px;
}

.yellow-runner-card {
  background: linear-gradient(135deg, #fff700, #ffe77a);
  color: #333;
  text-align: center;
}
.red-clear-runner-card {
  background: linear-gradient(135deg, #d16350, #df6749);
  color: #333;
  text-align: center;
}
.red-runner-card {
  background: linear-gradient(135deg, #ff0303, #ff0000);
  color: #333;
  text-align: center;
}

.title {
  font-weight: bold;
  font-size: 1.5rem;
}

.display-2 {
  font-size: 3rem;
  font-weight: bold;
}

.average-text {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.7);
  margin-top: 0.5rem;
}

.red-circle-icon {
  font-size: 36px;
  color: red;
  border: 2px solid black; /* Black ring outline */
  border-radius: 50%; /* Makes the border circular */
  padding: 4px; /* Adds space around the icon */
}

.yellow-circle-icon {
  font-size: 36px;
  color: rgb(244, 224, 12);
  border: 2px solid black; /* Black ring outline */
  border-radius: 50%; /* Makes the border circular */
  padding: 4px; /* Adds space around the icon */
}

.title-container {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-wrap: wrap; /* Allows multi-line text */
}
.title {
  font-weight: bold;
  font-size: 1.5rem;
  line-height: 1.2; /* Adjusts spacing between lines */
  white-space: normal; /* Ensures text wraps properly */
}
</style>
