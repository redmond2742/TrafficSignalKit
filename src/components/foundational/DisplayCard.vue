<template>
  <v-card class="tool-card" :class="{ 'tool-card--featured': featured }" :to="link" link>
    <!--
      cover, not contain. The card art spans 16 different aspect ratios, from
      0.75 portrait to 2.41 panorama, so "contain" letterboxed them by wildly
      different amounts and no two cards looked alike.
    -->
    <v-img
      :src="image"
      :height="imageHeight"
      cover
      :alt="resolvedImageAlt"
      class="tool-card__image"
      @error="imageFailed = true"
    >
      <!-- Two of the S3 URLs are dead, which used to leave a blank 200px void. -->
      <template #error>
        <div class="tool-card__fallback">
          <v-icon icon="mdi-traffic-light" size="44"></v-icon>
        </div>
      </template>
      <template #placeholder>
        <div class="tool-card__fallback tool-card__fallback--loading"></div>
      </template>
    </v-img>

    <v-card-title class="tool-card__title">{{ title }}</v-card-title>
    <v-card-text class="tool-card__description">{{ description }}</v-card-text>

    <v-card-subtitle class="tool-card__topics">
      <v-chip
        v-for="topic in visibleTopics"
        :key="topic"
        class="mr-1 mb-1"
        size="small"
        variant="tonal"
      >
        {{ topic }}
      </v-chip>
      <span v-if="hiddenTopicCount" class="tool-card__more">
        +{{ hiddenTopicCount }}
      </span>
    </v-card-subtitle>

    <!-- Pinned to the bottom so every card in a row ends on the same line. -->
    <v-card-actions class="tool-card__actions">
      <span class="tool-card__cta">
        Explore Tool
        <v-icon icon="mdi-arrow-right" size="16"></v-icon>
      </span>
    </v-card-actions>
  </v-card>
</template>

<script>
/** Beyond this the chip rows grow taller than the description. */
const MAX_TOPICS = 3;

export default {
  name: "DisplayCard",
  props: {
    image: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    imageAlt: {
      type: String,
      default: "",
    },
    topics: {
      type: Array,
      default: () => [],
    },
    /** Featured cards sit above the divider and run a little larger. */
    featured: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      imageFailed: false,
    };
  },
  computed: {
    resolvedImageAlt() {
      return this.imageAlt || this.title;
    },
    /**
     * Shorter art on phones only. At 200px the image was 45% of a 448px card,
     * and 34 of those made the home page about 21 screens long. `xs` rather
     * than `smAndDown`, because the latter reaches 960px and was giving
     * tablets a letterboxed banner on a 382px-wide card.
     */
    imageHeight() {
      if (this.$vuetify.display.xs) return 150;
      return this.featured ? 220 : 190;
    },
    visibleTopics() {
      return (this.topics || []).slice(0, MAX_TOPICS);
    },
    hiddenTopicCount() {
      return Math.max(0, (this.topics || []).length - MAX_TOPICS);
    },
  },
};
</script>

<style scoped>
/* A featured card shows its full blurb; the grid below keeps the 3-line clamp. */
.tool-card--featured .tool-card__description {
  -webkit-line-clamp: 4;
}
.tool-card--featured .tool-card__title {
  font-size: 1.2rem;
}

/* Full height so cards in a row match, with the CTA pushed to the bottom. */
.tool-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.tool-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .tool-card,
  .tool-card:hover {
    transition: none;
    transform: none;
  }
}
.tool-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/*
 * Anchor the crop to the top. The card box is ~2.3:1 on a phone against 1.5:1
 * art, so a centred crop cut the heading off every screenshot.
 */
.tool-card__image :deep(.v-img__img) {
  object-position: center top;
}

.tool-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}
.tool-card__fallback--loading {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
}

.tool-card__title {
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
  padding-bottom: 4px;
}

.tool-card__description {
  /* min-height rather than height: a fourth line used to spill out of the box */
  min-height: 60px;
  padding-top: 0;
  padding-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.tool-card__topics {
  padding-top: 0;
  padding-bottom: 4px;
  white-space: normal;
}
.tool-card__more {
  font-size: 0.75rem;
  opacity: 0.7;
}

.tool-card__actions {
  margin-top: auto;
  justify-content: center;
}
.tool-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}
</style>
