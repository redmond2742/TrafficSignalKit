<template>
  <div>
    <div
      v-for="(signal, index) in signals"
      :key="signal.id"
      class="signal-group"
    >
      <div class="signal-header">
        <div>
          <h2 class="section-title">
            Signal {{ index + 1 }}
          </h2>
          <p class="signal-subtitle">
            Enter a signal name and number, then paste the data sets for this
            signal.
          </p>
        </div>
        <div class="signal-header-actions" v-if="signals.length > 1">
          <v-btn
            variant="outlined"
            color="error"
            @click="removeSignal(signal.id)"
          >
            Remove Signal
          </v-btn>
        </div>
      </div>
      <div class="signal-meta">
        <v-text-field
          v-model="signal.name"
          label="Signal Name"
          variant="outlined"
          density="compact"
          hide-details
        ></v-text-field>
        <v-text-field
          v-model="signal.number"
          label="Signal Number"
          variant="outlined"
          density="compact"
          hide-details
        ></v-text-field>
      </div>
      <div class="rlr-inputs">
        <div class="grow-wrap">
          <InputBox v-model="signal.inputData" :defaultText="dataDefaultText" />
        </div>
        <div class="grow-wrap">
          <InputBox
            v-model="signal.detectorMapInput"
            :defaultText="detectorDefaultText"
          />
        </div>
      </div>
    </div>
    <div class="actions">
      <v-btn color="primary" @click="processDetectorEvents">Process</v-btn>
      <v-btn variant="outlined" @click="addSignal">Add Another Signal</v-btn>
      <v-btn
        variant="outlined"
        color="primary"
        :disabled="!summaryRows.length"
        @click="downloadPdfReport"
      >
        Download PDF Report
      </v-btn>
    </div>

    <div v-if="sortedSummaryRows.length" class="rlr-table-wrapper">
      <h2 class="section-title">Phase Summary Table</h2>
      <table class="rlr-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('signalNumber')"
              >
                Signal Number
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "signalNumber")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('signalName')"
              >
                Signal Name
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "signalName")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('phase')"
              >
                Phase
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "phase")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('yellowCount')"
              >
                Yellow Count
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "yellowCount")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('yellowAvg')"
              >
                Yellow Avg
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "yellowAvg")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('redCount')"
              >
                Red Count
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "redCount")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('redAvg')"
              >
                Red Avg
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "redAvg")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('detectorOffCount')"
              >
                Detector Off Count
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "detectorOffCount")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('yellowPerDetector')"
              >
                Yellow/Det Off %
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "yellowPerDetector")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('redPerDetector')"
              >
                Red/Det Off %
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "redPerDetector")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setSummarySort('severityScore')"
              >
                Severity Score
                <span class="sort-indicator">{{
                  sortIndicator(summarySort, "severityScore")
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedSummaryRows"
            :key="`${row.signalId}-${row.phase}`"
          >
            <td>{{ row.signalNumber || "—" }}</td>
            <td>{{ row.signalName || "—" }}</td>
            <td>{{ row.phase }}</td>
            <td>{{ row.yellowCount }}</td>
            <td>{{ formatSecondsOrDash(row.yellowAvg) }}</td>
            <td>{{ row.redCount }}</td>
            <td>{{ formatSecondsOrDash(row.redAvg) }}</td>
            <td>{{ row.detectorOffCount }}</td>
            <td>{{ formatPercentOrDash(row.yellowPerDetector) }}</td>
            <td>{{ formatPercentOrDash(row.redPerDetector) }}</td>
            <td>{{ formatScoreOrDash(row.severityScore) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="tableRows.length" class="rlr-table-wrapper">
      <h2 class="section-title">Time-of-Day / Calendar Heat Map</h2>
      <div class="rlr-heatmap-controls">
        <div class="heatmap-control-group">
          <span class="heatmap-control-label">Event Type</span>
          <div class="heatmap-button-group" role="group">
            <button
              type="button"
              class="heatmap-toggle"
              :class="{ active: heatmapState === 'Yellow' }"
              @click="heatmapState = 'Yellow'"
            >
              Yellow Events
            </button>
            <button
              type="button"
              class="heatmap-toggle"
              :class="{ active: heatmapState === 'Red' }"
              @click="heatmapState = 'Red'"
            >
              Red Events
            </button>
          </div>
        </div>
        <div class="heatmap-control-group">
          <v-select
            label="Signal"
            variant="outlined"
            density="compact"
            :items="heatmapSignalItems"
            v-model="selectedHeatmapSignal"
          ></v-select>
        </div>
        <div class="heatmap-control-group">
          <v-select
            label="Phase"
            variant="outlined"
            density="compact"
            :items="heatmapPhaseItems"
            v-model="selectedHeatmapPhase"
          ></v-select>
        </div>
      </div>
      <div ref="heatmapCapture">
        <p class="heatmap-subtitle" v-if="heatmapConfig.rangeLabel">
          {{ heatmapConfig.modeLabel }} • {{ heatmapState }} events •
          {{ heatmapConfig.rangeLabel }}
        </p>
        <div v-if="heatmapConfig.rows.length" class="heatmap-grid">
          <div
            class="heatmap-header"
            :style="{
              '--heatmap-columns': heatmapConfig.columns.length,
            }"
          >
            <div class="heatmap-corner"></div>
            <div
              v-for="column in heatmapConfig.columns"
              :key="`hour-${column.key}`"
              class="heatmap-hour"
            >
              {{ column.displayLabel }}
            </div>
          </div>
          <div
            v-for="row in heatmapConfig.rows"
            :key="row.key"
            class="heatmap-row"
            :style="{
              '--heatmap-columns': heatmapConfig.columns.length,
            }"
          >
            <div class="heatmap-row-label">{{ row.label }}</div>
            <div
              v-for="column in heatmapConfig.columns"
              :key="`${row.key}-${column.key}`"
              class="heatmap-cell"
              :style="{ backgroundColor: heatmapCellColor(row.key, column.key) }"
              :title="heatmapCellTitle(row, column)"
            ></div>
          </div>
        </div>
        <div v-else class="no-results">
          No {{ heatmapState.toLowerCase() }} events found for the selected phase.
        </div>
        <div class="heatmap-legend" v-if="heatmapConfig.maxCount > 0">
          <span class="heatmap-legend-label">Less</span>
          <div class="heatmap-legend-bar">
            <span
              v-for="step in heatmapLegendSteps"
              :key="`legend-${step}`"
              class="heatmap-legend-swatch"
              :style="{ backgroundColor: heatmapLegendColor(step) }"
            ></span>
          </div>
          <span class="heatmap-legend-label">More</span>
        </div>
      </div>
    </div>

    <div v-if="tableRows.length" class="rlr-table-wrapper">
      <h2 class="section-title">All Yellow and Red Running Events Table</h2>
      <table class="rlr-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('signalNumber')"
              >
                Signal Number
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "signalNumber")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('signalName')"
              >
                Signal Name
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "signalName")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('timestamp')"
              >
                Timestamp
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "timestamp")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('detector')"
              >
                Detector
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "detector")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('phase')"
              >
                Phase
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "phase")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('state')"
              >
                Signal State
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "state")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('elapsedSeconds')"
              >
                Seconds Into State
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "elapsedSeconds")
                }}</span>
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                type="button"
                @click="setDetailSort('termination')"
              >
                Phase Termination
                <span class="sort-indicator">{{
                  sortIndicator(detailSort, "termination")
                }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedTableRows" :key="row.key">
            <td>{{ row.signalNumber || "—" }}</td>
            <td>{{ row.signalName || "—" }}</td>
            <td>{{ row.timestamp }}</td>
            <td>{{ row.detector }}</td>
            <td>{{ row.phase }}</td>
            <td>{{ row.state }}</td>
            <td>{{ formatSeconds(row.elapsedSeconds) }}</td>
            <td>{{ row.termination }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="hasProcessed" class="no-results">
      No yellow/red detector-off events were found for the mapped phases.
    </div>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import { Chart } from "chart.js/auto";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import convertTime from "../mixins/convertTime";
import InputBox from "./foundational/InputBox.vue";

const DISPLAY_FORMAT = "ccc, MMM d yyyy h:mm:ss.S a";

export default {
  mixins: [convertTime],
  components: {
    InputBox,
  },
  data() {
    return {
      signals: [
        {
          id: 1,
          name: "",
          number: "",
          inputData: "",
          detectorMapInput: "",
        },
      ],
      nextSignalId: 2,
      dataDefaultText:
        "Paste in High-Resolution Traffic Signal Data as CSV (timestamp, eventCode, channel)",
      detectorDefaultText: "Det 1\t6\nDet 2\t2\nDet 3\t0\nDet 4\t0\nDet 5\t0",
      tableRows: [],
      hasProcessed: false,
      signalResults: [],
      detailSort: {
        key: "timestamp",
        direction: "asc",
      },
      summarySort: {
        key: "signalNumber",
        direction: "asc",
      },
      heatmapState: "Yellow",
      selectedHeatmapSignal: "All",
      selectedHeatmapPhase: "All",
    };
  },
  computed: {
    sortedTableRows() {
      return this.sortRows(
        this.tableRows,
        this.detailSort.key,
        this.detailSort.direction
      );
    },
    summaryRows() {
      const summary = [];

      this.signalResults.forEach((signal) => {
        signal.mappedPhases.forEach((phase) => {
          const phaseRows = this.tableRows.filter(
            (row) => row.signalId === signal.id && row.phase === phase
          );
          const yellowRows = phaseRows.filter((row) => row.state === "Yellow");
          const redRows = phaseRows.filter((row) => row.state === "Red");
          const yellowStats = this.computeStats(yellowRows);
          const redStats = this.computeStats(redRows);
          const detectorOffCount = signal.detectorOffCounts[phase] || 0;
          if (detectorOffCount === 0) {
            return;
          }
          if (yellowStats.count === 0 && redStats.count === 0) {
            return;
          }
          const yellowPerDetector =
            detectorOffCount > 0
              ? (yellowStats.count / detectorOffCount) * 100
              : null;
          const redPerDetector =
            detectorOffCount > 0 ? (redStats.count / detectorOffCount) * 100 : null;
          const severityScore =
            redStats.avg !== null ? redStats.avg * redStats.count : null;

          summary.push({
            signalId: signal.id,
            signalName: signal.name,
            signalNumber: signal.number,
            phase,
            yellowCount: yellowStats.count,
            yellowAvg: yellowStats.avg,
            redCount: redStats.count,
            redAvg: redStats.avg,
            detectorOffCount,
            yellowPerDetector,
            redPerDetector,
            severityScore,
          });
        });
      });

      return summary;
    },
    sortedSummaryRows() {
      return this.sortRows(
        this.summaryRows,
        this.summarySort.key,
        this.summarySort.direction
      );
    },
    reportSummaryRows() {
      return this.sortRows(this.summaryRows, "severityScore", "desc");
    },
    heatmapPhaseItems() {
      const phases = new Set();
      if (this.selectedHeatmapSignal === "All") {
        this.signalResults.forEach((signal) => {
          signal.mappedPhases.forEach((phase) => phases.add(phase));
        });
      } else {
        const signal = this.signalResults.find(
          (entry) => entry.id === this.selectedHeatmapSignal
        );
        if (signal) {
          signal.mappedPhases.forEach((phase) => phases.add(phase));
        }
      }
      return [
        { title: "All phases", value: "All" },
        ...Array.from(phases)
          .sort((a, b) => a - b)
          .map((phase) => ({
            title: `Phase ${phase}`,
            value: phase,
          })),
      ];
    },
    heatmapSignalItems() {
      return [
        { title: "All signals", value: "All" },
        ...this.signalResults.map((signal) => ({
          title: this.signalLabel(signal),
          value: signal.id,
        })),
      ];
    },
    heatmapEvents() {
      return this.tableRows.filter((row) => {
        const matchesState = row.state === this.heatmapState;
        const matchesPhase =
          this.selectedHeatmapPhase === "All" ||
          row.phase === this.selectedHeatmapPhase;
        const matchesSignal =
          this.selectedHeatmapSignal === "All" ||
          row.signalId === this.selectedHeatmapSignal;
        return matchesState && matchesPhase && matchesSignal;
      });
    },
    heatmapConfig() {
      const events = this.heatmapEvents;
      if (!events.length) {
        return {
          mode: null,
          modeLabel: "",
          rows: [],
          columns: [],
          counts: new Map(),
          maxCount: 0,
          rangeLabel: "",
        };
      }

      const millisList = events.map((row) => row.millis);
      const minMillis = Math.min(...millisList);
      const maxMillis = Math.max(...millisList);
      const start = DateTime.fromMillis(minMillis).startOf("day");
      const end = DateTime.fromMillis(maxMillis).startOf("day");
      const spanDays = Math.floor(end.diff(start, "days").days) + 1;
      const spanHours = (maxMillis - minMillis) / (1000 * 60 * 60);
      const counts = new Map();
      let maxCount = 0;
      let mode = "date";
      let modeLabel = "";
      let rows = [];
      let columns = [];

      if (spanDays >= 2) {
        mode = spanDays > 31 ? "dayOfMonth" : "date";
        modeLabel =
          mode === "date" ? "Daily × Hourly" : "Day of Month × Hourly";
        columns = Array.from({ length: 24 }, (_, hour) => ({
          key: hour,
          label: DateTime.fromObject({ hour }).toFormat("h a"),
          displayLabel: hour % 2 === 0 ? DateTime.fromObject({ hour }).toFormat("ha") : "",
        }));

        events.forEach((row) => {
          const dateTime = DateTime.fromMillis(row.millis);
          const rowKey =
            mode === "date"
              ? dateTime.toFormat("yyyy-LL-dd")
              : `${dateTime.day}`;
          const hour = dateTime.hour;
          const key = `${rowKey}-${hour}`;
          const nextCount = (counts.get(key) || 0) + 1;
          counts.set(key, nextCount);
          if (nextCount > maxCount) {
            maxCount = nextCount;
          }
        });

        if (mode === "date") {
          let cursor = start;
          while (cursor <= end) {
            rows.push({
              key: cursor.toFormat("yyyy-LL-dd"),
              label: cursor.toFormat("ccc, MMM d"),
            });
            cursor = cursor.plus({ days: 1 });
          }
        } else {
          const dayNumbers = Array.from(
            new Set(events.map((row) => DateTime.fromMillis(row.millis).day))
          ).sort((a, b) => a - b);
          dayNumbers.forEach((day) => {
            rows.push({ key: `${day}`, label: `Day ${day}` });
          });
        }
      } else {
        mode = "time";
        const totalMinutes = (maxMillis - minMillis) / (1000 * 60);
        let binMinutes = 60;
        if (spanHours <= 2) {
          binMinutes = 5;
        } else if (spanHours <= 5) {
          const targetBins = 24;
          const rawMinutes = Math.ceil(totalMinutes / targetBins);
          const rounded = Math.ceil(rawMinutes / 5) * 5;
          binMinutes = Math.max(10, rounded);
        } else if (spanHours <= 6) {
          binMinutes = 15;
        } else if (spanHours <= 12) {
          binMinutes = 30;
        }
        modeLabel = `Time × ${binMinutes}-Minute`;
        const startTime = DateTime.fromMillis(minMillis).startOf("minute");
        const alignedStartMinute =
          Math.floor(startTime.minute / binMinutes) * binMinutes;
        const alignedStart = startTime.set({
          minute: alignedStartMinute,
          second: 0,
          millisecond: 0,
        });
        const endTime = DateTime.fromMillis(maxMillis).startOf("minute");
        const labelIntervalMinutes = Math.max(
          binMinutes,
          binMinutes <= 10 ? 30 : binMinutes <= 30 ? 60 : 120
        );
        let cursor = alignedStart;
        while (cursor <= endTime) {
          const minutesFromStart = cursor.diff(alignedStart, "minutes").minutes;
          const shouldLabel =
            minutesFromStart % labelIntervalMinutes === 0;
          columns.push({
            key: cursor.toMillis(),
            label: cursor.toFormat("h:mm a"),
            displayLabel: shouldLabel ? cursor.toFormat("h:mm a") : "",
          });
          cursor = cursor.plus({ minutes: binMinutes });
        }

        rows = [
          {
            key: start.toFormat("yyyy-LL-dd"),
            label: start.toFormat("ccc, MMM d"),
          },
        ];

        events.forEach((row) => {
          const dateTime = DateTime.fromMillis(row.millis);
          const rowKey = start.toFormat("yyyy-LL-dd");
          const minutesOffset = dateTime.diff(alignedStart, "minutes").minutes;
          const binIndex = Math.floor(minutesOffset / binMinutes);
          const column = columns[binIndex];
          if (!column) {
            return;
          }
          const key = `${rowKey}-${column.key}`;
          const nextCount = (counts.get(key) || 0) + 1;
          counts.set(key, nextCount);
          if (nextCount > maxCount) {
            maxCount = nextCount;
          }
        });
      }

      const rangeLabel =
        mode === "time"
          ? `${DateTime.fromMillis(minMillis).toFormat(
              "MMM d, yyyy h:mm a"
            )} - ${DateTime.fromMillis(maxMillis).toFormat(
              "MMM d, yyyy h:mm a"
            )}`
          : `${start.toFormat("MMM d, yyyy")} - ${end.toFormat("MMM d, yyyy")}`;

      return {
        mode,
        modeLabel,
        rows,
        columns,
        counts,
        maxCount,
        rangeLabel,
      };
    },
    heatmapLegendSteps() {
      const steps = 5;
      return Array.from({ length: steps }, (_, index) => index);
    },
  },
  methods: {
    async downloadPdfReport() {
      if (!this.reportSummaryRows.length) {
        return;
      }
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.text("Yellow & Red Light Running Report", margin, margin);
      doc.setFontSize(10);
      doc.text(
        `Generated ${DateTime.now().toFormat("MMM d, yyyy h:mm a")}`,
        margin,
        margin + 18
      );

      autoTable(doc, {
        startY: margin + 30,
        head: [
          [
            "Signal Number",
            "Signal Name",
            "Phase",
            "Yellow Count",
            "Yellow Avg (sec)",
            "Red Count",
            "Red Avg (sec)",
            "Detector Off Count",
            "Yellow/Det %",
            "Red/Det %",
            "Priority Score",
          ],
        ],
        body: this.reportSummaryRows.map((row) => [
          row.signalNumber || "—",
          row.signalName || "—",
          row.phase,
          row.yellowCount,
          row.yellowAvg !== null ? row.yellowAvg.toFixed(1) : "—",
          row.redCount,
          row.redAvg !== null ? row.redAvg.toFixed(1) : "—",
          row.detectorOffCount,
          row.yellowPerDetector !== null ? `${row.yellowPerDetector.toFixed(1)}%` : "—",
          row.redPerDetector !== null ? `${row.redPerDetector.toFixed(1)}%` : "—",
          row.severityScore !== null ? row.severityScore.toFixed(1) : "—",
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [26, 115, 232] },
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.text("Calendar Heatmap", margin, margin);
      const heatmapElement = this.$refs.heatmapCapture;
      if (heatmapElement) {
        const heatmapImage = await this.captureElementImage(heatmapElement);
        const imgProps = doc.getImageProperties(heatmapImage);
        const targetWidth = pageWidth - margin * 2;
        const targetHeight = (imgProps.height * targetWidth) / imgProps.width;
        doc.addImage(
          heatmapImage,
          "PNG",
          margin,
          margin + 16,
          targetWidth,
          targetHeight
        );
      } else {
        doc.setFontSize(10);
        doc.text("Heatmap unavailable.", margin, margin + 20);
      }

      doc.addPage();
      doc.setFontSize(14);
      doc.text("Event Share", margin, margin);
      const pieChartImage = await this.buildPieChartImage();
      const pieProps = doc.getImageProperties(pieChartImage);
      const pieWidth = Math.min(320, pageWidth - margin * 2);
      const pieHeight = (pieProps.height * pieWidth) / pieProps.width;
      doc.addImage(
        pieChartImage,
        "PNG",
        margin,
        margin + 16,
        pieWidth,
        pieHeight
      );

      doc.save("yellow-red-running-report.pdf");
    },
    async captureElementImage(element) {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      return canvas.toDataURL("image/png");
    },
    async buildPieChartImage() {
      const yellowCount = this.tableRows.filter(
        (row) => row.state === "Yellow"
      ).length;
      const redCount = this.tableRows.filter((row) => row.state === "Red").length;
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const chart = new Chart(canvas.getContext("2d"), {
        type: "pie",
        data: {
          labels: ["Yellow Events", "Red Events"],
          datasets: [
            {
              data: [yellowCount, redCount],
              backgroundColor: ["#f7b731", "#eb3b5a"],
            },
          ],
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      const dataUrl = canvas.toDataURL("image/png");
      chart.destroy();
      return dataUrl;
    },
    processDetectorEvents() {
      const rows = [];
      const results = this.signals.map((signal) => {
        const { detectorToPhase, phaseColumns } = this.parseDetectorMapping(
          signal.detectorMapInput
        );
        const events = this.parseHighResData(signal.inputData);
        const signalResult = {
          id: signal.id,
          name: signal.name?.trim() || "",
          number: signal.number?.trim() || "",
          mappedPhases: phaseColumns,
          detectorOffCounts: {},
        };

        if (!events.length || !phaseColumns.length) {
          return signalResult;
        }

        const phaseIntervals = this.buildSignalIntervals(
          events,
          phaseColumns
        );
        const terminationEvents = this.collectTerminationEvents(
          events,
          phaseColumns
        );
        signalResult.detectorOffCounts = this.countDetectorOffEvents(
          events,
          detectorToPhase
        );

        const signalRows = events
          .filter(
            (event) =>
              event.eventCode === 81 && detectorToPhase[event.parameterCode]
          )
          .map((event) => {
            const phase = detectorToPhase[event.parameterCode];
            const interval = this.findInterval(
              phaseIntervals[phase] || [],
              event.millis
            );
            if (!interval) {
              return null;
            }
            const termination = this.findLatestTermination(
              terminationEvents[phase] || [],
              event.millis
            );
            return {
              key: `${signal.id}-${event.millis}-${event.parameterCode}`,
              signalId: signal.id,
              signalName: signalResult.name,
              signalNumber: signalResult.number,
              timestamp: this.formatMillis(event.millis),
              millis: event.millis,
              detector: event.parameterCode,
              phase,
              state: interval.state,
              elapsedSeconds: (event.millis - interval.start) / 1000,
              termination,
            };
          })
          .filter((row) => row !== null);

        rows.push(...signalRows);
        return signalResult;
      });

      this.signalResults = results;
      this.tableRows = rows;
      this.hasProcessed = true;

      if (
        this.selectedHeatmapSignal !== "All" &&
        !this.signalResults.some(
          (signal) => signal.id === this.selectedHeatmapSignal
        )
      ) {
        this.selectedHeatmapSignal = "All";
      }

      if (
        this.selectedHeatmapPhase !== "All" &&
        !this.heatmapPhaseItems.some(
          (phase) => phase.value === this.selectedHeatmapPhase
        )
      ) {
        this.selectedHeatmapPhase = "All";
      }
    },
    addSignal() {
      this.signals.push({
        id: this.nextSignalId,
        name: "",
        number: "",
        inputData: "",
        detectorMapInput: "",
      });
      this.nextSignalId += 1;
    },
    removeSignal(signalId) {
      this.signals = this.signals.filter((signal) => signal.id !== signalId);
      if (this.signals.length === 0) {
        this.addSignal();
      }
    },
    signalLabel(signal) {
      const number = signal.number || "Unnamed";
      const name = signal.name ? ` — ${signal.name}` : "";
      return `Signal ${number}${name}`;
    },
    computeStats(rows) {
      if (!rows.length) {
        return {
          count: 0,
          min: null,
          max: null,
          avg: null,
        };
      }
      const values = rows.map((row) => row.elapsedSeconds);
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: total / values.length,
      };
    },
    setDetailSort(key) {
      this.detailSort = this.toggleSort(this.detailSort, key);
    },
    setSummarySort(key) {
      this.summarySort = this.toggleSort(this.summarySort, key);
    },
    toggleSort(sortState, key) {
      if (sortState.key === key) {
        return {
          key,
          direction: sortState.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: "asc",
      };
    },
    sortRows(rows, key, direction) {
      if (!key) {
        return [...rows];
      }
      const factor = direction === "desc" ? -1 : 1;
      return [...rows].sort((a, b) => {
        const valueA = a[key];
        const valueB = b[key];
        if (valueA === valueB) {
          return 0;
        }
        if (valueA === null || valueA === undefined) {
          return 1;
        }
        if (valueB === null || valueB === undefined) {
          return -1;
        }
        if (typeof valueA === "number" && typeof valueB === "number") {
          return (valueA - valueB) * factor;
        }
        return (
          String(valueA).localeCompare(String(valueB), undefined, {
            numeric: true,
            sensitivity: "base",
          }) * factor
        );
      });
    },
    sortIndicator(sortState, key) {
      if (sortState.key !== key) {
        return "";
      }
      return sortState.direction === "asc" ? "▲" : "▼";
    },
    parseDetectorMapping(text) {
      const detectorToPhase = {};
      const phases = new Set();

      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .forEach((line) => {
          const matches = line.match(/\d+/g);
          if (!matches || matches.length < 2) {
            return;
          }
          const detector = Number(matches[0]);
          const phase = Number(matches[1]);
          if (!Number.isNaN(detector) && phase > 0) {
            detectorToPhase[detector] = phase;
            phases.add(phase);
          }
        });

      return {
        detectorToPhase,
        phaseColumns: Array.from(phases).sort((a, b) => a - b),
      };
    },
    parseHighResData(text) {
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const [timestamp, eventCode, parameter] = line.split(",");
          const converted = this.convertTimestamp(timestamp?.trim() || "");
          if (!converted?.MillisecFromEpoch) {
            return null;
          }
          return {
            millis: converted.MillisecFromEpoch,
            eventCode: Number(eventCode),
            parameterCode: Number(parameter),
          };
        })
        .filter((event) => event && !Number.isNaN(event.eventCode))
        .sort((a, b) => a.millis - b.millis);
    },
    countDetectorOffEvents(events, detectorToPhase) {
      return events
        .filter(
          (event) =>
            event.eventCode === 81 && detectorToPhase[event.parameterCode]
        )
        .reduce((counts, event) => {
          const phase = detectorToPhase[event.parameterCode];
          counts[phase] = (counts[phase] || 0) + 1;
          return counts;
        }, {});
    },
    collectTerminationEvents(events, phaseColumns) {
      const terminationByPhase = {};
      const terminationMap = {
        4: "Gap Out",
        5: "Max Out",
        6: "Force Off",
      };

      phaseColumns.forEach((phase) => {
        terminationByPhase[phase] = [];
      });

      events.forEach((event) => {
        const phase = event.parameterCode;
        const termination = terminationMap[event.eventCode];
        if (!termination || !phaseColumns.includes(phase)) {
          return;
        }
        terminationByPhase[phase].push({
          millis: event.millis,
          termination,
        });
      });

      return terminationByPhase;
    },
    findLatestTermination(terminations, millis) {
      let latest = null;
      terminations.forEach((termination) => {
        if (termination.millis <= millis) {
          latest = termination.termination;
        }
      });
      return latest || "Unknown";
    },
    buildSignalIntervals(events, phaseColumns) {
      const phaseState = {};
      const intervalsByPhase = {};

      phaseColumns.forEach((phase) => {
        phaseState[phase] = {
          yellowStart: null,
          redStart: null,
          redCandidate: null,
        };
        intervalsByPhase[phase] = [];
      });

      events.forEach((event) => {
        const phase = event.parameterCode;
        if (!phaseColumns.includes(phase)) {
          return;
        }
        const state = phaseState[phase];

        if (event.eventCode === 8) {
          state.yellowStart = event.millis;
        }

        if (event.eventCode === 9) {
          if (state.yellowStart !== null) {
            intervalsByPhase[phase].push({
              state: "Yellow",
              start: state.yellowStart,
              end: event.millis,
            });
            state.yellowStart = null;
          }
          if (state.redStart === null) {
            state.redCandidate = event.millis;
          }
        }

        if (event.eventCode === 10) {
          state.redStart = event.millis;
          state.redCandidate = null;
        }

        if ([11, 12, 0, 1].includes(event.eventCode)) {
          const redStart =
            state.redStart !== null ? state.redStart : state.redCandidate;
          if (redStart !== null) {
            intervalsByPhase[phase].push({
              state: "Red",
              start: redStart,
              end: event.millis + 6000,
            });
            state.redStart = null;
            state.redCandidate = null;
          }
        }
      });

      return intervalsByPhase;
    },
    findInterval(intervals, millis) {
      return intervals.find(
        (interval) => millis >= interval.start && millis <= interval.end
      );
    },
    formatMillis(millis) {
      return DateTime.fromMillis(millis).toFormat(DISPLAY_FORMAT);
    },
    formatSeconds(seconds) {
      const rounded = Math.round(seconds * 10) / 10;
      return `${rounded.toFixed(1)} sec`;
    },
    formatSecondsOrDash(seconds) {
      if (seconds === null || seconds === undefined) {
        return "—";
      }
      return this.formatSeconds(seconds);
    },
    formatPercentOrDash(value) {
      if (value === null || value === undefined) {
        return "—";
      }
      return `${value.toFixed(1)}%`;
    },
    formatScoreOrDash(value) {
      if (value === null || value === undefined) {
        return "—";
      }
      return value.toFixed(1);
    },
    heatmapCount(rowKey, columnKey) {
      return this.heatmapConfig.counts.get(`${rowKey}-${columnKey}`) || 0;
    },
    heatmapCellColor(rowKey, columnKey) {
      const count = this.heatmapCount(rowKey, columnKey);
      const maxCount = this.heatmapConfig.maxCount;
      if (!count || maxCount === 0) {
        return "#f1f3f5";
      }
      const intensity = count / maxCount;
      const lightness = 95 - intensity * 45;
      if (this.heatmapState === "Red") {
        return `hsl(3, 78%, ${lightness}%)`;
      }
      return `hsl(45, 90%, ${lightness}%)`;
    },
    heatmapLegendColor(step) {
      const maxStep = this.heatmapLegendSteps.length - 1;
      if (maxStep <= 0) {
        return "#f1f3f5";
      }
      const intensity = step / maxStep;
      const lightness = 95 - intensity * 45;
      if (this.heatmapState === "Red") {
        return `hsl(3, 78%, ${lightness}%)`;
      }
      return `hsl(45, 90%, ${lightness}%)`;
    },
    heatmapCellTitle(row, column) {
      const count = this.heatmapCount(row.key, column.key);
      return `${row.label} • ${column.label} — ${count} event${
        count === 1 ? "" : "s"
      }`;
    },
  },
};
</script>

<style scoped>
.rlr-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.signal-group {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fff;
}

.signal-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.signal-subtitle {
  margin: 4px 0 0;
  color: #5f6368;
}

.signal-header-actions {
  display: flex;
  align-items: center;
}

.signal-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0;
}

.rlr-table-wrapper {
  overflow-x: auto;
}

.rlr-heatmap-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}

.heatmap-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}

.heatmap-control-label {
  font-weight: 600;
}

.heatmap-button-group {
  display: flex;
  gap: 8px;
}

.heatmap-toggle {
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 6px 14px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}

.heatmap-toggle.active {
  border-color: #1a73e8;
  background: #e8f0fe;
  color: #1a73e8;
}

.heatmap-subtitle {
  margin: 0 0 12px;
  color: #4f4f4f;
}

.heatmap-grid {
  display: grid;
  gap: 6px;
}

.heatmap-header,
.heatmap-row {
  display: grid;
  grid-template-columns: 140px repeat(var(--heatmap-columns, 24), minmax(16px, 1fr));
  gap: 4px;
  align-items: center;
}

.heatmap-corner {
  height: 20px;
}

.heatmap-hour {
  font-size: 0.7rem;
  text-align: center;
  color: #555;
}

.heatmap-row-label {
  font-size: 0.78rem;
  color: #333;
  padding-right: 4px;
}

.heatmap-cell {
  width: 100%;
  height: 18px;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.heatmap-legend-bar {
  display: grid;
  grid-template-columns: repeat(5, 14px);
  gap: 4px;
}

.heatmap-legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
}

.heatmap-legend-label {
  font-size: 0.75rem;
  color: #555;
}

.rlr-table {
  width: 100%;
  border-collapse: collapse;
}

.rlr-table th,
.rlr-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
}

.sort-button:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}

.sort-indicator {
  font-size: 0.75em;
}

.no-results {
  margin-top: 12px;
  font-style: italic;
}

.grow-wrap {
  display: grid;
}

.grow-wrap::after {
  content: attr(data-replicated-value) " ";
  white-space: pre-wrap;
  visibility: hidden;
}

.grow-wrap > textarea {
  resize: none;
  overflow: hidden;
  overflow-y: scroll;
}

.grow-wrap > textarea,
.grow-wrap::after {
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;
  grid-area: 1 / 1 / 2 / 2;
}
</style>
