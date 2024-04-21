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
      phaseArray: [
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 0
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 1
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 2
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 3
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 4
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 5
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 6
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 7
        [{}, {}, {}, {}, {}, {}, {}, {}], // Row 8
      ],
    };
  },
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

      return (filledValues / totalElements) * 100;
    },
    calcCycleCompletionPercent() {
      let cycleComplete = 0;
      let totalPhaseComplete = 0;
      let countUsedPhases = this.phaseArray.length;
      for (let i = 0; i < this.phaseArray.length; i++) {
        let phaseComplete;
        phaseComplete = this.calcPhaseCompletionPercent(this.phaseArray[i]);
        totalPhaseComplete += phaseComplete;
        if (phaseComplete === 0) {
          countUsedPhases--;
        }
      }
      cycleComplete = totalPhaseComplete / (countUsedPhases * 100);
      console.log(this.phaseArray);
      if (cycleComplete === 1.0) {
        console.log("STARTING NEW CYCLE");
        this.countCycles++;
        this.phasesInCycle = [];
        this.phaseArray = [
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 0
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 1
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 2
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 3
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 4
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 5
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 6
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 7
          [{}, {}, {}, {}, {}, {}, {}, {}], // Row 8
        ];
        //print entire existing cycle
        // Clear Array Variables (phasesInCycle & phaseArray matrix)
        //set flag and send into event code if statments,
      }
    },

    loadCsv2JsonObj() {
      // Parse CSV data into an array of objects
      const lines = this.inputData.split("\n");

      console.log(lines);

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
      console.log(this.hdDataObj);

      return this.hdDataObj;
    },
    buildCycleItem(dataObj) {
      dataObj.forEach((obj) => {
        if (obj.parameterType === "Phase") {
          // if this.phaseArray.includes[obj.parameterCode][HAS GreenENDTime]
          /*
          0 - Phase
          1 - green start time
          2 - green end time
          3 - start yellow time
          4 - end yellow time
          5 - start red time
          6 - end red time
          7 - reason for termination

          */

          if (this.phasesInCycle.includes(obj.parameterCode)) {
            if (
              this.calcPhaseCompletionPercent(
                this.phaseArray[obj.parameterCode]
              ) === 100
            ) {
              this.calcCycleCompletionPercent();
            }

            if (obj.eventCode === 1) {
              this.phaseArray[obj.parameterCode][1].greenTimeStart =
                obj.timestamp;
            } else if (obj.eventCode === 6) {
              this.phaseArray[obj.parameterCode][7].phaseTerminationReason =
                "Force Off";
              obj.timestamp;
            } else if (obj.eventCode === 5) {
              this.phaseArray[obj.parameterCode][7].phaseTerminationReason =
                "Max Out";
              obj.timestamp;
            } else if (obj.eventCode === 4) {
              this.phaseArray[obj.parameterCode][7].phaseTerminationReason =
                "Gap Out";
              obj.timestamp;
            } else if (obj.eventCode === 14) {
              this.phaseArray[obj.parameterCode][7].phaseTerminationReason =
                "Skipped";
              obj.timestamp;
            } else if (obj.eventCode === 7) {
              this.phaseArray[obj.parameterCode][2].greenTimeEnd =
                obj.timestamp;
            } else if (obj.eventCode === 8) {
              this.phaseArray[obj.parameterCode][3].yellowTimeStart =
                obj.timestamp;
            } else if (obj.eventCode === 9) {
              this.phaseArray[obj.parameterCode][4].yellowTimeEnd =
                obj.timestamp;
            } else if (obj.eventCode === 10) {
              this.phaseArray[obj.parameterCode][5].redTimeStart =
                obj.timestamp;
            } else if (obj.eventCode === 11) {
              this.phaseArray[obj.parameterCode][6].redTimeEnd = obj.timestamp;
            }
          } else {
            this.phasesInCycle.push(obj.parameterCode);
            this.phaseArray[obj.parameterCode][0].phase = obj.parameterCode;
            if (obj.eventCode === 1) {
              this.phaseArray[obj.parameterCode][1].greenTimeStart =
                obj.timestamp;
              //this.phaseArray[0] = [{ greenTimeStart: obj.timestamp }];
            }
            //this.phaseArray[0] = [{ phase: obj.parameterCode }];
          }

          //TODO: need to load events into phase JSON object.
          // TODO: load up a array of phases served thus far, and then clear them out after a cycle

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
      console.log(this.phasesInCycle);
      console.log(this.phaseArray);
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
