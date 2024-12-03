<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">GPX Map Plotter</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: GPX Map Plotter" value="about">
          <v-expansion-panel-text>
            Mapping the locations of the latitude and longitude coordinates from
            a GPX file can be very helpful to visulize the locations.
            <br /><br />
            GPX, short for GPS Exchange Format, serves as a standardized XML
            schema tailored to facilitate the exchange of GPS data across
            various software applications. When incorporated into GPX
            files—repositories of GPS data capturing vehicle
            trajectories—time-space diagrams emerge as powerful tools for
            traffic engineers and planners. These diagrams enable a
            comprehensive evaluation of existing signal timing plans, offering
            insights into traffic dynamics and identifying areas ripe for
            enhancement. By tracking vehicle movements through intersections and
            along road segments over time, decision-makers gain the ability to
            pinpoint congestion hotspots and fine-tune signal phasing and timing
            parameters accordingly. This optimization process, in turn, drives
            improvements in overall traffic efficiency and safety. Moreover,
            time-space diagrams play a crucial role in assessing proposed signal
            timing adjustments, providing visual simulations that highlight
            potential impacts on traffic flow dynamics. Armed with this
            information, stakeholders can make informed decisions, leading to
            the implementation of more effective traffic management strategies.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="GPX Map Plotter TODO List"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            * Plot cumulative elevation gain over GPX track
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            &lt;?xml version=&quot;1.0&quot;?&gt; &lt;gpx
            version=&quot;1.0&quot; creator=&quot;Ultra GPS Logger&quot;
            xmlns:xsi=&quot;http://www.w3.org/2001/XMLSchema-instance&quot;
            xmlns=&quot;http://www.topografix.com/GPX/1/0&quot;
            xsi:schemaLocation=&quot;http://www.topografix.com/GPX/1/0
            http://www.topografix.com/GPX/1/0/gpx.xsd&quot;&gt; &lt;!-- segment:
            Walnut_Creek category: Car --&gt; &lt;trk&gt;
            &lt;name&gt;&lt;![CDATA[Walnut_Creek]]&gt;&lt;/name&gt;
            &lt;trkseg&gt; &lt;trkpt lat=&quot;37.89673&quot;
            lon=&quot;-122.06345&quot;&gt;&lt;ele&gt;36&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:48.198Z&lt;/time&gt;&lt;speed&gt;11.25&lt;/speed&gt;&lt;course&gt;154.66&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89664&quot;
            lon=&quot;-122.06339&quot;&gt;&lt;ele&gt;36&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:49.202Z&lt;/time&gt;&lt;speed&gt;10.77&lt;/speed&gt;&lt;course&gt;150.61&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89648&quot;
            lon=&quot;-122.06327&quot;&gt;&lt;ele&gt;37&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:51.197Z&lt;/time&gt;&lt;speed&gt;9.53&lt;/speed&gt;&lt;course&gt;149.53&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89640&quot;
            lon=&quot;-122.06322&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:52.207Z&lt;/time&gt;&lt;speed&gt;8.53&lt;/speed&gt;&lt;course&gt;150.80&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89629&quot;
            lon=&quot;-122.06313&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:54.195Z&lt;/time&gt;&lt;speed&gt;5.56&lt;/speed&gt;&lt;course&gt;151.90&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89621&quot;
            lon=&quot;-122.06308&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:56.219Z&lt;/time&gt;&lt;speed&gt;2.88&lt;/speed&gt;&lt;course&gt;152.29&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:32:58.198Z&lt;/time&gt;&lt;speed&gt;0.49&lt;/speed&gt;&lt;course&gt;152.40&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:00.142Z&lt;/time&gt;&lt;speed&gt;0.21&lt;/speed&gt;&lt;course&gt;152.39&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:01.194Z&lt;/time&gt;&lt;speed&gt;0.24&lt;/speed&gt;&lt;course&gt;152.42&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:03.207Z&lt;/time&gt;&lt;speed&gt;0.01&lt;/speed&gt;&lt;course&gt;152.47&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:05.134Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.44&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:06.159Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.45&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:08.143Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.42&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:09.156Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.41&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:11.173Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.45&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:13.190Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.47&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;38&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:14.219Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.49&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:16.192Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.49&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:18.203Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.47&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:20.139Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.47&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:21.215Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.48&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:23.196Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.51&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:25.143Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.53&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:26.188Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:28.174Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.51&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:30.147Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:32.155Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;39&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:34.140Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;40&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:36.141Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.53&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;40&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:37.159Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;trkpt lat=&quot;37.89618&quot;
            lon=&quot;-122.06306&quot;&gt;&lt;ele&gt;40&lt;/ele&gt;&lt;time&gt;2024-03-02T19:33:38.190Z&lt;/time&gt;&lt;speed&gt;0.00&lt;/speed&gt;&lt;course&gt;152.52&lt;/course&gt;&lt;/trkpt&gt;
            &lt;/trkseg&gt; &lt;/trk&gt; &lt;/gpx&gt;
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <processGPXMapper></processGPXMapper>
  </div>
</template>
<script>
import processGPXMapper from "../components/ProcessGPXMapper.vue";

export default {
  name: "gpxMapper",
  components: {
    processGPXMapper,
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
