<template></template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@vueuse/head";
import { site, absoluteUrl } from "./site";
import { routeMeta } from "./routes";
import {
  organizationJsonLd,
  websiteJsonLd,
  softwareApplicationJsonLd,
} from "./jsonld";

const route = useRoute();
const meta = computed(() => routeMeta[route.name] || {});
const title = computed(() => meta.value.title || site.defaultTitle);
const description = computed(
  () => meta.value.description || site.defaultDescription
);
// A noindex page (the 404 catch-all) gets no canonical at all -- pointing it
// anywhere either consolidates junk URLs onto a real page or, as it used to,
// onto the homepage.
const robots = computed(() => meta.value.robots || null);
const indexable = computed(() => !robots.value || !robots.value.includes("noindex"));
const canonical = computed(() =>
  indexable.value ? absoluteUrl(meta.value.path || route.path) : null
);
const ogImage = computed(() =>
  absoluteUrl(meta.value.ogImage || site.defaultOgImage)
);
const faqJsonLd = computed(() =>
  meta.value.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: meta.value.faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }
    : null
);

useHead(() => ({
  title: title.value,
  meta: [
    { name: "description", content: description.value },
    ...(robots.value ? [{ name: "robots", content: robots.value }] : []),
    { property: "og:title", content: title.value },
    { property: "og:description", content: description.value },
    ...(canonical.value ? [{ property: "og:url", content: canonical.value }] : []),
    { property: "og:type", content: "website" },
    { property: "og:image", content: ogImage.value },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title.value },
    { name: "twitter:description", content: description.value },
    { name: "twitter:image", content: ogImage.value },
  ],
  link: canonical.value ? [{ rel: "canonical", href: canonical.value }] : [],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify(organizationJsonLd),
    },
    { type: "application/ld+json", children: JSON.stringify(websiteJsonLd) },
    {
      type: "application/ld+json",
      children: JSON.stringify(softwareApplicationJsonLd),
    },
    ...(faqJsonLd.value
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify(faqJsonLd.value),
          },
        ]
      : []),
  ],
}));
</script>
