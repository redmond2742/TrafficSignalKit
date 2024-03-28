<template>
  <v-container class="grey lighten-5">
    <div class="left-justify-text">
      <v-expansion-panels v-model="gpxPanel" multiple>
        <v-expansion-panel title="Signal Data" value="about">
          <v-expansion-panel-text>
            <div class="grow-wrap">
              <InputBox v-model="signalLocations" />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-container>

  <div class="grow-wrap">
    <InputBox v-model="inputData" />
  </div>
  <br />
  <v-btn @click="bProcessGPX">Plot</v-btn>
  <v-btn @click="resetZoom">Reset Zoom</v-btn>

  <br />
  <div>
    <canvas ref="scatterPlotCanvas"></canvas>
  </div>
</template>

<script>
import InputBox from "./InputBox.vue";
import gpxParser from "gpxparser";
import { Chart } from "chart.js/auto"; // https://www.chartjs.org/
import zoomPlugin from "chartjs-plugin-zoom"; // https://www.chartjs.org/chartjs-plugin-zoom/latest/guide/animations.html

Chart.register(zoomPlugin);

export default {
  components: { InputBox },
  props: {},
  data() {
    return {
      gpxPanel: ["signal locations"],
      tracks: [],
      inputData: "",
      signalLocations: "",
      outputData: "",
      scatterData: [],
      signalPlotData: [],
      chartDataSet: [],
      allScatterPlotData: null,
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
            this.push_element(
              this.chartDataSet,
              this.createGPXTrack("GPX Track", this.scatterData)
            );
            // create the scatter data for plotting
            this.allScatterPlotData = this.createScatterData(this.chartDataSet);
            this.renderChart();
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
                  signalResult.correspondingValue
                )
              );
              this.push_element(
                this.signalPlotData,
                this.createScatterXY(
                  signalEndTime,
                  signalResult.correspondingValue
                )
              );
              this.push_element(
                this.chartDataSet,
                this.createSignal(signalObj[m].name, this.signalPlotData)
              );
              this.signalPlotData = [];
            }

            // append gpx chart data set
            this.push_element(
              this.chartDataSet,
              this.createGPXTrack("GPX Track", this.scatterData)
            );

            // create the scatter data for plotting
            this.allScatterPlotData = this.createScatterData(this.chartDataSet);

            const totalDistance = gpx.tracks[0].distance.cumul;
            this.outputData = totalDistance;

            this.renderChart();
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
    loadGPXPoints(gpxFile) {
      let totalCumlDistance = 0;
      for (let j = 0; j < gpxFile.length - 1; j++) {
        let currentLoc = [gpxFile[j].lat, gpxFile[j].lon];
        let nextLoc = [gpxFile[j + 1].lat, gpxFile[j + 1].lon];
        totalCumlDistance += this.earthDistance(nextLoc, currentLoc, false);

        // store data for ploting time space of gpx track
        this.scatterData.push({
          x:
            gpxFile[j].time.getTime() / 1000 - gpxFile[0].time.getTime() / 1000,
          y: totalCumlDistance, //cumulative Distance,
        });
      }
    },
    push_element(a, e) {
      // push element e into array
      a.push(e);
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
      let correspondingValue = null;
      let distances = signalObj[arrayIndex].distances;

      // Iterate over the first dimension of the 2D array
      for (let i = 0; i < distances.length; i++) {
        // Find the minimum value in the current row
        const minInRow = Math.min(...distances[i]);
        if (minInRow < minDistance) {
          minDistance = minInRow;
          correspondingValue = distances[i][1]; // Assuming the second column index is 1
        }
      }
      // Return an object containing the minimum distance and corresponding value
      return {
        minDistance: minDistance,
        correspondingValue: correspondingValue,
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
    createGPXTrack(gpxName, gpxData) {
      return {
        label: gpxName,
        data: gpxData,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        showLine: true,
        fill: false,
      };
    },
    createScatterData(d) {
      return {
        datasets: d,
      };
    },
    renderChart() {
      const ctx = this.$refs.scatterPlotCanvas.getContext("2d");
      var chartOptions = {
        title: {
          display: true,
          text: "Scatter Plot with Line Connecting Dots",
        },
        scales: {
          xAxes: [
            {
              type: "linear",
              position: "bottom",
            },
          ],
          yAxes: [
            {
              type: "linear",
              position: "left",
            },
          ],
        },
        plugins: {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              drag: {
                enabled: true,
              },
              mode: "xy",
            },
          },
        },
      };
      //console.log(this.signalPlotData[0]);
      var tempScatterData = {
        datasets: this.chartDataSet,
      };

      window.myPlot = new Chart(ctx, {
        type: "scatter",
        data: this.allScatterPlotData, //tempScatterData,
        options: chartOptions,
      });
    },
    resetZoom() {
      window.myPlot.resetZoom();
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
</style>
