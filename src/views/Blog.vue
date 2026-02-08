<template>
  <v-container class="blog-page">
    <h1 class="h1-center-text">Traffic Signal Kit Blog</h1>
    <v-card class="blog-card" variant="outlined">
      <v-card-text>
        <p>
          Welcome to the Traffic Signal Kit blog. This space will highlight
          experiment notes, feature deep-dives, and quick updates on new tools
          as they ship.
        </p>
        <p>
          Have a topic you want covered? Tap the heart button in the header and
          let me know what you want to see next.
        </p>
      </v-card-text>
    </v-card>
    <v-card class="blog-card blog-card--link" variant="outlined" to="/blog/offsets-are-the-point" link>
      <v-card-title>Offsets Are the Point</v-card-title>
      <v-card-subtitle>
        Why Cycle Length, Splits, and TOD Schedules Exist Only to Serve the Green Wave
      </v-card-subtitle>
      <v-card-text>
        <p>
          Offsets drive the green wave experience. This essay reframes
          coordination around the timing of green arrivals first, then
          everything else.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" variant="text" to="/blog/offsets-are-the-point">
          Read the article
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-card
      class="blog-card blog-card--link"
      variant="outlined"
      to="/blog/high-resolution-data-explainer"
      link
    >
      <v-card-title>
        High-Resolution Data Explainer: Decode Indiana Enumerations in Minutes
      </v-card-title>
      <v-card-subtitle>
        Tool-linked guide to loading CSV logs and tracking timestamps with the
        explainer.
      </v-card-subtitle>
      <v-card-text>
        <p>
          Learn the inputs the explainer expects, how Indiana enumerations map
          to controller behavior, and how to follow a specific event over time.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="primary"
          variant="text"
          to="/blog/high-resolution-data-explainer"
        >
          Read the article
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: "Blog",
};
</script>

<style scoped>
.blog-page {
  max-width: 960px;
  margin: 0 auto;
}
.blog-card {
  margin-top: 24px;
  border-radius: 16px;
}
.blog-card--link {
  cursor: pointer;
}
</style>
