<template>
  &nbsp;
  <div>
    <h1 class="h1-center-text">Pattern Calendar</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Pattern Calendar" value="about">
          <v-expansion-panel-text>
            This tool scans high-resolution controller event data for
            coordination pattern changes (event 131) and cycle length changes
            (event 132). It builds a calendar view that shows which pattern ran
            at each time of day. Use the summary table to confirm cycle lengths
            and the calendar to verify day-to-day pattern schedules.
            <p class="mt-2">
              The <b>pattern ranking</b> answers a different question: not
              what ran when, but which patterns are worth the time. A signal
              can hold a dozen patterns in its table while three of them cover
              most of the week, and those three are where studying pays. Sort
              it by total time to find them, by runs to see what the
              controller switches to most often, or by longest run to find the
              one that holds a whole peak.
            </p>
            <p class="mt-2">
              <b>Most used pattern by day</b> reduces each day to the pattern
              that held the intersection longest. "Day covered" is how much of
              the 24 hours the file describes at all, so a day with four hours
              of data is not read as a quiet one.
            </p>
            <p class="mt-2">
              A pattern running overnight is cut at midnight and counted
              against both days, but it stays one run: the controller switched
              once, and reporting two would overstate how often it changes.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example Usage" value="example">
          <v-expansion-panel-text>
            <pre>
1. Paste high-resolution CSV data (timestamp, event code, parameter).
2. Click "Build Calendar" to visualize pattern activity.
3. Click a day to see detailed time ranges and cycle lengths.
            </pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">High Resolution Data Input</h2>
      <div class="grow-wrap">
        <InputBox
          v-model="rawData"
          :defaultText="inputDefault"
        />
      </div>
      <div class="action-row">
        <v-btn color="primary" @click="buildCalendar">Build Calendar</v-btn>
        <v-btn variant="text" @click="resetCalendar">Reset</v-btn>
      </div>
    </v-card>

    <v-alert
      v-if="warningMessage"
      type="warning"
      class="mt-4"
      variant="tonal"
    >
      {{ warningMessage }}
    </v-alert>

    <!--
      Which patterns are worth the time. Sortable, because the answer changes
      with the question: total time says what to study first, runs say what
      the controller switches to most often, and longest run says which one
      actually holds an intersection for a whole peak.
    -->
    <v-card v-if="patternRanking.length" class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">Pattern Ranking</h2>
      <p class="table-hint">
        {{ patternRanking.length }}
        {{ patternRanking.length === 1 ? "pattern" : "patterns" }} over
        {{ span(rankingTotalMs) }} of data. Click a column to sort.
      </p>
      <v-data-table
        :headers="rankingHeaders"
        :items="patternRanking"
        :items-per-page="10"
        density="compact"
        class="rank-table"
      >
        <template #item.pattern="{ item }">
          <span class="rank-pattern">{{ item.pattern }}</span>
        </template>
        <template #item.cycleLength="{ item }">
          {{ item.cycleLength ?? "Unknown" }}
          <span v-if="item.cycleLengths.length > 1" class="muted">
            (also {{ item.cycleLengths.filter((c) => c !== item.cycleLength).join(", ") }})
          </span>
        </template>
        <template #item.totalMs="{ item }">{{ span(item.totalMs) }}</template>
        <template #item.share="{ item }">
          <div class="share-cell">
            <div class="share-bar" :style="{ width: `${Math.max(item.share * 100, 1)}%` }"></div>
            <span class="share-text">{{ percent(item.share) }}</span>
          </div>
        </template>
        <template #item.longestRunMs="{ item }">{{ span(item.longestRunMs) }}</template>
      </v-data-table>
    </v-card>

    <!--
      One row a day. The calendar above shows every change; this answers the
      simpler question of what the day mostly was.
    -->
    <v-card v-if="dailyRows.length" class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">Most Used Pattern by Day</h2>
      <p class="table-hint">
        The pattern that held the intersection longest on each day. "Day
        covered" is how much of the 24 hours the data describes at all, so a
        partial day is not mistaken for a quiet one.
      </p>
      <v-data-table
        :headers="dailyHeaders"
        :items="dailyRows"
        :items-per-page="10"
        density="compact"
        class="rank-table"
      >
        <template #item.dayKey="{ item }">
          <span class="nowrap">{{ item.dayKey }}</span>
          <span class="muted">{{ item.weekday }}</span>
        </template>
        <template #item.topPattern="{ item }">
          <span class="rank-pattern">{{ item.topPattern ?? "—" }}</span>
          <span v-if="item.runnersUp.length" class="muted">
            then {{ item.runnersUp.map((p) => p.pattern).join(", ") }}
          </span>
        </template>
        <template #item.topCycle="{ item }">{{ item.topCycle ?? "Unknown" }}</template>
        <template #item.topMs="{ item }">{{ span(item.topMs) }}</template>
        <template #item.topShare="{ item }">{{ percent(item.topShare) }}</template>
        <template #item.coverage="{ item }">{{ percent(item.coverage) }}</template>
      </v-data-table>
    </v-card>

    <v-card v-if="patternSummary.length" class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">Cycle Lengths by Pattern</h2>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Cycle Lengths Observed (s)</th>
            <th>Most Recent Cycle Length (s)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in patternSummary" :key="row.pattern">
            <td>{{ row.pattern }}</td>
            <td>{{ row.cycleLengths }}</td>
            <td>{{ row.latestCycleLength }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card v-if="calendarReady" class="pa-4 mt-6" variant="outlined">
      <div class="calendar-header">
        <h2 class="section-title">Pattern Calendar</h2>
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          item-title="label"
          item-value="value"
          label="Select month"
          density="compact"
          class="month-select"
        ></v-select>
      </div>

      <div class="calendar-grid">
        <div v-for="day in weekDays" :key="day" class="calendar-weekday">
          {{ day }}
        </div>
        <button
          v-for="day in calendarDays"
          :key="day.date"
          class="calendar-day"
          :class="{
            'calendar-day--muted': !day.inMonth,
            'calendar-day--active': day.date === selectedDay,
          }"
          @click="selectDay(day.date)"
        >
          <div class="calendar-day__date">{{ day.label }}</div>
          <div v-if="day.entries.length" class="calendar-day__entries">
            <v-chip
              v-for="entry in day.preview"
              :key="entry.id"
              size="x-small"
              color="primary"
              variant="tonal"
            >
              P{{ entry.pattern }} {{ entry.start }}
            </v-chip>
            <div v-if="day.entries.length > day.preview.length" class="more-text">
              +{{ day.entries.length - day.preview.length }} more
            </div>
          </div>
        </button>
      </div>

      <div class="day-details" v-if="selectedDayEntries.length">
        <h3 class="section-title">
          {{ selectedDayLabel }}
        </h3>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Pattern</th>
              <th>Cycle Length (s)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in selectedDayEntries" :key="entry.id">
              <td>{{ entry.start }}</td>
              <td>{{ entry.end }}</td>
              <td>{{ entry.pattern }}</td>
              <td>{{ entry.cycleLength ?? 'Unknown' }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <v-card v-if="phaseSummaryRows.length" class="pa-4 mt-6" variant="outlined">
      <h2 class="section-title">Average Phase Durations by Pattern</h2>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Pattern</th>
            <th v-for="phase in phaseDurationColumns" :key="`phase-${phase}`">
              Phase {{ phase }} Avg (s)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in phaseSummaryRows" :key="`pattern-${row.pattern}`">
            <td>{{ row.pattern }}</td>
            <td
              v-for="phase in phaseDurationColumns"
              :key="`pattern-${row.pattern}-phase-${phase}`"
            >
              {{ formatDuration(row.phaseAverages[phase]) }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import {
  dailyPatternUse,
  formatDuration as formatSpan,
  rankPatterns,
  splitSegmentsByDay,
} from "../utils/patternUsage.js";
import convertTime from "../mixins/convertTime";

export default {
  name: "PatternCalendar",
  components: {
    InputBox,
  },
  mixins: [convertTime],
  data() {
    return {
      panel: [],
      rawData: "",
      inputDefault:
        "Paste high-resolution CSV data (timestamp, event code, parameter)",
      warningMessage: "",
      rawEvents: [],
      segments: [],
      selectedMonth: "",
      selectedDay: "",
      calendarReady: false,
      weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    };
  },
  computed: {
    /**
     * Which patterns carry the day, longest-running first.
     *
     * The calendar says what ran when. This says what to study: a signal can
     * hold a dozen patterns while three of them cover most of the week, and
     * those three are where the time goes.
     */
    patternRanking() {
      return rankPatterns(this.segments);
    },
    rankingHeaders() {
      return [
        { title: "Pattern", key: "pattern", align: "start" },
        { title: "Cycle (s)", key: "cycleLength" },
        { title: "Total time", key: "totalMs", value: (row) => row.totalMs },
        { title: "Share", key: "share" },
        { title: "Days", key: "dayCount" },
        { title: "Runs", key: "runCount" },
        { title: "Longest run", key: "longestRunMs", value: (row) => row.longestRunMs },
      ];
    },
    dailyUse() {
      return dailyPatternUse(this.segments);
    },
    dailyHeaders() {
      return [
        { title: "Day", key: "dayKey", align: "start" },
        { title: "Most used pattern", key: "topPattern" },
        { title: "Cycle (s)", key: "topCycle" },
        { title: "Time on it", key: "topMs", value: (row) => row.topMs },
        { title: "Share of the day's data", key: "topShare" },
        { title: "Patterns that ran", key: "patternCount" },
        { title: "Day covered", key: "coverage" },
      ];
    },
    /** Flattened for the table, because v-data-table sorts on flat keys. */
    dailyRows() {
      return this.dailyUse.map((day) => ({
        dayKey: day.dayKey,
        weekday: DateTime.fromMillis(day.dayStartMs).toFormat("ccc"),
        topPattern: day.top ? day.top.pattern : null,
        topCycle: day.top ? day.top.cycleLength : null,
        topMs: day.top ? day.top.totalMs : 0,
        topShare: day.top ? day.top.share : 0,
        patternCount: day.patternCount,
        coverage: day.coverage,
        runnersUp: day.patterns.slice(1, 4),
      }));
    },
    /** How much of the loaded span each pattern would be studied for. */
    rankingTotalMs() {
      return this.patternRanking.reduce((sum, row) => sum + row.totalMs, 0);
    },
    patternSummary() {
      const summaryMap = new Map();
      this.segments.forEach((segment) => {
        if (!summaryMap.has(segment.pattern)) {
          summaryMap.set(segment.pattern, {
            lengths: new Set(),
            latest: "Unknown",
          });
        }
        const entry = summaryMap.get(segment.pattern);
        if (segment.cycleLength !== null && segment.cycleLength !== undefined) {
          entry.lengths.add(segment.cycleLength);
          entry.latest = segment.cycleLength;
        }
      });

      return Array.from(summaryMap.entries())
        .map(([pattern, data]) => ({
          pattern,
          cycleLengths: data.lengths.size
            ? Array.from(data.lengths).sort((a, b) => a - b).join(", ")
            : "Unknown",
          latestCycleLength: data.latest,
        }))
        .sort((a, b) => a.pattern - b.pattern);
    },
    monthOptions() {
      if (!this.segments.length) {
        return [];
      }
      const start = DateTime.fromISO(this.segments[0].startIso).startOf("month");
      const end = DateTime.fromISO(
        this.segments[this.segments.length - 1].endIso
      ).startOf("month");
      const months = [];
      let cursor = start;
      while (cursor <= end) {
        months.push({
          label: cursor.toFormat("LLLL yyyy"),
          value: cursor.toISO(),
        });
        cursor = cursor.plus({ months: 1 });
      }
      return months;
    },
    calendarDays() {
      if (!this.calendarReady || !this.selectedMonth) {
        return [];
      }
      const monthStart = DateTime.fromISO(this.selectedMonth).startOf("month");
      const gridStart = monthStart.startOf("week");
      const dayMap = this.buildDayMap();
      return Array.from({ length: 42 }, (_, index) => {
        const date = gridStart.plus({ days: index });
        const key = date.toISODate();
        const entries = dayMap.get(key) || [];
        return {
          date: key,
          label: date.day,
          inMonth: date.month === monthStart.month,
          entries,
          preview: entries.slice(0, 2),
        };
      });
    },
    selectedDayEntries() {
      if (!this.selectedDay) {
        return [];
      }
      const dayMap = this.buildDayMap();
      return dayMap.get(this.selectedDay) || [];
    },
    selectedDayLabel() {
      if (!this.selectedDay) {
        return "";
      }
      return DateTime.fromISO(this.selectedDay).toFormat("cccc, LLLL d, yyyy");
    },
    phaseSummary() {
      if (!this.rawEvents.length || !this.segments.length) {
        return { phases: [], rows: [] };
      }
      const intervals = this.buildPhaseIntervals(this.rawEvents);
      if (!intervals.length) {
        return { phases: [], rows: [] };
      }

      const phaseSet = new Set(intervals.map((interval) => interval.phase));
      const phases = Array.from(phaseSet).sort((a, b) => a - b);
      const patternMap = new Map();

      intervals.forEach((interval) => {
        const pattern = this.findPatternForMillis(interval.startMillis);
        if (pattern === null || pattern === undefined) {
          return;
        }
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, new Map());
        }
        const phaseMap = patternMap.get(pattern);
        if (!phaseMap.has(interval.phase)) {
          phaseMap.set(interval.phase, { sum: 0, count: 0 });
        }
        const stats = phaseMap.get(interval.phase);
        stats.sum += interval.durationSeconds;
        stats.count += 1;
      });

      const rows = Array.from(patternMap.entries())
        .map(([pattern, phaseMap]) => {
          const phaseAverages = {};
          phases.forEach((phase) => {
            const stats = phaseMap.get(phase);
            phaseAverages[phase] = stats
              ? stats.sum / stats.count
              : null;
          });
          return {
            pattern,
            phaseAverages,
          };
        })
        .sort((a, b) => a.pattern - b.pattern);

      return { phases, rows };
    },
    phaseDurationColumns() {
      return this.phaseSummary.phases;
    },
    phaseSummaryRows() {
      return this.phaseSummary.rows;
    },
  },
  methods: {
    resetCalendar() {
      this.rawData = "";
      this.warningMessage = "";
      this.rawEvents = [];
      this.segments = [];
      this.selectedMonth = "";
      this.selectedDay = "";
      this.calendarReady = false;
    },
    buildCalendar() {
      this.warningMessage = "";
      const rawEvents = this.parseRawEvents(this.rawData);
      if (!rawEvents.length) {
        this.warningMessage =
          "No readable events found. Confirm the CSV format includes timestamp, event code, and parameter.";
        this.calendarReady = false;
        return;
      }

      const segments = this.buildPatternSegments(rawEvents);
      if (!segments.length) {
        this.warningMessage =
          "No coordination pattern changes (event 131) were found in the data.";
        this.calendarReady = false;
        return;
      }

      this.rawEvents = rawEvents;
      this.segments = segments;
      this.selectedMonth = this.monthOptions[0]?.value || "";
      this.selectedDay = DateTime.fromISO(segments[0].startIso).toISODate();
      this.calendarReady = true;
    },
    parseRawEvents(rawData) {
      if (!rawData || !rawData.trim()) {
        return [];
      }

      return rawData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const [timestampRaw, eventCodeRaw, parameterRaw] = line
            .split(",")
            .map((value) => value.trim());

          const parsedEventCode = Number.parseInt(eventCodeRaw, 10);
          const parsedParameter = Number.parseInt(parameterRaw, 10);

          if (Number.isNaN(parsedEventCode) || Number.isNaN(parsedParameter)) {
            return null;
          }

          const timeInfo = this.convertTimestamp(timestampRaw);
          if (!timeInfo || !timeInfo.calculatable) {
            return null;
          }

          return {
            eventCode: parsedEventCode,
            parameter: parsedParameter,
            iso: timeInfo.iso,
            milliseconds: timeInfo.MillisecFromEpoch,
          };
        })
        .filter((item) => item)
        .sort((a, b) => a.milliseconds - b.milliseconds);
    },
    buildPatternSegments(rawEvents) {
      const filtered = rawEvents.filter((event) =>
        [131, 132].includes(event.eventCode)
      );
      if (!filtered.length) {
        return [];
      }

      const grouped = new Map();
      filtered.forEach((event) => {
        const key = event.milliseconds;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key).push(event);
      });

      const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b);
      let currentPattern = null;
      let currentCycle = null;
      const segments = [];

      sortedKeys.forEach((timestamp) => {
        const events = grouped.get(timestamp) || [];
        const cycleEvents = events.filter((event) => event.eventCode === 132);
        if (cycleEvents.length) {
          currentCycle = cycleEvents[cycleEvents.length - 1].parameter;
        }

        const patternEvents = events.filter((event) => event.eventCode === 131);
        patternEvents.forEach((event) => {
          if (segments.length) {
            segments[segments.length - 1].endIso = event.iso;
            segments[segments.length - 1].endMillis = event.milliseconds;
          }
          currentPattern = event.parameter;
          segments.push({
            pattern: currentPattern,
            cycleLength: currentCycle,
            startIso: event.iso,
            startMillis: event.milliseconds,
            endIso: event.iso,
            endMillis: event.milliseconds,
          });
        });
      });

      const lastEvent = rawEvents[rawEvents.length - 1];
      if (segments.length && lastEvent) {
        segments[segments.length - 1].endIso = lastEvent.iso;
        segments[segments.length - 1].endMillis = lastEvent.milliseconds;
      }

      return segments.filter((segment) => segment.pattern !== null);
    },
    buildPhaseIntervals(rawEvents) {
      const relevantEvents = rawEvents
        .filter((event) => [1, 11, 12].includes(event.eventCode))
        .sort((a, b) => a.milliseconds - b.milliseconds);
      const activeStarts = new Map();
      const intervals = [];

      relevantEvents.forEach((event) => {
        const phase = event.parameter;
        if (event.eventCode === 1) {
          activeStarts.set(phase, event);
          return;
        }
        if (event.eventCode === 11 || event.eventCode === 12) {
          const startEvent = activeStarts.get(phase);
          if (!startEvent) {
            return;
          }
          if (event.milliseconds > startEvent.milliseconds) {
            intervals.push({
              phase,
              startMillis: startEvent.milliseconds,
              endMillis: event.milliseconds,
              durationSeconds:
                (event.milliseconds - startEvent.milliseconds) / 1000,
            });
          }
          activeStarts.delete(phase);
        }
      });

      return intervals;
    },
    findPatternForMillis(millis) {
      const segment = this.segments.find(
        (item) => item.startMillis <= millis && item.endMillis >= millis
      );
      return segment ? segment.pattern : null;
    },
    span(ms) {
      return formatSpan(ms);
    },
    percent(value) {
      return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
    },
    formatDuration(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return "—";
      }
      return value.toFixed(1);
    },
    /**
     * The calendar's per-day entries, cut from the same splitter the ranking
     * uses. Two clippers would be two chances to disagree about which day an
     * overnight pattern belongs to, and the calendar and the tables below it
     * have to name the same day.
     */
    buildDayMap() {
      const dayMap = new Map();
      splitSegmentsByDay(this.segments).forEach((piece, index) => {
        if (!dayMap.has(piece.dayKey)) {
          dayMap.set(piece.dayKey, []);
        }
        dayMap.get(piece.dayKey).push({
          id: `${piece.dayKey}-${index}`,
          pattern: piece.pattern,
          cycleLength: piece.cycleLength,
          startMs: piece.startMs,
          start: DateTime.fromMillis(piece.startMs).toFormat("HH:mm:ss"),
          end: this.endOfDayLabel(piece),
        });
      });

      dayMap.forEach((entries) => {
        entries.sort((a, b) => a.startMs - b.startMs);
      });

      return dayMap;
    },
    /**
     * A piece that runs to the end of its day ends at the next midnight, and
     * printing that as 00:00:00 in a row dated the day before reads as a
     * pattern that lasted no time. 24:00:00 is how a time-of-day table says
     * the same thing without the contradiction.
     */
    endOfDayLabel(piece) {
      const end = DateTime.fromMillis(piece.endMs);
      const sameDay = end.toISODate() === DateTime.fromMillis(piece.startMs).toISODate();
      return sameDay ? end.toFormat("HH:mm:ss") : "24:00:00";
    },
    selectDay(date) {
      this.selectedDay = date;
    },
  },
};
</script>

<style scoped>
.table-hint {
  text-align: left;
  font-size: 0.82rem;
  opacity: 0.75;
  margin: 0 0 8px;
}
.rank-pattern {
  font-weight: 600;
}
.muted {
  font-size: 0.78rem;
  opacity: 0.65;
  margin-left: 6px;
}
.nowrap {
  white-space: nowrap;
}
/* A bar behind the number: the ranking is read by eye before it is read. */
.share-cell {
  position: relative;
  min-width: 96px;
  padding: 2px 0;
}
.share-bar {
  position: absolute;
  inset: 2px auto 2px 0;
  background: rgba(var(--v-theme-primary), 0.22);
  border-radius: 3px;
}
.share-text {
  position: relative;
}
.section-title {
  font-weight: 600;
}

.action-row {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.month-select {
  max-width: 240px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.calendar-weekday {
  font-weight: 600;
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
}

.calendar-day {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 8px;
  min-height: 92px;
  text-align: left;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.calendar-day--muted {
  opacity: 0.45;
}

.calendar-day--active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.calendar-day__date {
  font-weight: 600;
  margin-bottom: 6px;
}

.calendar-day__entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.more-text {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.day-details {
  margin-top: 24px;
}
</style>
