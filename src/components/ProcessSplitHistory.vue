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
      phasesInCycle: [
        {
          phase: -1,
        },
      ],
    };
  },
  methods: {
    getEventDescriptor(codeValue) {
      let value = "";
      enumerationObj.find((item) => {
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
    setGreenStart(obj, timestamp) {
      obj.push({
        GreenStart: timestamp,
      });
    },
    setGreenEnd(obj, timestamp) {
      obj.push({
        GreenEnd: timestamp,
      });
    },
    createPhase(phaseNumber) {
      let phaseObj = [
        {
          phase: phaseNumber,
        },
      ];
      return phaseObj;
    },

    loadCsv2JsonObj() {
      // Parse CSV data into an array of objects
      const lines = this.inputData.split("\n");

      console.log(lines);

      lines.forEach((line) => {
        const [timestamp, eventCode, parameter] = line.trim().split(", ");

        this.hdDataObj.push({
          timestamp: timestamp,
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
          console.log("this is a phase obj");

          //TODO: need to load events into phase JSON object.

          /*
          this.phasesInCycle.find((item) => {
            if (item.phase === parseInt(obj.parameterCode)) {
              // switch statement method for all relevant enumerations
              // one working case for now:
              if (obj.eventCode === 1) {
                console.log("Running else to build cl array - enum 1");
                this.setGreenStart(item, obj.timestamp);
              } else if (obj.eventCode === 7) {
                this.setGreenEnd(item, obj.timestamp);
              }
            } else {
              item = this.createPhase(obj.parameterCode);
              console.log("Running else to build cl array");
            }
            this.phasesInCycle.push(item);
          });
        }
        console.log(this.phasesInCycle);
      }); */
        }
      });
    },
    calculatePhaseDurations() {
      this.loadCsv2JsonObj(); //load all the enumerations into JSON obj.
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
