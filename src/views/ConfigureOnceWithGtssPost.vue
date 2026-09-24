<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Kit Journal</p>
      <h1 class="article-title">Configure Once, Not Once Per Tool</h1>
      <p class="article-subtitle">
        Why this site leans on GTSS, the General Traffic Signal Specification
      </p>
      <p class="article-meta">By Traffic Signal Kit • On configuration, accuracy, and open standards</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        There is a real weakness running through Traffic Signal Kit, and it is
        worth naming plainly: every tool asks you the same questions. Which
        phases are coordinated. Which detector channel sits on which approach.
        What the posted speed is. You answer once for the split failure check,
        again for the detector heat map, again for the preemption evaluator.
      </p>
      <p class="article-callout">
        The problem was never the analysis. It was being asked to describe the
        same intersection over and over.
      </p>

      <h2>Why the Site Works This Way</h2>
      <p>
        Traffic Signal Kit is a static site on free hosting. There is no
        account, no server, no database. That is a deliberate trade, and most
        of what it buys is good: nothing to sign up for, nothing to license,
        and your high-resolution data never leaves your browser because there
        is nowhere for it to go.
      </p>
      <p>
        The cost of that trade is memory. A site with no server has nowhere to
        keep what you told it last week. Every tool starts from an empty box.
        Some limitations of free static hosting are simply the price of
        admission. Re-typing your phase-to-detector mapping is not one of them.
      </p>

      <h2>Configuration Is an Accuracy Problem</h2>
      <p>
        The obvious cost is time. The more expensive one is accuracy.
        Configuration re-entered from memory at the end of a long day is how
        wrong numbers enter an analysis, and a transposed detector channel does
        not announce itself. It produces a chart that looks entirely reasonable
        and is quietly about the wrong approach. You can lose an afternoon to a
        conclusion that was never supported by the data.
      </p>
      <p>
        Analysis is only as trustworthy as the configuration underneath it. If
        that configuration is retyped by hand for every tool, every retyping is
        a chance to be subtly wrong.
      </p>

      <h2>What GTSS Is</h2>
      <p>
        <a href="https://gtss.dev" target="_blank" rel="noopener">GTSS</a> — the
        General Traffic Signal Specification — is an open standard that
        describes a traffic signal in plain text. It is free, it belongs to no
        vendor, and a feed is nothing more exotic than a zip of comma-separated
        files.
      </p>
      <p>
        If you have ever worked with transit data, the shape will be instantly
        familiar. GTFS made schedules portable by agreeing on a handful of text
        files in a zip; GTSS applies the same idea to signal configuration,
        down to the <code>agency.txt</code> that starts every feed. It is a
        well-proven idea pointed at a new problem.
      </p>

      <h2>What Is Actually in a Feed</h2>
      <p>
        Each file answers one kind of question, and they reference each other
        by ID:
      </p>
      <ul>
        <li><code>signals.txt</code> — the signals, with coordinates</li>
        <li>
          <code>approaches.txt</code> — street name, compass bearing and
          <em>posted speed</em> for every leg
        </li>
        <li>
          <code>phases.txt</code> — which phase serves which approach, its
          movement type, lane count and crosswalk length
        </li>
        <li>
          <code>detectors.txt</code> — every detector <em>channel</em>, the
          phase it calls, its purpose, technology and setback
        </li>
        <li>
          <code>basic_timings.txt</code> — minimum green, yellow, all-red,
          walk and clearance, per phase
        </li>
        <li>
          <code>preempt.txt</code> — which preempt channel serves which phases
        </li>
      </ul>
      <p>
        That is the whole of what the tools on this site keep asking you for,
        written down once, in a form any of them can read.
      </p>

      <h2>What It Changes in Practice</h2>
      <p>
        The
        <router-link to="/preemption-evaluator">Preemption Evaluator</router-link>
        is the clearest example. Without a feed, it can tell you that preempt
        channel 3 was called forty times, mostly on weekday mornings. True, and
        not very useful — channel 3 is a number in a cabinet.
      </p>
      <p>
        Load a GTSS feed and the same finding reads: <em>Main Street from
        the ESE, westbound</em>, called forty times, almost all on weekday
        mornings. It follows the chain the feed already contains — the channel
        serves phases 1 and 6, both belong to approach 1-2, and that approach
        is Main Street lying 120° from the intersection. Nobody typed any of
        that in. The same chain is what turns a detector channel into a
        lane and a phase into a direction everywhere else.
      </p>

      <h2>Where to Start</h2>
      <p>
        <a href="https://gtss.dev" target="_blank" rel="noopener">gtss.dev</a>
        holds the specification and its documentation — what each file means,
        which fields are required, and how the standard has evolved.
      </p>
      <p>
        <a href="https://app.gtss.dev" target="_blank" rel="noopener">app.gtss.dev</a>
        is the GTSS Builder: a configuration tool for assembling a feed signal
        by signal, tracking how complete each one is as you go. If you do not
        have a feed yet, that is the place to make one.
      </p>

      <h2>What GTSS Does Not Solve</h2>
      <p>
        Worth being straight about: GTSS describes configuration, not
        performance. It knows your phases, detectors and approach speeds. It
        knows nothing about what happened on Tuesday. You still bring your own
        high-resolution controller data, and the tools here still do the
        analysis in your browser.
      </p>
      <p>
        The point is narrower than that, and more useful for being narrow. A
        standard for configuration means describing an intersection once
        instead of once per tool — and it means the description you hand to the
        next tool is the same one you checked the first time.
      </p>
    </section>

    <v-btn class="back-link" color="primary" variant="text" to="/blog">
      Back to blog
    </v-btn>
  </v-container>
</template>

<script>
export default {
  name: "ConfigureOnceWithGtssPost",
};
</script>

<style scoped>
.blog-article {
  max-width: 1000px;
}

.article-header {
  border-top: 3px solid #111;
  border-bottom: 1px solid #111;
  padding: 18px 0;
  margin-bottom: 24px;
  text-align: left;
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
.article-body ul {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 16px;
}

.article-body ul {
  padding-left: 20px;
}

.article-body code {
  font-size: 0.92em;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 3px;
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

@media (max-width: 900px) {
  .article-body {
    column-count: 1;
  }
}
</style>
