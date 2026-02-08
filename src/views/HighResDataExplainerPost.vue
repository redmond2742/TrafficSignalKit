<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Knowledge Hub</p>
      <h1 class="article-title">
        High-Resolution Data Explainer: Decode Indiana Enumerations in Minutes
      </h1>
      <p class="article-subtitle">
        A tool-linked walkthrough for loading CSV logs, reading timestamps, and
        turning event codes into answers.
      </p>
      <p class="article-meta">By Traffic Signal Kit • Tool Spotlight</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        High-resolution controller logs can feel like a wall of numbers until
        you translate them into signal behavior. The
        <a href="/">Traffic Signal Kit</a> High Resolution Data
        Explainer turns Indiana’s standardized enumerations into readable,
        timestamped events so you can answer the questions that matter: What
        happened, when did it happen, and which phase or channel did it involve?
      </p>

      <h2>What the explainer expects as input</h2>
      <p>
        The tool is designed around the Indiana high-resolution data standard.
        Each row includes three pieces of information:
      </p>
      <ul>
        <li>
          <strong>Timestamp</strong> (controller or converted human-readable
          time)
        </li>
        <li><strong>Enumeration</strong> (the event code)</li>
        <li>
          <strong>Parameter</strong> (typically a phase number, channel number,
          or plan index)
        </li>
      </ul>
      <p>
        Paste a CSV snippet like this directly into the explainer, and it
        returns a human-readable timeline of the events:
      </p>
      <pre>
5/6/2024 17:33:38.5, 50, 2
5/6/2024 17:33:38.5, 200, 61
5/6/2024 17:33:38.7, 44, 2
5/6/2024 17:33:39.4, 81, 15
5/6/2024 17:33:42.0, 13, 2
      </pre>

      <h2>What the Indiana enumerations are doing behind the scenes</h2>
      <p>
        Indiana’s enumerations map event codes to controller behavior. Instead
        of guessing, the explainer looks up each enumeration and labels it with
        the standardized description—phase state changes, detector on/off
        events, pedestrian calls, preemption actions, coordination pattern
        changes, and more. The parameter column keeps the event grounded in
        real-world context, so an “event 44” can be tied to the exact phase or
        channel where it happened.
      </p>

      <h2>Typical workflow: find a specific value over time</h2>
      <ol>
        <li>
          <strong>Load data.</strong> Paste a CSV slice from your controller
          export into the explainer.
        </li>
        <li>
          <strong>Scan the translated table.</strong> The tool expands each
          event code into its description so you can quickly interpret the log.
        </li>
        <li>
          <strong>Follow a specific enumeration.</strong> Filter or scroll to
          the event you care about—like a phase green, detector on, or ped call.
        </li>
        <li>
          <strong>Read the timestamps.</strong> Track how often the event
          occurs, the gaps between instances, or how it aligns with other
          actions.
        </li>
        <li>
          <strong>Validate timing logic.</strong> Use the timeline to confirm
          expected behavior before moving on to deeper diagnostics or ATSPM
          metrics.
        </li>
      </ol>

      <p class="article-callout">
        Tool-linked blog content means you can read the explanation and run the
        exact example in the
        <a href="/explainer">High Resolution Data Explainer tool</a>—no
        copy-and-paste hunting required.
      </p>

      <h2>Why this matters in the Traffic Signal Knowledge Hub</h2>
      <p>
        The Knowledge Hub pairs blog posts with the tools they reference. This
        keeps the learning loop short: read the context, run the tool, and
        verify your own data in one session. The High Resolution Data Explainer
        is a perfect anchor for that workflow because it translates raw logs
        into a shared language the rest of the toolbox can build on.
      </p>

      <div class="article-actions">
        <v-btn color="primary" variant="flat" to="/explainer">
          Run this example in the High Resolution Data Explainer
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
  name: "HighResDataExplainerPost",
};
</script>

<style scoped>
.blog-article {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 48px;
  font-family: "Georgia", "Times New Roman", serif;
  color: #111;
  background: #fff;
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

.article-body pre {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px 16px;
  border-radius: 12px;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
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

  .article-body pre {
    background: rgba(255, 255, 255, 0.12);
  }
}

@media (max-width: 900px) {
  .article-body {
    column-count: 1;
  }
}
</style>
