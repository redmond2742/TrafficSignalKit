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
    <v-container class="search-section">
      <v-row justify="center" no-gutters>
        <v-col cols="12" md="8" lg="6">
          <v-text-field
            v-model="searchQuery"
            label="Search tools and topics"
            placeholder="detection, pedestrians, GPX, red light running…"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            autocomplete="off"
          />
        </v-col>
      </v-row>

      <div class="topic-filter">
        <v-chip
          v-for="topic in visibleTopics"
          :key="topic.name"
          class="ma-1"
          size="small"
          role="button"
          :aria-pressed="String(activeTopic === topic.name)"
          :color="activeTopic === topic.name ? 'primary' : undefined"
          :variant="activeTopic === topic.name ? 'flat' : 'outlined'"
          @click="toggleTopic(topic.name)"
        >
          {{ topic.name }} ({{ topic.count }})
        </v-chip>
        <v-chip
          v-if="hiddenTopicCount"
          class="ma-1"
          size="small"
          variant="text"
          role="button"
          :aria-expanded="String(showAllTopics)"
          @click="showAllTopics = !showAllTopics"
        >
          {{ showAllTopics ? "Show fewer" : `+${hiddenTopicCount} more topics` }}
        </v-chip>
      </div>

      <p class="tool-count">{{ resultSummary }}</p>
    </v-container>

    <v-container>
      <v-row v-if="filteredPosts.length" no-gutters>
        <v-col
          v-for="tool in filteredPosts"
          :key="tool.path"
          cols="12"
          sm="6"
          md="4"
          ><v-sheet class="ma-2 pa-2">
            <DisplayCard
              :image="tool.image"
              :image-alt="tool.title"
              :title="tool.title"
              :description="tool.description"
              :link="tool.path"
              :topics="tool.topics"
          /></v-sheet>
        </v-col>
      </v-row>
      <div v-else class="no-results">
        <p>No tools match that search.</p>
        <v-btn variant="outlined" @click="clearSearch">Clear search</v-btn>
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
  topicCounts,
} from "@/utils/toolRegistry.js";
export default {
  components: {
    DisplayCard,
  },
  name: "Home",
  data() {
    return {
      panel: ["detailed-explain"],
      searchQuery: "",
      activeTopic: null,
      showAllTopics: false,
    };
  },
  computed: {
    /** The tools that get a card, in the order the registry curates them. */
    posts() {
      return homeTools(TOOLS);
    },
    /** Every topic with how many tools carry it, busiest first. */
    topicCounts() {
      return topicCounts(this.posts);
    },
    /**
     * Only topics shared by more than one tool earn a chip by default: of the
     * 40-odd topics in use, most appear on a single tool and would bury the
     * ones that actually group things. The rest stay reachable through the
     * text search and the "more topics" toggle.
     */
    visibleTopics() {
      return this.showAllTopics ? this.topicCounts : this.topicCounts.filter((t) => t.count > 1);
    },
    hiddenTopicCount() {
      return this.topicCounts.filter((t) => t.count === 1).length;
    },
    searchTerms() {
      return (this.searchQuery || "")
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);
    },
    filteredPosts() {
      const byTopic = this.activeTopic
        ? this.posts.filter((tool) => (tool.topics || []).includes(this.activeTopic))
        : this.posts;
      return matchTools(byTopic, this.searchQuery);
    },
    resultSummary() {
      const total = this.posts.length;
      const shown = this.filteredPosts.length;
      if (shown === total) {
        return `Browse ${total} practical tools for traffic signal analysis and operations.`;
      }
      const scope = this.activeTopic ? ` in ${this.activeTopic}` : "";
      return `${shown} of ${total} tools${scope} ${shown === 1 ? "matches" : "match"} your search.`;
    },
  },
  methods: {
    toggleTopic(topic) {
      this.activeTopic = this.activeTopic === topic ? null : topic;
    },
    clearSearch() {
      this.searchQuery = "";
      this.activeTopic = null;
    },
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

.search-section {
  padding-top: 8px;
  padding-bottom: 0;
}

.topic-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
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
  color: #4e5f6c;
  margin: 0.25rem 0 1rem;
  font-size: 0.95rem;
}

</style>

