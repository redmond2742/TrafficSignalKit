<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Kit Journal</p>
      <h1 class="article-title">Offsets Are the Point</h1>
      <p class="article-subtitle">
        Why Cycle Length, Splits, and TOD Schedules Exist Only to Serve the Green Wave
      </p>
      <p class="article-meta">By Traffic Signal Kit • Updated for corridor timing teams</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
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
    </section>

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
  padding: 32px 20px 48px;
  font-family: "Georgia", "Times New Roman", serif;
  color: #111;
}

.article-header {
  border-top: 4px solid #111;
  border-bottom: 2px solid #111;
  padding: 16px 0 20px;
  margin-bottom: 28px;
  text-align: center;
}

.article-kicker {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  margin-bottom: 12px;
}

.article-title {
  margin-bottom: 8px;
  font-size: clamp(2.2rem, 4vw, 3.3rem);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.article-subtitle {
  margin-bottom: 12px;
  font-style: italic;
  color: rgba(0, 0, 0, 0.7);
}

.article-meta {
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.6);
}

.article-callout {
  font-weight: 600;
  font-size: 1.1rem;
  font-style: italic;
  border-left: 4px solid #111;
  padding-left: 16px;
  margin: 20px 0;
}

.article-body {
  column-count: 2;
  column-gap: 32px;
  column-rule: 1px solid rgba(0, 0, 0, 0.2);
  font-size: 1.02rem;
  line-height: 1.7;
}

.article-body h2 {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-top: 24px;
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.article-body p,
.article-body ol {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 16px;
}

.article-body ol {
  padding-left: 20px;
}

.article-lead::first-letter {
  float: left;
  font-size: 3rem;
  line-height: 0.9;
  padding-right: 10px;
  font-weight: 700;
}

.back-link {
  margin-top: 24px;
}

@media (prefers-color-scheme: dark) {
  .blog-article {
    color: #f5f5f5;
    background: #0f0f0f;
  }

  .article-header {
    border-top-color: #f5f5f5;
    border-bottom-color: #f5f5f5;
  }

  .article-subtitle {
    color: rgba(255, 255, 255, 0.7);
  }

  .article-meta {
    color: rgba(255, 255, 255, 0.6);
  }

  .article-callout {
    border-left-color: #f5f5f5;
  }

  .article-body {
    column-rule-color: rgba(255, 255, 255, 0.2);
  }
}

@media (max-width: 900px) {
  .article-body {
    column-count: 1;
  }
}
</style>
