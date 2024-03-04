<template>
  <h1 class="h1-center-text">GPX Processor</h1>

  <div class="left-justify-text">
    <v-expansion-panels v-model="panel" multiple>
      <v-expansion-panel title="About: GPX Processor" value="about">
        <v-expansion-panel-text>
          All About GPX Processor <br />
          GPX, or GPS Exchange Format, is an XML schema designed as a common GPS
          data format for software applications.
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel
        title="Detailed Explination: GPX Time Space"
        value="detailed-explain"
      >
        <v-expansion-panel-text>
          Technical Details of this Tool.
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Example: Using This Tool" value="example">
        <v-expansion-panel-text>
          &lt; trkseg &gt; &lt; trkpt lat="37.91553" lon="-122.06590" &gt; &lt;
          ele &gt; 43 &lt; /ele &gt; &lt; time &gt; 2024-03-02T19:28:13.174Z
          &lt; /time &gt; &lt; speed &gt; 16.13 &lt; /speed &gt; &lt; course
          &gt; 175.89 &lt; /course &gt; &lt; /trkpt &gt; &lt; trkpt
          lat="37.91538" lon="-122.06589" &gt; &lt; ele &gt; 42 &lt; /ele &gt;
          &lt; time &gt; 2024-03-02T19:28:14.195Z &lt; /time &gt; &lt; speed
          &gt; 15.07 &lt; /speed &gt; &lt; course &gt; 175.99 &lt; /course &gt;
          &lt; /trkpt &gt; &lt; trkpt lat="37.91512" lon="-122.06587" &gt; &lt;
          ele &gt; 42 &lt; /ele &gt; &lt; time &gt; 2024-03-02T19:28:16.181Z
          &lt; /time &gt; &lt; speed &gt; 11.15 &lt; /speed &gt; &lt; course
          &gt; 175.46 &lt; /course &gt; &lt; /trkpt &gt; &lt; trkpt
          lat="37.91502" lon="-122.06586" &gt; &lt; ele &gt; 42 &lt; /ele &gt;
          &lt; time &gt; 2024-03-02T19:28:17.209Z &lt; /time &gt; &lt; speed
          &gt; 8.39 &lt; /speed &gt; &lt; course &gt; 175.78 &lt; /course &gt;
          &lt; /trkpt &gt; &lt; trkpt lat="37.91487" lon="-122.06585" &gt; &lt;
          ele &gt; 41 &lt; /ele &gt; &lt; time &gt; 2024-03-02T19:28:19.213Z
          &lt; /time &gt; &lt; speed &gt; 4.08 &lt; /speed &gt; &lt; course &gt;
          178.03 &lt; /course &gt; &lt; /trkpt &gt; &lt; /trkseg &gt;
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
  <processGPX></processGPX>
</template>
<script>
import ProcessGPX from "../components/ProcessGPX.vue";

export default {
  name: "GpxPlotter",
  components: {
    ProcessGPX,
  },
  data() {
    return {
      panel: [],
      xmlString: "",
    };
  },
  methods: {
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
