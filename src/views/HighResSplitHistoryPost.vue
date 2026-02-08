<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Knowledge Hub</p>
      <h1 class="article-title">
        High-Resolution Split History: Turn Cycle Data into Actionable Splits
      </h1>
      <p class="article-subtitle">
        A guided walkthrough of the inputs, workflow, and filtering tools that
        make split history reports fast to interpret.
      </p>
      <p class="article-meta">By Traffic Signal Kit • Tool Spotlight</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        Split history makes high-resolution event logs usable by summarizing
        every cycle in one table. The
        <a href="/split-history">High Resolution Split History tool</a> tracks
        how much green, yellow, and all-red each phase actually received, so you
        can compare planned timing against what happened in the field.
      </p>

      <h2>Input guidance: enumerations that drive the report</h2>
      <p>
        This tool expects Indiana high-resolution CSV data—timestamps paired
        with an enumeration code and parameter (usually the phase). If you need
        a refresher on how to interpret those codes, start with the
        <a href="/blog/high-resolution-data-explainer">
          High-Resolution Data Explainer post
        </a>
        for a quick primer on enumerations and event meaning.
      </p>
      <p>
        Paste the same controller export into the split history tool and it
        builds a clean table of cycle-by-cycle timing without you manually
        sorting or scripting the data.
      </p>

      <h2>What is a split in this report?</h2>
      <p>
        A split is the full time a phase occupies in a cycle. For this tool, a
        split is measured as <strong>green + yellow + all-red</strong>. The
        report isolates those three pieces for every cycle, so you can see when
        greens stretch, when yellow or clearance intervals dominate, and how
        each phase contributes to the total cycle length.
      </p>

      <h2>Workflow: break down every cycle, then filter</h2>
      <ol>
        <li>
          <strong>Paste your high-resolution CSV.</strong> Use the controller
          export with enumeration and parameter columns.
        </li>
        <li>
          <strong>Review the split table.</strong> Each row represents a cycle
          for a specific phase, showing green, yellow, all-red, and the overall
          cycle length.
        </li>
        <li>
          <strong>Compare cycles.</strong> Scan for unusually long greens or
          short clearances that may point to max-outs or coordination effects.
        </li>
        <li>
          <strong>Filter by any column.</strong> The table lets you filter by
          phase, timing values, or cycle length to isolate the patterns you
          care about.
        </li>
      </ol>

      <p class="article-callout">
        Knowledge Hub articles pair the narrative with the actual tool—read
        here, then validate your own data right away in the
        <a href="/split-history">High Resolution Split History</a> workspace.
      </p>

      <h2>Why it belongs in the Knowledge Hub</h2>
      <p>
        Split history is the bridge between raw enumerations and performance
        insights. The Knowledge Hub framing keeps the context close to the
        workflow: understand the inputs, follow the steps, and refine the table
        until it answers the exact split question you need.
      </p>

      <div class="article-actions">
        <v-btn color="primary" variant="flat" to="/split-history">
          Launch the High Resolution Split History tool
        </v-btn>
      </div>
    </section>

    <v-btn class="back-link" color="primary" variant="text" to="/blog">
      Back to blog
    </v-btn>
  </v-container>
</template>

<script>
export default {
  name: "HighResSplitHistoryPost",
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
  font-size: clamp(2.1rem, 3.6vw, 3.1rem);
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
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.article-body p,
.article-body ol,
.article-body ul,
.article-body pre {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 16px;
}

.article-body ol,
.article-body ul {
  padding-left: 20px;
}

.article-actions {
  margin-top: 16px;
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
