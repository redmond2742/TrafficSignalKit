import gpxParser from "gpxparser";
import chartsAndPlots from "./chartsAndPlots";
import { DateTime } from "luxon";
//import * as toGeoJSON from "./mapbox/togeojson";
import * as toGeoJSON from '@mapbox/togeojson';
import * as GPX2GeoJSON from "../assets/js/gpx2geojson-master/gpx2geojson.js" //  https://github.com/M-Reimer/gpx2geojson
import { DOMParser } from '@xmldom/xmldom';

export default {
    mixins: [chartsAndPlots, toGeoJSON],
    data() {
        return {
            travelTime: {
                label: "Travel Time",
                value: "N/A",
                unit: "",
              },
              datetime: {
                label: "Full Date Timestamp",
                value: "",
                unit: "full date",
              },
              travelDist: {
                label: "Travel Distance",
                value: 0,
                unit: "",
              },
              avgSpeed: {
                label: "Avg. Speed",
                value: 0,
                unit: "",
              },
              numStops: {
                label: "Number of Stops",
                value: 0,
                unit: "Count",
              },
              durationStops: {
                label: "Duration of Stops",
                value: 0,
                unit: "Seconds",
              },
              avgDurationStops: {
                label: "Avg. Duration of Stops",
                value: 0,
                unit: "Seconds",
              },
              scatterData: [],
              colorsData: [],
              inputData: "",
              switchValue: false,
              chartDataSet: [],
              allScatterPlotData: null,
              signalPlotData: [],
              signalGreenPlotData: [],
              signalEarlyGreenTSPEvent: [],
              signalExtendGreenTSPEvent: [],
              signalYellowPlotData: [],
              signalRedPlotData: [],
              outputData: "",
              gpxXmin: 0,
              gpxXmax: 500,
              gpxYmin: 0,
              gpxYmax: 500,
              gpxMapData:"",
  

        }
    },
    methods: {
        push_element(a, e) {
            // push element e into array
            a.push(e);
          },
        remove_element(a, e){
          a.splice(e, 1)
        },
        earthDistance(point1, point2, miles = true) {
            const R = 6371; // Radius of the Earth in kilometers
            const [lat1, lon1] = point1;
            const [lat2, lon2] = point2;
            const dLat = ((lat2 - lat1) * Math.PI) / 180; // Convert degrees to radians
            const dLon = ((lon2 - lon1) * Math.PI) / 180; // Convert degrees to radians
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // Distance in kilometers
            if (miles) {
              return distance * 0.621371; //converted to miles
            } else {
              return distance * 0.621371 * 5280; //converted to feet
            }
          },
          createStaticObject(Name, Data, hexColor="rgba(150, 150, 150, 1)", lineThickness = 2) { 
            //useful for bus stops or signals without phasing
            return {
              label: Name,
              data: Data,
              backgroundColor: hexColor,
              borderColor: hexColor,
              borderWidth: lineThickness,
              showLine: true,
              fill: false,
            };
          },
          createBusStopObject(Name, Data, hexColor="rgba(130, 94, 92)", lineThickness=2) { 
            //useful for bus stops or signals without phasing
            return {
              label: Name,
              data: Data,
              backgroundColor: hexColor,//"rgba(130, 94, 92)",
              borderColor: hexColor,
              borderWidth: lineThickness,
              showLine: true,
              fill: false,
            };
          },
          createTrafficSignalObject(signalName, signalData, hexColor="rgba(165, 55, 253)", lineThickness=2) { 
            //useful for signals without phasing
            return {
              label: signalName,
              data: signalData,
              backgroundColor: hexColor,//"rgba(165, 55, 253)", //"rgba(255, 255, 255, 0)",
              borderColor: hexColor ,
              borderWidth: lineThickness,
              showLine: true,
              fill: false,
            };
          },
          createOtherObject(signalName, signalData, hexColor="rgba(255, 165, 0)", lineThickness=2) { 
            //useful for signals without phasing
            return {
              label: signalName,
              data: signalData,
              backgroundColor: hexColor,//"rgba(255, 165, 0)", //"rgba(255, 255, 255, 0)",
              borderColor: hexColor,
              borderWidth: lineThickness,
              showLine: true,
              fill: false,
            };
          },
          createGreenLight(signalName, signalData) { 
            return {
              label: signalName,
              data: signalData,
              backgroundColor: "#00A36C",
              borderColor: "#00A36C",
              borderWidth: 1,
              showLine: false,
              fill: false,
            };
          },
          createEarlyGreenTSPEvent(signalName, signalData) { 
            return {
              label: signalName,
              data: signalData,
              backgroundColor: "#FF0000" ,
              borderColor: "#00A36C",
              borderWidth: 1,
              showLine: false,
              fill: false,
              pointStyle: 'rect', //default: 'circle'
              radius: 5, //default: 3
              hoverRadius: 6,
              hoverBorderWidth: 3,
            };
          },
          createExtendGreenTSPEvent(signalName, signalData) { 
            return {
              label: signalName,
              data: signalData,
             
              backgroundColor: "#00A36C" ,
              borderColor: "FF0000",
              borderWidth: 1,
              showLine: false,
              fill: false,
              pointStyle: 'triangle', //default: 'circle'
              radius: 5, //default: 3
              hoverRadius: 6,
              hoverBorderWidth: 2,
            };
          },
          createYellowLight(signalName, signalData) { 
            return {
              label: signalName,
              data: signalData,
              backgroundColor: "#FAFA33",
              borderColor: "#FAFA33",
              borderWidth: 1,
              showLine: false,
              fill: false,
            };
          },
          createRedLight(signalName, signalData) { 
            return {
              label: signalName,
              data: signalData,
              backgroundColor: "#FF0000",
              borderColor: "#FF0000",
              borderWidth: 1,
              showLine: false,
              fill: false,
            };
          },
          createGPXTrack(gpxName, gpxData, speedArray = []) {
            // https://github.com/chartjs/Chart.js/issues/2670
            if (speedArray.length === 0){
                return {
                    label: gpxName,
                    data: gpxData,
                    backgroundColor: 'rgba(30, 139, 195, 1)',  // line color
                    borderColor: 'rgba(30, 139, 195, 1)', // line color outline
                    pointBackgroundColor: 'rgba(30, 139, 195, 0.5)',  //dot fill color
                    pointBorderColor: 'rgba(30, 139, 195, 1)', //dot outline color
                    borderWidth: 1,
                    showLine: true,
                    fill: false,

                }
            }
            else {
                return {
                    //for when speeds are shown as colors
                    label: gpxName,
                    data: gpxData,
                    backgroundColor: 'black', //"rgba(3, 138, 255, 0.5)",
                    borderColor: 'black', //"rgba(3, 138, 255, 0.5)",
                    pointBackgroundColor: speedArray,
                    pointBorderColor: speedArray,
                    borderWidth: 1,
                    showLine: true,
                    fill: false,
                }
            }
       
          },
          findCumulativeDistanceFromSignalObj(arrayIndex, signalObj) {
            let minDistance = Number.MAX_VALUE;
            let cumulativeDist = 0;
            let distances = signalObj[arrayIndex].distances;
      
            // Iterate over the first dimension of the 2D array
            for (let i = 0; i < distances.length; i++) {
              // Find the minimum value in the current row
              const minInRow = Math.min(distances[i][0]); // find min distance between gpx point and signal location.
              if (minInRow < minDistance) {
                minDistance = minInRow;
                cumulativeDist = distances[i][1]; // save the cumulative distance (column 1) if this is the closest point to a signal.
              }
            }
            // Return an object containing the minimum distance and cumulative distance for signal location
            return {
              minDistance: minDistance,
              cumulativeDist: cumulativeDist,
            };
          },
          
          speedToColor(speed) {
            let color;
            if (speed < 10) {
              color = "red";
            } else if (speed < 20) {
              color = "yellow";
            } else {
              color = "green";
            }
            return color;
          },
          loadMapPoints(gpxInput){
            // what does the outut need to look like to map this?
            //const mapGPXData = toGeoJSON.gpx(gpxFile);
            console.log(gpxInput)

            //const g2j = new GPX2GeoJSON();
            //const json = g2j.GPX2GeoJSON.fromText(gpxInput)
            //const jsonstr = JSON.stringify(json, null, "  ");


            //const doc = (new DOMParser()).parseFromString(text, "application/xml");
            const dom = (new DOMParser()).parseFromString(gpxInput, 'text/xml');
            //const dom = new xmldom.DOMParser().parseFromString(xmlStr, "text/xml");
            const mapGeoJSON = toGeoJSON.gpx(dom)

            console.log("Parsed gpx:", mapGeoJSON);

            return mapGeoJSON;

            //return gpxParsed.toGeoJSON();



          },
          loadGPXPoints(gpxFile) {
            let totalCumlDistance = 0;
            let totalSeconds = 0;
            let gpxFileLength = gpxFile.length;
            const speedThreshold = 3; // mph?
            const stopDurationThreshold = 3; // seconds
            let stops = 0;
            let consecutiveLowSpeedPoints = 0;
            let stopStartTime = null;
            let totalStopDuration = 0;
            let distance = 0;
            let timeDiffInSeconds = 0;
      
            for (let j = 0; j < gpxFileLength - 1; j++) {
              let currentLoc = [gpxFile[j].lat, gpxFile[j].lon];
              let nextLoc = [gpxFile[j + 1].lat, gpxFile[j + 1].lon];
              distance = this.earthDistance(nextLoc, currentLoc, false);
              totalCumlDistance += distance; //for timespace cuml distance
      
              timeDiffInSeconds =
                (gpxFile[j + 1].time.getTime() - gpxFile[j].time.getTime()) / 1000;
      
              const speedMPH = (distance / timeDiffInSeconds) * 0.681818; // ft/sec to MPH
      
              if (speedMPH < speedThreshold) {
                if (stopStartTime === null) {
                  stopStartTime = gpxFile[j].time.getTime() / 1000;
                }
                consecutiveLowSpeedPoints++;
              } else {
                if (
                  stopStartTime !== null &&
                  consecutiveLowSpeedPoints * timeDiffInSeconds >=
                    stopDurationThreshold
                ) {
                  stops++;
                  totalStopDuration += consecutiveLowSpeedPoints * timeDiffInSeconds;
                  stopStartTime = null; // reset stop start time
                }
                consecutiveLowSpeedPoints = 0;
              }
              this.numStops.value = stops;
              this.durationStops.value = totalStopDuration.toFixed(2);
              this.avgDurationStops.value = (
                this.durationStops.value / this.numStops.value
              ).toFixed(2);
      
              this.scatterData // store data for ploting time space of gpx track
                .push({
                  x:
                    gpxFile[j].time.getTime() / 1000 -
                    gpxFile[0].time.getTime() / 1000,
                  y: totalCumlDistance, //cumulative Distance,
                });
      
              this.colorsData.push(this.speedToColor(speedMPH));
            }
            //Set Metric Variables
            if (totalCumlDistance > 5280) {
              this.travelDist.value = (totalCumlDistance / 5280).toFixed(2);
              this.travelDist.unit = "miles";
            } else {
              this.travelDist.value = totalCumlDistance.toFixed(2);
              this.travelDist.unit = "Feet";
            }
      
            totalSeconds =
              gpxFile[gpxFileLength - 1].time.getTime() / 1000 -
              gpxFile[0].time.getTime() / 1000;
      
            this.travelTime.value = this.formatDuration(totalSeconds);
            this.travelTime.unit = "hh:mm:ss.ms";
      
            this.datetime.value = gpxFile[0].time;
      
            this.avgSpeed.value = (
              (totalCumlDistance / totalSeconds) *
              0.68181818
            ).toFixed(1);
            this.avgSpeed.unit = "MPH";
          },
          isStaticObject(staticObj){
            console.log(staticObj);
         
            try{
                if (staticObj[0].typeStaticObject){
                    return true;
                } else {
                    return false;
                }
            }
            catch {
                return false;
            }

            /*
            let typesToCheck = []
            typesToCheck.push(type)
       
            try{
                let staticObjectTypeBool = false;
                staticObjectTypeBool = staticObj.some(obj => {
                    const values = Object.values(obj);
                    console.log("values",values)
                    return  typesToCheck.some(type => values.includes(type)) //values.includes('Traffic Signal') || values.includes('Bus Stop');
                });
                return staticObjectTypeBool;

            }
            catch{
                return false;
            }
            */
          },
          selectStaticObjectData(staticObj){
            const hasDetailedSOData = (this.isStaticObject(staticObj ) || this.isStaticObject(staticObj) || this.isStaticObject(staticObj));
            
            console.log(staticObj, staticObj[1].typeStaticObject, typeof staticObj, hasDetailedSOData, "ts:", this.isStaticObject(staticObj), "bs:", this.isStaticObject(staticObj))
            
            if(typeof staticObj === 'string') {
                return this.parseCSVToSignalObj(staticObj)
            } 
            else if ((staticObj.type === undefined) ){//|| staticObj[1].typeStaticObject !== undefined){
                return this.parseStaticObjInfo(staticObj)
             }
          },
          ProcessGPX(inputGPXData, staticObjData, mapPoints=false) {
            //let gpxParser = require("gpxparser");
            let [i, j, k, m, n, p, q] = [0, 0, 0, 0, 0, 0];
      
            let gpx = new gpxParser();
            //let cumDist = 0;
            //let tsData = [];
            let currentLoc = [];
            let nextLoc = [];
            let totalCumlDistance = 0;
            let signalCumlDistance = 0;
            let signalDistance = [];
            let signalStartTime = 0;
            let signalEndTime = 0;
            let startGPXTime = 0;
            let gpxBoxXY = [];
            let mapJSONData = '';

            // NOTE: EST/10800 is for east coast adjustment to GPX timestamp for local clock. Remove when on Westcoast.
            const EST = 0 //10800 - east coast adjustment for local clock;
      
            if (false) {
              console.log(error);
            } else {
              gpx.parse(inputGPXData);

              if(mapPoints){
                this.gpxMapData = this.loadMapPoints(inputGPXData);
                //return mapJSONData;
             
              } else{

              
      
                try {
                  let gpxPoints = gpx.tracks[0].points;
                  startGPXTime = gpxPoints[0].time.getTime() / 1000; //milliseconds to seconds

                  let xBuffer = (gpxPoints[gpx.tracks[0].points.length-1].time.getTime() / 1000 - startGPXTime) * 0.1; // create buffer at right side of plot
                  let yBuffer = gpx.tracks[0].distance.cumul * 0.5; // create buffer at top of plot
                  // x1,y1, x2,y2
                  gpxBoxXY = [0, 0, gpxPoints[gpx.tracks[0].points.length-1].time.getTime() / 1000 - startGPXTime + xBuffer, gpx.tracks[0].distance.cumul + yBuffer]
        
                  // If no signal information is provided, then plot GPX points only.
                  if (Object.keys(staticObjData).length === 0) {
                    console.log("No Signal Locations Entered", staticObjData);
        
                    this.loadGPXPoints(gpxPoints);
                   
        
                    // append gpx chart data set
                    if (this.switchValue) {
                      this.push_element(
                        this.chartDataSet,
                        this.createGPXTrack(
                          "GPX Track (Red:<10mph, Yellow:<20mph,Green:>20mph)",
                          this.scatterData,
                          this.colorsData
                        )
                      );
                    } else {
                      this.push_element(
                        this.chartDataSet,
                        this.createGPXTrack("GPX Track", this.scatterData)
                      );
                    }
        
                    // create the scatter data for plotting
                    this.allScatterPlotData = this.createScatterDataset(this.chartDataSet);
        
                    this.renderChart(this.allScatterPlotData);
                    // If signal locations are provided, then plot those and the GPX file
                  } else {
                    let signalObj = [];
                    signalObj = this.selectStaticObjectData(staticObjData);
                    for (i = 0; i <= signalObj.length - 1; i++) {
                      for (j = 0; j < gpx.tracks[0].points.length - 1; j++) {
                        currentLoc = [gpxPoints[j].lat, gpxPoints[j].lon];
                        nextLoc = [gpxPoints[j + 1].lat, gpxPoints[j + 1].lon];
                        signalCumlDistance += this.earthDistance(
                          nextLoc,
                          currentLoc,
                          false
                        );
                        //console.log("i: " + i + "    J: " + j);
                        // Calclate all the distances from each gps point (j) to the center of the intersection (i)
                        signalObj[i].distances.push([
                          [
                            this.earthDistance(
                              currentLoc,
                              [signalObj[i].latitude, signalObj[i].longitude],
                              false
                            ),
                          ],
                          [signalCumlDistance],
                        ]);
                      }
                      signalCumlDistance = 0;
                    }
                    console.log(signalObj);
        
                    this.loadGPXPoints(gpxPoints);

              

                    for (m = 0; m <= signalObj.length - 1; m++) {
                      if (signalObj[m].phaseData !== undefined){
                          console.log("High Res data provided",  DateTime.fromISO(signalObj[m].phaseData[0].timestampStartISO).toSeconds() );
                          console.log("gpxTime",startGPXTime, gpxPoints[0].time.getTime() /1000, DateTime.fromISO(signalObj[m].phaseData[0].timestampStartISO).toSeconds() );
                          
                          let startCount;
                          let signalStartDelta = 0;
                          const interval = 1; //in seconds. Use 1/10 if you want all high res data
                          let earlyGreenEvents = [];
                          let lateGreenEvents = [];
                          
                          let signalResult = this.findCumulativeDistanceFromSignalObj(
                              m,
                              signalObj
                            );

                          signalStartDelta = startGPXTime - DateTime.fromISO(signalObj[m].phaseData[0].timestampStartISO).toSeconds()
                          
                          console.log("Signal Start Delta", signalStartDelta)

                          //Calculate TSP Events for plotting
                          if(signalObj[m].tspPreempt){
                            for(n= 0; n < signalObj[m].tspEvents.length; n++){
                              if(signalObj[m].tspEvents[n].phaseEventChannel === signalObj[m].tspPreempt){
                                
                                if(signalObj[m].tspEvents[n].phaseEventType && signalObj[m].tspEvents[n].phaseEventType === "Early Green"){
                                  earlyGreenEvents.push({
                                    start: DateTime.fromISO(signalObj[m].tspEvents[n].phaseEventTime.iso).toSeconds() - startGPXTime,
                                
                                  })
                                } else if( signalObj[m].tspEvents[n].phaseEventType && signalObj[m].tspEvents[n].phaseEventType === "Extend Green"){
                                  lateGreenEvents.push({
                                    start: DateTime.fromISO(signalObj[m].tspEvents[n].phaseEventTime.iso).toSeconds() - startGPXTime,
                                
                                  })
                                }
                                console.log("Yes, the tsp channels are equal!",lateGreenEvents, signalObj[0].tspPreempt > 0, signalObj[0].tspPreempt, lateGreenEvents.length)
                              }
                            }

                          }
                          
                    
                          for (j = 0; j < signalObj[m].phaseData.length -1; j++){
                              let phaseData = signalObj[m].phaseData[j];


                              //Only use phase value of interest, as selected in menu.
                              console.log("PH:",phaseData.phase,  signalObj[m].phase, signalObj[m].phase === phaseData.phase )
                              if(signalObj[m].phase === phaseData.phase){
                                  for(k = j+1; k < signalObj[m].phaseData.length - 1; k++){
                                      let nextPhaseData = signalObj[m].phaseData[k];
                                      if(signalObj[m].phase === nextPhaseData.phase){
                                          
                                          let startTime = (DateTime.fromISO(phaseData.timestampStartISO).toSeconds() - startGPXTime+EST);
                                          let nextStartTime = (DateTime.fromISO(nextPhaseData.timestampStartISO).toSeconds() - startGPXTime+EST);
                                          let lastItem = signalObj[m].phaseData.length -1;
                                          console.log(j,": st & next st:",startTime, nextStartTime, DateTime.fromISO(signalObj[m].phaseData[lastItem].timestampStartISO).toSeconds());
                                          
                                          for(let t = startTime; t < nextStartTime; t += interval ){
          
                                              console.log("G,Y:",phaseData.greenTime,phaseData.yellowTime)

                                          
                                              
                                              if (t > startTime  && t < startTime + phaseData.greenTime){
                                                  this.push_element(this.signalGreenPlotData, this.createScatterXY(
                                                      t,
                                                      signalResult.cumulativeDist
                                                  ));
                                              
                                              } else if ( t>= startTime + phaseData.greenTime && t < startTime + phaseData.yellowTime + phaseData.greenTime){
                                                this.push_element(this.signalYellowPlotData, this.createScatterXY(
                                                    t,
                                                    signalResult.cumulativeDist
                                                  ))
                                              } else {//if( t>= startTime + phaseData.greenTime + phaseData.yellowTime && t < nextStartTime){
                                                this.push_element(this.signalRedPlotData, this.createScatterXY(
                                                    t,
                                                    signalResult.cumulativeDist
                                                ))
                                              }
                                              
                                              //TSP Events
                                              if ( signalObj[m].tspPreempt > 0){
                                                for (p = 0; p <= earlyGreenEvents.length-1; p++ ){
                                                  // Early Green
                                                  if((earlyGreenEvents[p].start > startTime)  && (earlyGreenEvents[p].start < nextStartTime) && t >= (earlyGreenEvents[p].start)){
                                                    this.push_element(this.signalEarlyGreenTSPEvent, this.createScatterXY(
                                                      t,
                                                      signalResult.cumulativeDist
                                                    ))
                                                  

                                                  } 
                                                }
                                                // Extend Green
                                                for (q = 0; q <= lateGreenEvents.length - 1; q++){
                                                  if((lateGreenEvents[q].start > startTime) && (lateGreenEvents[q].start < nextStartTime) && t>= lateGreenEvents[q].start){
                                                    this.push_element(this.signalExtendGreenTSPEvent, this.createScatterXY(
                                                      t,
                                                      signalResult.cumulativeDist
                                                  ))
                                                  }

                                                }

                                                
                                              } else if ( t>= startTime + phaseData.greenTime && t < startTime + phaseData.yellowTime + phaseData.greenTime){
                                                  this.push_element(this.signalYellowPlotData, this.createScatterXY(
                                                      t,
                                                      signalResult.cumulativeDist
                                                  ))
                                              } else {//if( t>= startTime + phaseData.greenTime + phaseData.yellowTime && t < nextStartTime){
                                                  this.push_element(this.signalRedPlotData, this.createScatterXY(
                                                      t,
                                                      signalResult.cumulativeDist
                                                  ))
                                              }
                                              
                  
                                          } break;
                                          
                                              
                                      } 

                                  }
                              }     
                              
                          }

                          console.log("late tsp green", this.signalExtendGreenTSPEvent);
                          
                          this.push_element(
                              this.chartDataSet,
                              this.createGreenLight(signalObj[m].name, this.signalGreenPlotData)
                              );
                          this.push_element(
                              this.chartDataSet,
                              this.createEarlyGreenTSPEvent(signalObj[m].name, this.signalEarlyGreenTSPEvent)
                              );
                          this.push_element(
                            this.chartDataSet,
                            this.createExtendGreenTSPEvent(signalObj[m].name, this.signalExtendGreenTSPEvent)
                            );
                          this.push_element(
                              this.chartDataSet,
                              this.createYellowLight(signalObj[m].name, this.signalYellowPlotData)
                              );
                          this.push_element(
                              this.chartDataSet,
                              this.createRedLight(signalObj[m].name, this.signalRedPlotData)
                              );

                          this.signalGreenPlotData = [];
                          this.signalEarlyGreenTSPEvent = [];
                          this.signalExtendGreenTSPEvent = [];
                          this.signalYellowPlotData = [];
                          this.signalRedPlotData = [];
                          


                      
                      }else{
                          signalStartTime =
                          gpxPoints[0].time.getTime() / 1000 - startGPXTime;
                          signalEndTime =
                          gpxPoints[gpx.tracks[0].points.length - 1].time.getTime() /
                              1000 -
                          startGPXTime;
          
                          let signalResult = this.findCumulativeDistanceFromSignalObj(
                          m,
                          signalObj
                          );

                          //static object start point
                          this.push_element(
                          this.signalPlotData,
                          this.createScatterXY(
                              signalStartTime,
                              signalResult.cumulativeDist
                          )
                          );
                          //static object end point
                          this.push_element(
                          this.signalPlotData,
                          this.createScatterXY(signalEndTime, signalResult.cumulativeDist)
                          );
                          
                          //Lines for static objects along gpx route
                          if(signalObj[m].type === 'Traffic Signal'){
                              this.push_element(
                                  this.chartDataSet,
                                  this.createTrafficSignalObject(signalObj[m].name, this.signalPlotData, signalObj[m].color, signalObj[m].lineThickness)
                              );
                          }else if(signalObj[m].type === 'Bus Stop'){
                              this.push_element(
                                  this.chartDataSet,
                                  this.createBusStopObject(signalObj[m].name, this.signalPlotData, signalObj[m].color, signalObj[m].lineThickness)
                              );
                          } else if (signalObj[m].type === 'Other'){
                              this.push_element(
                                  this.chartDataSet,
                                  this.createOtherObject(signalObj[m].name, this.signalPlotData, signalObj[m].color, signalObj[m].lineThickness)
                              );
                          }
                          else{
                              //CVS basic static object info
                              this.push_element(
                                  this.chartDataSet,
                                  this.createStaticObject(signalObj[m].name, this.signalPlotData, signalObj[m].color, signalObj[m].lineThickness)
                              );
                          }
                      
                          this.signalPlotData = [];
                      }
                  }
        
                    // append gpx chart data set
                    if (this.switchValue) {
                      this.push_element(
                        this.chartDataSet,
                        this.createGPXTrack(
                          "GPX Track (Red:<10mph, Yellow:<20mph,Green:>20mph)",
                          this.scatterData,
                          this.colorsData
                        )
                      );
                    } else {
                      this.push_element(
                        this.chartDataSet,
                        this.createGPXTrack("GPX Track", this.scatterData)
                      );
                    }
        
                    // create the scatter data for plotting
                    this.allScatterPlotData = this.createScatterDataset(this.chartDataSet);
        
                    const totalDistance = gpx.tracks[0].distance.cumul;
                    this.outputData = totalDistance;
        
                    this.renderChart(this.allScatterPlotData);
                  }
                } catch (error) {
                  console.error(error);
                }
              }
          }
            return gpxBoxXY;
          },
          formatDuration(seconds) {
            let hours = Math.floor(seconds / 3600);
            let minutes = Math.floor((seconds % 3600) / 60);
            let remainingSeconds = (seconds % 60).toFixed(2);
      
            let formattedValue = `${this.padZero(hours)}:${this.padZero(
              minutes
            )}:${this.padZero(remainingSeconds)}`;
      
            return formattedValue;
          },
      
          padZero(num) {
            return num.toString().padStart(2, "0");
          },

    }
}