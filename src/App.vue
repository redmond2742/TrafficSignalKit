<template>
  <v-app>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div>
      <HeadManager />
      <Header />
      <main id="main-content">
        <router-view />
      </main>
      <Footer />
    </div>
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
<style>
.skip-link {
  position: absolute;
  left: -999px;
  top: 8px;
  background: #009688;
  color: white;
  padding: 8px 12px;
  z-index: 9999;
}
.skip-link:focus {
  left: 8px;
}
</style>
