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
      countCycles: 1,
      phasesInCycle: [],
      phaseArray: [],
      phaseElementsCount: 8, //update based on available JS items logged for each phase
    };
  },
  computed: {},
  methods: {
    getEventDescriptor(codeValue) {
      let value = "";
      enumerationObj.find((item) => {
        if (parseInt(item.eventCode) === codeValue) {
          value = item.eventDescriptor;
        }
      });
      return value;
    },
    getParameterType(codeValue) {
      let value = "";
      enumerationObj.find((item) => {
        if (parseInt(item.eventCode) === codeValue) {
          value = item.parameterType;
        }
      });
      return value;
    },
    getEventDescription(eventCode) {
      let value = "";
      enumerationObj.find((item) => {
        if (parseInt(item.eventCode) === eventCode) {
          value = item.description;
        }
      });
      return value;
    },
    calcPhaseCompletionPercent(arr) {
      const filledValues = arr.filter((value) => {
        if (typeof value === "object" && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      }).length;

      const totalElements = arr.length;
      //console.log("filled in: " + filledValues + "/" + totalElements);

      return (filledValues / totalElements) * 100;
    },
    calcPhaseComplete(phaseNum) {
      let completedItems = 0;
      let obj = this.phaseArray[phaseNum];

      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          completedItems++;
        }
      }
      return (completedItems / this.phaseElementsCount) * 100;
    },
    isCycleComplete() {
      let ringBarrier1 = false;
      let ringBarrier2 = false;

      for (let phase of this.phasesInCycle) {
        if (phase === 1 || phase === 2 || phase === 5 || phase === 6) {
          //ring barrier 1 phases

          if (this.calcPhaseComplete(phase) === 100) {
            ringBarrier1 = true;
          }
        } else if (phase === 3 || phase === 4 || phase === 7 || phase === 8) {
          //ring barrier 2 phases
          if (this.calcPhaseComplete(phase) === 100) {
            ringBarrier2 = true;
          }
        }
      }
      return ringBarrier1 && ringBarrier2;
    },

    loadCsv2JsonObj() {
      // Parse CSV data into an array of objects
      const lines = this.inputData.split("\n");

      lines.forEach((line) => {
        const [timestamp, eventCode, parameter] = line.trim().split(", ");

        let eventCodeInt = parseInt(eventCode);

        this.hdDataObj.push({
          timestamp: timestamp,
          eventCode: eventCodeInt,
          eventDescriptor: this.getEventDescriptor(eventCodeInt),
          parameterType: this.getParameterType(eventCodeInt), //Phase or Other
          parameterCode: parseInt(parameter), // 1-8 or channel or phase numbers
          description: this.getEventDescription(eventCodeInt),
        });
      });

      return this.hdDataObj;
    },
    buildCycleItem(dataObj) {
      dataObj.forEach((obj) => {
        if (obj.parameterType === "Phase") {
          let phaseNum = obj.parameterCode;

          if (this.phasesInCycle.includes(phaseNum)) {
            if (obj.eventCode === 7) {
              this.phaseArray[phaseNum].greenTimeEnd = obj.timestamp;
            } else if (obj.eventCode === 8) {
              this.phaseArray[phaseNum].yellowTimeStart = obj.timestamp;
            } else if (obj.eventCode === 9) {
              this.phaseArray[phaseNum].yellowTimeEnd = obj.timestamp;
            } else if (obj.eventCode === 10) {
              this.phaseArray[phaseNum].redTimeStart = obj.timestamp;
            } else if (obj.eventCode === 11) {
              this.phaseArray[phaseNum].redTimeEnd = obj.timestamp;
            } else if (obj.eventCode === 6) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Force Off";
            } else if (obj.eventCode === 5) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Max Out";
            } else if (obj.eventCode === 4) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Gap Out";
            } else if (obj.eventCode === 14) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Skipped";
            }
          } else {
            if (obj.eventCode === 1) {
              this.phaseArray[phaseNum] = [];
              this.phaseArray[phaseNum].phase = phaseNum;
              this.phaseArray[phaseNum].greenTimeStart = obj.timestamp;

              this.phasesInCycle.push(phaseNum); //append phase to cycle array since it has a start time
            }
          }

          if (this.isCycleComplete()) {
            console.log(
              "Phases in Cycle: " + this.phasesInCycle + " STARTING NEW CYCLE :"
            );
            this.countCycles++;
            this.phasesInCycle = [];
            this.phaseArray = [];
          }

          //TODO: calculate green, yellow, red times - computed props?
          // TODO: display table of split times for each cycle

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

      console.log("Total Cycle Count: " + this.countCycles);
      this.countCycles = 0;
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
