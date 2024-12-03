<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">High Resolution Data Explainer</h1>
    <!--

        <label for="csvInput">Enter your High Resolution Controller Enumerations as CSV data</label> <br>

    -->

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel
          title="About: High Resolution Definition"
          value="about"
        >
          <v-expansion-panel-text>
            Traffic signal controllers can collect data about the state of the
            controller including the signal states, detector states, timing
            plans and many other events. Arterial Traffic Signal Performance
            Measures (ATSPM) have been developed to help visualize this data.
            This tool starts with the basic building blocks and explains this
            data as defined by the
            <a href="https://docs.lib.purdue.edu/jtrpdata/4/"
              >Indiana Traffic Signal High Resolution Data Logger Enumerations. </a
            >[<a
              href="https://docs.lib.purdue.edu/cgi/viewcontent.cgi?article=1003&context=jtrpdata"
              >PDF</a
            >]
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Detailed Explination: CSV Formatted Data"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            Every 10th of a second (100 millisecond resolution) the controller
            can log the state of over 150 different aspects of the traffic
            signal. Enumerations numbers clearly state an event description and
            assigns a parameter number such as a Phase or Channel number to each
            event. Each event includes a timestamp of when this occured. Six
            Traffic controller vendors (in no particular order: Econolite,
            Siemens, Peek, McCain, Intelight and Trafficware) have incorporated
            standardized data logging enumerations. These can be transfered from
            the controller and converted to a Comma Seperated Value (CSV) file
            through a vendor defined process. That CSV file can be copied into
            this tool for the data to be clearly explained.
            <br />
            <b>Future Features to Consider:</b>

            <ul>
              <li>
                Export table of results as Excel:
                https://www.delftstack.com/howto/javascript/exprt-html-table-to-excel-javascript/
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            <p>
              For a high resolution data file text as CSV File, in the format
              shown here:
            </p>
            <pre>
16764359675, 0, 6
16764359675, 1, 6
16764359675, 11, 5
16764359677, 44, 6
            </pre>
            <p>
              Paste this in the text box below to explain when these
              enumerations and corresponding phases or channels occurred.
            </p>
            <br />
            <pre>
5/6/2024 17:33:38.5, 50, 2
5/6/2024 17:33:38.5, 200, 61
5/6/2024 17:33:38.5, 175, 8
5/6/2024 17:33:38.7, 44, 2
5/6/2024 17:33:38.7, 82, 15
5/6/2024 17:33:39.0, 201, 61
5/6/2024 17:33:39.0, 175, 8
5/6/2024 17:33:39.4, 81, 15
5/6/2024 17:33:42.0, 13, 2
5/6/2024 17:33:42.0, 16, 2
</pre
            >
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />

    <CSVInput @csvDataProcessed="handleProcessedData" />

    <ProcessedData v-if="processedData" :data="processedData" />
  </div>
</template>

<script>
import CSVInput from "../components/CSVInput.vue";
import ProcessedData from "../components/ProcessedData.vue";

export default {
  components: {
    CSVInput,
    ProcessedData,
  },
  data() {
    return {
      processedData: null,
      panel: [],
    };
  },
  methods: {
    handleProcessedData(data) {
      this.processedData = data;
    },
    all() {
      this.panel = ["foo", "bar", "baz"];
    },
    none() {
      this.panel = [];
    },
  },
  computed: {},
};
</script>

<style>
p {
  text-align: left;
}
pre {
  text-align: left;
}

table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

td,
th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

th {
  background-color: #dddddd;
}

input[type="text"],
select {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  margin-top: 25px;
}
</style>
