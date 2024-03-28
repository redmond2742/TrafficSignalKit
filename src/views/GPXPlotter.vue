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
          &lt;?xml version=&quot;1.0&quot;?&gt; &lt;gpx version=&quot;1.0&quot;
          creator=&quot;Ultra GPS Logger&quot;
          xmlns:xsi=&quot;http://www.w3.org/2001/XMLSchema-instance&quot;
          xmlns=&quot;http://www.topografix.com/GPX/1/0&quot;
          xsi:schemaLocation=&quot;http://www.topografix.com/GPX/1/0
          http://www.topografix.com/GPX/1/0/gpx.xsd&quot;&gt; &lt;!-- segment:
          Walnut_Creek category: Car --&gt; &lt;trk&gt;
          &lt;name&gt;&lt;![CDATA[Walnut_Creek]]&gt;&lt;/name&gt; &lt;trkseg&gt;
          &lt;trkpt lat=&quot;37.91553&quot;
          lon=&quot;-122.06590&quot;&gt;&lt;ele&gt;43&lt;/ele&gt;&lt;time&gt;2024-03-02T19:28:13.174Z&lt;/time&gt;&lt;speed&gt;16.13&lt;/speed&gt;&lt;course&gt;175.89&lt;/course&gt;&lt;/trkpt&gt;
          &lt;trkpt lat=&quot;37.91538&quot;
          lon=&quot;-122.06589&quot;&gt;&lt;ele&gt;42&lt;/ele&gt;&lt;time&gt;2024-03-02T19:28:14.195Z&lt;/time&gt;&lt;speed&gt;15.07&lt;/speed&gt;&lt;course&gt;175.99&lt;/course&gt;&lt;/trkpt&gt;
          &lt;trkpt lat=&quot;37.91512&quot;
          lon=&quot;-122.06587&quot;&gt;&lt;ele&gt;42&lt;/ele&gt;&lt;time&gt;2024-03-02T19:28:16.181Z&lt;/time&gt;&lt;speed&gt;11.15&lt;/speed&gt;&lt;course&gt;175.46&lt;/course&gt;&lt;/trkpt&gt;
          &lt;/trkseg&gt; &lt;/trk&gt; &lt;/gpx&gt;

          <br /><br /><br />
          Main & Penniman, 37.91468731793959, -122.065680012584, <br />
          CA/Civic, 37.9013511000743, -122.064401378189 <br />
          CA/YVR, 37.90495039889445, -122.06575265782921 <br />
          CA/Mt. D, 37.897397411618044, -122.06344916387569 <br />
          CA/Olympic, 37.89600895917039, -122.06282426447109 <br />
          CA/Bohtelo, 37.89457361001387, -122.061923996248 <br />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
  <br />
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
