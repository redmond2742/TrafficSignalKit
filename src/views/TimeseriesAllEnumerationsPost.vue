<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Knowledge Hub</p>
      <h1 class="article-title">
        Timeseries Plot All Enumerations: See Every Event on One Timeline
      </h1>
      <p class="article-subtitle">
        A tool-linked guide for turning high-resolution logs into a visual map
        of preemption, TSP, and controller activity.
      </p>
      <p class="article-meta">By Traffic Signal Kit • Tool Spotlight</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        When you need to confirm a preemption sequence, troubleshoot a TSP
        request, or pinpoint exactly when a controller changed state, a visual
        timeline makes the story obvious. The
        <a href="/preemption-plotter">Timeseries Plot All Enumerations</a> tool
        takes high-resolution event logs and plots every enumeration over time,
        so you can see how actions stack up second by second.
      </p>

      <h2>Knowledge Hub framing: read, run, verify</h2>
      <p>
        The Traffic Signal Knowledge Hub pairs each blog post with a working
        tool. Read the context here, then launch the plotter to validate the
        same workflow on your own controller exports. If you need a refresher
        on the raw log format, start with the
        <a href="/blog/high-resolution-data-explainer">
          High-Resolution Data Explainer post
        </a>
        to understand what those enumerations represent.
      </p>

      <h2>What the tool expects as input</h2>
      <p>
        The plotter is designed for Indiana high-resolution data. It expects a
        CSV table with a timestamp, enumeration, and parameter for every event.
        Use the same structure you would load into the explainer:
      </p>
      <ul>
        <li><strong>Timestamp</strong> in controller time or converted format</li>
        <li><strong>Enumeration</strong> (the event code)</li>
        <li>
          <strong>Parameter</strong> (phase, channel, preemption ID, or pattern)
        </li>
      </ul>
      <p>
        Paste the CSV directly into the tool and it will render a stacked plot
        of each event over time.
      </p>

      <h2>Workflow: from log to diagnosis</h2>
      <ol>
        <li>
          <strong>Load the high-resolution CSV.</strong> Copy a time window from
          your controller export and drop it into the plotter.
        </li>
        <li>
          <strong>Review the full event stack.</strong> The timeline shows every
          enumeration so you can see preemption, TSP, detector, and phase events
          in context.
        </li>
        <li>
          <strong>Zoom to the moment that matters.</strong> Focus on a specific
          time period to pinpoint which events fired and in what order.
        </li>
        <li>
          <strong>Trace preemption or TSP behavior.</strong> Follow the sequence
          of request, service, and return events to confirm expected operation.
        </li>
        <li>
          <strong>Document insights.</strong> Capture the timeline view to share
          with operations or maintenance teams.
        </li>
      </ol>

      <h2>Sample output snapshot</h2>
      <p>
        Replace the placeholder below with a real plot screenshot once you have
        a representative dataset. The intent is to show how enumerations stack
        up across the timeline.
      </p>
      <figure class="article-figure">
        <img
          src="https://placehold.co/900x500?text=Timeseries+Plot+All+Enumerations"
          alt="Placeholder for a Timeseries Plot All Enumerations screenshot"
        />
        <figcaption>
          Placeholder image for a future Timeseries Plot All Enumerations
          snapshot.
        </figcaption>
      </figure>

      <p class="article-callout">
        If you can describe the question as “What events happened around this
        time?” the Timeseries Plot All Enumerations tool gives you the answer
        in a single chart.
      </p>

      <div class="article-actions">
        <v-btn color="primary" variant="flat" to="/preemption-plotter">
          Open the Timeseries Plot All Enumerations tool
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
  name: "TimeseriesAllEnumerationsPost",
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
.article-body ul {
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

.article-figure {
  margin: 16px 0 20px;
  text-align: center;
}

.article-figure img {
  max-width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.article-figure figcaption {
  margin-top: 8px;
  font-size: 0.9rem;
  font-style: italic;
  color: rgba(0, 0, 0, 0.7);
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

  .article-figure figcaption {
    color: rgba(255, 255, 255, 0.7);
  }
}

@media (max-width: 900px) {
  .article-body {
    column-count: 1;
  }
}
</style>
