<template>
  <v-app-bar :elevation="12" color="#009688">
    <div class="title-justify">
      <v-app-bar-title>
        <router-link to="/about"
          ><b>Traffic Signal Kit</b> <span class="beta">BETA</span></router-link
        ></v-app-bar-title
      >
    </div>
    <hr />

    <div class="text-center">
      <v-menu>
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
      <v-menu>
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
      <v-menu>
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

    <!--
    <router-link v-for="route in routes" :key="route.path" :to="route.path">
    {{route.name}}
  </router-link>
    -->

    <v-spacer></v-spacer>

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
</template>

<script>
export default {
  data: () => ({
    q1Items: [
      { title: "January: Split Calculator", path: "/split-calculator" },
      { title: "Feburary: High Res. Explainer", path: "/explainer" },
      { title: "March: Time Space Visualizer", path: "/gpx" },
    ],
    q2Items: [
      { title: "April: Split History", path: "/split-history" },
      { title: "May: Intersection Simulator", path: "/traffic-simulator" },
      { title: "June: Phase Plotter", path: "/phase-plotter" },
    ],
    q3Items: [
      { title: "July: GPX & Phase Plotter", path: "/gpx-phase-plotter" },
      { title: "August: GPX Mapper", path: "/gpx-mapper" },
    ],

    dialog: false,
  }),
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
