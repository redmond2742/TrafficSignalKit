<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">High Resolution Split History</h1>
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
            This tool uses the
            <a href="https://docs.lib.purdue.edu/jtrpdata/4/"
              >Indiana Traffic Signal High Resolution Data Logger Enumerations. </a
            >[<a
              href="https://docs.lib.purdue.edu/cgi/viewcontent.cgi?article=1003&context=jtrpdata"
              >PDF</a
            >] to generate a Split Report of the signal for each of the phases.
            It ignores all the detection events (for now).
            <p>
              Every 10th of a second (100 millisecond resolution) the controller
              can log the state of over 150 different aspects of the traffic
              signal. Enumerations numbers clearly state an event description
              and assigns a parameter number such as a Phase or Channel number
              to each event. Each event includes a timestamp of when this
              occured. Six Traffic controller vendors (in no particular order:
              Econolite, Siemens, Peek, McCain, Intelight and Trafficware) have
              incorporated standardized data logging enumerations. These can be
              transfered from the controller and converted to a Comma Seperated
              Value (CSV) file through a vendor defined process. That CSV file
              can be copied into this tool to see a split report.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Detailed Explination About This Tool"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            This tool attempts to calculate the duration of each phase from the
            high resolution data and provide a reason for the phase ending. It
            calcuates the Start of Green to the End of Red. Note the All Red
            Clearance interval would be included in this duration.
            <br />
            <b>Features Available in this tool:</b>
            <ul>
              <li>See a table of each phase and how long it ran for</li>
              <li>Show if split was gapped out, maxed out or forced off</li>
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
16764339605, 1, 6
16764339605, 1, 2
16764339809, 7, 2
16764339809, 7, 6
16764339809, 8, 2
16764339809, 8, 6
16764339809, 4, 2
16764339809, 4, 6
16764339949, 9, 2
16764339949, 9, 6
16764339949, 10, 2
16764339949, 10, 6
16764340049, 12, 2
16764340049, 12, 6
16764340049, 11, 2
16764340049, 11, 6

              </pre
            >
            <p>
              Paste this in the text box below to show the split history of the
              high resolution data.
            </p>
            <br />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />

    <section class="left-justify-text faq-section">
      <h2>FAQ</h2>
      <div class="faq-item">
        <h3>What does the split history report show?</h3>
        <p>
          It summarizes each phase run time and indicates whether phases gapped
          out, maxed out, or were forced off.
        </p>
      </div>
      <div class="faq-item">
        <h3>How is split history calculated?</h3>
        <p>
          The tool derives phase durations from high-resolution event logs
          between the start of green and end of red.
        </p>
      </div>
    </section>

    <ProcessSplitHistory
      @phaseDurations="displayPhaseDuration"
    ></ProcessSplitHistory>

    <TableDisplaySplit :tableData="emittedData"></TableDisplaySplit>
  </div>
</template>

<script>
import ProcessSplitHistory from "../components/ProcessSplitHistory.vue";
import TableDisplaySplit from "../components/foundational/TableDisplaySplit.vue";

export default {
  components: {
    ProcessSplitHistory,
    TableDisplaySplit,
  },
  data() {
    return {
      processedData: null,
      panel: [],
      emittedData: [],
      emittedPhaseData: [],
    };
  },
  methods: {
    displayPhaseDuration(data) {
      this.emittedData = data;
      this.emittedPhaseData = data;
    },
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
};
</script>
<style scoped></style>
