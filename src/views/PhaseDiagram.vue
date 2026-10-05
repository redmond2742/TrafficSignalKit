<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Phase Diagrams</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Phase Diagrams" value="about">
          <v-expansion-panel-text>
            <p>
              A phase number on its own is an abstraction. The same number
              drawn as an arrow pointing out of Main Street is something you
              can hold up against the intersection and check. This draws one
              diagram per intersection &mdash; or one per phase &mdash; from
              nothing but approach bearings and phase movements.
            </p>
            <p class="mt-2">
              The geometry follows the
              <a href="https://gtss.dev" target="_blank" rel="noopener">GTSS</a>
              Signal Builder's phase editor, so a diagram here and a diagram
              there describe the same intersection the same way. Load a GTSS
              export and every signal in it is ready to draw at once.
            </p>
            <p class="mt-2">
              The output is a <b>printable sheet</b>. One diagram per page is
              rarely what anyone wants; a corridor on one 30&nbsp;&times;&nbsp;30
              plot, or a signal's phases laid out side by side, is. The grid
              goes from 1&nbsp;&times;&nbsp;1 up to 10&nbsp;&times;&nbsp;10.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Reading the Diagram" value="reading">
          <v-expansion-panel-text>
            <p>
              Each grey leg is an approach. The arrow on it is a movement, and
              its colour and number are the phase that serves it.
            </p>
            <ul class="mt-2">
              <li>
                <b>Which way a leg points.</b> An approach's compass bearing is
                the heading traffic holds <i>arriving</i> at the stop bar, so
                an eastbound approach comes <i>from</i> the west and its leg is
                drawn to the west. This catches people out; it is the single
                most common way a phase diagram ends up mirrored.
              </li>
              <li class="mt-1">
                <b>Where an arrow sits across the leg.</b> Lefts sit toward the
                centreline, rights toward the kerb, throughs in between &mdash;
                the lane the movement is actually made from. Two phases with
                the same movement off one approach are spread apart so they do
                not land on top of each other.
              </li>
              <li class="mt-1">
                <b>Dashed lines.</b> A dashed shaft is a protected-permissive
                left; a dashed yellow turn is a flashing yellow arrow; dashed
                lines across the legs are crosswalks, coloured to the phase
                that calls them.
              </li>
              <li class="mt-1">
                <b>A P-badge</b> marks a pedestrian-only phase, which has
                crossings but no arrow to hang its number on.
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What It Cannot Know" value="limits">
          <v-expansion-panel-text>
            <p>
              This is a schematic, not a survey. Legs radiate from a common
              centre at their true bearings, but lane counts, offsets, skews,
              medians and the actual width of anything are not drawn. Two
              intersections with the same bearings and phases produce the same
              picture.
            </p>
            <p class="mt-2">
              A phase whose <code>approach_id</code> names no approach has no
              bearing to be drawn on, so it is listed as unplaced rather than
              guessed at. A diagram quietly missing phase 4 is worse than one
              that says phase 4 could not be placed.
            </p>
            <p class="mt-2">
              Handedness changes every turn in every diagram. It is read from
              <code>agency.txt</code> when the export carries it, and is a
              switch below when it does not.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Printing a Large Sheet" value="printing">
          <v-expansion-panel-text>
            <p>
              The PDF is vector, not a screenshot, so it stays sharp at
              whatever size the plotter is set to and the text in it is real
              text you can search. A hundred diagrams come out a few hundred
              kilobytes rather than a few hundred megabytes.
            </p>
            <p class="mt-2">
              The thing to watch is text size. A 10&nbsp;&times;&nbsp;10 grid on
              a 30-inch sheet gives each diagram about two and a half inches,
              which puts the street names near 7&nbsp;pt &mdash; small but
              readable. The same grid on letter paper is under 2&nbsp;pt, which
              is not. The page works out the smallest text on your sheet and
              says so before you send it anywhere.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <!-- Where the intersections come from. One or the other, never both at
         once: a half-typed intersection and a loaded export fighting over the
         same preview is a worse problem than an extra click. -->
    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">The intersections</h2>
        <p class="setup-card__hint">
          A GTSS export already has everything this needs. Without one, build
          an intersection by hand.
        </p>
      </div>
      <v-tabs v-model="sourceTab" density="compact" color="primary">
        <v-tab value="gtss">Load a GTSS export</v-tab>
        <v-tab value="manual">Build one by hand</v-tab>
      </v-tabs>
      <v-window v-model="sourceTab" class="mt-3">
        <v-window-item value="gtss">
          <div class="gtss-row">
            <v-btn
              variant="tonal"
              prepend-icon="mdi-folder-zip-outline"
              :loading="gtssLoading"
              @click="$refs.gtssInput.click()"
            >
              Load GTSS export
            </v-btn>
            <input
              ref="gtssInput"
              type="file"
              class="hidden-file"
              multiple
              accept=".zip,.txt"
              @change="loadGtssFiles"
            />
            <span v-if="gtssName" class="gtss-name">
              <v-icon icon="mdi-check" size="small" class="gtss-tick" />
              {{ gtssName }}
              <span class="muted">— {{ gtssSummary }}</span>
              <v-btn size="x-small" variant="text" @click="clearGtss">Clear</v-btn>
            </span>
            <span v-else class="setup-card__hint">
              approaches.txt and phases.txt are the two it draws from.
            </span>
          </div>
          <v-alert v-if="gtssError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ gtssError }}
          </v-alert>
          <v-alert
            v-else-if="gtss && gtss.warnings.length"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ gtss.warnings.join(" ") }}
          </v-alert>
        </v-window-item>

        <v-window-item value="manual">
          <div class="manual-head">
            <p class="setup-card__hint">
              Approaches first &mdash; a street and the heading traffic arrives
              on &mdash; then a phase for each movement.
            </p>
            <v-btn size="small" variant="tonal" @click="loadExample">
              Load a standard 8-phase intersection
            </v-btn>
          </div>

          <div class="settings-row mt-2">
            <v-text-field
              v-model="manualSignalId"
              label="Signal ID"
              placeholder="Optional"
              density="compact"
              variant="outlined"
              hide-details
              class="setting--narrow"
            ></v-text-field>
          </div>

          <h3 class="sub-title">Approaches</h3>
          <v-table density="compact" class="editor-table">
            <thead>
              <tr>
                <th>Street</th>
                <th>Arriving heading (&deg;)</th>
                <th>Reads as</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in manualApproaches" :key="row.approachId">
                <td>
                  <input v-model="row.streetName" type="text" class="cell-input" />
                </td>
                <td>
                  <input
                    v-model.number="row.compassBearing"
                    type="number"
                    min="0"
                    max="359"
                    class="cell-input cell-input--narrow"
                  />
                </td>
                <td class="muted nowrap">{{ bearingNote(row.compassBearing) }}</td>
                <td>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    :aria-label="`Remove approach ${index + 1}`"
                    @click="removeApproach(index)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="addApproach">
            Add approach
          </v-btn>

          <h3 class="sub-title mt-4">Phases</h3>
          <v-table density="compact" class="editor-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Approach</th>
                <th>Movement</th>
                <th>Crossing</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in manualPhases" :key="row.key">
                <td>
                  <input
                    v-model.number="row.phase"
                    type="number"
                    min="1"
                    max="16"
                    class="cell-input cell-input--narrow"
                  />
                </td>
                <td>
                  <v-select
                    v-model="row.approachId"
                    :items="approachChoices"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="cell-select"
                  ></v-select>
                </td>
                <td>
                  <v-select
                    v-model="row.movementType"
                    :items="movementChoices"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="cell-select"
                  ></v-select>
                </td>
                <td>
                  <v-select
                    v-model="row.pedX"
                    :items="pedChoices"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="cell-select"
                  ></v-select>
                </td>
                <td>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    :aria-label="`Remove phase row ${index + 1}`"
                    @click="removePhase(index)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-plus"
            :disabled="!manualApproaches.length"
            @click="addPhase"
          >
            Add phase
          </v-btn>
        </v-window-item>
      </v-window>
    </v-card>

    <template v-if="signals.length">
      <!-- What goes in each cell. This is the question the tool turns on: a
           sheet of intersections and a sheet of one intersection's phases are
           both worth printing and they are not the same sheet. -->
      <v-card class="setup-card" variant="outlined">
        <div class="setup-card__head">
          <h2 class="setup-card__title">What goes in each box</h2>
        </div>
        <div class="settings-row">
          <v-btn-toggle
            v-model="cellMode"
            mandatory
            divided
            density="compact"
            variant="outlined"
            color="primary"
          >
            <v-btn value="signal" size="small">One intersection</v-btn>
            <v-btn value="phase" size="small">One phase</v-btn>
          </v-btn-toggle>
          <v-select
            v-if="signals.length > 1"
            v-model="chosenSignals"
            :items="signalOptions"
            label="Signals"
            multiple
            chips
            closable-chips
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--wide"
          >
            <template #prepend-item>
              <v-list-item title="Select all" @click="chosenSignals = signals.map((s) => s.signalId)" />
              <v-divider />
            </template>
          </v-select>
          <div class="setting-note">{{ sheetItems.length }} {{ sheetItems.length === 1 ? "diagram" : "diagrams" }}</div>
        </div>
        <p v-if="cellMode === 'phase'" class="setup-card__hint mt-2">
          One box per phase, each still showing the whole intersection so the
          movement has something to belong to. This is the sheet to print when
          the question is what a sequence does, rather than where the signals
          are.
        </p>
      </v-card>

      <v-card class="setup-card" variant="outlined">
        <div class="setup-card__head">
          <h2 class="setup-card__title">How it looks</h2>
        </div>
        <div class="settings-row">
          <v-select
            v-model="palette"
            :items="paletteOptions"
            label="Colours"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--wide"
          ></v-select>
          <v-switch
            v-model="options.showStreetNames"
            label="Street names"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
          <v-switch
            v-model="options.showPhaseNumbers"
            label="Phase numbers"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
          <v-switch
            v-model="options.showCrosswalks"
            label="Crosswalks"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
          <v-switch
            v-model="showSignalId"
            label="ID in the middle"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
          <v-switch
            v-model="options.showCompass"
            label="Compass"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
          <v-switch
            v-model="options.isLht"
            label="Drives on the left"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
        </div>
        <p v-if="palette === 'print'" class="setup-card__hint mt-2">
          Everything in black, for a monochrome plotter where eight hues come
          out as eight indistinguishable greys. The phase numbers do the work
          the colours were doing.
        </p>
      </v-card>

      <h2 class="section-title">Preview</h2>
      <p class="chart-hint">
        {{ previewNote }}
      </p>
      <div class="preview-grid">
        <figure v-for="item in previewItems" :key="item.key" class="preview-cell">
          <!-- The markup comes from this app's own generator, which escapes
               every string that came out of the uploaded file. -->
          <div class="preview-svg" v-html="item.svg"></div>
          <figcaption>
            <span class="preview-caption">{{ item.caption }}</span>
            <span v-if="item.sublabel" class="preview-sub">{{ item.sublabel }}</span>
          </figcaption>
        </figure>
      </div>

      <v-alert
        v-if="unplacedNote"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        {{ unplacedNote }}
      </v-alert>

      <h2 class="section-title">The printed sheet</h2>
      <v-card class="setup-card" variant="outlined">
        <div class="settings-row">
          <v-select
            v-model="sheet.paper"
            :items="paperOptions"
            label="Paper"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--wide"
          ></v-select>
          <v-select
            v-model="sheet.orientation"
            :items="[{ title: 'Portrait', value: 'portrait' }, { title: 'Landscape', value: 'landscape' }]"
            label="Orientation"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--wide"
          ></v-select>
          <v-text-field
            v-model.number="sheet.columns"
            type="number"
            min="1"
            max="10"
            label="Columns"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--narrow"
          ></v-text-field>
          <v-text-field
            v-model.number="sheet.rows"
            type="number"
            min="1"
            max="10"
            label="Rows"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--narrow"
          ></v-text-field>
          <v-text-field
            v-model.number="sheet.marginInches"
            type="number"
            min="0"
            step="0.25"
            label="Margin (in)"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--narrow"
          ></v-text-field>
        </div>
        <div class="settings-row mt-3">
          <v-text-field
            v-model="sheet.title"
            label="Sheet title"
            placeholder="Optional"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--grow"
          ></v-text-field>
          <v-switch
            v-model="sheet.showGridLines"
            label="Box each diagram"
            density="compact"
            color="primary"
            hide-details
          ></v-switch>
        </div>

        <div class="quick-grid">
          <span class="setup-card__hint">Common grids:</span>
          <v-btn
            v-for="n in [1, 2, 3, 4, 5, 10]"
            :key="n"
            size="x-small"
            variant="tonal"
            @click="sheet.columns = n; sheet.rows = n"
          >
            {{ n }} × {{ n }}
          </v-btn>
        </div>

        <div class="advice-row">
          <div class="metric-tile">
            <div class="metric-value">{{ advice.perPage }}</div>
            <div class="metric-label">per page</div>
          </div>
          <div class="metric-tile">
            <div class="metric-value">{{ advice.pages }}</div>
            <div class="metric-label">{{ advice.pages === 1 ? "page" : "pages" }}</div>
          </div>
          <div class="metric-tile">
            <div class="metric-value">{{ advice.cellInches.toFixed(1) }}″</div>
            <div class="metric-label">each diagram</div>
          </div>
          <div class="metric-tile" :class="{ 'metric-tile--warn': advice.tooSmall }">
            <div class="metric-value">{{ advice.smallestTextPt.toFixed(1) }} pt</div>
            <div class="metric-label">smallest text</div>
          </div>
        </div>
        <v-alert
          v-if="advice.tooSmall"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          At {{ advice.smallestTextPt.toFixed(1) }} pt the street names will not
          be readable at arm's length. Use fewer boxes, bigger paper, or turn
          the street names off and let the phase numbers carry it.
        </v-alert>
      </v-card>

      <div class="action-row">
        <v-btn color="primary" :loading="building" @click="downloadPdf">
          Download PDF
        </v-btn>
        <v-btn variant="tonal" @click="downloadSvg">Download SVG</v-btn>
        <span class="setup-card__hint">
          {{ paperLabel }} · {{ sheet.columns }} × {{ sheet.rows }} ·
          {{ advice.pages }} {{ advice.pages === 1 ? "page" : "pages" }}
        </span>
      </div>
      <v-alert v-if="pdfError" type="error" variant="tonal" density="compact" class="mt-3">
        {{ pdfError }}
      </v-alert>
    </template>

    <v-alert v-else type="info" variant="tonal" class="mt-4">
      Load a GTSS export, or build an intersection by hand, and the diagrams
      appear here.
    </v-alert>
  </div>
</template>

<script>
import jsPDF from "jspdf";
import { readZipText } from "../utils/zipReader.js";
import { buildPhaseDirectory, bearingToCompass, bearingToTravel } from "../utils/gtss.js";
import {
  DEFAULT_OPTIONS,
  PALETTES,
  buildPhaseDiagram,
} from "../utils/phaseDiagram.js";
import { diagramToSvg } from "../utils/phaseDiagramSvg.js";
import { DEFAULT_SHEET, PAPER_SIZES, paperPoints } from "../utils/phaseSheet.js";
import { drawSheet, sheetAdvice } from "../utils/phaseDiagramPdf.js";

/** Rendering a hundred diagrams into the DOM at once is a slideshow. */
const PREVIEW_LIMIT = 24;

const MOVEMENTS = [
  { value: "T", title: "Through" },
  { value: "L", title: "Left" },
  { value: "LPP", title: "Left protected-permissive" },
  { value: "FYA", title: "Flashing yellow arrow" },
  { value: "LT", title: "Left + through" },
  { value: "TR", title: "Through + right" },
  { value: "TL", title: "Permissive" },
  { value: "R", title: "Right" },
  { value: "U", title: "U-turn" },
  { value: "PED", title: "Pedestrian only" },
];

const PED_MODES = [
  { value: 0, title: "None" },
  { value: 1, title: "This approach" },
  { value: 2, title: "Both sides" },
  { value: 3, title: "Opposite side" },
  { value: 4, title: "Diagonal ╲" },
  { value: 5, title: "Diagonal ╱" },
  { value: 6, title: "Scramble ✕" },
  { value: 7, title: "All crossings" },
];

/** A plain four-leg, eight-phase intersection, for a page that is still empty. */
function exampleIntersection() {
  const approaches = [
    { approachId: "A1", streetName: "Main St", compassBearing: 0 },
    { approachId: "A2", streetName: "1st Ave", compassBearing: 90 },
    { approachId: "A3", streetName: "Main St", compassBearing: 180 },
    { approachId: "A4", streetName: "1st Ave", compassBearing: 270 },
  ];
  const phases = [
    { phase: 1, approachId: "A3", movementType: "L", pedX: 0 },
    { phase: 2, approachId: "A1", movementType: "T", pedX: 1 },
    { phase: 3, approachId: "A4", movementType: "L", pedX: 0 },
    { phase: 4, approachId: "A2", movementType: "T", pedX: 1 },
    { phase: 5, approachId: "A1", movementType: "L", pedX: 0 },
    { phase: 6, approachId: "A3", movementType: "T", pedX: 1 },
    { phase: 7, approachId: "A2", movementType: "L", pedX: 0 },
    { phase: 8, approachId: "A4", movementType: "T", pedX: 1 },
  ];
  return { approaches, phases };
}

export default {
  name: "PhaseDiagramView",
  data() {
    return {
      panel: [],
      sourceTab: "gtss",
      gtss: null,
      gtssName: "",
      gtssError: "",
      gtssLoading: false,
      manualApproaches: [],
      manualPhases: [],
      manualSeq: 0,
      cellMode: "signal",
      chosenSignals: [],
      palette: "signal",
      showSignalId: true,
      manualSignalId: "",
      options: { ...DEFAULT_OPTIONS },
      sheet: { ...DEFAULT_SHEET, title: "" },
      building: false,
      pdfError: "",
      movementChoices: MOVEMENTS,
      pedChoices: PED_MODES,
    };
  },
  computed: {
    paletteOptions() {
      return Object.entries(PALETTES).map(([value, p]) => ({ value, title: p.name }));
    },
    paperOptions() {
      return Object.entries(PAPER_SIZES).map(([value, p]) => ({ value, title: p.name }));
    },
    paperLabel() {
      return (PAPER_SIZES[this.sheet.paper] || PAPER_SIZES.square30).name;
    },
    /** Every intersection available to draw, whichever tab produced it. */
    signals() {
      if (this.sourceTab === "manual") {
        if (!this.manualApproaches.length) return [];
        return [{
          signalId: this.manualSignalId.trim() || "manual",
          name: this.manualName,
          approaches: this.manualApproaches,
          phases: [...this.manualPhases].sort((a, b) => a.phase - b.phase),
        }];
      }
      if (!this.gtss) return [];
      return this.gtss.signals.map((id) => this.gtss.bySignal.get(id));
    },
    manualName() {
      const streets = [...new Set(
        this.manualApproaches.map((a) => (a.streetName || "").trim()).filter(Boolean),
      )];
      return streets.slice(0, 2).join(" & ");
    },
    approachChoices() {
      return this.manualApproaches.map((a) => ({
        value: a.approachId,
        title: `${a.streetName || "(unnamed)"} — ${a.compassBearing}°`,
      }));
    },
    signalOptions() {
      return this.signals.map((signal) => ({
        value: signal.signalId,
        title: signal.name ? `${signal.signalId} — ${signal.name}` : String(signal.signalId),
      }));
    },
    activeSignals() {
      if (this.signals.length <= 1) return this.signals;
      if (!this.chosenSignals.length) return this.signals;
      const wanted = new Set(this.chosenSignals);
      return this.signals.filter((signal) => wanted.has(signal.signalId));
    },
    drawOptions() {
      return { ...this.options, palette: this.palette };
    },
    /**
     * Every diagram the sheet will carry, in order.
     *
     * Built once and shared by the preview and the PDF, so what is on screen
     * is what comes out of the plotter.
     */
    sheetItems() {
      const items = [];
      for (const signal of this.activeSignals) {
        const label = signal.name || `Signal ${signal.signalId}`;
        // "manual" is this page's own placeholder id, not something anyone
        // typed, so it has no business appearing under a diagram.
        const idLabel = signal.signalId === "manual" ? "" : `Signal ${signal.signalId}`;
        if (this.cellMode === "signal") {
          items.push({
            key: `s-${signal.signalId}`,
            caption: label,
            sublabel: signal.name ? idLabel : "",
            diagram: buildPhaseDiagram({
              approaches: signal.approaches,
              phases: signal.phases,
              options: this.optionsFor(signal),
            }),
          });
          continue;
        }
        for (const phase of signal.phases) {
          items.push({
            key: `p-${signal.signalId}-${phase.phase}`,
            caption: `Phase ${phase.phase}`,
            sublabel: label,
            diagram: buildPhaseDiagram({
              // Every leg, one movement: the phase needs an intersection to
              // belong to or it is an arrow floating in space.
              approaches: signal.approaches,
              phases: [phase],
              options: this.optionsFor(signal),
            }),
          });
        }
      }
      return items;
    },
    previewItems() {
      return this.sheetItems.slice(0, PREVIEW_LIMIT).map((item) => ({
        ...item,
        svg: diagramToSvg(item.diagram, {
          title: `${item.caption}${item.sublabel ? ` — ${item.sublabel}` : ""}`,
        }),
      }));
    },
    previewNote() {
      const total = this.sheetItems.length;
      if (total > PREVIEW_LIMIT) {
        return `Showing the first ${PREVIEW_LIMIT} of ${total}. The PDF has all of them.`;
      }
      return total === 1 ? "One diagram." : `${total} diagrams.`;
    },
    unplacedNote() {
      const warnings = (this.gtss?.warnings || []).filter((w) => w.includes("no bearing"));
      return warnings.join(" ");
    },
    gtssSummary() {
      if (!this.gtss) return "";
      const count = this.gtss.signals.length;
      return `${count} ${count === 1 ? "signal" : "signals"}`;
    },
    advice() {
      return sheetAdvice(this.sheetSettings, this.sheetItems.length);
    },
    sheetSettings() {
      return {
        ...this.sheet,
        columns: Math.min(10, Math.max(1, Number(this.sheet.columns) || 1)),
        rows: Math.min(10, Math.max(1, Number(this.sheet.rows) || 1)),
      };
    },
  },
  watch: {
    // An export's own handedness beats the switch, because it is a fact about
    // the agency rather than a guess by whoever opened the page.
    gtss(next) {
      if (next) this.options.isLht = next.isLht;
    },
  },
  methods: {
    /** The diagram options for one signal, including its own ID. */
    optionsFor(signal) {
      return {
        ...this.drawOptions,
        // "manual" is this page's placeholder, not an ID anyone assigned.
        centerLabel: this.showSignalId && signal.signalId !== "manual"
          ? String(signal.signalId)
          : "",
      };
    },
    bearingNote(bearing) {
      const n = Number(bearing);
      if (!Number.isFinite(n)) return "";
      return `from the ${bearingToCompass((n + 180) % 360)} (${bearingToTravel(n)})`;
    },
    addApproach() {
      this.manualSeq += 1;
      this.manualApproaches.push({
        approachId: `M${this.manualSeq}`,
        streetName: "",
        compassBearing: 0,
      });
    },
    removeApproach(index) {
      const [gone] = this.manualApproaches.splice(index, 1);
      // Phases pointing at a removed approach would silently stop drawing, so
      // take them with it rather than leaving invisible rows behind.
      this.manualPhases = this.manualPhases.filter((p) => p.approachId !== gone.approachId);
    },
    addPhase() {
      this.manualSeq += 1;
      const used = new Set(this.manualPhases.map((p) => p.phase));
      let next = 1;
      while (used.has(next) && next < 17) next += 1;
      this.manualPhases.push({
        key: `P${this.manualSeq}`,
        phase: next,
        approachId: this.manualApproaches[0]?.approachId || "",
        movementType: "T",
        pedX: 0,
      });
    },
    removePhase(index) {
      this.manualPhases.splice(index, 1);
    },
    loadExample() {
      const { approaches, phases } = exampleIntersection();
      this.manualApproaches = approaches.map((a) => ({ ...a }));
      this.manualPhases = phases.map((p, i) => ({ ...p, key: `E${i}` }));
      this.manualSeq = 100;
    },
    async loadGtssFiles(event) {
      const files = [...(event.target.files || [])];
      if (!files.length) return;
      this.gtssError = "";
      this.gtssLoading = true;
      try {
        const collected = {};
        for (const file of files) {
          if (/\.zip$/i.test(file.name)) {
            Object.assign(collected, await readZipText(await file.arrayBuffer()));
          } else {
            collected[file.name.split("/").pop()] = await file.text();
          }
        }
        const directory = buildPhaseDirectory(collected);
        if (!directory.signals.length) {
          this.gtssError =
            directory.warnings[0] || "That export describes no approaches, so there is nothing to draw.";
          this.gtss = null;
        } else {
          this.gtss = directory;
          this.gtssName = files.map((f) => f.name).join(", ");
          this.chosenSignals = directory.signals.slice(0, 4);
        }
      } catch (err) {
        this.gtssError = `Could not read that export: ${err.message}`;
        this.gtss = null;
      } finally {
        this.gtssLoading = false;
        event.target.value = "";
      }
    },
    clearGtss() {
      this.gtss = null;
      this.gtssName = "";
      this.gtssError = "";
      this.chosenSignals = [];
    },
    fileStem() {
      const title = (this.sheet.title || "").trim();
      const base = title || (this.cellMode === "phase" ? "phase-sequence" : "phase-diagrams");
      return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "phase-diagrams";
    },
    async downloadPdf() {
      if (!this.sheetItems.length) return;
      this.pdfError = "";
      this.building = true;
      try {
        const page = paperPoints(this.sheetSettings.paper, this.sheetSettings.orientation);
        const doc = new jsPDF({
          unit: "pt",
          format: [page.width, page.height],
          orientation: page.width > page.height ? "landscape" : "portrait",
          compress: true,
        });
        drawSheet(doc, this.sheetItems, {
          ...this.sheetSettings,
          footer: "trafficsignalkit.com",
        });
        doc.save(`${this.fileStem()}.pdf`);
      } catch (err) {
        this.pdfError = `Could not build the PDF: ${err.message}`;
      } finally {
        this.building = false;
      }
    },
    downloadSvg() {
      const item = this.sheetItems[0];
      if (!item) return;
      const svg = diagramToSvg(item.diagram, { title: item.caption });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${this.fileStem()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.setup-card {
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
}
.setup-card__head {
  margin-bottom: 12px;
}
.setup-card__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: left;
}
.setup-card__hint {
  margin: 4px 0 0;
  font-size: 0.82rem;
  opacity: 0.75;
  text-align: left;
}
.sub-title {
  text-align: left;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 12px 0 6px;
}
.settings-row,
.gtss-row,
.manual-head,
.quick-grid,
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.manual-head {
  justify-content: space-between;
}
/* A select has no intrinsic width the way a number field does, so it needs a
   basis or it shrinks to its own caret. */
.setting--wide {
  flex: 0 1 240px;
  min-width: 200px;
}
.setting--narrow {
  flex: 0 0 110px;
}
.setting--grow {
  flex: 1 1 260px;
}
.setting-note {
  font-size: 0.82rem;
  opacity: 0.8;
}
.hidden-file {
  display: none;
}
.gtss-name {
  font-size: 0.82rem;
  opacity: 0.85;
}
.gtss-tick {
  color: rgb(var(--v-theme-primary));
}
.editor-table {
  max-width: 760px;
}
.cell-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  background: #fff;
}
.cell-input--narrow {
  max-width: 90px;
}
.cell-select {
  min-width: 150px;
}
.section-title {
  text-align: left;
  font-size: 1.1rem;
  margin: 24px 0 8px;
}
.chart-hint {
  text-align: left;
  font-size: 0.82rem;
  opacity: 0.75;
}
.preview-grid {
  display: grid;
  /* Fixed-width cells rather than a share of the row: with one diagram, a
     fractional column stretches a 300-unit square across the whole page. */
  grid-template-columns: repeat(auto-fill, minmax(190px, 230px));
  justify-content: start;
  gap: 14px;
  margin-top: 8px;
}
.preview-cell {
  margin: 0;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 10px;
  padding: 8px;
  background: #fff;
}
.preview-svg {
  aspect-ratio: 1;
}
.preview-cell figcaption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding-top: 4px;
}
.preview-caption {
  font-size: 0.85rem;
  font-weight: 600;
}
.preview-sub {
  font-size: 0.74rem;
  opacity: 0.65;
}
.advice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.metric-tile {
  flex: 1 1 120px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 12px;
  padding: 10px 14px;
  text-align: left;
}
.metric-tile--warn {
  border-color: rgba(245, 124, 0, 0.6);
  background: rgba(245, 124, 0, 0.06);
}
.metric-value {
  font-size: 1.25rem;
  font-weight: 600;
}
.metric-label {
  font-size: 0.74rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.muted {
  opacity: 0.7;
  font-size: 0.8rem;
}
.nowrap {
  white-space: nowrap;
}
@media (max-width: 760px) {
  .preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
