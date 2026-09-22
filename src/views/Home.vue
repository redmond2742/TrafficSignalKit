<template>
  <div class="home-page">
    <p class="sr-only">
      Traffic Signal Kit homepage with searchable traffic engineering tools and simulators.
    </p>
    <!--
      A compact header rather than a card of prose. The six featured tools
      below are the hero; this just says what the site is and gets out of the
      way. The old intro card was 259px on a desktop and 577px on a phone.
    -->
    <header class="hero">
      <h1 class="hero__title">Traffic Signal Kit</h1>
      <p class="hero__tagline">
        Free &amp; open source tools for traffic engineers &mdash; rapid-fire,
        proof-of-concept, and built to find what actually makes an impact.
      </p>
      <div class="hero__actions">
        <v-btn color="primary" variant="flat" size="small" to="/dashboard">
          Dashboard
        </v-btn>
        <v-btn color="primary" variant="outlined" size="small" to="/tsp-dashboard">
          TSP Dashboard
        </v-btn>
      </div>
    </header>

    <!--
      Search now lives in the app bar. What remains here is only the state
      readout for an active ?q=, which is how the header's "see all results"
      row and Google's SearchAction both arrive.
    -->
    <div v-if="searchQuery" class="search-state">
      <v-chip closable variant="tonal" color="primary" @click:close="clearSearch">
        Searching: "{{ searchQuery }}"
      </v-chip>
      <p class="tool-count">{{ resultSummary }}</p>
    </div>

    <!-- px-0: .page-shell already owns the side gutter, and paying it twice
         cost a 375px phone another 32px of card width. -->
    <v-container class="px-0">
      <!--
        align="stretch" is what lets the cards fill the row height and line up.
        The v-sheet wrapper that used to sit in here added 16px of padding a
        side on top of the column gutter, which cost a 375px phone 96px of card
        width. lg="3" uses the width a wide monitor actually has.
      -->
      <!--
        Featured tools sit above a divider, three up and a little larger. The
        split is suppressed while a search is active: "Featured" is meaningless
        in a filtered list, so ?q= falls back to one flat grid.
      -->
      <template v-if="showFeatured">
        <h2 class="section-heading">Featured tools</h2>
        <v-row align="stretch">
          <v-col
            v-for="tool in featured"
            :key="tool.path"
            cols="12"
            sm="6"
            lg="4"
          >
            <DisplayCard
              featured
              :image="tool.image"
              :image-alt="tool.title"
              :title="tool.title"
              :description="tool.description"
              :link="tool.path"
              :topics="tool.topics"
            />
          </v-col>
        </v-row>

        <div class="section-divider">
          <span>{{ gridTools.length }} more tools</span>
        </div>
      </template>

      <v-row v-if="gridTools.length" align="stretch">
        <v-col
          v-for="tool in gridTools"
          :key="tool.path"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <DisplayCard
            :image="tool.image"
            :image-alt="tool.title"
            :title="tool.title"
            :description="tool.description"
            :link="tool.path"
            :topics="tool.topics"
          />
        </v-col>
      </v-row>
      <div v-else-if="!showFeatured" class="no-results">
        <p>No tools match "{{ searchQuery }}".</p>
        <v-btn variant="outlined" @click="clearSearch">Show all tools</v-btn>
      </div>
    </v-container>
  </div>
</template>

<script>
import DisplayCard from "@/components/foundational/DisplayCard.vue";
import {
  TOOLS,
  homeTools,
  matchTools,
  featuredTools,
  otherTools,
} from "@/utils/toolRegistry.js";
export default {
  components: {
    DisplayCard,
  },
  name: "Home",
  data() {
    return {
      // Mirrors ?q= in the URL rather than owning the search state, so a
      // shared or bookmarked link reproduces the same filtered grid.
      searchQuery: "",
    };
  },
  computed: {
    /** The tools that get a card, in the order the registry curates them. */
    posts() {
      return homeTools(TOOLS);
    },
    filteredPosts() {
      return matchTools(this.posts, this.searchQuery);
    },
    /** Only split into featured/rest when the full set is on show. */
    showFeatured() {
      return !this.searchQuery && this.featured.length > 0;
    },
    featured() {
      return featuredTools(TOOLS);
    },
    /** Everything below the divider, or the whole filtered set when searching. */
    gridTools() {
      return this.showFeatured ? otherTools(TOOLS) : this.filteredPosts;
    },
    resultSummary() {
      const total = this.posts.length;
      const shown = this.filteredPosts.length;
      return `${shown} of ${total} tools ${shown === 1 ? "matches" : "match"}.`;
    },
  },
  methods: {
    /** ?q= is the source of truth; this keeps data and URL in step. */
    syncFromRoute() {
      const q = this.$route.query.q;
      this.searchQuery = typeof q === "string" ? q : "";
    },
    clearSearch() {
      this.searchQuery = "";
      if (this.$route.query.q !== undefined) {
        this.$router.replace({ path: "/", query: {} }).catch(() => {});
      }
    },
  },
  created() {
    this.syncFromRoute();
  },
  watch: {
    // Fires when the header search pushes /?q=... while Home is already open.
    "$route.query.q": "syncFromRoute",
  },
};
</script>

<style scoped>
.home-page {
  padding-bottom: 1.5rem;
}

.hero {
  text-align: center;
  padding: 4px 12px 0;
}
.hero__title {
  font-size: 1.9rem;
  line-height: 1.2;
  margin: 0 0 6px;
}
.hero__tagline {
  /* the global `p { text-align: left }` would otherwise win here */
  text-align: center;
  max-width: 680px;
  margin: 0 auto 12px;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 4px;
}

.search-state {
  text-align: center;
  margin-top: 4px;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 8px 0 4px;
  padding-inline: 12px;
}

/* a labelled rule, so the break between featured and the rest is explicit */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 28px 12px 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.95rem;
  font-weight: 500;
}
.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.16);
}

.no-results {
  text-align: center;
  padding: 40px 16px;
  opacity: 0.8;
}

.no-results p {
  margin-bottom: 12px;
}

.tool-count {
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0.25rem 0 1rem;
  font-size: 0.95rem;
}

</style>

