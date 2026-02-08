<template>
  <v-container class="blog-article">
    <header class="article-header">
      <p class="article-kicker">Traffic Signal Knowledge Hub</p>
      <h1 class="article-title">
        GPX Mapper Guide: Turn Field Tracks into Map-Ready Insight
      </h1>
      <p class="article-subtitle">
        Input guidance, a workflow checklist, and a map-first view of GPX data
        with quick Street View validation.
      </p>
      <p class="article-meta">By Traffic Signal Kit • Tool Spotlight</p>
    </header>

    <section class="article-body">
      <p class="article-lead">
        The GPX Mapper tool helps you visualize field tracks without fighting
        spreadsheets. In the Traffic Signal Knowledge Hub, each post connects a
        workflow narrative to a live tool, so you can read the steps and run
        your own data in the same session. This guide focuses on the GPX Mapper,
        which converts a GPX file into a map trace plus a coordinate table you
        can audit with Street View.
      </p>

      <h2>Input guidance: what a GPX file should contain</h2>
      <p>
        GPX files store ordered latitude/longitude points with timestamps. The
        GPX Mapper expects a clean track segment with at least these fields:
      </p>
      <ul>
        <li><strong>Latitude and longitude</strong> for each track point.</li>
        <li>
          <strong>Timestamp (optional but recommended).</strong> Time helps you
          match the trace to field notes or event logs.
        </li>
        <li>
          <strong>Track order.</strong> The points should be in the order they
          were recorded so the map line matches the actual drive.
        </li>
      </ul>
      <p>
        If you are unsure about GPX formatting, export a track from your device
        and open the file to confirm it includes <code>&lt;trkpt&gt;</code>
        elements with <code>lat</code> and <code>lon</code> attributes. That is
        enough for the mapper to draw the route.
      </p>

      <h2>Map overview: Leaflet + OpenStreetMap</h2>
      <p>
        The GPX Mapper displays your track on an interactive map powered by
        <a href="https://leafletjs.com/" target="_blank" rel="noopener">
          Leaflet
        </a>
        and
        <a
          href="https://www.openstreetmap.org/"
          target="_blank"
          rel="noopener"
        >
          OpenStreetMap
        </a>
        tiles. Leaflet gives you zoom, pan, and responsive markers, while
        OpenStreetMap keeps the basemap lightweight and easy to share.
      </p>

      <h2>Workflow steps for the GPX Mapper</h2>
      <ol>
        <li>
          <strong>Upload your GPX track.</strong> Drop the file into the tool
          and confirm the file loads without errors.
        </li>
        <li>
          <strong>Review the map trace.</strong> Zoom to the corridor and make
          sure the plotted path matches the route you drove.
        </li>
        <li>
          <strong>Scan the coordinate table.</strong> The tool lists each point
          so you can spot duplicates, gaps, or unexpected jumps.
        </li>
        <li>
          <strong>Validate with Street View.</strong> Use the Street View links
          to verify whether odd points are legitimate (construction detours,
          driveways) or GPS noise.
        </li>
        <li>
          <strong>Export or summarize.</strong> Use the table to document
          corridor extents or share a few anchor points with your team.
        </li>
      </ol>

      <h2>Example coordinate table with Street View links</h2>
      <p>
        The table below mirrors what you will see after loading a GPX file. Each
        point includes latitude, longitude, and a one-click Street View link for
        fast validation.
      </p>
      <table class="coordinate-table">
        <thead>
          <tr>
            <th>Point</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Street View</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>39.76838</td>
            <td>-86.15804</td>
            <td>
              <a
                href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=39.76838,-86.15804"
                target="_blank"
                rel="noopener"
              >
                Open Street View
              </a>
            </td>
          </tr>
          <tr>
            <td>2</td>
            <td>39.76689</td>
            <td>-86.15777</td>
            <td>
              <a
                href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=39.76689,-86.15777"
                target="_blank"
                rel="noopener"
              >
                Open Street View
              </a>
            </td>
          </tr>
          <tr>
            <td>3</td>
            <td>39.76542</td>
            <td>-86.15742</td>
            <td>
              <a
                href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=39.76542,-86.15742"
                target="_blank"
                rel="noopener"
              >
                Open Street View
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="article-callout">
        The Knowledge Hub pairing means you can read the workflow here and then
        immediately load your own GPX file in the
        <a href="/gpx-mapper">GPX Mapper tool</a>.
      </p>

      <h2>Why this matters in the Knowledge Hub</h2>
      <p>
        GPX traces are often the fastest way to align a field run with signal
        timing observations. By anchoring the guide to the GPX Mapper, the
        Knowledge Hub keeps your context, map, and validation links together.
        That way you can move from raw GPS data to a ready-to-share corridor
        story without switching tools.
      </p>

      <div class="article-actions">
        <v-btn color="primary" variant="flat" to="/gpx-mapper">
          Open the GPX Mapper tool
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
  name: "GPXMapperKnowledgeHubPost",
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
.article-body table {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 16px;
}

.article-body ol,
.article-body ul {
  padding-left: 20px;
}

.coordinate-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.coordinate-table th,
.coordinate-table td {
  border: 1px solid rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  text-align: left;
}

.coordinate-table th {
  background: rgba(0, 0, 0, 0.06);
  font-weight: 600;
}

.article-actions {
  margin-top: 16px;
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

  .coordinate-table th,
  .coordinate-table td {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .coordinate-table th {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
