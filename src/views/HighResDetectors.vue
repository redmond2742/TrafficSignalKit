<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Detector Event</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Detector Events" value="about">
          <v-expansion-panel-text>
            Detection events for a traffic signal controller refer to the
            moments when sensors, such as inductive loops or cameras, detect the
            presence of vehicles or pedestrians at an intersection. These events
            trigger the controller to adjust the signal timing, optimizing
            traffic flow and minimizing delays. The data from detection events
            can also be used for traffic analysis and improving signal safety.
            Here we look at yellow light and red light runner events.
            <br /><br />
            Red and yellow light running poses significant dangers to road
            safety, leading to severe accidents and fatalities. When drivers
            ignore red lights, they risk colliding with vehicles that have the
            right of way, often at high speeds, causing T-bone or side-impact
            crashes that are particularly deadly. Yellow light running, where
            drivers speed up to avoid stopping, can lead to rear-end collisions
            and creates uncertainty at intersections, increasing the risk of
            accidents for all road users.
            <br /><br />
            High-resolution data from traffic signal controllers and detection
            systems can provide detailed insights into red and yellow light
            running events. By analyzing the timing, frequency, and conditions
            under which these violations occur, traffic engineers can identify
            patterns and high-risk intersections. This data enables precise
            adjustments to signal timings, installation of additional safety
            measures like red-light cameras, or redesigning intersections to
            improve visibility and reduce the likelihood of accidents,
            ultimately enhancing road safety.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Detector Events TODO List"
          value="detailed-explain"
        >
          <v-expansion-panel-text>
            * Load in Detector Channel and Info <br />
            * Determine where detector events turn on AND Off when signal phase
            is yellow or red <br />
            * Plot these events using TSD or along a phase chart, or use lat,
            lon of detector <br />
            * Provide a count of events given the high resolution data <br />
            * provide a avg. time between events
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Load a detector info, channel, and then load high resolution data
            and plot.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <br />
    <processDetectorRLR></processDetectorRLR>
  </div>
</template>
<script>
import processDetectorRLR from "../components/ProcessDetectorRLR.vue";

export default {
  name: "detectorRLR",
  components: {
    processDetectorRLR,
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
