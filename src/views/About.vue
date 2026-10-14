<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">About</p>
      <h1 class="article-title">About Traffic Signal Kit</h1>
      <p class="article-subtitle">Practical, browser-based tools for traffic engineers</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        Traffic Signal Kit is a free, open-source collection of tools for
        traffic engineers and signal timing specialists. Most of them read
        high-resolution data from signal controllers: paste it into a text box
        and get an answer right in your browser, with nothing to install and no
        account to create. Here is how the site came together, and what the
        tools are for.
      </p>

      <h2>How It Started</h2>
      <p>
        TrafficSignalKit.com was created as part of a yearlong effort to build
        practical, MVP tools for traffic engineers. With help from AI, each tool
        took about a month to develop. Many of these tools are powered by
        high-resolution event data from traffic signal controllers. This data,
        logged in tenth-of-a-second intervals, includes detailed event
        enumerations defined by
        <a :href="links.purdue" target="_blank" rel="noopener">Purdue University</a>,
        with over 180 recognized event types. Most tools on this site are
        designed to work by simply pasting data into a text box &mdash; no file
        uploads or logins required.
      </p>

      <h2>Reading Controller Data</h2>
      <p>
        One of the most straightforward tools on TrafficSignalKit is the
        <router-link to="/explainer">High Resolution Data Explainer</router-link>.
        It decodes controller events and enumerations, making it easy to
        understand exactly what happened at each time step. This tool is
        particularly useful for reviewing detailed signal behavior, such as
        transitions between coordination plans or identifying whether a phase
        was skipped (e.g., Enumeration #14).
      </p>
      <p>
        To provide a higher-level summary of signal operations, the
        <router-link to="/split-history">High Resolution Split History</router-link>
        tool aggregates event data into signal cycles, calculating the duration
        of green, yellow, and all-red intervals. It also identifies how each
        phase was terminated. This cycle-level overview offers a quick way to
        visualize historical operations. However, due to inconsistencies in
        event logging, cycle counts and durations may occasionally reflect minor
        inaccuracies.
      </p>

      <h2>Time-Space and GPX</h2>
      <p>
        Another tool focused on signal coordination is the
        <router-link to="/gpx">Time Space Diagram Visualizer</router-link>. This
        tool began as a way to visualize basic GPX trajectory data. A GPX file
        is a simple GPS data format that records where and when something moved
        &mdash; like a breadcrumb trail showing the path a vehicle, bike,
        person, or ship moved over time. This time-space diagram evolved into
        the
        <router-link to="/gpx-phase-plotter">GPX Time-Space &amp; Phase Plotter (with TSP Events)</router-link>,
        which overlays signal states onto the diagram. Development started with
        the <router-link to="/phase-plotter">Phase Plotter</router-link> &mdash;
        a tool that shows the state of all phases over time &mdash; and expanded
        to put phase-specific data directly on the time-space chart. For
        agencies using Transit Signal Priority (TSP), the GPX &amp; Phase
        Plotter also visualizes TSP events, making it easy to see where
        low-priority events were called. Its configuration is more involved
        than most of the other tools, so there is an
        <a :href="links.video" target="_blank" rel="noopener">explainer video</a>
        that walks through it.
      </p>
      <p>
        As more tools began to incorporate GPX files for vehicle trajectories,
        it became clear that a lightweight mapping utility was needed. The
        <router-link to="/gpx-mapper">GPX Mapper</router-link> was built to fill
        that gap &mdash; a simple tool that lets users paste in raw GPX file
        text and instantly visualize the route on a map. In addition to the map
        display, it generates a table of all logged GPS points, making it easy
        to review the path, timestamps, and any additional metadata. This tool
        is especially useful for quickly verifying field-collected GPX tracks.
      </p>

      <h2>Red and Yellow Light Running</h2>
      <p>
        Red and yellow light running continues to be a major safety risk at
        signalized intersections. With high-resolution controller data, it's
        now possible to flag potential violations by analyzing vehicle presence
        detection channels and the corresponding signal states at fine time
        scales. The configuration for the
        <router-link to="/detectorRLR">Red Light Runner</router-link> tool is
        more involved and can become tedious when evaluating multiple detectors
        and signals. That led me to think about a new platform that addresses
        these issues and considers configuration from the start.
      </p>

      <h2>Side Projects and Learning Tools</h2>
      <p>
        Some tools on TrafficSignalKit.com were created as a side project
        (within a side project) to explore related ideas and support traffic
        engineering education.
      </p>
      <p>
        One example is the
        <router-link to="/traffic-simulator">Max Out and Gap Out Traffic Simulator</router-link>,
        which shows how a signal can gap out or max out, and what that actually
        means. A phase can also force off, but that's for coordination. The
        simulator shows simulated event logs similar to the high-resolution
        data generated by a real controller.
      </p>
      <p>
        The <router-link to="/practice-exam">Practice Exam</router-link> tool was
        built as a simple, interactive way to quiz engineers on any topic,
        including traffic signal timing. Topics are limited for now, and a
        signal timing question-and-answer quiz could be added here. If you have
        a quiz topic in mind, send it with its questions and answers through the
        <a :href="links.feedback" target="_blank" rel="noopener">feedback form</a>.
      </p>
      <p>
        The <router-link to="/split-calculator">Split Calculator</router-link>
        was the first tool developed. It provides a quick way to check whether
        allocated phase splits add up to the full cycle length, sometimes
        serving as a faster alternative to opening a larger signal timing
        software suite like Synchro. While still a bit rough around the edges,
        it can be a useful spot-check tool.
      </p>

      <h2>Keeping It Online</h2>
      <p>
        The goal is to keep TrafficSignalKit.com online and available as a
        resource for the traffic engineering community. The site is
        <a :href="links.github" target="_blank" rel="noopener">open source</a>
        and welcomes new ideas and improvements through the
        <a :href="links.feedback" target="_blank" rel="noopener">feedback form</a>
        &mdash; the heart icon at the top of every page.
      </p>
    </section>
  </v-container>
</template>

<script>
export default {
  name: "About",
  data() {
    return {
      // The same targets the rest of the site links to: Purdue's enumeration
      // report (SplitHistory.vue), the GPX & Phase Plotter walkthrough
      // (GPXPhasePlotter.vue), the feedback form behind the heart in the app
      // bar (Header.vue), and the repository (Footer.vue).
      links: {
        purdue: "https://docs.lib.purdue.edu/jtrpdata/4/",
        video: "https://www.youtube.com/watch?v=MLJvc0Hdg6c",
        feedback:
          "https://docs.google.com/forms/d/e/1FAIpQLSeVlfAjK6kn8hbWJ4YOzcekYtFDH9VLGGuNRMEJhp1HiYRT_A/viewform",
        github: "https://github.com/redmond2742/TrafficSignalKit",
      },
    };
  },
};
</script>
