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
    formatDuration(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return "—";
      }
      return value.toFixed(1);
    },
    buildDayMap() {
      const dayMap = new Map();
      this.segments.forEach((segment, index) => {
        const start = DateTime.fromISO(segment.startIso);
        const end = DateTime.fromISO(segment.endIso);
        if (!start.isValid || !end.isValid) {
          return;
        }
        let cursor = start.startOf("day");
        const endDay = end.startOf("day");
        while (cursor <= endDay) {
          const dayKey = cursor.toISODate();
          const dayStart = cursor;
          const dayEnd = cursor.endOf("day");
          const entryStart = start > dayStart ? start : dayStart;
          const entryEnd = end < dayEnd ? end : dayEnd;

          if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, []);
          }
          dayMap.get(dayKey).push({
            id: `${dayKey}-${index}`,
            pattern: segment.pattern,
            cycleLength: segment.cycleLength,
            start: entryStart.toFormat("HH:mm:ss"),
            end: entryEnd.toFormat("HH:mm:ss"),
          });
          cursor = cursor.plus({ days: 1 });
        }
      });

      dayMap.forEach((entries) => {
        entries.sort((a, b) => a.start.localeCompare(b.start));
      });

      return dayMap;
    },
    selectDay(date) {
      this.selectedDay = date;
    },
  },
};
</script>

<style scoped>
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
