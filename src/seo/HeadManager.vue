<template></template>

<script setup>
/**
 * Applies the head at runtime. All the logic lives in head.js so the build
 * step that bakes these same tags into static HTML cannot drift from what the
 * app renders after hydration.
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@vueuse/head";
import { headFor, metaTagsFor } from "./head.js";

const route = useRoute();
const head = computed(() => headFor(route.path, route.name));

useHead(() => ({
  title: head.value.title,
  meta: metaTagsFor(head.value),
  link: head.value.canonical
    ? [{ rel: "canonical", href: head.value.canonical }]
    : [],
  script: head.value.jsonLd.map((block) => ({
    type: "application/ld+json",
    children: JSON.stringify(block),
  })),
}));
</script>
