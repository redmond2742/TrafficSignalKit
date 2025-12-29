<template>
  <v-card class="mx-auto" max-width="500" :to="link" link>
    <v-img :src="image" height="200px" :alt="resolvedImageAlt"></v-img>
    <v-card-title class="title">{{ title }}</v-card-title>
    <v-card-text class="description">{{ description }}</v-card-text>
    <v-card-actions class="centered-actions">
      <span class="explore-text">Explore Tool</span>
    </v-card-actions>
    <v-card-subtitle>
      <v-chip-group column>
        <v-chip
          v-for="(topic, index) in topics"
          :key="index"
          class="ma-1"
          small
        >
          {{ topic }}
        </v-chip>
      </v-chip-group>
    </v-card-subtitle>
  </v-card>
</template>

<script>
export default {
  name: "DisplayCard",
  props: {
    image: {
      type: String,
      required: true,
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
      required: true,
    },
  },
  computed: {
    resolvedImageAlt() {
      return this.imageAlt || this.title;
    },
  },
};
</script>

<style scoped>
.v-card {
  cursor: pointer;
  transition: background-color 0.3s;
}

.v-card:hover {
  background-color: #f5f5f5;
}

.v-card:focus-visible {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.description {
  text-decoration: none;
  color: inherit;
  height: 60px; /* Set a fixed height for the description */
  overflow: visible;
  text-overflow: clip;
  word-break: break-word;
  display: -webkit-box;
  text-decoration: none;
  color: inherit;
  -webkit-line-clamp: 3; /* Limit to 3 lines */
  -webkit-box-orient: vertical;
}
.v-chip-group {
  display: flex;
  flex-wrap: wrap;
  color: #009688;
}
.centered-actions {
  display: flex;
  justify-content: center; /* Center horizontally */
}
.explore-text {
  color: #1976d2;
  font-weight: 500;
}
.title {
  word-wrap: wrap;
}
</style>
