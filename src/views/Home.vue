<template>
  <div class="home-page">
    <p class="sr-only">
      Traffic Signal Kit homepage with searchable traffic engineering tools and simulators.
    </p>
    <v-card class="intro-card" variant="outlined">
      <h1 class="h1-center-text page-title">Traffic Signal Kit</h1>
      <v-card-text class="intro-text">
        Various experimental free & open source tools for traffic engineers.
        These are rapid-fire, proof-of-concept creations designed to innovate,
        inspire, and provide insights into traffic signal operations. Expect
        raw, early-stage concepts—this is about speed, experimentation, and
        finding what truly makes an impact. Your feedback is my roadmap! ❤️
        Click that heart button to vote on features and shape the future of
        these tools.
      </v-card-text>
      <v-card-actions class="intro-actions">
        <v-btn color="primary" variant="flat" to="/dashboard">
          Go to Dashboard
        </v-btn>
        <v-btn color="secondary" variant="flat" to="/tsp-dashboard">
          Go to TSP Dashboard
        </v-btn>
      </v-card-actions>
    </v-card>
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
      <v-row v-if="filteredPosts.length" align="stretch">
        <v-col
          v-for="tool in filteredPosts"
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
      <div v-else class="no-results">
        <p>No tools match "{{ searchQuery }}".</p>
        <v-btn variant="outlined" @click="clearSearch">Show all tools</v-btn>
      </div>
    </v-container>
  </div>
</template>

<script>
import DisplayCard from "@/components/foundational/DisplayCard.vue";
import { TOOLS, homeTools, matchTools } from "@/utils/toolRegistry.js";
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

.page-title {
  margin-top: 1rem;
  margin-bottom: 0.25rem;
}

.search-state {
  text-align: center;
  margin-top: 4px;
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

