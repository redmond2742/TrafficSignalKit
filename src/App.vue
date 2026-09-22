<template>
  <v-app>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <HeadManager />
    <Header />
    <!--
      v-main is what reserves space for the fixed app bar. Without it the bar
      overlapped the page and was cleared only by the body margin, which meant
      the header could never grow. Vuetify measures the bar and sets the offset,
      so clearance is now self-correcting.
    -->
    <v-main id="main-content">
      <div class="page-shell">
        <router-view />
      </div>
    </v-main>
    <Footer />
  </v-app>
</template>

<script>
import Header from "./components/Header.vue";
import Footer from "./components/Footer.vue";
import HeadManager from "./seo/HeadManager.vue";

export default {
  name: "App",
  components: {
    Header,
    Footer,
    HeadManager,
  },
  data: () => ({
    tab: null,
  }),
};
</script>
