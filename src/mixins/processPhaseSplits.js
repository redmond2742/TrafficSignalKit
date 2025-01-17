import enumerationObj from "../data/enumerations.json";
import convertTime from "./convertTime.js";
import { DateTime } from "luxon";

export default {
    mixins: [convertTime],
    data() {
        return {
            phasesInCycle: [],
            phaseArray: [],
            activePhasesInCycle: [],
            cycleCount: 1,
            countCycles: 1,
            currentCycleLength: 0,
            maxOutPercents: [],
            rowData: [],
            allB1Phases: [1, 2, 5, 6],
            allB2Phases: [3, 4, 7, 8],
            processedData: [],
            phaseElementsCount: 8, //update based on available JS items logged for each phase
            unusedPhases: [],
            incompleteB1Phases: [],
            incompleteB2Phases: [],
            terminationResults: {
                phase1: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase2: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase3: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase4: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase5: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase6: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase7: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase8: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase9: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase10: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
                phase11: { skipped: 0, gapOut: 0, maxOut: 0, forceOff: 0 },
              },
            activeB1Phases: [],
            activeB2Phases: [],
            completedB1Phases: [],
            completedB2Phases: [],
            timezone: "",
            tspEventData: [],
            previousYellowChangeState: false,
            previousRedClearState: false,
            previousPhaseState: false,
            previousDetectorState: false,
            eventStates: {},
            totalPhaseCalls:[],
            yellowStartTS: null,
            allRedStartTS: null,
            phaseEndTS: null,
            

        };
    },
    methods: {
        selectedTimezone(tzData) {
          this.timezone = tzData;
        },
    
        getEventDescriptor( codeValue) {
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
        countLightRunnerEvents(eventArray){
          const counts = {};

          for(const event of eventArray){
            if(counts[event.type]) {
              counts[event.type]++;
            } else {
              counts[event.type] = 1 //initialize the count for this type
            }
          }
          return counts;
        },

        // generic function to determine enumeration state, save in object
        determineParameterState(logEvent, eventCode, parameter) {
          const key = `${eventCode}-${parameter}`;
          if (!this.eventStates[key] || this.eventStates[key] === undefined) {
            this.eventStates[key] = { eventCode, parameter, state: false };
          }
          let s = logEvent.eventCode === eventCode && logEvent.parameterCode === parameter
          this.eventStates[key].state = s;
          return this.eventStates[key].state;
        },


        //isGreenActive(logEvent, phase, startEnum = 1, endEnum = 7){
         //TODO: Return Active Phase Number (might not be current phase)
        //}
        

        isYellowChangeActive(logEvent, phase, startEnum = 8, endEnum = 9){
          let yellowChangeState = this.previousYellowChangeState;
          let prevYellowState = this.previousYellowChangeState;
          
          if (this.determineParameterState(logEvent, startEnum, phase)) {
              yellowChangeState = true;
            
              this.yellowStartTS = logEvent.timestamp
              console.log("new time starting yellow", this.yellowStartTS)
              
            }
          if(this.determineParameterState(logEvent, endEnum, phase)){
            yellowChangeState = false;
          }
          this.previousYellowChangeState = yellowChangeState;
          return {
            //TODO: Return Active Phases Number (might not be current phase)
            State: yellowChangeState,
            Timestamp: this.yellowStartTS,
            PrevState: prevYellowState,
          }
        },

        isRedClearActive(logEvent, phase) {
          let redClearState = this.previousRedClearState;
          let prevRedClearState = this.previousRedClearState;

          if(this.determineParameterState(logEvent, 10, phase)) { // begin red clear
              redClearState = true;
              this.allRedStartTS = logEvent.timestamp
            } 
          if (this.determineParameterState(logEvent, 11, phase)) { // end red clear
              redClearState = false;
            }
          this.previousRedClearState = redClearState;
          return {
            State: redClearState,
            Timestamp: this.allRedStartTS,
            prevState: prevRedClearState
          }
        },

        isPhaseInactive(logEvent, phase, startEnum = 12, endEnum = 0){
          let phaseState = this.previousPhaseState;
          let prevPhaseState = this.previousPhaseState;
          
          if (this.determineParameterState(logEvent, startEnum, phase)) {
              phaseState = true;
            
              this.phaseEndTS = logEvent.timestamp
              console.log("new time starting Phase Inactive", this.phaseEndTS)
              
            }
          if(this.determineParameterState(logEvent, endEnum, phase)){
            phaseState = false;
          }
          this.previousPhaseState = phaseState;
          return {
            State: phaseState,
            Timestamp: this.phaseEndTS,
            PrevState: prevPhaseState,
          }
        },

        isDetectorOn(logEvent, detChannel){
          let detChannelState = this.previousDetectorState;
          let prevDetState = this.previousDetectorState;

          if(this.determineParameterState(logEvent, 82, detChannel)){ // detector ON
            detChannelState = true;
          }
          if (this.determineParameterState(logEvent, 81, detChannel)){ // detector OFF
            detChannelState = false;
          }
          this.previousDetectorState = detChannelState;
          return {
            State: detChannelState,
            Timestamp: logEvent.timestamp,
            prevState: prevDetState,
          }
        },

        detectYRCrossings(hdData, channelNumber, activePhase){
          let yellowChange =false; 
          let redClear = false;
          let phaseInactive = false;
          let detEvent = false;
          let prevDetectorState = false;
          let results = [];
          const yellowClearancePeriods = {};
          let elapsedTime = 0;


          hdData.forEach(event => {
            yellowChange = this.isYellowChangeActive(event, activePhase);
            redClear = this.isRedClearActive(event, activePhase);
            phaseInactive = this.isPhaseInactive(event, activePhase);

            /*
            [detON | detOFF]
           1. Y         Y
           2. Y         R 8:08:32
           3. Y         R+
           4. R         R
           5. R         R+ (any time during other phases)  <-figure this one out

          */
            // Starts in Yellow, Ends in Yellow
            if(yellowChange.State){
              detEvent = this.isDetectorOn(event, channelNumber)

              if (detEvent.State) {  // detetor of interest is ON
                  prevDetectorState = true; // vehicle approaching light
           
              }
              if(!detEvent.State && prevDetectorState){
                
                  elapsedTime = ((detEvent.Timestamp.MillisecFromEpoch - this.yellowStartTS.MillisecFromEpoch)/1000).toFixed(2);
                  results.push({Type:"Yellow Start/Yellow End", Timestamp: event.timestamp, Elapse: Number(elapsedTime)});
                  prevDetectorState = false;
              }
            }
            // Starts in Yellow, ends in Red
            if(yellowChange.State){
              detEvent = this.isDetectorOn(event, channelNumber)

              if (detEvent.State) {  // detetor of interest is ON
                  prevDetectorState = true; // vehicle approaching light
              }}
            else if(redClear.State){
              if(!detEvent.State && prevDetectorState){
              
                  elapsedTime = ((detEvent.Timestamp.MillisecFromEpoch - this.allRedStartTS.MillisecFromEpoch)/1000).toFixed(2);
                  results.push({Type:"Yellow Start/Red End", Timestamp: event.timestamp, Elapse: Number(elapsedTime)});
                  prevDetectorState = false;
              }
            }
             // Starts in Red, ends in Red
            if(redClear.State){
              detEvent = this.isDetectorOn(event, channelNumber)
         
              if (detEvent.State) {  // detetor of interest is ON
                  prevDetectorState = true; // vehicle approaching light
              }
              if(!detEvent.State && prevDetectorState){

                  elapsedTime = ((detEvent.Timestamp.MillisecFromEpoch - this.allRedStartTS.MillisecFromEpoch)/1000).toFixed(2);
                  results.push({Type:"Red Start/Red End", Timestamp: event.timestamp, Elapse: Number(elapsedTime)});
                  prevDetectorState = false;
              } // Starts in all Red, ends in Phase Inactive
            }else if(phaseInactive.State){
              detEvent = this.isDetectorOn(event, channelNumber)

              if(detEvent.State) {
                prevDetectorState = true;
              }
              if(!detEvent.State && prevDetectorState){
                elapsedTime = ((detEvent.Timestamp.MillisecFromEpoch - this.phaseEndTS.MillisecFromEpoch)/1000).toFixed(2);
                results.push({Type: "Red Start/Phase Inactive End", Timestamp: event.timestamp, Elapse: Number(elapsedTime)});
                prevDetectorState = false;
              }
            }
            // Starts in Phase Inactive, ends in Phase Inactive
            if(phaseInactive.State){
              detEvent = this.isDetectorOn(event, channelNumber)

              if(detEvent.State){
                prevDetectorState = true;
              }
              if(!detEvent.State && prevDetectorState){
                elapsedTime = ((detEvent.Timestamp.MillisecFromEpoch - this.phaseEndTS.MillisecFromEpoch)/1000).toFixed(2);
                results.push({Type: "Phase Inactive Start/Phase Inactive End", Timestamp: event.timestamp, Elapse: Number(elapsedTime)});
                prevDetectorState = false;
              }
            }
            

            

              //TODO: find a way to check for detector ON, and when it goes off, if not during Green.
          });
          return results;
        },
    
        isCycleComplete(ph) {
          let activePhase = ph;
    
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
    
          if (this.calcPhaseComplete(activePhase) > 0) {
            this.unusedPhases = this.unusedPhases.filter(
              (item) => item !== activePhase
            );
    
            if (this.allB1Phases.includes(activePhase)) {
              if (!this.activeB1Phases.includes(activePhase)) {
                this.activeB1Phases.push(activePhase);
              }
              this.buildingB1 = true;
              if (!this.incompleteB1Phases.includes(activePhase)) {
                this.incompleteB1Phases.push(activePhase);
              }
            } else if (this.allB2Phases.includes(activePhase)) {
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
    
                if (
                  this.completedB1Phases.length === this.activeB1Phases.length &&
                  this.completedB1Phases.every(
                    (value, index) => value === this.activeB1Phases[index]
                  )
                ) {
                  this.buildingB1 = false;
                  this.completedB1 = true;
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
                if (
                  this.completedB2Phases.length === this.activeB2Phases.length &&
                  this.completedB2Phases.every(
                    (value, index) => value === this.activeB2Phases[index]
                  )
                ) {
                  this.buildingB2 = false;
                  this.completedB2 = true;
    
                  // eventually reset some variables
                }
              }
            } else if (this.completedB1 && this.completedB2) {
              this.incompleteB1Phases = this.incompleteB2Phases = [];
              this.completedB1Phases = this.completedB2Phases = [];
              this.unusedPhases = [];
              this.activeB1Phases = this.activeB2Phases = [];
              this.completedB1 = this.completedB2 = false;
              this.countCycles++;
    
              return true;
            }
          } else {
            return this.completedB1 && this.completedB2;
          }
        },
        incrementTerminationResults(phaseNumber, reason) {
          // Check if the phase exists in the object
          let phaseName = "phase" + phaseNumber;
    
          if (this.terminationResults.hasOwnProperty(phaseName)) {
            // Increment the corresponding reason
    
            this.terminationResults[phaseName][reason]++;
          } else {
            console.error(`Phase ${phaseName} does not exist. Only 1-8 available`);
          }
        },
        loadCsv2JsonObj(inData) {
          // Parse CSV data into an array of objects, requires enumerations.json in /data
          let hdData = [];
          const lines = inData.split("\n");
    
          lines.forEach((line) => {
            const [timestamp, eventCode, parameter] = line.trim().split(",");
    
            let eventCodeInt = parseInt(eventCode);
    
            hdData.push({
              timestamp: this.convertTimestamp(timestamp, this.timezone),
              eventCode: eventCodeInt,
              eventDescriptor: this.getEventDescriptor(eventCodeInt),
              parameterType: this.getParameterType(eventCodeInt), //Phase, TSP or Other
              parameterCode: parseInt(parameter), // 1-8 or channel or phase numbers, TSP Channel
              description: this.getEventDescription(eventCodeInt),
            });
          });
          
          return hdData;
        },
        calcTSPevents(dataObj){

          dataObj.forEach((obj) => {
            //Load TSP Events
            if (obj.parameterType === "TSP"){
              let tspChannel = obj.parameterCode;
              console.log("TSP Event Data", this.tspEventData, this.tspEventData.length > 0);
    
              if (obj.eventCode === 113) {
                console.log("TSP Early Green!!");
                this.tspEventData.push({
                  phaseEventTime: obj.timestamp,
                  phaseEventChannel: tspChannel,
                  phaseEventType: "Early Green",
                });
              } else if (obj.eventCode === 114) {
                this.tspEventData.push({
                  phaseEventTime: obj.timestamp,
                  phaseEventChannel: tspChannel,
                  phaseEventType: "Extend Green",
                });
              } else if (obj.eventCode === 112) {
                this.tspEventData.push({
                  checkInTime: obj.timestamp,
                  checkInChannel: tspChannel,
                })
              } else if (obj.eventCode === 115) {
                this.tspEventData.push({
                  checkOutTime: obj.timestamp,
                  checkOutChannel: tspChannel,
                });
              }
            }

          });
          return this.tspEventData;
      },
        buildCycleItem(dataObj) {
          
          const customFormat = "ccc, MMM d yyyy h:mm:ss.S a";
          let allPhaseData = [];
          
          dataObj.forEach((obj) => {
         
            //Load Phase Events
            if (obj.parameterType === "Phase" ) {

              let phaseNum = obj.parameterCode;
    
              if (
                this.phasesInCycle.includes(phaseNum) &&
                this.phaseArray[phaseNum].greenTimeStart
               
              ) {
                
                if (obj.eventCode === 7) {
                  this.phaseArray[phaseNum].greenTimeEnd = obj.timestamp.iso;
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
    
                  this.maxOutPercents =
                    this.calcAllPhaseTerminationPercents("Max Out");
                  this.gapOutPercents =
                    this.calcAllPhaseTerminationPercents("Gap Out");
                  this.forceOffPercents =
                    this.calcAllPhaseTerminationPercents("Force Off");
                  this.skippedPercents =
                    this.calcAllPhaseTerminationPercents("Skipped");
                  this.totalPhaseCalls[phaseNum -1] = 
                  this.countTotalTerminationsByPhase(phaseNum);
    
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
                    timestampYellowStartISO: this.phaseArray[phaseNum].yellowTimeStart,
                    timestampYellowEndISO: this.phaseArray[phaseNum].yellowTimeEnd,
                    timestampAllRedStartISO: this.phaseArray[phaseNum].redTimeStart,
                    timestampAllRedEndISO: this.phaseArray[phaseNum].redTimeEnd,
                    totalPhaseCalls: this.totalPhaseCalls,

                  };

    
                  this.rowData.push(phaseSplit);
                  allPhaseData.push(phaseSplit);
    
                  //emit phase durations to parent to display in table
                  this.$emit("phaseDurations", this.rowData);
                  
    
                  //clear phase data
                  this.phaseArray[phaseNum] = "";
                }
    
                if (this.isCycleComplete(phaseNum)) {
                  // take in phaseArray item and perform g,y,r duration calculations.
                  let phaseDur = this.calcPhaseDurations(
                    this.phaseArray,
                    this.phasesInCycle
                  );
    
                  let cycleFromPhases = this.calcSplitDuration(phaseDur);
    
                  this.phasesInCycle = [];
                  this.phaseArray = [];
                }
              } else {
                if (obj.eventCode === 1) {
                  this.phaseArray[phaseNum] = [];
                  this.phaseArray[phaseNum].phase = phaseNum;
                  this.phaseArray[phaseNum].greenTimeStart = obj.timestamp.iso;
    
                  this.phasesInCycle.push(phaseNum); //append phase to cycle array since it has a start time
                }
              } 
            }
            
          });
            return allPhaseData;
        },
      

      },
    };
