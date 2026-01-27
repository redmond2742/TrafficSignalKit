<template>
  <v-container class="blog-article">
    <h1 class="article-title">Offsets Are the Point</h1>
    <p class="article-subtitle">
      Why Cycle Length, Splits, and TOD Schedules Exist Only to Serve the Green Wave
    </p>

    <p>
      For decades, signal coordination has been taught as a balancing act between
      cycle length, splits, and offsets. We build timing plans, define time-of-day
      schedules, tweak phase splits, and re-optimize cycles. But let’s say the
      quiet part out loud:
    </p>
    <p class="article-callout">
      Offsets are the goal. Everything else exists only to support them.
    </p>
    <p>
      Cycle lengths, phase splits, and even time-of-day plans are not the end—they
      are scaffolding. The true performance of a coordinated system is measured by
      one thing: did the platoon arrive on green? If the answer is yes, drivers
      feel like the system is working. If not, no amount of perfect splits will
      save it.
    </p>

    <h2>The Green Wave Is the Product</h2>
    <p>
      When a driver moves down a corridor and hits three greens in a row, they
      don’t think, “Ah yes, excellent phase allocation and cycle selection.” They
      think, “This city knows what it’s doing.” That experience—the green wave—is
      created almost entirely by offset alignment between signals. Offsets define
      when the green window exists in space and time relative to upstream
      intersections. Everything else simply defines how long that window is and
      how often it repeats.
    </p>

    <h2>The Traditional Stack (and Its Hidden Assumption)</h2>
    <p>Traditional coordination usually follows this order:</p>
    <ol>
      <li>Pick a cycle length (90s, 120s, etc.)</li>
      <li>Allocate splits for each phase</li>
      <li>Define offsets between signals</li>
      <li>Create TOD plans to handle demand changes</li>
    </ol>
    <p>
      This stack hides a major assumption: that we must lock into a cycle first
      and then fit offsets inside of it. But what if that assumption is
      backwards? What if we started with the offsets?
    </p>

    <h2>Reframing the Problem: Offsets First</h2>
    <p>
      Instead of asking, “What cycle should this corridor run?” what if we asked:
      “At what time should each signal turn green so the largest volume of
      vehicles can pass through without stopping?”
    </p>
    <p>
      That question is independent of cycle length, phase structure, and
      time-of-day bins. It is purely a spatiotemporal alignment problem. Once we
      know the optimal green arrival times, then we can wrap a cycle around them,
      assign splits to protect them, and adjust side-street service as needed.
      This flips the entire coordination paradigm.
    </p>
    <v-btn class="back-link" color="primary" variant="text" to="/blog">
      Back to blog
    </v-btn>
  </v-container>
</template>

<script>
export default {
  name: "OffsetsAreThePoint",
};
</script>

<style scoped>
.blog-article {
  max-width: 960px;
  margin: 0 auto;
}

.article-title {
  margin-bottom: 8px;
}

.article-subtitle {
  margin-bottom: 24px;
  color: rgba(0, 0, 0, 0.7);
}

.article-callout {
  font-weight: 600;
  font-size: 1.1rem;
}

.back-link {
  margin-top: 24px;
}
</style>
