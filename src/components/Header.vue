<template>
  <v-app-bar :elevation="12" color="#009688">
    <div class="title-justify">
      <v-app-bar-title>
        <router-link to="/about"
          ><b> Traffic Signal Kit</b>
          <span class="beta">beta</span></router-link
        ></v-app-bar-title
      >
    </div>

    <v-spacer></v-spacer>

    <router-link to="/split-calculator">
      <v-btn to="/split-calculator"> Split Calculator </v-btn>
    </router-link>
    <router-link to="/split-calculator">
      <v-btn to="/explainer"> High Resolution Explainer </v-btn>
    </router-link>

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
    items: [
      // { title: 'Split Calculator'},
      // { title: 'Click Me' },
      // { title: 'Click Me' },
      // { title: 'Click Me 2' },
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
title-justify {
  justify-content: flex-start;
  padding: 0.25em;
}
</style>
