<template>
  <v-footer class="d-flex flex-column">
    <div class="bg-teal d-flex w-100 align-center px-4">
      <strong>Free & Open Tools for Traffic Engineers</strong>

      <v-spacer></v-spacer>

      <v-btn
        v-for="icon in icons"
        :key="icon"
        class="mx-4"
        :icon="icon"
        variant="plain"
        size="small"
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
    icons: ["mdi-github", "mdi-linkedin"],
  }),
};
</script>
<style scoped>
.basic-text {
  text-decoration: none; /* Removes the underline */
  color: rgb(128, 20, 20); /* Sets the color to black */
}
</style>
