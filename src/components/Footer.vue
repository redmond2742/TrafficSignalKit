<template>
  <v-footer class="d-flex flex-column">
    <div class="bg-teal d-flex w-100 align-center px-4">
      <strong>Free & Open Tools for Traffic Engineers</strong>

      <v-spacer></v-spacer>

      <v-btn
        v-for="icon in footerIcons"
        :key="icon.id"
        class="mx-4"
        :icon="icon.icon"
        :aria-label="icon.label"
        variant="plain"
        size="small"
        :href="icon.link"
        target="_blank"
        rel="noopener"
      ></v-btn>
    </div>

    <div class="px-4 py-2 bg-black text-center w-100">
      {{ new Date().getFullYear() }} —
      <router-link style="text-decoration: none; color: inherit" to="/about">
        <strong>Traffic Signal Kit</strong></router-link
      >
      &nbsp; &nbsp; &nbsp; &nbsp;

      <router-link
        style="text-decoration: none; color: inherit"
        to="/terms-of-service"
        >Terms of Service</router-link
      >
    </div>
  </v-footer>
</template>

<script>
export default {
  data: () => ({
    footerIcons: [
      {
        id: 1,
        icon: "mdi-github",
        label: "GitHub repository",
        link: "https://github.com/redmond2742/TrafficSignalKit",
      },
      {
        id: 2,
        icon: "mdi-linkedin",
        label: "LinkedIn profile",
        link: "https://www.linkedin.com/in/matt-redmond-00700a36/",
      },
    ],
  }),
};
</script>
<style scoped>
.basic-text {
  text-decoration: none; /* Removes the underline */
  color: rgb(128, 20, 20); /* Sets the color to black */
}
</style>
