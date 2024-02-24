<template>
  <v-app>
    <Header></Header>

    <v-row>
      <v-col sm="1"></v-col>
      <v-col>
        <router-view></router-view>
      </v-col>
      <v-col sm="1"></v-col>
    </v-row>

    <Footer> </Footer>
  </v-app>
</template>

<script>
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";

export default {
  name: "App",
  components: {
    Header,
    Footer,
  },
  data: () => ({
    tab: null,
  }),
};
</script>
