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
