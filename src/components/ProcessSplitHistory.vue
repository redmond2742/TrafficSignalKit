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

      buildingB1: false,
      buildingB2: false,

      completedB1: false,
      completedB2: false,

      allB1Phases: [1, 2, 5, 6],
      allB2Phases: [3, 4, 7, 8],

      incompleteB1Phases: [],
      incompleteB2Phases: [],
      completedB1Phases: [],
      completedB2Phases: [],
      unusedPhases: [],
      activeB1Phases: [],
      activeB2Phases: [],
    };
  },
  created() {
    // Resetting the variable in the created hook
    this.phaseArray = [];
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
    calcPhaseDurations(phaseJSON, ph) {
      //TODO: update from ms to Seconds!!
      let phaseDurationArray = [];
      let oneCycleArray = [];
      for (let i = 0; i < ph.length; i++) {
        let curPhaseObj = phaseJSON[ph[i]];
        //console.log(curPhaseObj);
        phaseDurationArray[i] = [];
        phaseDurationArray[i].phase = ph[i];
        phaseDurationArray[i].gTime =
          (curPhaseObj.greenTimeEnd - curPhaseObj.greenTimeStart) / 100;
        phaseDurationArray[i].yTime =
          (curPhaseObj.yellowTimeEnd - curPhaseObj.yellowTimeStart) / 100;
        phaseDurationArray[i].rTime =
          (curPhaseObj.redTimeEnd - curPhaseObj.redTimeStart) / 100;
        phaseDurationArray[i].termReason = curPhaseObj.phaseTerminationReason;
        phaseDurationArray[i].start = curPhaseObj.greenTimeStart;
      }
      oneCycleArray.push(phaseDurationArray);

      return oneCycleArray;
    },
    calcSplitDuration(phArr) {
      let cycleDuration = [];
      let splitTime = [];
      let curPhase = phArr[0];
      for (let i = 0; i < curPhase.length; i++) {
        splitTime[i] = [];
        splitTime[i] =
          curPhase[i].gTime + curPhase[i].yTime + curPhase[i].rTime;
        console.log(splitTime[i]);
      }
      return splitTime;
      //console.log(splitTime[i]);
    },
    isCycleComplete(ph) {
      let activePhase = ph;

      //console.log("PHASE in CycleFn: " + this.calcPhaseComplete(ph));

      console.log(
        "PHASES IN CYCLE:" +
          this.phasesInCycle +
          " & " +
          ph +
          " is " +
          this.calcPhaseComplete(ph) +
          "% complete."
      );

      if (ph === 2) {
        console.log(this.phaseArray[ph]);
      }

      let incompletePhases = this.phasesInCycle;
      this.unusedPhases = this.allB1Phases.concat(this.B2Phases);

      let activePhases = this.phasesInCycle;

      this.activeB1Phases = this.allB1Phases.filter((el) =>
        activePhases.includes(el)
      );
      this.activeB2Phases = this.allB2Phases.filter((el) =>
        activePhases.includes(el)
      );

      let allPhases = this.allB1Phases.concat(this.allB2Phases);

      /*
        1. if phasesInCycle are greater than 0% complete?
            YES:
             A. Set buildingR#=True,
             B. filter out this phase from unusedPhases
             C. add this phase to incompleteR#Phases
            if ph=100%, add to completed phase in Ring#
             A. filter out this phase from incomplete phaseR#
             B. add to completed phase in R#
              if completedR#Phases === ring#Phases.filter(unusedPhases)
                YES: completedR# = True
                    -> move to next ring phases.

                    Clear out variables.

            NO: buildingR#=False

      */

      if (this.calcPhaseComplete(activePhase) > 0) {
        console.log(activePhase + " phase is greater than zero % complete");

        this.unusedPhases = this.unusedPhases.filter(
          (item) => item !== activePhase
        );

        if (this.allB1Phases.includes(activePhase)) {
          console.log("building Barrier 1");
          console.log(this.activeB1Phases);
          if (!this.activeB1Phases.includes(activePhase)) {
            this.activeB1Phases.push(activePhase);
          }
          this.buildingB1 = true;
          if (!this.incompleteB1Phases.includes(activePhase)) {
            this.incompleteB1Phases.push(activePhase);
          }
        } else if (this.allB2Phases.includes(activePhase)) {
          console.log("building Barrier 2");
          console.log(this.activeB2Phases);
          if (!this.activeB2Phases.includes(activePhase)) {
            this.activeB2Phases.push(activePhase);
          }
          this.buildingB2 = true;
          if (!this.incompleteB2Phases.includes(activePhase)) {
            this.incompleteB2Phases.push(activePhase);
          }
        }

        if (this.calcPhaseComplete(activePhase) === 100) {
          console.log("Phase " + activePhase + " is complete!");
          // Ring 1
          if (
            this.buildingB1 === true &&
            this.completedB1 === false &&
            this.allB1Phases.includes(activePhase)
          ) {
            this.incompleteB1Phases = this.incompleteB1Phases.filter(
              (item) => item !== activePhase
            );
            if (!this.completedB1Phases.includes(activePhase)) {
              this.completedB1Phases.push(activePhase);
            }
            this.completedB1Phases.sort();
            this.activeB1Phases.sort();

            console.log(this.completedB1Phases);
            console.log(this.activeB1Phases);

            if (
              this.completedB1Phases.length === this.activeB1Phases.length &&
              this.completedB1Phases.every(
                (value, index) => value === this.activeB1Phases[index]
              )
            ) {
              this.buildingB1 = false;
              this.completedB1 = true;
              console.log("B1 Complete");
              // eventually reset some variables
            }
          }
          // Ring 2
          else if (
            this.buildingB2 === true &&
            this.completedB2 === false &&
            this.allB2Phases.includes(activePhase)
          ) {
            this.incompleteB2Phases = this.incompleteB2Phases.filter(
              (item) => item !== activePhase
            );
            if (!this.completedB2Phases.includes(activePhase)) {
              this.completedB2Phases.push(activePhase);
            }
            this.completedB2Phases.sort();
            this.activeB2Phases.sort();

            console.log("CB2" + this.completedB2Phases);
            console.log("AB2" + this.activeB2Phases);

            if (
              this.completedB2Phases.length === this.activeB2Phases.length &&
              this.completedB2Phases.every(
                (value, index) => value === this.activeB2Phases[index]
              )
            ) {
              this.buildingB2 = false;
              this.completedB2 = true;
              console.log("B2 Complete");

              // eventually reset some variables
            }
          }
        } else if (this.completedB1 && this.completedB2) {
          ("CYCLE COMPLETE - INCREMENT AND CLEAR VARIABLES");
          this.incompleteB1Phases = this.incompleteB2Phases = [];
          this.completedB1Phases = this.completedB2Phases = [];
          this.unusedPhases = [];
          this.activeB1Phases = this.activeB2Phases = [];
          this.completedB1 = this.completedB2 = false;
          return true;
        }
      } else {
        return this.completedB1 && this.completedB2;
      }
      /*
      unusedPhases = allPhases.filter((item) => item !== activePhases);

      incompleteR1Phases = incompletePhases.filter((value) =>
        ring1Phases.includes(value)
      );
      incompleteR2Phases = incompletePhases.filter((value) =>
        ring2Phases.includes(value)
      );


      from active phases, if it reaches 100% remove from list of active phases.


      if (incompleteR1Phases.length > 0 && incompleteR2Phases.length > 0) {
        for (let i = 0; i < incompleteR1Phases.length; i++) {
          // Check if the current phase is present in activePhases
          if (activePhases.includes(incompleteR1Phases[i])) {
            // Check if any active phase is complete
            if (
              activePhases.some(
                (phase) => this.calcPhaseComplete(phase) === 100
              )
            ) {
              // Filter out completed phases from incompletePhases
              //console.log("filtering out Ring 1 phase");
              incompletePhases.splice(i, 1);
              i--; // Decrement the index to account for the removed item
              if (incompleteR1Phases.length === 0) {
                ringBarrier1 = true;
              }
            }
          }
        }
        for (let i = 0; i < incompleteR2Phases.length; i++) {
          // Check if the current phase is present in activePhases
          if (activePhases.includes(incompleteR2Phases[i])) {
            // Check if any active phase is complete
            if (
              activePhases.some(
                (phase) => this.calcPhaseComplete(phase) === 100
              )
            ) {
              // Filter out completed phases from incompletePhases
              //console.log("filtering out Ring 2 phase");
              incompletePhases.splice(i, 1);
              i--; // Decrement the index to account for the removed item
              if (incompleteR2Phases.length === 0) {
                ringBarrier2 = true;
              }
            }
          }
        }
      }
       */

      /*
      for (let phase of this.phasesInCycle) {
        if (ring1Phases.includes(phase)) {
          if (this.calcPhaseComplete(phase) === 100) {
            incompleteR1Phases = ring1Phases.filter((item) => item !== phase);
            for (let partialPhase of incompleteR1Phases) {
              if (this.calcPhaseComplete(partialPhase) === 100) {
                ringBarrier1 = true;
              }
            }
          }
        } else if (ring2Phases.includes(phase)) {
          if (this.calcPhaseComplete(phase) === 100) {
            incompleteR2Phases = ring2Phases.filter((item) => item !== phase);
            for (let partialPhase of incompleteR2Phases) {
              if (this.calcPhaseComplete(partialPhase) === 100) {
                ringBarrier2 = true;
              }
            }
          }
        }
      }
      */
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

          if (
            this.phasesInCycle.includes(phaseNum) &&
            this.phaseArray[phaseNum].greenTimeStart
          ) {
            console.log(
              phaseNum + " is " + this.phasesInCycle.includes(phaseNum)
            );
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

            if (this.isCycleComplete(phaseNum)) {
              console.log("STARTING NEW CYCLE");
              // take in phaseArray item and perform g,y,r duration calculations.
              let phaseDur = this.calcPhaseDurations(
                this.phaseArray,
                this.phasesInCycle
              );
              //console.log(phaseDur);

              let cycleFromPhases = this.calcSplitDuration(phaseDur);
              console.log(cycleFromPhases);
              this.countCycles++;
              this.phasesInCycle = [];
              this.phaseArray = [];
            }
          } else {
            if (obj.eventCode === 1) {
              this.phaseArray[phaseNum] = [];
              this.phaseArray[phaseNum].phase = phaseNum;
              this.phaseArray[phaseNum].greenTimeStart = obj.timestamp;
              console.log("does this run for the first ph2");
              this.phasesInCycle.push(phaseNum); //append phase to cycle array since it has a start time
            }
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
