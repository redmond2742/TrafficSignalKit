# Traffic Signal Kit

Welcome to the Traffic Signal Kit! This project is a learning journey into Vue.js with a focus on building practical traffic signal-related tools. These tools were built fast to serve as proof of concepts, showcasing different Vue.js features and techniques while providing a useful tool related to traffic signals.

## Purpose

The purpose of the Traffic Signal Kit is to provide simple tools for traffic engineers. By focusing on simple and small traffic signal-related tools, we aim to make the learning process engaging and relatable to practical scenarios.

## Goals

- **Learn Vue.js:** Gain a deeper understanding of Vue.js concepts, including components, directives, state management, routing, and more.
- **Explore Traffic Signal Concepts:** Apply Vue.js principles to simulate and manipulate traffic signal behaviors, timing, and controls.
- **Build Practical Tools:** Create functional traffic signal-related tools that can be used for educational purposes or as prototypes for future projects.
- **Iterative Development:** Continuously improve skills and knowledge by building a new tool each month, incorporating feedback, and experimenting with new techniques.

## Using Traffic Signal Kit

Visit the website where this website is deployed: https://trafficsignalkit.com/

## Disclaimer

Please note that the tools developed as part of the Traffic Signal Kit are intended for learning purposes and proof of concepts. They may not be fully polished or production-ready. Use them at your own discretion and be aware of any limitations or potential issues.

## Contributors

- Matt Redmond - Creator and maintainer of the Traffic Signal Kit project.

## Feedback and Contributions

Feedback, suggestions, bug reports, and contributions are welcome! If you have any ideas for new tools, improvements to existing tools, or general feedback about the project, feel free to open an issue, submit a pull request on GitHub or [fill out this feedback survey](https://forms.gle/eWchSuYdDwG6MsTx9).

## GPX Elevation Plotter

The GPX Elevation Plotter converts GPX files into an elevation profile. Paste GPX text into the tool and view a chart of elevation versus distance to analyze climbs and descents along your track.

## License

The Traffic Signal Kit project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute the code for educational or personal projects. Refer to the LICENSE file for more information.

---

Thanks for checking out Traffic Signal Kit! 🚦✨

## Block Logic Tool

A new tool is available at `/tools/block-logic` for visual, rule-based diagnostics over high-resolution traffic signal streams, now using the shared InputBox component for HR text/file entry.

### What it includes
- **Block palette + canvas + inspector** to build rule graphs with condition/operator/action blocks.
- **Rule schema v1.0** (JSON serializable/importable/exportable).
- **Execution engine** with deterministic replay order, edge handling, hold/sequence operators, timers, counters, table/plot/diagnostic outputs, and per-rule rate limiting.
- **Step + full run modes** with progress bar and cancellable worker execution for larger datasets.
- **Built-in templates:** Detector Stuck On, Green Extension Marker, and Split Failure Proxy.

### Rule schema shape

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "rule-1",
      "name": "Green Phase 2 Marker",
      "enabled": true,
      "trigger": { "type": "continuous" },
      "if": { "type": "phase", "signal": "green", "phase": 2, "target": 1, "mode": "edgeRising" },
      "actions": [{ "type": "plotPoint", "phase": 2 }]
    }
  ]
}
```

### Adding new blocks
1. Add a block factory entry in `src/utils/blockLogicSchema.js` (`createCondition` or `createAction`).
2. Add evaluation behavior in `src/utils/blockLogicEngine.js` (`evalCondition` or `runAction`).
3. Add inspector controls in `src/views/BlockLogic.vue`.

## Pedestrian Conflict Correlator

`/ped-conflict-correlator` pairs a detector channel with a pedestrian phase and shows when the two are active at the same time — the exposure between turning vehicles and people crossing.

### What it does
- **Correlation rules:** each rule is one detector channel × one pedestrian phase. Pick the detector type (vehicle 82/81, ped 90/89, TSP 94/93), the pedestrian interval to watch (WALK, ped clearance, both, or the ped call wait), the trigger (detector ON, OFF, either edge, or any occupancy overlap), and lead/lag buffer seconds. Presets cover permissive lefts, right turn on red, departures at the start of WALK, and late crossings.
- **Red-light run chain:** the `Red-light run` trigger links three events — the stop bar detector drops out while the named vehicle phase is showing yellow or red, a downstream detector then turns on and back off within the allowed travel time, and that traversal overlaps the selected pedestrian interval. The downstream confirmation separates a vehicle that entered the intersection from one shuffling in queue, and each downstream call is matched to only one departure. Yellow is `8 → 9`; red runs from the end of yellow (or the start of red clearance) to that phase's next begin green.
- **Speed through the intersection:** give a red-light-run rule a detector setback distance and it estimates each vehicle's speed from the stop-bar drop-out to the downstream pick-up. The assumed vehicle length (20 ft by default) is subtracted because the two events watch different ends of the car — the stop bar drops out when the rear bumper clears it, the downstream picks up when the front bumper arrives — so the front bumper covers `setback − vehicle length`. Reported in mph and ft/s, with average and peak per rule. A setback no longer than the vehicle yields no estimate rather than a negative distance; a setback of 0 skips the calculation.
- **Conflict timeline:** one row per pedestrian service with time measured from the start of WALK, so correlated detector activity lines up into a visible pattern. Blue markers bracket the evaluated window; detector occupancy inside it is drawn in red.
- **Offset histogram and hour-of-day chart** to show whether detector activity clusters around the start of WALK and when it happens.
- **Summary metrics** per rule, including percent of pedestrian services affected, detector occupancy per service, and an exposure index (in-window event rate ÷ whole-file event rate).
- **CSV export** of every correlated event, including signal state, seconds into yellow/red, and stop-bar-to-downstream travel time for red-light runs.
- **Video clip timestamp CSV** for the [Video Frame Extractor](https://trafficsignalkit.com/video-frame-extractor): ISO 8601 timestamps written as the controller's wall clock marked `Z` (what the extractor's sync clock compares against), in that tool's seven-column order — timestamp, signal ID, signal name, phase, detector channel, light state, seconds into state — followed by the rule, movement, ped phase, ped interval, and offset from WALK start. Optional rows bracket each incident: clip start/end at the padding you choose, the WALK start of the affected crossing, and the downstream arrival for red-light runs. Rows reading yellow or red are picked up by the extractor as running events.

All parsing and analysis happen in the browser in a Web Worker — pasted text and selected files never leave the machine. Core logic lives in `src/utils/pedConflictCorrelator.js` and is covered by `tests/pedConflictCorrelator.test.mjs` (`npm test`).

## YOLO Image Annotator

`/yolo-image-annotator` turns roadway images into a YOLO training dataset for a traffic-signal detector. It pairs with the [Video Frame Extractor](https://trafficsignalkit.com/video-frame-extractor): pull frames from intersection video there, label them here.

### What it does
- **Draw, edit, move fast:** drag to box a signal head, drag the body to move it, corner handles to resize, with zoom, pan and per-image undo/redo. Zoom matters — signal heads are often 20–40 px across and cannot be boxed tightly at fit-to-screen scale. `Enter` marks an image reviewed and advances; `N` marks it reviewed with no signals.
- **Full screen** (`F`) hands the whole display to the canvas, keeping the toolbar, progress and status strip so the review loop never leaves the keyboard. Where the Fullscreen API is blocked — an embedded frame, a locked-down browser — it maximizes inside the page instead and says so, rather than failing. Every toolbar button carries a tooltip naming its shortcut.
- **Single class** by design: every box is class 0 (`traffic_signal`, renameable). The class name only reaches `data.yaml`.
- **Reviewed / negative / pending are distinct.** A reviewed image with no boxes exports as a genuine negative sample (a zero-byte `.txt`). Unreviewed images are excluded from the export by default — shipping them as negatives would teach the detector that signals are background.
- **Deterministic train/val/test split:** set a validation share and a test share; whatever is left becomes training, and the export fills `images/{train,val,test}` with matching label folders. A test share of 0 skips that folder and omits the `test:` line from `data.yaml` rather than pointing at nothing. Filenames are hashed rather than shuffled, so adding images later never reshuffles the existing split — and the val band is ordered first so enabling a test share only ever draws from training, never from validation. Frames sharing a trailing number can be grouped so near-duplicate video frames stay on the same side, and the tool warns when a requested split would come out empty, naming the actual cause (too few groups, or just how a small sample fell).
- **Export** is a zip with `images/train`, `images/val`, matching `labels/…`, `data.yaml`, a README, and the project JSON. Images are the original files copied byte for byte — never re-encoded through a canvas, which would add exactly the compression artifacts that hurt a detector on small objects.
- **Auto-save** keeps boxes in `localStorage` keyed by filename and size (quota-safe, evicting oldest first), plus explicit project JSON save/load. Nothing is uploaded; the zip is assembled in the browser.

Logic lives in `src/utils/annotatorGeometry.js`, `src/utils/yoloDataset.js`, `src/utils/zipWriter.js`, `src/utils/annotationStore.js` and `src/utils/hash.js`, each covered by `npm test`. The zip writer is a hand-rolled store-mode implementation with no new dependency — images are already compressed, so storing them loses nothing and keeps the extracted files byte-identical.
