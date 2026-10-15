<template>
  <v-container class="not-found">
    <p class="not-found__code">404</p>
    <h1 class="not-found__title">Page not found</h1>
    <p class="not-found__text">
      There is nothing at <code>{{ path }}</code>. The link may be mistyped, or
      the page may have moved. The search at the top of the page finds any
      tool by name or by what it does.
    </p>

    <template v-if="suggestions.length">
      <h2 class="not-found__sub">Were you looking for one of these?</h2>
      <v-list density="compact" class="not-found__list">
        <v-list-item
          v-for="tool in suggestions"
          :key="tool.path"
          :to="tool.path"
          :title="tool.title"
          :subtitle="tool.description"
          link
        ></v-list-item>
      </v-list>
    </template>

    <div class="not-found__actions">
      <v-btn color="primary" variant="flat" to="/">All tools</v-btn>
      <v-btn variant="tonal" to="/about">About the site</v-btn>
    </div>
  </v-container>
</template>

<script>
import { TOOLS, suggestForPath } from "../utils/toolRegistry.js";

/**
 * Where any URL the router does not know ends up.
 *
 * It used to render the About page, which left someone who followed a dead
 * link reading about the site with no sign the page they wanted was missing.
 * The head for this route is noindex with no canonical (src/seo/routes.js).
 */
export default {
  name: "NotFound",
  computed: {
    path() {
      return this.$route.fullPath;
    },
    suggestions() {
      return suggestForPath(TOOLS, this.$route.path);
    },
  },
};
</script>

<style scoped>
.not-found {
  max-width: 720px;
  padding-top: 32px;
  padding-bottom: 48px;
  text-align: left;
}
.not-found__code {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgb(var(--v-theme-primary));
}
.not-found__title {
  margin: 4px 0 12px;
  font-size: clamp(1.6rem, 4vw, 2.2rem);
}
.not-found__text code {
  word-break: break-all;
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 1px 5px;
  border-radius: 4px;
}
.not-found__sub {
  margin: 24px 0 4px;
  font-size: 1.05rem;
}
.not-found__list {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
}
.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
</style>
