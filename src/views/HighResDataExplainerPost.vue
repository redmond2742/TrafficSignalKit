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
