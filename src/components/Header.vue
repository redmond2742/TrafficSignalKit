<template>
  <v-app-bar :elevation="12" color="#009688">
    <v-app-bar-nav-icon
      v-if="mobileView"
      @click="drawer = !drawer"
    ></v-app-bar-nav-icon>
    <div class="title-justify">
      <v-app-bar-title>
        <router-link to="/about"
          ><b>Traffic Signal Kit</b>
        </router-link></v-app-bar-title
      >
    </div>
    <hr />

    <div class="text-center">
      <v-menu v-if="mobileViewHide">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props"> 2024' Q1 Tools</v-btn>
        </template>

        <v-list>
          <v-list-item v-for="(item, index) in q1Items" :key="index">
            <v-list-item-title
              ><router-link :to="item.path"
                >{{ item.title }}
              </router-link></v-list-item-title
            >
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div class="text-center">
      <v-menu v-if="mobileViewHide">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props"> 2024' Q2 Tools</v-btn>
        </template>

        <v-list>
          <v-list-item v-for="(item, index) in q2Items" :key="index">
            <v-list-item-title
              ><router-link :to="item.path"
                >{{ item.title }}
              </router-link></v-list-item-title
            >
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div class="text-center">
      <v-menu v-if="mobileViewHide">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props"> 2024' Q3 Tools</v-btn>
        </template>

        <v-list>
          <v-list-item v-for="(item, index) in q3Items" :key="index">
            <v-list-item-title
              ><router-link :to="item.path"
                >{{ item.title }}
              </router-link></v-list-item-title
            >
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div class="text-center">
      <v-menu v-if="mobileViewHide">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props"> 2024' Q4 Tools</v-btn>
        </template>

        <v-list>
          <v-list-item v-for="(item, index) in q4Items" :key="index">
            <v-list-item-title
              ><router-link :to="item.path"
                >{{ item.title }}
              </router-link></v-list-item-title
            >
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!--
    <router-link v-for="route in routes" :key="route.path" :to="route.path">
    {{route.name}}
  </router-link>
    -->

    <v-spacer v-if="mobileViewHide"></v-spacer>
    <v-spacer></v-spacer>

    <v-switch
      v-model="darkMode"
      :label="darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'"
      @change="toggleDarkMode"
    ></v-switch>

    <template v-slot:append>
      <v-btn large plain
        ><v-icon style="color: rgb(235, 8, 8)">mdi-heart</v-icon></v-btn
      >

      <v-dialog v-model="dialog" activator="parent" width="auto">
        <v-card>
          <v-card-text>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSeVlfAjK6kn8hbWJ4YOzcekYtFDH9VLGGuNRMEJhp1HiYRT_A/viewform?embedded=true"
              width="640"
              height="1009"
              frameborder="0"
              marginheight="0"
              marginwidth="0"
              >Loading…</iframe
            >
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" block @click="dialog = false"
              >Close Dialog</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-app-bar>
  <v-navigation-drawer v-model="drawer" app temporary>
    <v-list>
      <v-list-item
        v-for="(item, index) in tools"
        :key="index"
        :to="item.path"
        @click="drawer = false"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import { ref, onMounted } from "vue";

export default {
  data() {
    return {
      darkMode: true, // Initial mode state
      tools: [
        { title: "Split Calculator", path: "/split-calculator" },
        { title: "High Res. Explainer", path: "/explainer" },
        { title: "Time Space Visualizer", path: "/gpx" },
        { title: "Split History", path: "/split-history" },
        {
          title: "Intersection Simulator",
          path: "/traffic-simulator",
        },
        { title: "Phase Plotter", path: "/phase-plotter" },
        { title: "GPX & Phase Plotter", path: "/gpx-phase-plotter" },
        { title: "GPX Mapper", path: "/gpx-mapper" },
      ],

      q1Items: [
        { title: "January: Split Calculator", path: "/split-calculator" },
        { title: "Feburary: High Res. Explainer", path: "/explainer" },
        { title: "March: Time Space Visualizer", path: "/gpx" },
      ],
      q2Items: [
        { title: "April: Split History", path: "/split-history" },
        {
          title: "May: Intersection Simulator",
          path: "/traffic-simulator",
        },
        { title: "June: Phase Plotter", path: "/phase-plotter" },
      ],
      q3Items: [
        { title: "July: GPX & Phase Plotter", path: "/gpx-phase-plotter" },
        { title: "August: GPX Mapper", path: "/gpx-mapper" },
        { title: "September: TBD", path: "/detectorRLR" },
      ],
      q4Items: [{ title: "October: Practice Exam", path: "/practiceExam" }],

      dialog: false,
      drawer: false, // Controls the drawer visibility
    };
  },
  methods: {
    toggleDarkMode() {
      this.$vuetify.theme.global.name = this.darkMode ? "dark" : "light";
    },
  },
  mounted() {
    console.log(this.$vuetify.breakpoint);
    // Detect system preference for initial mode
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    this.darkMode = prefersDark;
    this.$vuetify.theme.global.name = prefersDark ? "dark" : "light";
  },
  computed: {
    mobileView() {
      return this.$vuetify.display.smAndDown;
    },
    mobileViewHide() {
      return !this.$vuetify.display.smAndDown;
    },
  },
};
</script>

<style scoped>
a {
  text-decoration: none;
  color: inherit;
}
.beta {
  font-size: 10px;
  color: red;
  vertical-align: super;
  font-weight: bold;
}
.center-items {
  display: flex;
  justify-content: center;
}
.title-justify {
  justify-content: flex-start;
  margin-left: 10px;
}
</style>
