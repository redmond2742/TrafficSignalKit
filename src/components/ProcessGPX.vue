<template>
  <v-container class="grey lighten-5">
    <div class="left-justify-text">
      <v-expansion-panels v-model="gpxPanel" multiple>
        <v-expansion-panel
          title="Signal Locations as CSV: Name,Latitude,Longitude"
          value="about"
        >
          <v-expansion-panel-text>
            <div class="grow-wrap">
              <InputBox
                v-model="signalLocations"
                :defaultText="signalInfoTextboxDefaultText"
              />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-container>

  <div class="grow-wrap">
    <InputBox v-model="inputData" :defaultText="gpxTextboxDefaultText" />
  </div>
  <br />
  <div class="button-container">
    <v-row>
      <v-btn color="primary" @click="bProcessGPX">Plot</v-btn>
      <hr />
      <hr />
      <hr />

      <v-switch
        v-model="switchValue"
        color="primary"
        label="Show Speeds as Color"
      ></v-switch>
    </v-row>
  </div>

  <br />
  <v-row>
    <v-col cols="2"></v-col>
    <div class="metrics-container">
      <metric :data="datetime"></metric>
    </div>
    <v-col cols="2"></v-col>
  </v-row>

  <v-row>
    <v-col cols="4"></v-col>
    <div class="metrics-container">
      <metric :data="travelTime"></metric>
      <metric :data="travelDist"></metric>
      <metric :data="avgSpeed"></metric>
    </div>
  </v-row>
  <v-row>
    <v-col cols="4"></v-col>
    <div class="metrics-container">
      <metric :data="numStops"></metric>
      <metric :data="durationStops"></metric>
      <metric :data="avgDurationStops"></metric>
    </div>
  </v-row>

  <br />
  <div>
    <v-btn color="info" @click="resetZoom">Reset Zoom</v-btn>

    <canvas ref="scatterPlotCanvas"></canvas>
  </div>
</template>

<script>
import InputBox from "./foundational/InputBox.vue";
import gpxParser from "gpxparser";
import chartsAndPlots from "../mixins/chartsAndPlots";
import Metric from "./foundational/Metric.vue";

export default {
  mixins: [chartsAndPlots],
  components: { InputBox, Metric },
  props: {},
  data() {
    return {
      gpxTextboxDefaultText: "Paste in GPX file in XML format",
      signalInfoTextboxDefaultText:
        "For each signal location, Paste in CSV of: Name, Latitude, Longitude",
      gpxPanel: ["signal locations"],
      switchValue: false,
      tracks: [],
      inputData: "",
      signalLocations: "",
      outputData: "",
      scatterData: [],
      colorsData: [],
      signalPlotData: [],
      chartDataSet: [],
      allScatterPlotData: null,
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
    };
  },
  mounted() {},
  methods: {
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
    handleUpdateTravelTime() {},

    bProcessGPX(input) {
      //let gpxParser = require("gpxparser");
      let [i, j, k] = [0, 0, 0];

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

      if (false) {
        console.log(error);
      } else {
        //console.log(this.parseCSV(this.signalLocations));
        gpx.parse(this.inputData);
        console.log(this.signalLocations);

        try {
          let gpxPoints = gpx.tracks[0].points;
          startGPXTime = gpxPoints[0].time.getTime() / 1000; //milliseconds to seconds

          // If no signal information is provided, then plot GPX points only.
          if (this.signalLocations === "") {
            console.log("No Signal Locations Entered");

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
            this.allScatterPlotData = this.createScatterData(this.chartDataSet);

            this.renderChart(this.allScatterPlotData);
            // If signal locations are provided, then plot those and the GPX file
          } else {
            let signalObj = [];
            signalObj = this.parseCSVToSignalObj(this.signalLocations);
            for (i = 0; i <= signalObj.length - 1; i++) {
              for (j = 0; j < gpx.tracks[0].points.length - 1; j++) {
                currentLoc = [gpxPoints[j].lat, gpxPoints[j].lon];
                nextLoc = [gpxPoints[j + 1].lat, gpxPoints[j + 1].lon];
                signalCumlDistance += this.earthDistance(
                  nextLoc,
                  currentLoc,
                  false
                );
                console.log("i: " + i + "    J: " + j);
                // Calclate all the distances from each gps point (j) to the center of the intersection i
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

            // Plot start and end time for a signal location
            for (let m = 0; m <= signalObj.length - 1; m++) {
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
              this.push_element(
                this.signalPlotData,
                this.createScatterXY(
                  signalStartTime,
                  signalResult.cumulativeDist
                )
              );
              this.push_element(
                this.signalPlotData,
                this.createScatterXY(signalEndTime, signalResult.cumulativeDist)
              );
              this.push_element(
                this.chartDataSet,
                this.createSignal(signalObj[m].name, this.signalPlotData)
              );
              this.signalPlotData = [];
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
            this.allScatterPlotData = this.createScatterData(this.chartDataSet);

            const totalDistance = gpx.tracks[0].distance.cumul;
            this.outputData = totalDistance;

            this.renderChart(this.allScatterPlotData);
          }
        } catch (error) {
          console.error(error);
        }
      }
    },
    createScatterXY(x_data, y_data) {
      return {
        x: x_data,
        y: y_data,
      };
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

    //to be removed.
    calculateStops(trackPoints, speedThreshold, stopDurationThreshold) {
      let stops = 0;
      let consecutiveLowSpeedPoints = 0;
      let stopStartTime = null;
      let totalStopDuration = 0;

      for (let i = 0; i < trackPoints.length - 1; i++) {
        const currentPoint = trackPoints[i];
        const nextPoint = trackPoints[i + 1];

        // Calculate distance between two points (you may have your own method for this)
        const distance = calculateDistance(currentPoint, nextPoint);

        // Calculate time difference between two points
        const timeDiffInSeconds =
          (nextPoint.timestamp - currentPoint.timestamp) / 1000;

        // Calculate speed (distance / time)
        const speed = distance / timeDiffInSeconds;

        // Check if speed is below the threshold
        if (speed < speedThreshold) {
          if (stopStartTime === null) {
            stopStartTime = currentPoint.timestamp;
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
            stopStartTime = null; // Reset stop start time
          }
          consecutiveLowSpeedPoints = 0;
        }
      }

      return {
        numberOfStops: stops,
        totalStopDuration: totalStopDuration,
      };
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
    push_element(a, e) {
      // push element e into array
      a.push(e);
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
    parseCSVToSignalObj(csvString) {
      // Split the CSV string into individual lines
      const lines = csvString.trim().split("\n");

      // Initialize an empty array to store the parsed objects
      const objects = [];

      // Iterate over each line and parse its fields
      lines.forEach((line) => {
        // Split the line into fields (name, latitude, longitude)
        const fields = line.trim().split(",");

        // Extract name, latitude, and longitude from the fields
        const name = fields[0].trim();
        const latitude = parseFloat(fields[1].trim());
        const longitude = parseFloat(fields[2].trim());

        // Construct an object with name, latitude, and longitude
        const object = {
          name: name,
          latitude: latitude,
          longitude: longitude,
          latlon: [latitude, longitude],
          distances: [[], []],
          cDistance: [],
        };

        // Push the object to the array of parsed objects
        objects.push(object);
      });

      // Return the array of parsed objects
      return objects;
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
    createSignal(signalName, signalData) {
      return {
        label: signalName,
        data: signalData,
        backgroundColor: "rgba(200, 200, 200, 0.2)",
        borderColor: "rgba(150, 150, 150, 1)",
        borderWidth: 1,
        showLine: true,
        fill: false,
      };
    },
    createGPXTrack(gpxName, gpxData, speedArray = []) {
      return {
        label: gpxName,
        data: gpxData,
        backgroundColor: "rgba(0, 0, 0, .7)",
        borderColor: "rgba(0, 0, 0, 1)",
        borderWidth: 1,
        showLine: true,
        fill: false,
        pointBackgroundColor: speedArray,
        pointBorderColor: speedArray,
      };
    },
    createScatterData(d) {
      return {
        datasets: d,
      };
    },
  },
};
</script>

<style scoped>
textarea {
  height: 400px;
}
signaltextarea {
  height: 200px;
}
.metrics-container {
  display: flex;
  justify-content: center;
}

/* Adjust spacing between metrics if needed */
.metrics-container > * {
  margin-right: 20px; /* Adjust margin as needed */
}
.button-space {
  margin-left: 20px;
}
</style>
