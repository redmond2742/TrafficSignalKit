<template></template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@vueuse/head";
import { site, absoluteUrl } from "./site";
import { routeMeta } from "./routes";

const route = useRoute();
const meta = computed(() => routeMeta[route.name] || {});
const title = computed(() => meta.value.title || site.defaultTitle);
const description = computed(
  () => meta.value.description || site.defaultDescription
);
const canonical = computed(() => absoluteUrl(meta.value.path || route.path));
const ogImage = computed(() =>
  absoluteUrl(meta.value.ogImage || site.defaultOgImage)
);

useHead(() => ({
  title: title.value,
  meta: [
    { name: "description", content: description.value },
    { property: "og:title", content: title.value },
    { property: "og:description", content: description.value },
    { property: "og:url", content: canonical.value },
    { property: "og:type", content: "website" },
    { property: "og:image", content: ogImage.value },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title.value },
    { name: "twitter:description", content: description.value },
    { name: "twitter:image", content: ogImage.value },
  ],
  link: [{ rel: "canonical", href: canonical.value }],
}));
</script>
