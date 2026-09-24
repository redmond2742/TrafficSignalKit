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
