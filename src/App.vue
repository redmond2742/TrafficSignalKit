<template>
  <v-app>
    <div>
      <Header></Header>
      <v-row>
        <v-col md="1" xs="0"></v-col>
      </v-row>
      <v-col>
        <router-view></router-view>
      </v-col>
      <v-row>
        <v-col md="1" xs="0"></v-col>
      </v-row>
      <Footer> </Footer>
    </div>
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
<style></style>
