<template>
  <div class="image-annotator">
    &nbsp;
    <h1 class="h1-center-text">YOLO Image Annotator</h1>
    <p class="intro-text">
      Draw boxes around traffic signal heads and export a YOLO training
      dataset. Pull frames from intersection video with the
      <router-link to="/video-frame-extractor">Video Frame Extractor</router-link>
      first, then label them here. Everything runs in your browser &mdash; your
      images are never uploaded anywhere.
    </p>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panels" multiple>
        <v-expansion-panel title="About: what this tool produces" value="about">
          <v-expansion-panel-text>
            A zip laid out the way YOLO expects: <code>images/train</code>,
            <code>images/val</code>, matching <code>labels/…</code> folders of
            normalized <code>class cx cy w h</code> text files, and a
            <code>data.yaml</code>. This tool is single-class &mdash; every box
            is class 0 &mdash; so the detector it trains finds signal heads
            rather than reading their indication. The images inside the zip are
            your original files copied byte for byte, never re-encoded.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Keyboard shortcuts" value="keys">
          <v-expansion-panel-text>
            <div class="shortcut-grid">
              <div v-for="row in shortcutRows" :key="row.keys" class="shortcut-row">
                <kbd>{{ row.keys }}</kbd><span>{{ row.what }}</span>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What makes a good traffic-signal dataset" value="quality">
          <v-expansion-panel-text>
            Box every signal head you can identify, including the far-side and
            the ones partly hidden &mdash; a detector learns as much from hard
            examples as from easy ones. Zoom in before boxing: a head is often
            20&ndash;40 px across and a loose box at fit-to-screen scale teaches
            the model a fuzzy target.
            <br /><br />
            Images you review and find no signals in are worth keeping. They
            export as a <b>negative sample</b> &mdash; an empty label file
            &mdash; which teaches the detector what is <i>not</i> a signal.
            That is why unreviewed images are excluded from the export by
            default: shipping them as negatives would quietly teach the model
            that traffic signals are background, and you would not find out
            until the model underperformed.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="How train, val and test are split" value="split">
          <v-expansion-panel-text>
            The export builds up to three folders &mdash;
            <code>train</code>, <code>val</code> and <code>test</code> &mdash;
            and fills them for you. Set the validation and test shares; whatever
            is left over becomes training. A test share of 0 skips that folder
            entirely, and <code>data.yaml</code> then omits its <code>test:</code>
            line rather than pointing at nothing.
            <br /><br />
            Membership is decided by hashing each filename, not by shuffling, so
            adding more images later leaves every existing assignment untouched
            and two models trained weeks apart stay comparable. That makes the
            shares approximate rather than exact &mdash; the achieved counts are
            shown before you export, and the split seed re-rolls a bad draw on a
            small set.
            <br /><br />
            <b>Group frames from one video</b> is on by default. It strips a
            trailing frame number so consecutive frames share a split. Without
            it, near-identical frames land on both sides and the validation
            score measures memorization instead of generalization.
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Where your work is saved" value="saving">
          <v-expansion-panel-text>
            Boxes auto-save in this browser as you draw them, keyed by filename
            and size, so a refresh or a closed tab costs nothing &mdash; re-pick
            the same images and the boxes come back. That key is a heuristic,
            not a fingerprint of the pixels: two different images that share a
            filename <i>and</i> a byte count would share annotations.
            <br /><br />
            Auto-save is a convenience, not an archive. Browsers cap it at a few
            megabytes and clearing site data wipes it. <b>Save Project</b> writes
            a JSON file that is the durable copy, and it is what moves work to
            another machine.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-alert v-if="storageDisabled" type="warning" variant="tonal" class="mt-4" density="compact">
      Auto-save is off &mdash; this browser refused local storage (private
      browsing, or the quota is full). Use <b>Save Project</b> to keep your work.
    </v-alert>

    <!-- 1. Load -->
    <v-card class="mt-6" variant="outlined">
      <v-card-title>1. Load Images</v-card-title>
      <v-card-text>
        <div
          class="drop-zone"
          :class="{ 'drop-zone-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <p class="drop-hint">Drop image files here, or</p>
          <div class="action-row justify-center">
            <v-btn color="primary" @click="$refs.fileInput.click()">Choose Images</v-btn>
            <v-btn variant="outlined" @click="$refs.folderInput.click()">Choose Folder</v-btn>
            <v-btn v-if="images.length" variant="text" @click="clearImages">Clear</v-btn>
          </div>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="d-none"
            @change="onFilesPicked"
          />
          <input
            ref="folderInput"
            type="file"
            webkitdirectory
            directory
            multiple
            class="d-none"
            @change="onFilesPicked"
          />
        </div>

        <div v-if="images.length" class="scan-summary">
          <v-chip class="ma-1" color="primary" variant="tonal">{{ images.length }} images</v-chip>
          <v-chip class="ma-1" variant="tonal">{{ formatBytes(totalBytes) }}</v-chip>
          <v-chip v-if="restoredCount" class="ma-1" color="success" variant="tonal">
            {{ restoredCount }} restored from auto-save
          </v-chip>
          <v-chip v-if="skippedCount" class="ma-1" color="warning" variant="tonal">
            {{ skippedCount }} non-image files skipped
          </v-chip>
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </v-card-text>
    </v-card>

    <!-- 2. Annotate -->
    <v-card v-if="images.length" class="mt-6" variant="outlined">
      <v-card-title>2. Annotate</v-card-title>
      <v-card-text>
        <!-- Vuetify's VCard is position:relative with z-index:0, which creates a
             stacking context the panel cannot escape with z-index alone. For
             the in-page fallback we teleport out of it. Native fullscreen is
             NOT teleported: re-parenting the fullscreen element makes the
             browser drop out of fullscreen immediately. -->
        <Teleport to="body" :disabled="!focusMode">
        <div
          ref="annotateShell"
          class="annotate-shell"
          :class="{ 'annotate-maximized': isMaximized, 'is-detached': focusMode }"
        >
        <div class="annotate-header">
          <div class="image-name" :title="currentImage && currentImage.name">
            <strong>{{ currentIndex + 1 }} / {{ images.length }}</strong>
            &nbsp;{{ currentImage ? currentImage.name : "" }}
            <span v-if="currentImage && currentImage.width" class="dim-note">
              ({{ currentImage.width }}&times;{{ currentImage.height }})
            </span>
          </div>
          <div class="status-pill" :class="`status-${currentStatus}`">{{ statusLabel }}</div>
        </div>

        <div class="toolbar">
          <v-btn size="small" variant="outlined" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">
            &larr; Prev
            <v-tooltip v-bind="tooltipProps" text="Previous image  ( ← )" />
          </v-btn>
          <v-btn
            size="small"
            variant="outlined"
            :disabled="currentIndex >= images.length - 1"
            @click="goTo(currentIndex + 1)"
          >
            Next &rarr;
            <v-tooltip v-bind="tooltipProps" text="Next image  ( → )" />
          </v-btn>
          <v-btn size="small" color="primary" @click="markReviewedAndAdvance">
            Reviewed &amp; Next
            <v-tooltip v-bind="tooltipProps" text="Mark reviewed and advance  ( Enter )" />
          </v-btn>
          <v-btn size="small" color="secondary" variant="outlined" @click="markNegativeAndAdvance">
            No Signals
            <v-tooltip v-bind="tooltipProps" text="Reviewed with no signals — a negative sample  ( N )" />
          </v-btn>
          <span class="toolbar-gap"></span>
          <v-btn size="small" variant="text" :disabled="!canUndo" @click="undo">
            Undo
            <v-tooltip v-bind="tooltipProps" text="Undo the last box change  ( Ctrl/⌘ Z )" />
          </v-btn>
          <v-btn size="small" variant="text" :disabled="!canRedo" @click="redo">
            Redo
            <v-tooltip v-bind="tooltipProps" text="Redo  ( Ctrl/⌘ Shift Z )" />
          </v-btn>
          <v-btn size="small" variant="text" :disabled="!selectedBoxId" @click="deleteSelected">
            Delete Box
            <v-tooltip v-bind="tooltipProps" text="Delete the selected box  ( Del or X )" />
          </v-btn>
          <v-btn size="small" variant="text" :disabled="!canCopyPrevious" @click="copyPreviousBoxes">
            Copy Previous
            <v-tooltip v-bind="tooltipProps" text="Copy the previous image's boxes  ( C )" />
          </v-btn>
          <span class="toolbar-gap"></span>
          <v-btn size="small" variant="text" @click="fitToWindow">
            Fit
            <v-tooltip v-bind="tooltipProps" text="Fit the image to the window  ( 0 )" />
          </v-btn>
          <v-btn size="small" variant="text" @click="setZoom(1)">
            1:1
            <v-tooltip v-bind="tooltipProps" text="Zoom to 100%  ( 1 )  ·  2 / 3 / 4 give 200 / 400 / 800%" />
          </v-btn>
          <span class="zoom-readout">{{ Math.round(view.scale * 100) }}%</span>
          <span class="toolbar-gap"></span>
          <v-btn
            size="small"
            :color="isMaximized ? 'primary' : undefined"
            :variant="isMaximized ? 'flat' : 'outlined'"
            @click="toggleFullscreen"
          >
            {{ isMaximized ? "Exit Full Screen" : "Full Screen" }}
            <v-tooltip
              v-bind="tooltipProps"
              :text="isMaximized ? 'Leave full screen  ( F or Esc )' : 'Annotate on the whole screen  ( F )'"
            />
          </v-btn>
          <v-btn size="small" variant="text" @click="showShortcuts = true">
            Shortcuts
            <v-tooltip v-bind="tooltipProps" text="Show every shortcut  ( H )" />
          </v-btn>
        </div>

        <p v-if="fullscreenNote" class="note-text">{{ fullscreenNote }}</p>

        <div ref="canvasWrap" class="canvas-wrap">
          <canvas
            ref="canvas"
            class="annot-canvas"
            :class="{ 'canvas-panning': spaceDown || dragMode === 'panning' }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @contextmenu.prevent
          ></canvas>
          <div v-if="decoding" class="canvas-overlay">Decoding image…</div>
          <div v-else-if="decodeError" class="canvas-overlay canvas-overlay-error">
            {{ decodeError }}
          </div>
        </div>

        <p class="note-text">
          Drag on empty space to draw a box. Drag a box to move it, or a corner
          to resize. Scroll to zoom, hold space to pan.
          <kbd>F</kbd> full screen &middot; <kbd>Enter</kbd> next &middot;
          <kbd>N</kbd> no signals &middot; <kbd>H</kbd> all shortcuts.
          <span v-if="tinyBoxCount" class="warning-inline">
            {{ tinyBoxCount }} box(es) on this image are under {{ warnBelowPx }} px &mdash; zoom in
            and check them.
          </span>
        </p>

        <v-progress-linear
          :model-value="stats.total ? ((stats.annotated + stats.negative) / stats.total) * 100 : 0"
          color="primary"
          height="8"
          rounded
          class="mt-2"
        />
        <div class="progress-line">
          <span>
            {{ stats.annotated + stats.negative }} / {{ stats.total }} reviewed &middot;
            {{ stats.boxes }} boxes &middot; {{ stats.negative }} negatives &middot;
            {{ stats.pending }} pending
          </span>
          <v-btn size="x-small" variant="text" :disabled="!stats.pending" @click="goToNextUnreviewed">
            Jump to next unreviewed
          </v-btn>
        </div>

        <div v-if="images.length <= 2000" class="status-strip">
          <button
            v-for="(image, index) in images"
            :key="image.id"
            type="button"
            class="strip-cell"
            :class="[`strip-${statusOf(image)}`, { 'strip-current': index === currentIndex }]"
            :title="`${index + 1}. ${image.name} — ${statusOf(image)}`"
            @click="goTo(index)"
          ></button>
        </div>

        <!-- Lives inside the shell so it is visible in fullscreen too: an
             overlay teleported to <body> would be outside the fullscreen
             element's subtree and never render. -->
        <div v-if="showShortcuts" class="shortcut-overlay" @click.self="showShortcuts = false">
          <div class="shortcut-panel">
            <div class="shortcut-panel-head">
              <strong>Keyboard shortcuts</strong>
              <v-btn size="x-small" variant="text" @click="showShortcuts = false">Close</v-btn>
            </div>
            <div class="shortcut-grid">
              <div v-for="row in shortcutRows" :key="`ov-${row.keys}`" class="shortcut-row">
                <kbd>{{ row.keys }}</kbd><span>{{ row.what }}</span>
              </div>
            </div>
          </div>
        </div>
        </div>
        </Teleport>
      </v-card-text>
    </v-card>

    <!-- 3. Settings -->
    <v-card v-if="images.length" class="mt-6" variant="outlined">
      <v-card-title>3. Dataset Settings</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="className"
              label="Class name"
              hint="Used in data.yaml only"
              persistent-hint
              density="compact"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model.number="valRatio"
              type="number"
              min="0"
              max="1"
              step="0.05"
              label="Validation share"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model.number="testRatio"
              type="number"
              min="0"
              max="1"
              step="0.05"
              label="Test share"
              hint="0 skips the test folder"
              persistent-hint
              density="compact"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="splitSeed"
              label="Split seed"
              hint="Change to re-roll the split"
              persistent-hint
              density="compact"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model.number="warnBelowPx"
              type="number"
              min="1"
              step="1"
              label="Flag boxes under (px)"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
        </v-row>
        <v-switch
          v-model="groupSplit"
          color="primary"
          density="compact"
          hide-details
          label="Group frames from one video into the same split"
        />
      </v-card-text>
    </v-card>

    <!-- 4. Export -->
    <v-card v-if="images.length" class="mt-6" variant="outlined">
      <v-card-title>4. Review &amp; Export</v-card-title>
      <v-card-text>
        <div class="stat-row">
          <div class="stat-tile">
            <span class="stat-value">{{ exportPlan.count }}</span>
            <span class="stat-label">Images in dataset</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">
              {{ exportPlan.counts.train }} / {{ exportPlan.counts.val }}
              <template v-if="exportPlan.counts.test"> / {{ exportPlan.counts.test }}</template>
            </span>
            <span class="stat-label">
              Train / val<template v-if="exportPlan.counts.test"> / test</template>
              <template v-if="exportPlan.count">
                &mdash; {{ ((exportPlan.counts.val / exportPlan.count) * 100).toFixed(1) }}% val<template
                  v-if="exportPlan.counts.test"
                >, {{ ((exportPlan.counts.test / exportPlan.count) * 100).toFixed(1) }}% test</template>
              </template>
            </span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">{{ stats.boxes }}</span>
            <span class="stat-label">Boxes</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">{{ stats.negative }}</span>
            <span class="stat-label">Negative samples</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">{{ formatBytes(exportPlan.bytes) }}</span>
            <span class="stat-label">Approx. zip size</span>
          </div>
        </div>

        <v-switch
          v-model="includeUnreviewed"
          color="warning"
          density="compact"
          hide-details
          :label="`Include the ${stats.pending} unreviewed image(s) as negative samples`"
        />
        <p v-if="includeUnreviewed && stats.pending" class="warning-text">
          Unreviewed images will be exported with empty label files. If any of
          them actually contain signal heads, you are teaching the detector that
          signals are background.
        </p>
        <p v-if="ratioWarning" class="warning-text">{{ ratioWarning }}</p>
        <p v-if="emptySplitWarning" class="warning-text">{{ emptySplitWarning }}</p>
        <p v-if="stats.tiny" class="note-text">
          {{ stats.tiny }} box(es) are smaller than {{ warnBelowPx }} px. They are still exported
          &mdash; this is a prompt to check them, not an error.
        </p>
        <p v-if="exportError" class="error-message">{{ exportError }}</p>

        <div class="action-row">
          <v-btn
            color="primary"
            :disabled="!exportPlan.count || exporting"
            :loading="exporting"
            @click="exportDataset"
          >
            Export YOLO Dataset (.zip)
          </v-btn>
          <v-btn v-if="exporting" variant="outlined" @click="cancelExport">Cancel</v-btn>
          <span v-if="!exportPlan.count" class="note-text">
            Review at least one image first.
          </span>
        </div>
        <v-progress-linear
          v-if="exporting"
          :model-value="exportProgress"
          color="primary"
          height="6"
          rounded
          class="mt-2"
        />
        <p v-if="exporting" class="note-text">{{ exportStatus }}</p>
      </v-card-text>
    </v-card>

    <!-- 5. Project -->
    <v-card v-if="images.length" class="mt-6" variant="outlined">
      <v-card-title>5. Save / Load Project</v-card-title>
      <v-card-text>
        <div class="action-row">
          <v-btn color="secondary" @click="saveProject">Save Project (.json)</v-btn>
          <v-btn variant="outlined" @click="$refs.projectInput.click()">Load Project</v-btn>
          <v-btn variant="text" @click="clearSavedAnnotations">Clear Auto-saved Boxes</v-btn>
          <span v-if="!storageDisabled" class="note-text">
            Auto-save: {{ formatBytes(storageUsage) }} used
          </span>
          <input
            ref="projectInput"
            type="file"
            accept="application/json,.json"
            class="d-none"
            @change="onProjectPicked"
          />
        </div>
        <p v-if="projectMessage" class="note-text">{{ projectMessage }}</p>
        <ul v-if="projectWarnings.length" class="warning-list">
          <li v-for="(warning, index) in projectWarnings.slice(0, 5)" :key="index">{{ warning }}</li>
        </ul>
      </v-card-text>
    </v-card>

    <p class="disclaimer">
      Images and annotations stay on this machine. Nothing is uploaded, and the
      export is assembled in your browser.
    </p>
  </div>
</template>

<script>
import {
  screenToImage,
  rectToScreen,
  fitView,
  zoomAt,
  zoomToScale,
  clampPan,
  normalizeRect,
  clampRectToImage,
  moveBox,
  applyResize,
  handlePositions,
  handleIdsFor,
  hitTestHandles,
  hitTestBoxes,
  MIN_BOX_PX,
} from "../utils/annotatorGeometry";
import {
  DEFAULT_CLASS_NAME,
  deriveGroupKey,
  buildLabelFile,
  buildDataYaml,
  buildReadme,
  splitExtension,
  dedupeBasenames,
  assignSplits,
  datasetStats,
  selectExportImages,
} from "../utils/yoloDataset";
import { crc32, crc32Update, crc32Finish, CRC32_INIT, zipBlob, assertZipLimits } from "../utils/zipWriter";
import {
  imageKey,
  encodeRecord,
  loadRecord,
  safeSet,
  estimateUsage,
  clearStoredAnnotations,
  storageAvailable,
  buildProject,
  parseProject,
  matchProjectToFiles,
} from "../utils/annotationStore";

const MIN_SCALE = 0.05;
const MAX_SCALE = 64;
const BITMAP_CACHE_SIZE = 5;
const DRAW_TRAVEL_PX = 3;

let boxSequence = 0;
let imageSequence = 0;

function newBoxId() {
  boxSequence += 1;
  return `b${boxSequence}`;
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

export default {
  name: "ImageAnnotator",
  data() {
    return {
      panels: ["about"],
      images: [],
      currentIndex: 0,
      selectedBoxId: null,
      view: { scale: 1, offsetX: 0, offsetY: 0 },
      dragOver: false,
      decoding: false,
      decodeError: "",
      errorMessage: "",
      restoredCount: 0,
      skippedCount: 0,

      className: DEFAULT_CLASS_NAME,
      valRatio: 0.2,
      testRatio: 0.1,
      splitSeed: "",
      groupSplit: true,
      warnBelowPx: 8,
      includeUnreviewed: false,

      exporting: false,
      exportProgress: 0,
      exportStatus: "",
      exportError: "",

      storageDisabled: false,
      storageUsage: 0,
      projectMessage: "",
      projectWarnings: [],
      pendingProjectEntries: [],

      showShortcuts: false,
      nativeFullscreen: false,
      focusMode: false,
      fullscreenNote: "",
      spaceDown: false,
      dragMode: null,
      // Non-reactive scratch: mutated every pointer move, must not trigger renders.
      drag: null,
      canvasRect: { left: 0, top: 0, width: 0, height: 0 },
      dpr: 1,
      historyByImage: new Map(),
      bitmaps: new Map(),
      historyTick: 0,
      canvasReady: false,
    };
  },
  computed: {
    currentImage() {
      return this.images[this.currentIndex] || null;
    },
    currentBoxes() {
      return this.currentImage ? this.currentImage.boxes : [];
    },
    stats() {
      return datasetStats(this.images, { warnBelowPx: this.warnBelowPx });
    },
    currentStatus() {
      return this.currentImage ? this.statusOf(this.currentImage) : "pending";
    },
    statusLabel() {
      return { annotated: "Annotated", negative: "No signals", pending: "Not reviewed" }[
        this.currentStatus
      ];
    },
    tinyBoxCount() {
      return this.currentBoxes.filter((b) => b.w < this.warnBelowPx || b.h < this.warnBelowPx).length;
    },
    totalBytes() {
      return this.images.reduce((sum, image) => sum + image.size, 0);
    },
    canUndo() {
      return this.historyTick >= 0 && this.historyFor().past.length > 0;
    },
    canRedo() {
      return this.historyTick >= 0 && this.historyFor().future.length > 0;
    },
    canCopyPrevious() {
      const previous = this.images[this.currentIndex - 1];
      const current = this.currentImage;
      return Boolean(
        previous &&
          current &&
          previous.boxes.length &&
          !current.boxes.length &&
          previous.width === current.width &&
          previous.height === current.height,
      );
    },
    exportPlan() {
      const chosen = selectExportImages(this.images, { includeUnreviewed: this.includeUnreviewed });
      const bases = dedupeBasenames(chosen.map((image) => image.name));
      const { counts } = assignSplits(bases, {
        valRatio: this.valRatio,
        testRatio: this.testRatio,
        seed: this.splitSeed,
        groupSplit: this.groupSplit,
      });
      return {
        count: chosen.length,
        counts,
        // How many independent things the hash actually has to work with —
        // grouping can collapse hundreds of frames down to a handful.
        groups: new Set(bases.map((base) => (this.groupSplit ? deriveGroupKey(base) : base))).size,
        bytes: chosen.reduce((sum, image) => sum + image.size, 0),
      };
    },
    ratioWarning() {
      const val = Number(this.valRatio) || 0;
      const test = Number(this.testRatio) || 0;
      if (val + test >= 1) {
        return `A ${(val * 100).toFixed(0)}% validation share plus a ${(test * 100).toFixed(0)}% test share leaves nothing to train on. The test share is capped so training keeps what is left.`;
      }
      return "";
    },
    emptySplitWarning() {
      const { count, counts, groups } = this.exportPlan;
      if (!count) return "";

      // Only complain about a split the user actually asked for.
      const wanted = [
        { key: "train", label: "training", asked: true },
        { key: "val", label: "validation", asked: Number(this.valRatio) > 0 },
        { key: "test", label: "test", asked: Number(this.testRatio) > 0 },
      ];
      const missing = wanted.filter((split) => split.asked && !counts[split.key]);
      if (!missing.length) return "";

      const names = missing.map((split) => split.label).join(" and ");
      const plural = missing.length > 1 ? "sets would be" : "set would be";
      const opening = `The ${names} ${plural} empty.`;

      // Diagnose the real cause rather than always blaming grouping: with few
      // independent groups the hash has nothing to spread, but with plenty of
      // groups an empty split is just how a small sample fell.
      if (this.groupSplit && groups < 4 && groups < count) {
        return `${opening} These ${count} images collapse to ${groups} group${groups === 1 ? "" : "s"} for splitting, so grouping keeps them together — turn off grouping, or add images from another location.`;
      }
      return `${opening} With ${groups} independent image${groups === 1 ? "" : "s"} that is simply how the split fell; change the split seed, or raise the validation and test shares.`;
    },
    isMaximized() {
      return this.nativeFullscreen || this.focusMode;
    },
    tooltipProps() {
      // Vuetify overlays teleport to <body> by default, which is outside the
      // fullscreen element's subtree and therefore invisible while fullscreen.
      // Attaching them to the shell keeps tooltips working in both modes.
      return {
        activator: "parent",
        location: "bottom",
        openDelay: 350,
        attach: this.isMaximized ? this.$refs.annotateShell : false,
      };
    },
    shortcutRows() {
      return [
        { keys: "F", what: "Enter or leave full screen" },
        { keys: "Enter", what: "Mark reviewed and go to the next image" },
        { keys: "N", what: "Mark reviewed with no signals (negative sample)" },
        { keys: "R", what: "Toggle reviewed without moving" },
        { keys: "← →", what: "Previous / next image (Shift: next unreviewed)" },
        { keys: "Del / X", what: "Delete the selected box" },
        { keys: "Esc", what: "Cancel the current drag, or deselect" },
        { keys: "Tab", what: "Cycle through this image's boxes" },
        { keys: "Ctrl/⌘ Z", what: "Undo (add Shift to redo)" },
        { keys: "0", what: "Fit the image to the window" },
        { keys: "1 2 3 4", what: "Zoom to 100% / 200% / 400% / 800%" },
        { keys: "+ / -", what: "Zoom in / out" },
        { keys: "Space + drag", what: "Pan (middle-drag works too)" },
        { keys: "C", what: "Copy the previous image's boxes" },
        { keys: "H / ?", what: "Show this list" },
        { keys: "Esc", what: "Also leaves full screen" },
      ];
    },
  },
  watch: {
    currentIndex() {
      this.selectedBoxId = null;
      this.loadCurrent();
    },
    currentBoxes: {
      deep: true,
      handler() {
        this.scheduleSave();
        this.requestRender();
      },
    },
    warnBelowPx() {
      this.requestRender();
    },
    // Section 2 is v-if'd on having images, so the canvas does not exist at
    // mount. Wire it up when it actually appears, and tear it down when it goes.
    "images.length"(next, previous) {
      if (next > 0 && !previous) this.$nextTick(() => this.setupCanvas());
      else if (!next && previous) this.teardownCanvas();
    },
  },
  mounted() {
    this.dpr = window.devicePixelRatio || 1;
    this.storageDisabled = !storageAvailable();
    this.refreshStorageUsage();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
    window.addEventListener("scroll", this.refreshRect, { passive: true });
    window.addEventListener("resize", this.resizeCanvas);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    this.$nextTick(() => this.setupCanvas());
  },
  beforeUnmount() {
    this.flushSave();
    this.teardownCanvas();
    document.documentElement.style.overflow = "";
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);
    window.removeEventListener("scroll", this.refreshRect);
    window.removeEventListener("resize", this.resizeCanvas);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.releaseBitmaps();
    this.exportJobId = (this.exportJobId || 0) + 1;
  },
  methods: {
    /* ---------------------------------------------------------------- files */
    onFilesPicked(event) {
      this.addFiles(Array.from(event.target.files || []));
      event.target.value = "";
    },
    onDrop(event) {
      this.dragOver = false;
      this.addFiles(Array.from(event.dataTransfer?.files || []));
    },
    addFiles(files) {
      this.errorMessage = "";
      const accepted = files.filter((file) => /^image\//.test(file.type) || /\.(jpe?g|png|bmp|webp)$/i.test(file.name));
      this.skippedCount = files.length - accepted.length;
      if (!accepted.length) {
        if (files.length) this.errorMessage = "None of those files are images.";
        return;
      }

      const existing = new Set(this.images.map((image) => `${image.name}:${image.size}`));
      let restored = 0;

      const added = accepted
        .filter((file) => !existing.has(`${file.name}:${file.size}`))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((file) => {
          imageSequence += 1;
          const image = {
            id: `i${imageSequence}`,
            file,
            name: file.name,
            size: file.size,
            width: 0,
            height: 0,
            reviewed: false,
            boxes: [],
          };

          // Auto-save first, then any project entry the user loaded earlier.
          const saved = this.storageDisabled ? null : loadRecord(null, imageKey(file));
          const source = saved || this.takePendingProjectEntry(file);
          if (source) {
            image.reviewed = Boolean(source.reviewed);
            image.width = source.width || 0;
            image.height = source.height || 0;
            image.boxes = source.boxes.map((box) => ({ ...box, id: newBoxId() }));
            restored += 1;
          }
          return image;
        });

      if (!added.length) return;
      this.restoredCount = restored;
      this.images = [...this.images, ...added];
      if (this.images.length === added.length) this.loadCurrent();
      this.refreshStorageUsage();
    },
    takePendingProjectEntry(file) {
      const index = this.pendingProjectEntries.findIndex(
        (entry) => entry.name === file.name && entry.size === file.size,
      );
      if (index < 0) return null;
      return this.pendingProjectEntries.splice(index, 1)[0];
    },
    clearImages() {
      this.flushSave();
      this.releaseBitmaps();
      this.images = [];
      this.currentIndex = 0;
      this.selectedBoxId = null;
      this.restoredCount = 0;
      this.skippedCount = 0;
      this.historyByImage = new Map();
    },

    /* --------------------------------------------------------------- bitmap */
    async loadCurrent() {
      const image = this.currentImage;
      if (!image) return;
      this.decodeError = "";

      if (this.bitmaps.has(image.id)) {
        this.afterDecode(image);
        return;
      }

      const token = (this.decodeToken || 0) + 1;
      this.decodeToken = token;
      this.decoding = true;
      try {
        const bitmap = await createImageBitmap(image.file, { imageOrientation: "from-image" });
        if (token !== this.decodeToken) {
          bitmap.close();
          return;
        }
        image.width = bitmap.width;
        image.height = bitmap.height;
        this.bitmaps.set(image.id, bitmap);
        this.evictBitmaps();
        this.afterDecode(image);
      } catch (error) {
        if (token === this.decodeToken) {
          this.decodeError = `Could not decode ${image.name}.`;
        }
      } finally {
        if (token === this.decodeToken) this.decoding = false;
      }
    },
    afterDecode(image) {
      this.decoding = false;
      if (!this.viewLockedFor || this.viewLockedFor !== image.id) {
        this.fitToWindow();
        this.viewLockedFor = image.id;
      }
      this.requestRender();
    },
    evictBitmaps() {
      if (this.bitmaps.size <= BITMAP_CACHE_SIZE) return;
      const keep = new Set(
        this.images
          .slice(Math.max(0, this.currentIndex - 2), this.currentIndex + 3)
          .map((image) => image.id),
      );
      for (const [id, bitmap] of this.bitmaps) {
        if (this.bitmaps.size <= BITMAP_CACHE_SIZE) break;
        if (keep.has(id)) continue;
        bitmap.close();
        this.bitmaps.delete(id);
      }
    },
    releaseBitmaps() {
      for (const bitmap of this.bitmaps.values()) bitmap.close();
      this.bitmaps.clear();
    },

    /* --------------------------------------------------------------- canvas */
    setupCanvas() {
      const canvas = this.$refs.canvas;
      const wrap = this.$refs.canvasWrap;
      if (!canvas || this.canvasReady) return;

      // passive:false is required — without it the preventDefault that stops
      // the page scrolling under a zoom gesture is ignored.
      canvas.addEventListener("wheel", this.onWheel, { passive: false });
      if (typeof ResizeObserver !== "undefined" && wrap) {
        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(wrap);
      }
      this.canvasReady = true;
      this.resizeCanvas();
      // The first fit ran against a zero-sized viewport; redo it for real.
      this.viewLockedFor = null;
      this.loadCurrent();
    },
    teardownCanvas() {
      const canvas = this.$refs.canvas;
      if (canvas) canvas.removeEventListener("wheel", this.onWheel);
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      this.canvasReady = false;
    },
    refreshRect() {
      const canvas = this.$refs.canvas;
      if (canvas) this.canvasRect = canvas.getBoundingClientRect();
    },
    resizeCanvas() {
      const canvas = this.$refs.canvas;
      const wrap = this.$refs.canvasWrap;
      if (!canvas || !wrap) return;

      this.dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
      canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
      this.refreshRect();
      this.clampView();
      this.requestRender();
    },
    viewportSize() {
      return { w: this.canvasRect.width || 1, h: this.canvasRect.height || 1 };
    },
    fitToWindow() {
      const image = this.currentImage;
      if (!image || !image.width) return;
      const { w, h } = this.viewportSize();
      this.view = fitView(image.width, image.height, w, h, 12);
      this.requestRender();
    },
    setZoom(scale) {
      const { w, h } = this.viewportSize();
      this.view = zoomToScale(this.view, scale, w / 2, h / 2, MIN_SCALE, MAX_SCALE);
      this.clampView();
      this.requestRender();
    },
    clampView() {
      const image = this.currentImage;
      if (!image || !image.width) return;
      const { w, h } = this.viewportSize();
      this.view = clampPan(this.view, image.width, image.height, w, h);
    },
    requestRender() {
      if (this.rafHandle) return;
      this.rafHandle = requestAnimationFrame(() => {
        this.rafHandle = null;
        this.render();
      });
    },
    render() {
      const canvas = this.$refs.canvas;
      const image = this.currentImage;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const dpr = this.dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bitmap = image ? this.bitmaps.get(image.id) : null;
      if (!bitmap) return;

      // Pass 1: the image, in image space.
      ctx.setTransform(
        dpr * this.view.scale,
        0,
        0,
        dpr * this.view.scale,
        dpr * this.view.offsetX,
        dpr * this.view.offsetY,
      );
      // Past 2x, show real pixel edges instead of a smoothed guess.
      ctx.imageSmoothingEnabled = this.view.scale < 2;
      ctx.drawImage(bitmap, 0, 0);

      // Pass 2: boxes, in screen space, so strokes stay 1px at every zoom.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const boxes = image.boxes;
      for (const box of boxes) {
        const screen = rectToScreen(this.view, box);
        const selected = box.id === this.selectedBoxId;
        const tiny = box.w < this.warnBelowPx || box.h < this.warnBelowPx;

        ctx.lineWidth = selected ? 2 : 1;
        ctx.setLineDash(tiny ? [4, 3] : []);
        ctx.strokeStyle = selected ? "#1976d2" : tiny ? "#ef6c00" : box.carried ? "#7b1fa2" : "#43a047";
        ctx.strokeRect(
          Math.round(screen.x) + 0.5,
          Math.round(screen.y) + 0.5,
          Math.round(screen.w),
          Math.round(screen.h),
        );
        ctx.setLineDash([]);

        if (selected) {
          ctx.fillStyle = "#1976d2";
          const positions = handlePositions(screen);
          for (const id of handleIdsFor(screen)) {
            const [hx, hy] = positions[id];
            ctx.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 6, 6);
          }
        }
      }

      if (this.drag && this.drag.mode === "drawing" && this.drag.preview) {
        const screen = rectToScreen(this.view, this.drag.preview);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = "#1976d2";
        ctx.strokeRect(
          Math.round(screen.x) + 0.5,
          Math.round(screen.y) + 0.5,
          Math.round(screen.w),
          Math.round(screen.h),
        );
        ctx.setLineDash([]);
      }
    },

    /* ----------------------------------------------------------- fullscreen */
    fullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    },
    async toggleFullscreen() {
      const shell = this.$refs.annotateShell;
      if (!shell) return;

      if (this.isMaximized) {
        if (this.nativeFullscreen) {
          try {
            await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
          } catch {
            this.nativeFullscreen = false;
          }
        }
        this.focusMode = false;
        this.fullscreenNote = "";
        this.afterMaximizeChange();
        return;
      }

      try {
        await (shell.requestFullscreen?.() ?? shell.webkitRequestFullscreen?.());
        this.fullscreenNote = "";
      } catch (error) {
        // Some contexts refuse the Fullscreen API outright (an embedded frame
        // without the permission, or a locked-down browser). Maximizing inside
        // the page gets the same working surface, so fall back rather than
        // leaving the user with nothing.
        this.focusMode = true;
        this.fullscreenNote = "Full screen is blocked here, so the annotator is maximized in the page instead.";
        this.afterMaximizeChange();
      }
    },
    handleFullscreenChange() {
      this.nativeFullscreen = this.fullscreenElement() === this.$refs.annotateShell;
      if (this.nativeFullscreen) this.focusMode = false;
      this.afterMaximizeChange();
    },
    afterMaximizeChange() {
      // Keep the page behind from scrolling under the maximized panel.
      document.documentElement.style.overflow = this.isMaximized ? "hidden" : "";
      // The canvas box changes size on both transitions; re-measure and refit
      // once the browser has settled the new layout.
      this.$nextTick(() => {
        this.resizeCanvas();
        this.fitToWindow();
      });
    },

    /* -------------------------------------------------------------- pointer */
    toImage(event) {
      return screenToImage(this.view, event.clientX, event.clientY, this.canvasRect);
    },
    toLocal(event) {
      return { x: event.clientX - this.canvasRect.left, y: event.clientY - this.canvasRect.top };
    },
    onPointerDown(event) {
      const image = this.currentImage;
      if (!image || !image.width) return;
      this.refreshRect();
      try {
        this.$refs.canvas.setPointerCapture(event.pointerId);
      } catch {
        /* a pointer that is already gone cannot be captured; the drag still works */
      }

      const local = this.toLocal(event);
      const imgPt = this.toImage(event);
      const panning = this.spaceDown || event.button === 1;

      if (panning) {
        this.dragMode = "panning";
        this.drag = {
          mode: "panning",
          pointerId: event.pointerId,
          startClient: { x: event.clientX, y: event.clientY },
          startView: { ...this.view },
        };
        return;
      }
      if (event.button !== 0) return;

      const selected = image.boxes.find((box) => box.id === this.selectedBoxId);
      if (selected) {
        const handle = hitTestHandles(rectToScreen(this.view, selected), local.x, local.y);
        if (handle) {
          this.pushUndo();
          this.dragMode = "resizing";
          this.drag = {
            mode: "resizing",
            pointerId: event.pointerId,
            handle,
            boxId: selected.id,
            travel: 0,
            startClient: { x: event.clientX, y: event.clientY },
          };
          return;
        }
      }

      const hit = hitTestBoxes(image.boxes, imgPt, {
        selectedId: this.selectedBoxId,
        tolerance: 2 / this.view.scale,
      });
      if (hit) {
        this.selectedBoxId = hit.id;
        this.pushUndo();
        this.dragMode = "moving";
        this.drag = {
          mode: "moving",
          pointerId: event.pointerId,
          boxId: hit.id,
          startImg: imgPt,
          startRect: { ...hit },
          travel: 0,
          startClient: { x: event.clientX, y: event.clientY },
        };
        this.requestRender();
        return;
      }

      this.dragMode = "drawing";
      this.drag = {
        mode: "drawing",
        pointerId: event.pointerId,
        startImg: imgPt,
        startClient: { x: event.clientX, y: event.clientY },
        travel: 0,
        preview: null,
      };
    },
    onPointerMove(event) {
      const image = this.currentImage;
      if (!image) return;

      if (!this.drag) {
        this.updateCursor(event);
        return;
      }
      const drag = this.drag;
      drag.travel = Math.max(
        drag.travel || 0,
        Math.abs(event.clientX - drag.startClient.x) + Math.abs(event.clientY - drag.startClient.y),
      );

      if (drag.mode === "panning") {
        this.view = clampPan(
          {
            scale: drag.startView.scale,
            offsetX: drag.startView.offsetX + (event.clientX - drag.startClient.x),
            offsetY: drag.startView.offsetY + (event.clientY - drag.startClient.y),
          },
          image.width,
          image.height,
          this.viewportSize().w,
          this.viewportSize().h,
        );
        this.requestRender();
        return;
      }

      const imgPt = this.toImage(event);

      if (drag.mode === "drawing") {
        const x = Math.min(Math.max(imgPt.x, 0), image.width);
        const y = Math.min(Math.max(imgPt.y, 0), image.height);
        drag.preview = normalizeRect(drag.startImg.x, drag.startImg.y, x, y);
        this.requestRender();
        return;
      }

      const box = image.boxes.find((b) => b.id === drag.boxId);
      if (!box) return;

      if (drag.mode === "moving") {
        const moved = moveBox(
          drag.startRect,
          imgPt.x - drag.startImg.x,
          imgPt.y - drag.startImg.y,
          image.width,
          image.height,
        );
        box.x = moved.x;
        box.y = moved.y;
      } else if (drag.mode === "resizing") {
        const result = applyResize(box, drag.handle, imgPt, image.width, image.height);
        Object.assign(box, result.rect);
        drag.handle = result.handle;
      }
      this.requestRender();
    },
    onPointerUp(event) {
      const drag = this.drag;
      const image = this.currentImage;
      this.drag = null;
      this.dragMode = null;
      try {
        this.$refs.canvas.releasePointerCapture(event.pointerId);
      } catch {
        /* the capture may already be gone */
      }
      if (!drag || !image) return;

      if (drag.mode === "drawing") {
        const rect = drag.preview;
        // Both guards must pass: enough travel to be a deliberate drag, and a
        // box big enough to mean something. A stray click makes neither.
        if (rect && drag.travel >= DRAW_TRAVEL_PX && rect.w >= MIN_BOX_PX && rect.h >= MIN_BOX_PX) {
          this.pushUndo();
          const box = { id: newBoxId(), ...clampRectToImage(rect, image.width, image.height) };
          image.boxes.push(box);
          this.selectedBoxId = box.id;
        } else if (drag.travel < DRAW_TRAVEL_PX) {
          this.selectedBoxId = null;
        }
        this.requestRender();
        return;
      }

      if (drag.mode === "moving" || drag.mode === "resizing") {
        const box = image.boxes.find((b) => b.id === drag.boxId);
        if (box) {
          Object.assign(box, clampRectToImage(box, image.width, image.height));
          if (box.carried) box.carried = false;
        }
        if (drag.travel < 1) this.dropLastUndo();
        this.requestRender();
      }
    },
    updateCursor(event) {
      const canvas = this.$refs.canvas;
      const image = this.currentImage;
      if (!canvas || !image) return;
      if (this.spaceDown) {
        canvas.style.cursor = "grab";
        return;
      }
      const local = this.toLocal(event);
      const selected = image.boxes.find((box) => box.id === this.selectedBoxId);
      if (selected) {
        const handle = hitTestHandles(rectToScreen(this.view, selected), local.x, local.y);
        if (handle) {
          canvas.style.cursor = /^(nw|se)$/.test(handle)
            ? "nwse-resize"
            : /^(ne|sw)$/.test(handle)
              ? "nesw-resize"
              : /^(n|s)$/.test(handle)
                ? "ns-resize"
                : "ew-resize";
          return;
        }
      }
      const hit = hitTestBoxes(image.boxes, this.toImage(event), {
        selectedId: this.selectedBoxId,
        tolerance: 2 / this.view.scale,
      });
      canvas.style.cursor = hit ? "move" : "crosshair";
    },
    onWheel(event) {
      const image = this.currentImage;
      if (!image || !image.width) return;
      event.preventDefault();
      this.refreshRect();

      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= this.viewportSize().h;

      const local = { x: event.clientX - this.canvasRect.left, y: event.clientY - this.canvasRect.top };

      if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
        this.view = clampPan(
          { ...this.view, offsetX: this.view.offsetX - delta },
          image.width,
          image.height,
          this.viewportSize().w,
          this.viewportSize().h,
        );
      } else {
        this.view = zoomAt(this.view, local.x, local.y, Math.pow(1.0015, -delta), MIN_SCALE, MAX_SCALE);
        this.clampView();
      }
      this.requestRender();
    },

    /* ------------------------------------------------------------- keyboard */
    onKeyDown(event) {
      if (isTypingTarget(document.activeElement)) return;
      if (this.showShortcuts) {
        // While the overlay is up it owns Escape; everything else is ignored.
        if (event.key === "Escape") {
          event.preventDefault();
          this.showShortcuts = false;
        }
        return;
      }
      if (!this.images.length) return;

      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        this.redo();
        return;
      }
      if (meta) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          this.spaceDown = true;
          return;
        case "Enter":
          event.preventDefault();
          this.markReviewedAndAdvance();
          return;
        case "ArrowRight":
          event.preventDefault();
          if (event.shiftKey) this.goToNextUnreviewed();
          else this.goTo(this.currentIndex + 1);
          return;
        case "ArrowLeft":
          event.preventDefault();
          if (event.shiftKey) this.goToPreviousUnreviewed();
          else this.goTo(this.currentIndex - 1);
          return;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          this.deleteSelected();
          return;
        case "Escape":
          if (this.drag) {
            this.cancelDrag();
          } else if (this.focusMode) {
            this.toggleFullscreen();
          } else {
            this.selectedBoxId = null;
            this.requestRender();
          }
          return;
        case "Tab":
          event.preventDefault();
          this.cycleSelection(event.shiftKey ? -1 : 1);
          return;
        case "+":
        case "=":
          this.setZoom(this.view.scale * 1.25);
          return;
        case "-":
          this.setZoom(this.view.scale / 1.25);
          return;
        default:
          break;
      }

      switch (event.key.toLowerCase()) {
        case "n":
          this.markNegativeAndAdvance();
          break;
        case "r":
          this.toggleReviewed();
          break;
        case "x":
          this.deleteSelected();
          break;
        case "c":
          this.copyPreviousBoxes();
          break;
        case "0":
          this.fitToWindow();
          break;
        case "f":
          this.toggleFullscreen();
          break;
        case "1":
          this.setZoom(1);
          break;
        case "2":
          this.setZoom(2);
          break;
        case "3":
          this.setZoom(4);
          break;
        case "4":
          this.setZoom(8);
          break;
        case "h":
        case "?":
          this.showShortcuts = true;
          break;
        default:
          break;
      }
    },
    onKeyUp(event) {
      if (event.key === " ") this.spaceDown = false;
    },
    onWindowBlur() {
      // Without this, alt-tabbing mid-pan leaves pan mode stuck on.
      this.spaceDown = false;
    },
    cancelDrag() {
      const drag = this.drag;
      this.drag = null;
      this.dragMode = null;
      if (drag && (drag.mode === "moving" || drag.mode === "resizing")) this.undo();
      this.requestRender();
    },

    /* -------------------------------------------------------------- editing */
    historyFor(id) {
      const key = id || (this.currentImage ? this.currentImage.id : "none");
      if (!this.historyByImage.has(key)) this.historyByImage.set(key, { past: [], future: [] });
      return this.historyByImage.get(key);
    },
    pushUndo() {
      const image = this.currentImage;
      if (!image) return;
      const history = this.historyFor(image.id);
      history.past.push(JSON.stringify(image.boxes));
      if (history.past.length > 100) history.past.shift();
      history.future.length = 0;
      this.historyTick += 1;
    },
    dropLastUndo() {
      const history = this.historyFor();
      history.past.pop();
      this.historyTick += 1;
    },
    undo() {
      const image = this.currentImage;
      if (!image) return;
      const history = this.historyFor(image.id);
      if (!history.past.length) return;
      history.future.push(JSON.stringify(image.boxes));
      image.boxes = JSON.parse(history.past.pop());
      this.selectedBoxId = null;
      this.historyTick += 1;
      this.requestRender();
    },
    redo() {
      const image = this.currentImage;
      if (!image) return;
      const history = this.historyFor(image.id);
      if (!history.future.length) return;
      history.past.push(JSON.stringify(image.boxes));
      image.boxes = JSON.parse(history.future.pop());
      this.selectedBoxId = null;
      this.historyTick += 1;
      this.requestRender();
    },
    deleteSelected() {
      const image = this.currentImage;
      if (!image || !this.selectedBoxId) return;
      this.pushUndo();
      image.boxes = image.boxes.filter((box) => box.id !== this.selectedBoxId);
      this.selectedBoxId = null;
      this.requestRender();
    },
    cycleSelection(direction) {
      const boxes = this.currentBoxes;
      if (!boxes.length) return;
      const at = boxes.findIndex((box) => box.id === this.selectedBoxId);
      const next = (at + direction + boxes.length + (at < 0 ? 1 : 0)) % boxes.length;
      this.selectedBoxId = boxes[next].id;
      this.requestRender();
    },
    copyPreviousBoxes() {
      if (!this.canCopyPrevious) return;
      const previous = this.images[this.currentIndex - 1];
      this.pushUndo();
      // Carried boxes are drawn in a different colour until they are confirmed,
      // so boxes nobody has actually looked at stay visually obvious.
      this.currentImage.boxes = previous.boxes.map((box) => ({
        id: newBoxId(),
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        carried: true,
      }));
      this.requestRender();
    },

    /* ------------------------------------------------------------ navigation */
    statusOf(image) {
      if (!image.reviewed) return "pending";
      return image.boxes.length ? "annotated" : "negative";
    },
    goTo(index) {
      if (index < 0 || index >= this.images.length || index === this.currentIndex) return;
      this.flushSave();
      this.currentIndex = index;
    },
    markReviewed() {
      if (!this.currentImage) return;
      this.currentImage.reviewed = true;
      for (const box of this.currentImage.boxes) box.carried = false;
      this.scheduleSave();
    },
    toggleReviewed() {
      if (!this.currentImage) return;
      this.currentImage.reviewed = !this.currentImage.reviewed;
      this.scheduleSave();
    },
    markReviewedAndAdvance() {
      this.markReviewed();
      if (this.currentIndex < this.images.length - 1) this.goTo(this.currentIndex + 1);
    },
    markNegativeAndAdvance() {
      const image = this.currentImage;
      if (!image) return;
      if (image.boxes.length) this.pushUndo();
      image.boxes = [];
      image.reviewed = true;
      this.scheduleSave();
      if (this.currentIndex < this.images.length - 1) this.goTo(this.currentIndex + 1);
    },
    goToNextUnreviewed() {
      for (let i = this.currentIndex + 1; i < this.images.length; i += 1) {
        if (!this.images[i].reviewed) return this.goTo(i);
      }
      for (let i = 0; i < this.currentIndex; i += 1) {
        if (!this.images[i].reviewed) return this.goTo(i);
      }
      return undefined;
    },
    goToPreviousUnreviewed() {
      for (let i = this.currentIndex - 1; i >= 0; i -= 1) {
        if (!this.images[i].reviewed) return this.goTo(i);
      }
      return undefined;
    },

    /* ----------------------------------------------------------- persistence */
    scheduleSave() {
      if (this.storageDisabled) return;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.flushSave(), 400);
    },
    flushSave() {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      const image = this.currentImage;
      if (!image || this.storageDisabled) return;
      const key = imageKey(image);
      const result = safeSet(null, key, encodeRecord(image), { keepKeys: [key] });
      if (!result.ok && result.reason !== "unavailable") this.storageDisabled = true;
      if (!result.ok && result.reason === "unavailable") this.storageDisabled = true;
      this.refreshStorageUsage();
    },
    refreshStorageUsage() {
      this.storageUsage = this.storageDisabled ? 0 : estimateUsage(null);
    },
    clearSavedAnnotations() {
      const removed = clearStoredAnnotations(null);
      this.refreshStorageUsage();
      this.projectMessage = `Cleared ${removed} auto-saved record(s). Boxes on screen are untouched — use Save Project to keep them.`;
    },
    saveProject() {
      const project = buildProject({
        className: this.className,
        settings: {
          valRatio: this.valRatio,
          testRatio: this.testRatio,
          splitSeed: this.splitSeed,
          groupSplit: this.groupSplit,
          warnBelowPx: this.warnBelowPx,
        },
        images: this.images,
      });
      this.downloadBlob(
        new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
        "annotations-project.json",
      );
    },
    async onProjectPicked(event) {
      const [file] = event.target.files || [];
      event.target.value = "";
      if (!file) return;

      const { project, warnings } = parseProject(await file.text());
      this.projectWarnings = warnings;
      if (!project) {
        this.projectMessage = "";
        return;
      }

      if (project.className) this.className = project.className;
      const settings = project.settings || {};
      if (Number.isFinite(settings.valRatio)) this.valRatio = settings.valRatio;
      if (Number.isFinite(settings.testRatio)) this.testRatio = settings.testRatio;
      if (typeof settings.splitSeed === "string") this.splitSeed = settings.splitSeed;
      if (typeof settings.groupSplit === "boolean") this.groupSplit = settings.groupSplit;
      if (Number.isFinite(settings.warnBelowPx)) this.warnBelowPx = settings.warnBelowPx;

      const { matched, unmatchedProject } = matchProjectToFiles(project, this.images);
      for (const { file: image, entry } of matched) {
        image.reviewed = Boolean(entry.reviewed);
        if (entry.width) image.width = entry.width;
        if (entry.height) image.height = entry.height;
        image.boxes = entry.boxes.map((box) => ({ ...box, id: newBoxId() }));
      }
      // Entries with no matching file are kept, not dropped: loading a project
      // before picking images must not destroy it.
      this.pendingProjectEntries = unmatchedProject;

      this.projectMessage = unmatchedProject.length
        ? `Matched ${matched.length} of ${project.images.length} images. The other ${unmatchedProject.length} will attach when you add those files.`
        : `Matched all ${matched.length} annotated images.`;
      this.historyByImage = new Map();
      this.requestRender();
      this.flushSave();
    },

    /* ---------------------------------------------------------------- export */
    async fileCrc(file) {
      if (typeof file.stream !== "function") {
        return crc32(new Uint8Array(await file.arrayBuffer()));
      }
      // Streamed so a 300-image set never sits in memory all at once.
      const reader = file.stream().getReader();
      let state = CRC32_INIT;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        state = crc32Update(state, value);
      }
      return crc32Finish(state);
    },
    cancelExport() {
      this.exportJobId = (this.exportJobId || 0) + 1;
      this.exporting = false;
      this.exportStatus = "";
    },
    async exportDataset() {
      const chosen = selectExportImages(this.images, { includeUnreviewed: this.includeUnreviewed });
      if (!chosen.length) return;

      this.exportError = "";
      this.exporting = true;
      this.exportProgress = 0;
      const job = (this.exportJobId || 0) + 1;
      this.exportJobId = job;

      try {
        const bases = dedupeBasenames(chosen.map((image) => image.name));
        const { assign, counts } = assignSplits(bases, {
          valRatio: this.valRatio,
          testRatio: this.testRatio,
          seed: this.splitSeed,
          groupSplit: this.groupSplit,
        });

        const entries = [];
        let droppedBoxes = 0;

        for (let i = 0; i < chosen.length; i += 1) {
          if (job !== this.exportJobId) return;
          const image = chosen[i];
          const base = bases[i];
          const split = assign.get(base);
          const { ext } = splitExtension(image.name);

          this.exportStatus = `Checksumming ${i + 1} / ${chosen.length}: ${image.name}`;
          this.exportProgress = ((i + 1) / chosen.length) * 90;

          const crc = await this.fileCrc(image.file);
          if (job !== this.exportJobId) return;

          entries.push({
            name: `images/${split}/${base}${ext || ".jpg"}`,
            blob: image.file,
            size: image.size,
            crc,
            date: new Date(image.file.lastModified || Date.now()),
          });

          const label = buildLabelFile(image.boxes, image.width, image.height);
          droppedBoxes += label.dropped;
          entries.push({ name: `labels/${split}/${base}.txt`, data: label.text });

          // Let the progress bar actually paint on large sets.
          if (i % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const stats = datasetStats(chosen, { warnBelowPx: this.warnBelowPx });
        entries.push({
          name: "data.yaml",
          data: buildDataYaml(this.className, { hasTest: counts.test > 0 }),
        });
        entries.push({ name: "README.txt", data: buildReadme({ className: this.className, counts, stats }) });
        entries.push({
          name: "annotations-project.json",
          data: JSON.stringify(
            buildProject({
              className: this.className,
              settings: {
                valRatio: this.valRatio,
                splitSeed: this.splitSeed,
                groupSplit: this.groupSplit,
                warnBelowPx: this.warnBelowPx,
              },
              images: chosen,
            }),
            null,
            2,
          ),
        });

        assertZipLimits(entries);
        this.exportStatus = "Building the archive…";
        this.exportProgress = 95;
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (job !== this.exportJobId) return;

        this.downloadBlob(zipBlob(entries), "yolo-traffic-signal-dataset.zip");
        this.exportProgress = 100;
        this.exportStatus = "";
        if (droppedBoxes) {
          this.exportError = `${droppedBoxes} box(es) were smaller than a pixel once clamped and were left out of the labels.`;
        }
      } catch (error) {
        this.exportError = String(error.message || error);
      } finally {
        if (job === this.exportJobId) this.exporting = false;
      }
    },
    downloadBlob(blob, name) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      // Deliberately late, unlike the immediate revoke used elsewhere in the
      // app: a dataset zip can be hundreds of MB and revoking straight away can
      // abort the save before the browser has finished writing it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },

    /* ---------------------------------------------------------------- format */
    formatBytes(bytes) {
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
    },
  },
};
</script>

<style scoped>
.image-annotator {
  padding: 0 12px 40px;
}

.h1-center-text {
  text-align: center;
}

.intro-text {
  max-width: 900px;
  margin: 12px auto 24px;
  text-align: center;
}

.left-justify-text {
  text-align: left;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.justify-center {
  justify-content: center;
}

.drop-zone {
  border: 2px dashed rgba(128, 128, 128, 0.5);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.drop-zone-active {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.08);
}

.drop-hint {
  margin: 0;
  opacity: 0.75;
}

.scan-summary {
  margin-top: 16px;
}

.annotate-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.image-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.dim-note {
  opacity: 0.6;
  font-size: 0.85rem;
}

.status-pill {
  border-radius: 999px;
  padding: 2px 12px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-annotated {
  background: rgba(67, 160, 71, 0.2);
  color: #2e7d32;
}

.status-negative {
  background: rgba(25, 118, 210, 0.2);
  color: #1565c0;
}

.status-pending {
  background: rgba(128, 128, 128, 0.2);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 12px 0;
}

.toolbar-gap {
  flex: 0 0 16px;
}

.zoom-readout {
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
  opacity: 0.75;
  min-width: 48px;
}

.annotate-shell {
  position: relative;
}

/* Fullscreen turns the shell into the whole screen: a column with a compact
   toolbar, the canvas taking every spare pixel, and the progress row pinned
   underneath so the workflow keys still have their readouts. */
.annotate-shell.is-detached {
  font-family: "Roboto", sans-serif;
}

.annotate-shell.annotate-maximized {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  padding: 10px 14px 12px;
  background: rgb(var(--v-theme-surface, 255 255 255));
  color: rgb(var(--v-theme-on-surface, 0 0 0));
  overflow: hidden;
}

.annotate-shell.annotate-maximized .canvas-wrap {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.annotate-shell.annotate-maximized .toolbar,
.annotate-shell.annotate-maximized .annotate-header {
  flex: 0 0 auto;
  margin: 4px 0;
}

.annotate-shell.annotate-maximized .note-text {
  margin-top: 6px;
}

.annotate-shell.annotate-maximized .status-strip {
  max-height: 44px;
}

.canvas-wrap {
  position: relative;
  width: 100%;
  height: min(70vh, 640px);
  background: rgba(128, 128, 128, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.annot-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  cursor: crosshair;
}

.canvas-panning {
  cursor: grab;
}

.canvas-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  opacity: 0.8;
  pointer-events: none;
}

.canvas-overlay-error {
  color: #c62828;
}

.progress-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 6px;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 10px;
  max-height: 72px;
  overflow-y: auto;
}

.strip-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: none;
  padding: 0;
  cursor: pointer;
}

.strip-pending {
  background: rgba(128, 128, 128, 0.45);
}

.strip-annotated {
  background: #43a047;
}

.strip-negative {
  background: #1976d2;
}

.strip-current {
  outline: 2px solid #ef6c00;
  outline-offset: 1px;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0 16px;
}

.stat-tile {
  display: flex;
  flex-direction: column;
  min-width: 150px;
  flex: 1 1 150px;
  max-width: 320px;
  padding: 12px;
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.78rem;
  opacity: 0.75;
}

.shortcut-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 20;
}

.shortcut-panel {
  background: rgb(var(--v-theme-surface, 255 255 255));
  color: rgb(var(--v-theme-on-surface, 0 0 0));
  border-radius: 10px;
  padding: 16px 20px;
  max-width: 520px;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.shortcut-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  align-items: center;
}

.shortcut-row {
  display: contents;
}

kbd {
  background: rgba(128, 128, 128, 0.2);
  border-radius: 4px;
  padding: 1px 6px;
  font-family: inherit;
  font-size: 0.82rem;
  white-space: nowrap;
}

.warning-list {
  margin: 8px 0 0 18px;
  font-size: 0.85rem;
  color: #ef6c00;
}

.warning-inline {
  color: #ef6c00;
}

.error-message {
  color: #c62828;
  margin-top: 12px;
}

.warning-text {
  color: #ef6c00;
  margin-top: 8px;
}

.note-text {
  font-size: 0.85rem;
  opacity: 0.75;
  margin-top: 12px;
}

.disclaimer {
  max-width: 900px;
  margin: 32px auto 0;
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: center;
}
</style>
