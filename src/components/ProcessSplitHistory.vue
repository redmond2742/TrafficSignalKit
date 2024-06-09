<template>
  <div>
    <!--
<TimezoneSelect @updateTimezone="selectedTimezone"></TimezoneSelect>

    -->
  </div>
  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <div>
    <v-btn @click="calculatePhaseDurations" color="primary">Process</v-btn>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import enumerationObj from "../data/enumerations.json";
import convertTime from "../mixins/convertTime";
import TableDisplaySplit from "./foundational/TableDisplaySplit.vue";
import { DateTime } from "luxon";

export default {
  mixins: [convertTime],
  components: {
    InputBox,
    TableDisplaySplit,
  },
  data() {
    return {
      inputData: "",
      rowData: [],
      hdDataObj: [],
      countCycles: 1,
      cycleCount: 1,
      currentCycleLength: 0,
      phasesInCycle: [],
      activePhasesInCycle: [],
      phaseArray: [],
      phaseElementsCount: 8, //update based on available JS items logged for each phase
      terminationResults: {
        phase1: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase2: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase3: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase4: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase5: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase6: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase7: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
        phase8: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
      },
      maxOutPercents: [],

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
      timezone: "",
    };
  },
  created() {
    // Resetting the variable in the created hook
    this.phaseArray = [];
  },
  computed: {},
  methods: {
    selectedTimezone(tzData) {
      this.timezone = tzData;
    },
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
    calcPhaseSplit(phaseObj, ph) {
      let curPhaseObj = phaseObj[ph];
      let splitTime = this.secondsBetweenISOEvents(
        curPhaseObj.greenTimeStart,
        curPhaseObj.redTimeEnd
      );
      return splitTime;
    },
    calcGreenTime(phaseObj, ph) {
      let curPhaseObj = phaseObj[ph];
      let greenTime = this.secondsBetweenISOEvents(
        curPhaseObj.greenTimeStart,
        curPhaseObj.greenTimeEnd
      );
      return greenTime;
    },
    calcYellowTime(phaseObj, ph) {
      let curPhaseObj = phaseObj[ph];
      let yellowTime = this.secondsBetweenISOEvents(
        curPhaseObj.yellowTimeStart,
        curPhaseObj.yellowTimeEnd
      );
      return yellowTime;
    },
    calcAllRedTime(phaseObj, ph) {
      let curPhaseObj = phaseObj[ph];
      let allRedTime = this.secondsBetweenISOEvents(
        curPhaseObj.redTimeStart,
        curPhaseObj.redTimeEnd
      );
      return allRedTime;
    },
    convertToCamelCase(str) {
      return str
        .split(" ")
        .map((word, index) => {
          if (index === 0) {
            return word.toLowerCase();
          } else {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
        })
        .join("");
    },
    countTotalTerminationsByPhase(phaseNumber) {
      let phaseName = "phase" + phaseNumber;
      let totalTerminationCount =
        this.terminationResults[phaseName].gapOut +
        this.terminationResults[phaseName].maxOut +
        this.terminationResults[phaseName].forceOff +
        this.terminationResults[phaseName].skipped;

      return totalTerminationCount;
    },
    calcAllPhaseTerminationPercents(termPhrase) {
      let terminationArray = [];
      let termName = this.convertToCamelCase(termPhrase);
      for (let i = 1; i <= 8; i++) {
        let phaseName = "phase" + i;
        terminationArray.push(
          Math.floor(
            (this.terminationResults[phaseName][termName] /
              this.countTotalTerminationsByPhase(i)) *
              100
          )
        );
      }
      return terminationArray;
    },

    isCycleComplete(ph) {
      let activePhase = ph;

      //console.log("PHASE in CycleFn: " + this.calcPhaseComplete(ph));

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
          console.log("CYCLE COMPLETE - INCREMENT AND CLEAR VARIABLES");
          this.incompleteB1Phases = this.incompleteB2Phases = [];
          this.completedB1Phases = this.completedB2Phases = [];
          this.unusedPhases = [];
          this.activeB1Phases = this.activeB2Phases = [];
          this.completedB1 = this.completedB2 = false;
          this.countCycles++;
          console.log(this.countCycles);
          return true;
        }
      } else {
        return this.completedB1 && this.completedB2;
      }
    },
    incrementTerminationResults(phaseNumber, reason) {
      // Check if the phase exists in the object
      let phaseName = "phase" + phaseNumber;
      console.log("PHASE NAME:" + phaseName);
      if (this.terminationResults.hasOwnProperty(phaseName)) {
        // Increment the corresponding reason
        console.log("TERM:" + this.terminationResults);
        this.terminationResults[phaseName][reason]++;
      } else {
        console.error(`Phase ${phaseName} does not exist. Only 1-8 available`);
      }
    },
    loadCsv2JsonObj() {
      // Parse CSV data into an array of objects
      const lines = this.inputData.split("\n");

      lines.forEach((line) => {
        const [timestamp, eventCode, parameter] = line.trim().split(",");

        let eventCodeInt = parseInt(eventCode);

        this.hdDataObj.push({
          timestamp: this.convertTimestamp(timestamp, this.timezone),
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
      const customFormat = "ccc, MMM d yyyy h:mm:ss.S a";
      console.log(dataObj);
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
              this.phaseArray[phaseNum].greenTimeEnd = obj.timestamp.iso;
              console.log();
            } else if (obj.eventCode === 8) {
              this.phaseArray[phaseNum].yellowTimeStart = obj.timestamp.iso;
            } else if (obj.eventCode === 9) {
              this.phaseArray[phaseNum].yellowTimeEnd = obj.timestamp.iso;
            } else if (obj.eventCode === 10) {
              this.phaseArray[phaseNum].redTimeStart = obj.timestamp.iso;
            } else if (
              obj.eventCode === 11 &&
              obj.timestamp.iso > this.phaseArray[phaseNum].greenTimeStart
            ) {
              //logic for after green start time +0.1 sec
              this.phaseArray[phaseNum].redTimeEnd = obj.timestamp.iso;
            } else if (obj.eventCode === 6) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Force Off";
            } else if (obj.eventCode === 5) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Max Out";
            } else if (obj.eventCode === 4) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Gap Out";
            } else if (obj.eventCode === 14) {
              this.phaseArray[phaseNum].phaseTerminationReason = "Skipped";
            }

            if (this.calcPhaseComplete(phaseNum) === 100) {
              let phaseSplitDuration = this.calcPhaseSplit(
                this.phaseArray,
                phaseNum
              );

              if (this.activePhasesInCycle.includes(phaseNum)) {
                this.cycleCount++;
                this.currentCycleLength = 0;
                this.activePhasesInCycle = [];
                this.activePhasesInCycle.push(phaseNum);
                this.currentCycleLength += phaseSplitDuration;
              } else {
                this.activePhasesInCycle.push(phaseNum);
                this.currentCycleLength += phaseSplitDuration;
              }

              this.incrementTerminationResults(
                phaseNum,
                this.convertToCamelCase(
                  this.phaseArray[phaseNum].phaseTerminationReason
                )
              );

              console.log(
                "TERM RESULTS:" + this.terminationResults.phase3.gapOut
              );
              console.log(
                "TOTAL TERM:" +
                  phaseNum +
                  " : " +
                  (this.terminationResults.phase3.gapOut /
                    this.countTotalTerminationsByPhase(3)) *
                    100
              );

              this.maxOutPercents =
                this.calcAllPhaseTerminationPercents("Max Out");

              this.gapOutPercents =
                this.calcAllPhaseTerminationPercents("Gap Out");
              this.forceOffPercents =
                this.calcAllPhaseTerminationPercents("Force Off");
              this.skippedPercents =
                this.calcAllPhaseTerminationPercents("Skipped");

              console.log(
                "TERM-summary: " +
                  this.gapOutPercents +
                  " - " +
                  this.forceOffPercents
              );

              const phaseSplit = {
                timestampStart: DateTime.fromISO(
                  this.phaseArray[phaseNum].greenTimeStart
                ).toFormat(customFormat),
                timestampStartISO: this.phaseArray[phaseNum].greenTimeStart,
                phase: phaseNum,
                duration: phaseSplitDuration,
                greenTime: this.calcGreenTime(this.phaseArray, phaseNum),
                yellowTime: this.calcYellowTime(this.phaseArray, phaseNum),
                allRedTime: this.calcAllRedTime(this.phaseArray, phaseNum),
                termReason: this.phaseArray[phaseNum].phaseTerminationReason,
                cycleCount: this.cycleCount,
                cycleLength: this.currentCycleLength,
                maxOutPercents: this.maxOutPercents,
                gapOutPercents: this.gapOutPercents,
                forceOffPercents: this.forceOffPercents,
                skippedPercents: this.skippedPercents,
              };

              this.rowData.push(phaseSplit);

              //emit phase durations to parent to display in table
              this.emitPhaseDurations(this.rowData);

              //clear phase data
              this.phaseArray[phaseNum] = "";
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

              this.phasesInCycle = [];
              this.phaseArray = [];
            }
          } else {
            if (obj.eventCode === 1) {
              this.phaseArray[phaseNum] = [];
              this.phaseArray[phaseNum].phase = phaseNum;
              this.phaseArray[phaseNum].greenTimeStart = obj.timestamp.iso;
              console.log("Adding " + phaseNum + " to Phases in Cycle");
              this.phasesInCycle.push(phaseNum); //append phase to cycle array since it has a start time
            }
          }
        }
      });
    },
    emitPhaseDurations(phData) {
      this.$emit("phaseDurations", phData);
    },
    calculatePhaseDurations() {
      this.loadCsv2JsonObj(); //load all the enumerations into JSON obj.
      this.buildCycleItem(this.hdDataObj);

      console.log("Total Cycle Count: " + this.countCycles);
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
