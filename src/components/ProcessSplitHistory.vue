<template>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <div>
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
import InputBox from "../components/InputBox.vue";
import enumerationObj from "../data/enumerations.json";

export default {
  components: {
    InputBox,
  },
  data() {
    return {
      inputData: "",
      hdDataObj: [],
    };
  },
  methods: {
    getEventDescriptor(codeValue) {
      let value = "";
      enumerationObj.find((item) => {
        //console.log("log" + item.eventDescriptor);

        //console.log(item.eventCode);
        //console.log(codeValue);
        if (item.eventCode === parseInt(codeValue)) {
          value = item.eventDescriptor;
        }
      });
      return value;
    },
    getParameterType(codeValue) {
      let value = "";
      enumerationObj.find((item) => {
        if (item.eventCode === parseInt(codeValue)) {
          value = item.parameterType;
        }
      });
      return value;
    },

    getEventDescription(eventCode) {
      let value = "";
      enumerationObj.find((item) => {
        if (item.eventCode === parseInt(eventCode)) {
          value = item.description;
        }
      });
      return value;
    },
    loadCsv2JsonObj() {
      // Parse CSV data into an array of objects
      const lines = this.inputData.split("\n");

      console.log(lines);

      lines.forEach((line) => {
        const [timestamp, eventCode, parameter] = line.trim().split(", ");

        this.hdDataObj.push({
          eventCode: parseInt(eventCode),
          eventDescriptor: this.getEventDescriptor(eventCode),
          parameterType: this.getParameterType(eventCode),
          parameterCode: parseInt(parameter),
          description: this.getEventDescription(eventCode),
        });
      });
      console.log(this.hdDataObj);

      return this.hdDataObj;
    },
    buildCycleItem(dataObj) {
      dataObj.forEach((obj) => {
        if (obj.parameterType === "Phase") {
          console.log("Condition met for object Phase", obj);
        }
      });
    },
    calculatePhaseDurations() {
      console.log("test");
      this.loadCsv2JsonObj();
      this.buildCycleItem(this.hdDataObj);
    },
  },
};
</script>

<style scoped>
.grow-wrap {
  /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
  display: grid;
}
.grow-wrap::after {
  /* Note the weird space! Needed to preventy jumpy behavior */
  content: attr(data-replicated-value) " ";

  /* This is how textarea text behaves */
  white-space: pre-wrap;

  /* Hidden from view, clicks, and screen readers */
  visibility: hidden;
}
.grow-wrap > textarea {
  /* You could leave this, but after a user resizes, then it ruins the auto sizing */
  resize: none;

  /* Firefox shows scrollbar on growth, you can hide like this. */
  overflow: hidden;
  overflow-y: scroll;
}
.grow-wrap > textarea,
.grow-wrap::after {
  /* Identical styling required!! */
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;

  /* Place on top of each other */
  grid-area: 1 / 1 / 2 / 2;
}
</style>
