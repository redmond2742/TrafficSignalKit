<template>
  <h1>Traffic Signal Kit</h1>

  <v-container class="grey lighten-5">
    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Traffic Signal Kit" value="about">
          <v-expansion-panel-text>
            In 2024, I'm diving into Vue.js with Signal Kit. Each month, I'll
            build a practical traffic signal-related tool to learn different Vue
            aspects. ChatGPT will help scale it up fast. These tools won't be
            polished; they're just proof of concepts (<a
              href="https://www.corporate-rebels.com/blog/musks-algorithm-to-cut-bureaucracy"
              >automation comes last</a
            >). Your feedback (with the heart button) guides my future
            resources. Let's see where this journey takes us! 🚦
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Top TODO Items" value="detailed-explain">
          <v-expansion-panel-text>
            To move quickly, everything about this website is very much a work
            in progress. Below is a list of the active ttems I am working to
            update.

            <ul>
              <li>upload to github</li>
              <li>host</li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using These Tools" value="example">
          <v-expansion-panel-text>
            I use the
            <router-link to="/split-calculator">Split Calculator</router-link>
            for checking splits in cycle lengths to make sure they add up and if
            any modifications are necessary how that would impact the ring.
            <br />
            I use the
            <router-link to="/explainer"
              >High Resolution Data Explainer</router-link
            >
            see historical information About what happened at a traffic signal.
            It allows me to dive deep into what the controller was actually
            doing.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-container>

  <h2>Calendar</h2>

  <div class="left-justify-text">
    <b>January: </b>
    <router-link to="/split-calculator">Split Calculator</router-link> - Adjust
    Splits and Cycle lengths <br />
    <b>February: </b>
    <router-link to="/explainer">High Resolution Data Explainer</router-link> -
    Tabulate high resolution data <br />
    <b>March: </b>Time Space Diagram Visualizer <br />
    <b>April: </b> <br />
    <b>May: </b> <br />
    <b>June: </b> <br />
    <b>July: </b> <br />
    <b>August: </b> <br />
    <b>September: </b> <br />
    <b>October: </b> <br />
    <b>November: </b> <br />
    <b>December: </b> <br />
  </div>
</template>

<script>
export default {
  name: "About",
  data() {
    return {
      panel: ["detailed-explain"],
    };
  },
};
</script>

<style>
.left-justify-text {
  margin: 0;
  padding: 0;
  text-align: left; /* Aligning text to left */
}
p {
  text-align: left;
}
.buffer {
  width: 80%;
  height: 20px;
  float: center;
  padding: 0.25em;
}
li {
  text-align: left;
}
</style>
