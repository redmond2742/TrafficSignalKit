<template>
  <div>
    &nbsp;
    <h1 class="h1-center-text">Preemption Evaluator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: Preemption Evaluator" value="about">
          <v-expansion-panel-text>
            Paste or upload high-resolution controller data and this tool pulls
            out the preemption sequences: when each one ran, how long it lasted,
            and which preempt channel served it. Everything that is not a
            preemption event is discarded as the file is read, so a full day of
            data is handled without waiting on the phase and detector rows that
            make up the bulk of it.
            <p class="mt-2">
              Add a block per signal to compare intersections side by side.
              Each block is identified by its <b>signal number</b>, which is
              the same number a GTSS export uses, so naming the channels is
              automatic. Data that already leads with a signal ID column brings
              its own numbers and ignores the field.
            </p>
            <p class="mt-2">
              Load a <b>GTSS export</b> and each channel is named by what it
              actually serves &mdash; "Preempt 3" becomes "Main Street from
              the ESE (WB)" &mdash; so a pattern points at a direction
              rather than a channel number.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What This Tool Shows" value="details">
          <v-expansion-panel-text>
            <ul>
              <li>A bar for every preemption event, on its own channel row</li>
              <li>
                Each event broken into the time waiting on entry, track
                clearance, dwell and exit
              </li>
              <li>Per-channel counts, along with shortest, median and longest durations</li>
              <li>
                Calls that were registered but <b>never served</b>, which are
                easy to miss when scrolling raw data
              </li>
              <li>
                Every event as a <b>CSV or an Excel workbook</b>, with the
                date in its own column so the day is something a spreadsheet
                can group by
              </li>
              <li>
                A <b>kit screen</b>: every event plotted by date and time of
                day, coloured per signal and channel
              </li>
              <li>
                A <b>weekly pattern</b> heatmap per channel, hour against day
                of week
              </li>
              <li>
                A <b>signal picker</b> on every chart, so two intersections
                can be compared or one examined on its own
              </li>
              <li>
                A <b>time-space diagram</b>, once a GTSS export supplies the
                coordinates: distance along the corridor against time, with
                runs of calls that look like one vehicle joined up
              </li>
            </ul>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel
          title="Screening for Unauthorised Emitters"
          value="kits"
        >
          <v-expansion-panel-text>
            <p>
              Switch the chart to <b>Kit screen</b>. Each dot is one preemption
              event, placed by the date it happened and the time of day it
              started.
            </p>
            <p class="mt-2">
              A vehicle carrying an unauthorised emitter triggers preemption on
              its driver's own commute, so its events land at close to the same
              minute of the day, on weekdays, again and again. That reads as a
              near-horizontal row of dots. Genuine emergency calls follow no
              such schedule and scatter across the chart. Weekend events are
              drawn as crosses, because the pattern being hunted is a weekday
              one.
            </p>
            <p class="mt-2">
              Every chart carries a <b>signal picker</b>. Left on "all
              signals" the charts show the whole set, with each row named by
              signal and channel so two intersections cannot be read as one;
              pick a signal and the chart narrows to it. The tables and the
              exports stay on the full set either way, so narrowing the
              picture never quietly narrows the numbers.
            </p>
            <p class="mt-2">
              <b>Weekly pattern</b> asks the other half of the question: not
              "the same time every day" but "only on working days". Each
              channel gets an hour-by-weekday grid. A commute rides Monday to Friday
              and leaves the weekend rows empty. Apparatus answering real calls
              fills the whole week, because emergencies keep no office hours.
              The percentage beside each grid is the share of that channel's
              events falling on a weekday.
            </p>
            <p class="mt-2">
              <b>Time-space</b> asks the third question: not when, but where.
              With a GTSS export loaded the signals are placed along the
              corridor they form and every call is drawn at its own
              intersection. A vehicle driving through calls each signal in
              turn, which draws as a diagonal walking up the chart; one
              signal triggered over and over draws as a flat row. Runs that
              hold a direction at a speed a vehicle could keep are joined
              with a line and listed underneath, with the route they took.
            </p>
            <p class="mt-2">
              A flat row or a weekday-only block is a lead, not a finding:
              scheduled transit, a shift change at a nearby station, or a
              recurring delivery can all look similar. Confirm against the
              channel the calls arrive on and the times in the event table
              before drawing conclusions.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Naming Channels from a GTSS Export" value="gtss">
          <v-expansion-panel-text>
            <p>
              A preempt channel number means nothing on its own. A
              <b>GTSS export</b> &mdash; the General Traffic Signal
              Specification, documented at
              <a href="https://gtss.dev" target="_blank" rel="noopener">gtss.dev</a>
              &mdash; carries the chain that gives it meaning:
            </p>
            <pre>
preempt.txt     preempt_channel, signalID, type, phase, maxTime
phases.txt      phase, signal_id, movement_type, approach_id
approaches.txt  approach_id, signal_id, street_name, compass_bearing
            </pre>
            <p>
              Channel 3 at signal 1 serves phases 1 and 6; both belong to
              approach 1-2, which is Main Street lying 120&deg; from the
              intersection. So the channel is the <b>ESE approach</b>, and
              the traffic on it is <b>westbound</b>.
            </p>
            <p class="mt-2">
              Load the zip with <b>Load GTSS export</b>. If preempt.txt ships
              separately, select it at the same time. The signal field on each
              block then becomes a picker over the signals the export actually
              contains, listed by number and cross street, so there is no
              separate linking step: the number is the link.
            </p>
            <p class="mt-2">
              Have no export yet? The configuration builder at
              <a href="https://app.gtss.dev" target="_blank" rel="noopener">app.gtss.dev</a>
              produces one, and
              <a href="https://gtss.dev" target="_blank" rel="noopener">gtss.dev</a>
              covers what each file holds. Why this site leans on it at all is
              the subject of
              <router-link to="/blog/configure-once-with-gtss">
                Configure Once, Not Once Per Tool</router-link>.
            </p>
            <p class="mt-2">
              <b>On direction:</b> compass_bearing is the bearing of the
              approach leg from the intersection &mdash; where the vehicles
              come from &mdash; so the travel direction shown is its
              reciprocal. A channel serving phases on two different approaches
              gets no direction at all rather than an arbitrary one.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Which Events Are Used" value="codes">
          <v-expansion-panel-text>
            <p>
              Only these enumerations are read. The event parameter carries the
              preempt channel number.
            </p>
            <v-table density="compact" class="code-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="code in codeList" :key="code.code">
                  <td>{{ code.code }}</td>
                  <td>{{ code.label }}</td>
                </tr>
              </tbody>
            </v-table>
            <p class="mt-2">
              TSP events (112&ndash;115, 117&ndash;119) are priority rather than
              preemption and are handled by the
              <router-link to="/tsp-dashboard">TSP Dashboard</router-link>.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Example: Using This Tool" value="example">
          <v-expansion-panel-text>
            Paste high-resolution data as CSV lines of
            <code>timestamp, enumeration, channel</code>. A leading signal ID
            column is detected and skipped automatically.
            <pre>
3/14/2024 14:01:40.0, 101, 1
3/14/2024 14:01:45.0, 102, 1
3/14/2024 14:01:46.0, 105, 1
3/14/2024 14:01:48.0, 106, 1
3/14/2024 14:02:05.0, 107, 1
3/14/2024 14:04:40.0, 104, 1
3/14/2024 14:04:42.0, 111, 1
            </pre>
            Click <b>Evaluate Preemption</b> to build the table and chart.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <!--
      The export comes first because it changes what the signal fields below
      it are: a picker over real intersections rather than a number to type.
      It is its own card for the same reason -- it is loaded once for the
      whole page, not once per signal, and sitting among the per-signal
      blocks it read as though it belonged to one of them.
    -->
    <v-card class="setup-card gtss-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">
          <v-icon icon="mdi-map-marker-distance" size="small" class="mr-1" />
          Signal configuration
          <span class="setup-card__optional">optional</span>
        </h2>
        <p class="setup-card__hint">
          A GTSS export names each preempt channel by what it serves, and
          carries the coordinates the time-space diagram needs. Without one
          the tool still works; channels stay numbers.
          <a href="https://gtss.dev" target="_blank" rel="noopener">
            What is GTSS?
          </a>
        </p>
      </div>
      <div class="gtss-row">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-map-marker-distance"
          :loading="gtssLoading"
          @click="$refs.gtssInput.click()"
        >
          Load GTSS export
        </v-btn>
        <input
          ref="gtssInput"
          type="file"
          class="gtss-file"
          multiple
          accept=".zip,.txt"
          @change="loadGtssFiles"
        />
        <span v-if="gtssName" class="gtss-name">
          <v-icon icon="mdi-check" size="small" class="gtss-tick" />
          {{ gtssName }}
          <span class="muted">
            — {{ gtss.signals.length }}
            {{ gtss.signals.length === 1 ? "signal" : "signals" }}
          </span>
          <v-btn size="x-small" variant="text" @click="clearGtss">Clear</v-btn>
        </span>
        <span v-else class="gtss-hint">
          The zip, plus preempt.txt if it ships separately
        </span>
      </div>
    </v-card>

    <!--
      One card per signal, so it is obvious which data belongs to which
      intersection. Comparing signals is the point of the kit screen and the
      time-space diagram, and an unboxed list could not say where a paste
      came from. A file that already leads with a signal ID column keeps its
      own names instead.
    -->
    <v-card
      v-for="(source, index) in sources"
      :key="source.id"
      class="setup-card source-card"
      variant="outlined"
    >
      <div class="source-head">
        <!--
          The signal number, not a free-text name: it is the key the GTSS
          export uses, so what goes here is what links the two. With an export
          loaded this offers its signals, but stays a combobox rather than a
          picker -- data often covers an intersection the export has not
          caught up with, and refusing to accept the number would be refusing
          to process the file.
        -->
        <v-combobox
          v-if="gtssSignalOptions.length"
          v-model="source.signalId"
          :items="gtssSignalOptions"
          :return-object="false"
          label="Signal"
          placeholder="Pick one, or type any number"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="source-name"
        ></v-combobox>
        <v-text-field
          v-else
          v-model="source.signalId"
          :placeholder="`${index + 1}`"
          label="Signal number"
          density="compact"
          variant="outlined"
          hide-details
          class="source-name source-name--narrow"
        ></v-text-field>
        <span v-if="signalNote(source.signalId)" class="signal-note">
          {{ signalNote(source.signalId) }}
        </span>
        <v-spacer />
        <v-btn
          v-if="sources.length > 1"
          variant="text"
          size="small"
          prepend-icon="mdi-close"
          @click="removeSource(index)"
        >
          Remove
        </v-btn>
      </div>
      <InputBox
        v-model="source.text"
        defaultText="Paste in High-Resolution Traffic Signal Data as CSV text (timestamp, enumeration, channel)"
        accept=".csv,.txt,text/csv,text/plain"
      />
    </v-card>

    <v-alert v-if="gtssError" type="error" variant="tonal" density="compact" class="mb-3">
      {{ gtssError }}
    </v-alert>
    <v-alert
      v-else-if="gtssWarnings.length"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      {{ gtssWarnings.join(" ") }}
    </v-alert>

    <div class="action-row">
      <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addSource">
        Add another signal
      </v-btn>
      <v-btn
        color="primary"
        :loading="processing"
        :disabled="!hasInput"
        @click="evaluate"
      >
        Evaluate Preemption
      </v-btn>
      <v-text-field
        v-model.number="maxEventSeconds"
        type="number"
        label="Split events after (seconds)"
        density="compact"
        variant="outlined"
        hide-details
        min="10"
        class="gap-field"
      ></v-text-field>
      <v-btn v-if="events.length" variant="tonal" @click="downloadCsv">
        Download CSV
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
      {{ error }}
    </v-alert>

    <v-alert
      v-else-if="ranOnce && !events.length"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      No preemption events found. {{ scanNote }}
    </v-alert>

    <template v-if="events.length">
      <v-alert type="success" variant="tonal" density="compact" class="mt-4">
        {{ scanNote }}
      </v-alert>

      <div class="metric-row">
        <div v-for="metric in metrics" :key="metric.label" class="metric-tile">
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-label">{{ metric.label }}</div>
        </div>
      </div>

      <div v-if="unservedCount" class="mt-4">
        <v-alert type="warning" variant="tonal" density="compact">
          {{ unservedCount }}
          {{ unservedCount === 1 ? "call was" : "calls were" }} registered but
          never entered preemption.
        </v-alert>
      </div>

      <template v-if="gtss">
        <h2 class="section-title">Preempt channels</h2>
        <v-alert
          v-if="unmatchedSignals.length"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          The export has nothing for
          {{ unmatchedSignals.map((s) => `signal ${s}`).join(", ") }}. Set the
          signal number on each block above to match the export.
        </v-alert>

        <div v-if="directoryRows.length" class="table-wrapper">
          <v-table density="compact">
            <thead>
              <tr>
                <th v-if="multiSignal">Signal</th>
                <th>Channel</th>
                <th>Serves</th>
                <th>Phases</th>
                <th>Type</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in directoryRows" :key="`${row.name}-${row.channel}`">
                <td v-if="multiSignal" class="nowrap">
                  {{ row.name }}
                  <span v-if="row.crossStreets" class="muted">
                    {{ row.crossStreets }}
                  </span>
                </td>
                <td class="nowrap">{{ channelLabel(row.name, row.channel) }}</td>
                <td>{{ row.serves || "—" }}</td>
                <td class="nowrap">{{ row.phases || "—" }}</td>
                <td>{{ row.type || "—" }}</td>
                <td class="nowrap">{{ row.maxTime === null ? "—" : `${row.maxTime}s` }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <p v-else class="chart-hint">
          Set the signal number on each block above to match the export, and
          each channel will be named by what it serves.
        </p>
      </template>

      <h2 class="section-title">Events by channel</h2>
      <div class="chart-controls">
        <!--
          One picker for every mode. A chart of two intersections at once
          answers a different question from a chart of one, and until now
          only the weekly grids let you ask the second.
        -->
        <v-select
          v-if="signals.length > 1"
          v-model="chartSignal"
          :items="chartSignalOptions"
          label="Signal"
          density="compact"
          variant="outlined"
          hide-details
          class="chart-signal"
        ></v-select>
        <v-btn-toggle
          v-model="chartMode"
          mandatory
          divided
          density="compact"
          variant="outlined"
          color="primary"
          aria-label="Choose how to plot the events"
        >
          <v-btn value="timeline" size="small">Timeline</v-btn>
          <v-btn value="durations" size="small">Durations</v-btn>
          <v-btn value="scatter" size="small">Kit screen</v-btn>
          <v-btn value="weekly" size="small">Weekly pattern</v-btn>
          <v-btn
            value="timespace"
            size="small"
            :disabled="!hasCorridor"
            :title="hasCorridor ? '' : 'Needs a GTSS export with two or more placed signals'"
          >
            Time-space
          </v-btn>
        </v-btn-toggle>
        <v-chip-group v-model="visibleChannels" multiple column>
          <v-chip
            v-for="channel in allChannels"
            :key="channel"
            :value="channel"
            filter
            variant="outlined"
            size="small"
          >
            {{ chipLabel(channel) }}
          </v-chip>
        </v-chip-group>
        <v-checkbox
          v-if="chartMode === 'timespace'"
          v-model="showProgressions"
          label="Join runs"
          density="compact"
          hide-details
          class="run-toggle"
        ></v-checkbox>
        <v-btn
          v-if="chartMode === 'timespace'"
          size="small"
          variant="text"
          @click="showEverything"
        >
          Show all time
        </v-btn>
        <v-btn
          v-if="chartMode !== 'weekly'"
          size="small"
          variant="text"
          @click="resetZoom"
        >
          Reset zoom
        </v-btn>
      </div>
      <p class="chart-hint">
        <template v-if="chartMode === 'timeline'">
          Every event on its channel, at the time it happened. Scroll to zoom
          the time axis &mdash; events are short next to a whole day of data.
        </template>
        <template v-else-if="chartMode === 'weekly'">
          Events by hour and day of week, one grid per channel. A vehicle
          riding a commute concentrates into a few cells in the Monday-to-Friday
          rows. Apparatus answering real calls spreads across the whole week,
          because emergencies keep no office hours.
        </template>
        <template v-else-if="chartMode === 'timespace'">
          Distance along the corridor against time, built from the
          coordinates in the GTSS export. One vehicle working its way through
          calls each signal in turn, which draws as a diagonal;
          <span v-if="progressions.length">
            {{ progressions.length }}
            {{ progressions.length === 1 ? "run is" : "runs are" }} joined
            below.
          </span>
          <span v-else>
            no run of {{ minProgressionSignals }} or more signals was found in
            this data.
          </span>
          Repeated calls at one signal sit on a flat row instead.
          <b>It opens on the first run rather than the whole file</b>, because
          a trip takes two minutes and the file covers weeks; pick a row in
          the table below to move to another, or scroll to zoom.
        </template>
        <template v-else-if="chartMode === 'scatter'">
          Each dot is one event, placed by date and time of day. A vehicle
          carrying an emitter calls on its own commute, so its dots form a
          near-horizontal row on weekdays; genuine emergency calls scatter.
          Weekends are drawn as crosses. Scroll to zoom, drag to pan.
        </template>
        <template v-else>
          Every event lined up from its own start, so the durations compare
          directly.
          <span v-if="durationEvents.length < filteredEvents.length">
            Showing the {{ durationEvents.length }} longest of
            {{ filteredEvents.length }}.
          </span>
        </template>
      </p>
      <!-- A CSS grid rather than a canvas: no charting library has a matrix
           type built in, and this stays legible and selectable at any size. -->
      <div v-if="chartMode === 'weekly'" class="heatmaps">
        <div v-for="grid in heatmaps" :key="`${grid.signal}-${grid.channel}`" class="heatmap">
          <div class="heatmap-head">
            <h3 class="heatmap-title">
              <span v-if="chartShowsSignal" class="heatmap-signal-name">
                {{ grid.signal || "—" }} ·
              </span>
              {{ channelLabel(grid.signal, grid.channel) }}
              <span v-if="servesLabel(grid.signal, grid.channel)" class="heatmap-serves">
                — {{ servesLabel(grid.signal, grid.channel) }}
              </span>
            </h3>
            <span class="heatmap-facts">
              {{ grid.total }} {{ grid.total === 1 ? "event" : "events" }} ·
              {{ Math.round(grid.weekdayShare * 100) }}% on weekdays
              <template v-if="grid.peak">
                · busiest {{ grid.peak.weekday }}
                {{ hourLabel(grid.peak.hour) }}:00
              </template>
            </span>
          </div>

          <div class="heatmap-grid" role="img" :aria-label="`${channelLabel(grid.signal, grid.channel)}: ${grid.total} events by hour and day of week`">
            <div class="heatmap-corner"></div>
            <div v-for="hour in hourCount" :key="`h${hour}`" class="heatmap-hour">
              {{ hour - 1 }}
            </div>
            <template v-for="(row, rowIndex) in grid.counts" :key="`r${rowIndex}`">
              <div class="heatmap-day" :class="{ 'heatmap-day--weekend': rowIndex > 4 }">
                {{ weekdayLabels[rowIndex] }}
              </div>
              <div
                v-for="(count, hour) in row"
                :key="`c${rowIndex}-${hour}`"
                class="heatmap-cell"
                :style="cellStyle(count, grid.max)"
                :title="cellTitle(weekdayLabels[rowIndex], hour, count)"
              >
                {{ count || "" }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-else class="chart-wrapper" :style="{ height: chartHeight + 'px' }">
        <!-- Point charts through Scatter, interval charts through Bar. -->
        <Scatter
          v-if="pointChart"
          ref="gantt"
          :data="chartData"
          :options="chartOptions"
        />
        <Bar v-else ref="gantt" :data="chartData" :options="chartOptions" />
      </div>

      <template v-if="chartMode === 'timespace' && progressions.length">
        <h3 class="run-title">
          Runs through the corridor
          <span class="muted">
            — calls at {{ minProgressionSignals }}+ signals, one direction,
            at a speed a vehicle could hold
          </span>
        </h3>
        <div class="table-wrapper">
          <v-table density="compact">
            <thead>
              <tr>
                <th>Start</th>
                <th>Signals</th>
                <th>Route</th>
                <th>Distance</th>
                <th>Elapsed</th>
                <th>Avg speed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(run, index) in progressions"
                :key="index"
                class="run-row"
                :class="{ 'run-row--active': isFocused(run) }"
                @click="focusRun(run)"
              >
                <td class="nowrap">{{ fullTime(run.startMs) }}</td>
                <td>{{ run.signals }}</td>
                <td>{{ run.points.map((p) => p.station).join(" → ") }}</td>
                <td class="nowrap">{{ distance(run.distanceFt) }}</td>
                <td class="nowrap">{{ secs(run.endMs - run.startMs) }}</td>
                <td class="nowrap">{{ Math.round(run.speedMph) }} mph</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <p class="chart-hint">
          A run is a lead, not a finding. Apparatus answering a call travels
          a corridor too, and so does anything with a legitimate emitter.
          What separates the two is whether the same route repeats on the
          same schedule &mdash; check the kit screen and the weekly pattern
          for the signals named above.
        </p>
      </template>

      <h2 class="section-title">Channel summary</h2>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th v-if="multiSignal">Signal</th>
              <th>Channel</th>
              <th v-if="hasDirections">Serves</th>
              <th>Events</th>
              <th>Shortest</th>
              <th>Median</th>
              <th>Longest</th>
              <th>Total</th>
              <th>Median call&nbsp;&rarr;&nbsp;entry</th>
              <th>Never served</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="channel in viewSummary.channels"
              :key="`${channel.signal}-${channel.channel}`"
            >
              <td v-if="multiSignal">{{ channel.signal || "—" }}</td>
              <td class="nowrap">{{ channelLabel(channel.signal, channel.channel) }}</td>
              <td v-if="hasDirections">
                {{ servesLabel(channel.signal, channel.channel) || "—" }}
              </td>
              <td>{{ channel.count }}</td>
              <td>{{ secs(channel.minMs) }}</td>
              <td>{{ secs(channel.medianMs) }}</td>
              <td>{{ secs(channel.maxMs) }}</td>
              <td>{{ secs(channel.totalMs) }}</td>
              <td>{{ secs(channel.medianEntryDelayMs) }}</td>
              <td>{{ channel.statuses.callOnly || "—" }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="detail-head">
        <h2 class="section-title">
          Event detail
          <span v-if="shownEvents.length < filteredEvents.length" class="muted">
            (first {{ shownEvents.length }} of {{ filteredEvents.length }})
          </span>
        </h2>
        <!--
          Every filtered event, not just the rows drawn above: the table stops
          at 500 to stay responsive, and an export that quietly stopped there
          too would be the kind of thing found out much later.
        -->
        <v-btn
          size="small"
          variant="tonal"
          prepend-icon="mdi-file-table-outline"
          @click="exportExcel"
        >
          Export to Excel
        </v-btn>
      </div>
      <div class="table-wrapper">
        <v-table density="compact">
          <thead>
            <tr>
              <th v-if="multiSignal">Signal</th>
              <th>Channel</th>
              <th>Date</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Status</th>
              <th v-if="hasDirections">Direction</th>
              <th v-if="hasDirections">Phases</th>
              <th>Call&nbsp;&rarr;&nbsp;entry</th>
              <th>Track clear</th>
              <th>Dwell</th>
              <th>Codes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(event, index) in shownEvents"
              :key="index"
              :class="{ 'row-unserved': event.status === 'callOnly' }"
            >
              <td v-if="multiSignal">{{ event.signal || "—" }}</td>
              <td>{{ event.channel }}</td>
              <td class="nowrap">{{ dateOnly(event.startMs) }}</td>
              <td class="nowrap">{{ clockTime(event.startMs) }}</td>
              <td>{{ secs(event.durationMs) }}</td>
              <td>{{ statusLabels[event.status] }}</td>
              <td v-if="hasDirections" class="direction">
                {{ channelInfo(event.signal, event.channel).direction || "—" }}
              </td>
              <td v-if="hasDirections" class="nowrap">
                {{ channelInfo(event.signal, event.channel).phases || "—" }}
              </td>
              <td>{{ secs(event.segments.callToEntry) }}</td>
              <td>{{ secs(event.segments.trackClearance) }}</td>
              <td>{{ secs(event.segments.dwell) }}</td>
              <td class="codes">{{ event.codes.map((c) => c.code).join(" ") }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </div>
</template>

<script>
import { Bar, Scatter } from "vue-chartjs";
import zoom from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { DateTime } from "luxon";
import InputBox from "../components/foundational/InputBox.vue";
import { readZipText } from "../utils/zipReader.js";
import { xlsxBlob } from "../utils/xlsx.js";
import { buildPreemptDirectory, describeChannel } from "../utils/gtss.js";
import {
  MIN_PROGRESSION_SIGNALS,
  buildTimeSpacePoints,
  findProgressions,
  formatDistance,
  projectSignals,
} from "../utils/preemptCorridor.js";
import {
  PREEMPT_CODES,
  STATUS_LABELS,
  DEFAULT_MAX_EVENT_SECONDS,
  MINUTES_PER_DAY,
  WEEKDAY_LABELS,
  HOURS_PER_DAY,
  buildHourWeekdayGrids,
  evaluateSources,
  buildScatterPoints,
  seriesKey,
  eventsToCsv,
  summarizePreemption,
  toSeconds,
} from "../utils/preemptionEvaluator.js";

ChartJS.register(
  Title, Tooltip, Legend, BarElement, PointElement, LinearScale, CategoryScale, zoom,
);

/**
 * The intervals drawn inside each event bar, in the order they occur. Each
 * runs from its own mark to the first of the marks that follow it, so a
 * sequence missing a code still draws as one continuous bar.
 */
const SEGMENTS = [
  { key: "call", label: "Waiting on entry", color: "#F9A825", from: null, next: ["entry", "trackClear", "dwell", "exit", "forceOff"] },
  { key: "entry", label: "Entry", color: "#26A69A", from: "entry", next: ["trackClear", "dwell", "exit", "forceOff"] },
  { key: "trackClear", label: "Track clearance", color: "#EF6C00", from: "trackClear", next: ["dwell", "exit", "forceOff"] },
  { key: "dwell", label: "Dwell", color: "#00695C", from: "dwell", next: ["exit", "forceOff"] },
  { key: "exit", label: "Exit interval", color: "#78909C", from: "exit", next: [] },
];

const UNSERVED_COLOR = "#C62828";

/** The joining line under a run of calls that looks like one vehicle. */
const PROGRESSION_COLOR = "rgba(198, 40, 40, 0.55)";

/** Breathing room above and below the end signals, so their dots are not clipped. */
function corridorPad(corridor) {
  return Math.max((corridor ? corridor.spanFt : 0) * 0.08, 150);
}

/**
 * One colour per signal-and-channel series on the kit screen. Chosen to stay
 * distinguishable against each other rather than to match the interval
 * palette above, which encodes something different.
 */
const SERIES_COLORS = [
  "#00695C", "#C62828", "#1565C0", "#EF6C00", "#6A1B9A", "#2E7D32",
  "#AD1457", "#00838F", "#5D4037", "#37474F", "#9E9D24", "#4527A0",
];
/**
 * The signal picker's "everything" option. A real signal id could collide with
 * any ordinary string, so the sentinel uses the NUL that seriesKey already
 * relies on being absent from a label.
 */
const ALL_SIGNALS = "\u0000all";

/** Rendering every row of a very large result set is not worth the stall. */
const MAX_TABLE_ROWS = 500;
/** The durations view gives every event its own row, so it needs a ceiling. */
const MAX_CHART_ROWS = 40;

export default {
  name: "PreemptionEvaluator",
  components: { InputBox, Bar, Scatter },
  data() {
    return {
      panel: [],
      sources: [{ id: 1, signalId: "", text: "" }],
      nextSourceId: 2,
      maxEventSeconds: DEFAULT_MAX_EVENT_SECONDS,
      processing: false,
      ranOnce: false,
      error: "",
      events: [],
      summary: { channels: [], totals: {} },
      stats: null,
      visibleChannels: [],
      signals: [],
      chartMode: "timeline",
      chartSignal: ALL_SIGNALS,
      showProgressions: true,
      timeSpaceFocus: null,
      minProgressionSignals: MIN_PROGRESSION_SIGNALS,
      gtss: null,
      gtssName: "",
      gtssWarnings: [],
      gtssError: "",
      gtssLoading: false,
      weekdayLabels: WEEKDAY_LABELS,
      hourCount: HOURS_PER_DAY,
      statusLabels: STATUS_LABELS,
    };
  },
  computed: {
    codeList() {
      return Object.entries(PREEMPT_CODES).map(([code, meta]) => ({
        code: Number(code),
        label: meta.label,
      }));
    },
    hasInput() {
      return this.sources.some((source) => (source.text || "").trim());
    },
    /** Whether the data spans more than one signal, which changes what is worth showing. */
    multiSignal() {
      return this.signals.length > 1;
    },
    gtssSignalOptions() {
      if (!this.gtss) return [];
      return this.gtss.signals.map((signal) => ({
        title: signal.crossStreets
          ? `${signal.id} — ${signal.crossStreets}`
          : `Signal ${signal.id}`,
        value: signal.id,
      }));
    },
    /** GTSS entries keyed by signal id, for quick lookup while rendering. */
    gtssById() {
      const map = {};
      for (const signal of this.gtss ? this.gtss.signals : []) map[signal.id] = signal;
      return map;
    },
    /**
     * True once any signal in the data is one the export knows about.
     * The signal name in the data is the GTSS id, so this is a direct lookup.
     */
    hasDirections() {
      return this.signals.some((name) => this.gtssById[name]);
    },
    /** Every channel the export knows about, for the signals actually loaded. */
    directoryRows() {
      const rows = [];
      for (const name of this.signals) {
        const signal = this.gtssById[name];
        if (!signal) continue;
        for (const entry of signal.channels) {
          rows.push({
            name,
            crossStreets: signal.crossStreets,
            channel: entry.channel,
            serves: describeChannel(entry),
            phases: entry.phases.join(", "),
            type: entry.type,
            maxTime: entry.maxTime,
          });
        }
      }
      return rows;
    },
    /** Signals in the data that the export has nothing for. */
    unmatchedSignals() {
      if (!this.gtss) return [];
      return this.signals.filter((name) => !this.gtssById[name]);
    },
    /**
     * The signal the charts are drawing. Validated rather than trusted: a
     * re-evaluation can drop the signal that was selected, and a picker
     * pointing at nothing would draw an empty chart with no way back.
     */
    activeChartSignal() {
      return this.signals.includes(this.chartSignal) ? this.chartSignal : ALL_SIGNALS;
    },
    chartSignalOptions() {
      return [
        { title: "All signals", value: ALL_SIGNALS },
        ...this.signals.map((signal) => ({
          title: this.signalTitle(signal),
          value: signal,
        })),
      ];
    },
    /**
     * What the charts draw: the channel chips first, then the signal picker.
     *
     * Deliberately not what the tables show. The picker narrows the picture,
     * not the finding -- the summary, the event table and the exports stay on
     * the whole filtered set, so isolating one intersection on the chart
     * cannot quietly shrink the numbers being reported.
     */
    chartEvents() {
      const signal = this.activeChartSignal;
      if (signal === ALL_SIGNALS) return this.filteredEvents;
      return this.filteredEvents.filter((event) => event.signal === signal);
    },
    /**
     * Whether a chart row has to name its signal to stay unambiguous. Two
     * intersections both have a Preempt 1, and without this their events
     * share a row and read as one channel.
     */
    chartShowsSignal() {
      return this.multiSignal && this.activeChartSignal === ALL_SIGNALS;
    },
    /** One grid per signal and channel, for whatever the picker has selected. */
    heatmaps() {
      return buildHourWeekdayGrids(this.chartEvents);
    },
    /**
     * The signals laid out along the corridor they form, from the export's
     * coordinates. Null whenever there is no corridor to draw: fewer than two
     * placed signals, or every signal at one spot.
     */
    corridor() {
      if (!this.gtss) return null;
      const present = new Set(this.signals);
      return projectSignals(this.gtss.signals.filter((signal) => present.has(signal.id)));
    },
    /** Whether the time-space view has anything to show. */
    hasCorridor() {
      return Boolean(this.corridor);
    },
    timeSpacePoints() {
      return buildTimeSpacePoints(this.chartEvents, this.corridor);
    },
    /**
     * Runs of calls that look like one vehicle working along the corridor.
     * Drawn as a joining line, because the diagonal is the finding and a
     * scatter of dots leaves the reader to trace it by eye.
     */
    progressions() {
      if (!this.showProgressions) return [];
      return findProgressions(this.timeSpacePoints, { minSignals: this.minProgressionSignals });
    },
    /**
     * The window the time-space chart opens on.
     *
     * Not the full extent, which is the obvious choice and the wrong one: a
     * trip down the corridor takes two minutes, and three weeks of data drawn
     * across one chart width packs every signal's calls into a solid band. A
     * time-space diagram is read over minutes. So it opens on the first run
     * it found -- the thing worth looking at -- and the runs table below
     * moves it to any of the others.
     */
    timeSpaceExtent() {
      if (this.timeSpaceFocus) return this.timeSpaceFocus;
      const points = this.timeSpacePoints;
      if (!points.length) return { min: undefined, max: undefined };
      const run = this.progressions[0];
      if (run) return this.windowAround(run.startMs, run.endMs);
      // Nothing found: two hours from the start is still readable, where
      // three weeks is not.
      return { min: points[0].startMs - 60000, max: points[0].startMs + 2 * 3600000 };
    },
    timeSpaceChartData() {
      const bySeries = new Map();
      for (const point of this.timeSpacePoints) {
        const key = this.channelLabel(point.signal, point.channel);
        if (!bySeries.has(key)) bySeries.set(key, []);
        bySeries.get(key).push({ x: point.startMs, y: point.offsetFt, point });
      }
      const datasets = [...bySeries.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([label, data], index) => {
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          return {
            label,
            data,
            backgroundColor: color,
            borderColor: color,
            pointRadius: 4,
            pointHoverRadius: 7,
            showLine: false,
            order: 1,
          };
        });

      // Drawn under the dots, in one colour: the runs are one kind of thing,
      // and colouring them individually would compete with the channel
      // colours that carry the direction.
      this.progressions.forEach((run, index) => {
        datasets.push({
          label: index === 0 ? "Vehicle through the corridor" : `__run_${index}`,
          data: run.points.map((point) => ({ x: point.startMs, y: point.offsetFt, point, run })),
          borderColor: PROGRESSION_COLOR,
          backgroundColor: PROGRESSION_COLOR,
          borderWidth: 2,
          pointRadius: 0,
          showLine: true,
          fill: false,
          order: 2,
        });
      });

      return { datasets };
    },
    /** Date against time of day, one point per event.
     *
     * A vehicle carrying an unauthorised emitter calls the signal on its own
     * commute, so its points sit at nearly the same minute of the day, on
     * weekdays, across many dates -- a near-horizontal row. Real emergency
     * calls have no such structure.
     */
    scatterChartData() {
      const points = buildScatterPoints(this.chartEvents);
      const bySeries = new Map();
      for (const point of points) {
        const key = seriesKey(point.signal, point.channel);
        if (!bySeries.has(key)) bySeries.set(key, []);
        bySeries.get(key).push({ x: point.dateMs, y: point.minuteOfDay, point });
      }
      const datasets = [...bySeries.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([, data], index) => {
          // seriesKey is a pure util with no view of the export, so the
          // direction is attached here rather than baked into the key.
          const first = data[0].point;
          const channel = this.channelLabel(first.signal, first.channel);
          const label = first.signal ? `${first.signal} · ${channel}` : channel;
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          return {
            label,
            data,
            backgroundColor: color,
            borderColor: color,
            // Weekends hollowed out: the pattern being hunted is a weekday one.
            pointStyle: data.map((d) => (d.point.isWeekend ? "crossRot" : "circle")),
            pointRadius: 4,
            pointHoverRadius: 7,
          };
        });
      return { datasets };
    },
    /**
     * Always the full set, so a filter can never hide the chip that undoes it.
     * Deduplicated: the summary now has a row per signal and channel, so the
     * same channel number appears once for each signal that has one.
     */
    allChannels() {
      return [...new Set(this.summary.channels.map((channel) => channel.channel))].sort(
        (a, b) => a - b,
      );
    },
    /**
     * What the tables and tiles report. Recomputed from the filtered events so
     * a channel filter applies to the whole page, not just the chart.
     */
    viewSummary() {
      if (!this.visibleChannels.length) return this.summary;
      return summarizePreemption(this.filteredEvents);
    },
    filteredEvents() {
      if (!this.visibleChannels.length) return this.events;
      const wanted = new Set(this.visibleChannels);
      return this.events.filter((event) => wanted.has(event.channel));
    },
    shownEvents() {
      return this.filteredEvents.slice(0, MAX_TABLE_ROWS);
    },
    unservedCount() {
      return this.viewSummary.totals.statuses
        ? this.viewSummary.totals.statuses.callOnly
        : 0;
    },
    scanNote() {
      if (!this.stats) return "";
      const { scanned, kept, keptPercent, malformed } = this.stats;
      const parts = [
        `Read ${this.num(scanned)} rows and kept ${this.num(kept)} preemption rows (${keptPercent.toFixed(2)}%).`,
      ];
      if (malformed) parts.push(`${this.num(malformed)} rows could not be read.`);
      return parts.join(" ");
    },
    metrics() {
      const totals = this.viewSummary.totals;
      return [
        { label: "Events", value: this.num(totals.events || 0) },
        { label: "Channels", value: this.num(totals.channels || 0) },
        { label: "Median duration", value: this.secs(totals.medianMs) },
        { label: "Longest", value: this.secs(totals.maxMs) },
      ];
    },
    /** One row per channel, so the chart grows with the data rather than squashing. */
    chartChannels() {
      const channels = new Set(this.chartEvents.map((event) => event.channel));
      return [...channels].sort((a, b) => a - b);
    },
    /**
     * The timeline's rows. Built through rowLabel so the axis and the bars
     * cannot disagree about what a row is called, and sorted by signal then
     * channel number rather than by the label text -- "Preempt 10/NB" sorts
     * before "Preempt 2/NB" alphabetically, which is not an order anyone
     * reads a channel list in.
     */
    chartRows() {
      const seen = new Map();
      for (const event of this.chartEvents) {
        const label = this.rowLabel(event);
        if (!seen.has(label)) seen.set(label, [event.signal || "", event.channel]);
      }
      return [...seen.entries()]
        .sort((a, b) => {
          if (a[1][0] !== b[1][0]) return a[1][0] < b[1][0] ? -1 : 1;
          return a[1][1] - b[1][1];
        })
        .map(([label]) => label);
    },
    /** Longest first, capped, so the durations view stays readable. */
    durationEvents() {
      return this.chartEvents
        .slice()
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, MAX_CHART_ROWS);
    },
    chartHeight() {
      if (this.chartMode === "scatter") return 480;
      if (this.chartMode === "timespace") return 520;
      if (this.chartMode === "durations") {
        return Math.max(240, this.durationEvents.length * 30 + 120);
      }
      return Math.max(240, this.chartChannels.length * 64 + 110);
    },
    /**
     * Which Chart.js type draws this mode. Both point modes were addressed by
     * name here, so adding one silently routed it to the bar chart, where
     * every event drew as a full-width bar at its station's height.
     */
    pointChart() {
      return this.chartMode === "scatter" || this.chartMode === "timespace";
    },
    chartData() {
      if (this.chartMode === "timespace") return this.timeSpaceChartData;
      if (this.chartMode === "scatter") return this.scatterChartData;
      return this.chartMode === "durations"
        ? this.durationChartData
        : this.timelineChartData;
    },
    /** Absolute time on the x axis: when each event happened, and any overlap. */
    timelineChartData() {
      const labels = this.chartRows;
      const buckets = new Map();
      for (const event of this.chartEvents) {
        const label = this.rowLabel(event);
        for (const segment of this.segmentsFor(event)) {
          if (!buckets.has(segment.key)) buckets.set(segment.key, []);
          buckets.get(segment.key).push({
            x: [segment.from, segment.to],
            y: label,
            event,
            segment: segment.label,
          });
        }
      }
      return { labels, datasets: this.datasetsFrom(buckets) };
    },
    /**
     * Elapsed seconds on the x axis, every event starting at zero. A three
     * minute event is a sliver against a whole day, so this view is what makes
     * the durations, and the split between intervals, actually comparable.
     */
    durationChartData() {
      const events = this.durationEvents;
      // A category axis resolves a point's y by looking the value up in labels,
      // so the row has to be addressed by its label and every label has to be
      // distinct -- a repeat would silently stack two events on one row.
      const seen = new Map();
      const labels = events.map((event) => {
        // The date, not just the clock: this view sorts by length, so the
        // rows above and below are usually from other days. Without it, two
        // 07:14 events a week apart are indistinguishable, and the question
        // this chart gets asked is whether a duration repeats day to day.
        const base = `${this.rowLabel(event)} · ${this.stampLabel(event.startMs)}`;
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        return count === 1 ? base : `${base} (${count})`;
      });
      const buckets = new Map();
      events.forEach((event, index) => {
        for (const segment of this.segmentsFor(event)) {
          if (!buckets.has(segment.key)) buckets.set(segment.key, []);
          buckets.get(segment.key).push({
            x: [(segment.from - event.startMs) / 1000, (segment.to - event.startMs) / 1000],
            y: labels[index],
            event,
            segment: segment.label,
          });
        }
      });
      return { labels, datasets: this.datasetsFrom(buckets) };
    },
    /**
     * The visible time window. Without an explicit min/max a bar chart anchors
     * its value axis at zero, which here is 1970 -- a three minute event then
     * renders under a thousandth of a pixel wide.
     */
    chartExtent() {
      if (this.chartMode === "durations") {
        const longest = this.durationEvents.reduce(
          (max, event) => Math.max(max, event.durationMs / 1000),
          0,
        );
        return { min: 0, max: Math.max(longest * 1.02, 10) };
      }
      let min = Infinity;
      let max = -Infinity;
      for (const event of this.chartEvents) {
        if (event.startMs < min) min = event.startMs;
        if (event.endMs > max) max = event.endMs;
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: undefined, max: undefined };
      // Keep a floor on the span so a single short event is not drawn edge to edge.
      const pad = Math.max((max - min) * 0.02, 30000);
      return { min: min - pad, max: max + pad };
    },
    /**
     * Time across, distance along the corridor up. The classic time-space
     * diagram, with preemption calls in place of vehicle trajectories.
     */
    timeSpaceOptions() {
      const corridor = this.corridor;
      const stations = corridor ? corridor.stations : [];
      const full = this.fullTime;
      const label = this.channelLabel;
      const secs = this.secs;
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        scales: {
          x: {
            type: "linear",
            min: this.timeSpaceExtent.min,
            max: this.timeSpaceExtent.max,
            ticks: {
              callback: (value) => this.stampLabel(value),
              maxRotation: 0,
              autoSkipPadding: 24,
            },
            title: { display: true, text: "Time" },
          },
          y: {
            type: "linear",
            min: -corridorPad(corridor),
            max: (corridor ? corridor.spanFt : 0) + corridorPad(corridor),
            // Ticks at the signals themselves rather than round numbers of
            // feet: the question is which intersection, not how far along.
            afterBuildTicks: (axis) => {
              axis.ticks = stations.map((station) => ({ value: station.offsetFt }));
            },
            ticks: {
              autoSkip: false,
              callback: (value) => {
                const station = stations.find((s) => Math.abs(s.offsetFt - value) < 1);
                return station ? station.label : "";
              },
            },
            title: { display: true, text: "Signal, by position along the corridor" },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            // The runs share one colour and one entry; the rest would be a
            // wall of identical swatches.
            labels: { filter: (item) => !item.text.startsWith("__run_") },
          },
          tooltip: {
            callbacks: {
              title: (items) => items[0].raw.point.station,
              label: (item) => {
                const p = item.raw.point;
                return `${label(p.signal, p.channel)} — ${full(p.startMs)}`;
              },
              afterBody: (items) => {
                const raw = items[0].raw;
                const lines = [`Duration: ${secs(raw.point.durationMs)}`];
                if (raw.run) {
                  lines.push(
                    `Part of a run through ${raw.run.signals} signals`,
                    `${formatDistance(raw.run.distanceFt)} at about ${Math.round(raw.run.speedMph)} mph`,
                  );
                }
                return lines;
              },
            },
          },
          zoom: {
            pan: { enabled: true, mode: "xy" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
          },
        },
      };
    },
    /** Date across, minute of day up, both in local time. */
    scatterOptions() {
      const clock = this.clockTime;
      const label = this.channelLabel;
      const secs = this.secs;
      const minuteLabel = (minute) => {
        const h = Math.floor(minute / 60);
        const m = Math.round(minute % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            ticks: {
              callback: (value) => new Date(value).toLocaleDateString(),
              maxRotation: 0,
              autoSkipPadding: 24,
            },
            title: { display: true, text: "Date" },
          },
          y: {
            type: "linear",
            min: 0,
            max: MINUTES_PER_DAY,
            // Midnight at the bottom, so the day reads upward like a clock face.
            ticks: { stepSize: 120, callback: (value) => minuteLabel(value) },
            title: { display: true, text: "Time of day" },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => items[0].raw.point.signal || "Signal",
              label: (item) => {
                const p = item.raw.point;
                return `${label(p.signal, p.channel)} — ${new Date(p.startMs).toLocaleString()}`;
              },
              afterBody: (items) => {
                const p = items[0].raw.point;
                return [
                  `Time of day: ${minuteLabel(p.minuteOfDay)}`,
                  `Duration: ${secs(p.durationMs)}`,
                  p.isWeekend ? "Weekend" : "Weekday",
                ];
              },
            },
          },
          zoom: {
            pan: { enabled: true, mode: "xy" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
          },
        },
      };
    },
    chartOptions() {
      if (this.chartMode === "timespace") return this.timeSpaceOptions;
      if (this.chartMode === "scatter") return this.scatterOptions;
      const clock = this.clockTime;
      const full = this.fullTime;
      const rowLabel = this.rowLabel;
      const secs = this.secs;
      const extent = this.chartExtent;
      const durations = this.chartMode === "durations";
      // Durations plots elapsed seconds; timeline plots absolute epoch ms.
      const axisValue = (value) => (durations ? secs(value * 1000) : clock(value));
      const spanOf = (raw) => (durations ? (raw.x[1] - raw.x[0]) * 1000 : raw.x[1] - raw.x[0]);
      return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            min: extent.min,
            max: extent.max,
            beginAtZero: false,
            ticks: {
              callback: (value) => axisValue(value),
              maxRotation: 0,
              autoSkipPadding: 20,
            },
            title: {
              display: true,
              text: durations ? "Elapsed from start of event" : "Time of day",
            },
          },
          y: {
            type: "category",
            title: {
              display: true,
              text: durations
                ? "Event"
                : this.chartShowsSignal
                  ? "Signal and preempt channel"
                  : "Preempt channel",
            },
            ticks: { autoSkip: false },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              title: (items) => {
                const event = items[0].raw.event;
                // The full stamp here, so the axis label can stay short.
                return `${rowLabel(event)} — ${full(event.startMs)}`;
              },
              label: (item) => `${item.raw.segment}: ${secs(spanOf(item.raw))}`,
              afterBody: (items) => {
                const event = items[0].raw.event;
                return [
                  `Event duration: ${secs(event.durationMs)}`,
                  `Status: ${STATUS_LABELS[event.status]}`,
                  `Codes: ${event.codes.map((c) => c.code).join(" ")}`,
                ];
              },
            },
          },
          zoom: {
            pan: { enabled: !durations, mode: "x" },
            zoom: {
              wheel: { enabled: !durations },
              pinch: { enabled: !durations },
              drag: { enabled: false },
              mode: "x",
            },
          },
        },
      };
    },
  },
  methods: {
    /**
     * The intervals inside one event, as absolute times. Each runs from its own
     * mark to the first mark that follows it, so a sequence that is missing a
     * code still draws as one continuous bar rather than springing a gap.
     */
    segmentsFor(event) {
      if (event.status === "callOnly") {
        return [
          {
            key: "unserved",
            label: "Call never served",
            color: UNSERVED_COLOR,
            from: event.startMs,
            // A call and its drop in the same second still needs a visible bar.
            to: Math.max(event.endMs, event.startMs + 1000),
          },
        ];
      }
      const out = [];
      for (const segment of SEGMENTS) {
        const from = segment.from === null ? event.startMs : event.marks[segment.from];
        if (from === undefined) continue;
        let to;
        for (const candidate of segment.next) {
          if (event.marks[candidate] !== undefined) {
            to = event.marks[candidate];
            break;
          }
        }
        if (to === undefined) to = event.endMs;
        if (!(to > from)) continue;
        out.push({ key: segment.key, label: segment.label, color: segment.color, from, to });
      }
      return out;
    },
    /** One dataset per interval type, in sequence order, drawn on one row. */
    datasetsFrom(buckets) {
      const order = [...SEGMENTS, { key: "unserved", label: "Call never served", color: UNSERVED_COLOR }];
      return order
        .filter((segment) => buckets.has(segment.key))
        .map((segment) => ({
          label: segment.label,
          data: buckets.get(segment.key),
          backgroundColor: segment.color,
          borderWidth: 0,
          // Overlap the datasets on one category row instead of stacking them
          // side by side, which is what makes this read as a Gantt chart.
          grouped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.9,
        }));
    },
    /** A signal as the pickers name it: its number, plus cross streets if known. */
    signalTitle(signal) {
      if (!signal) return "Unnamed signal";
      const known = this.gtssById[signal];
      return known && known.crossStreets
        ? `${signal} — ${known.crossStreets}`
        : `Signal ${signal}`;
    },
    /**
     * A chart row's name. The signal is included only when the chart is
     * showing more than one, because on a single-signal chart it is noise on
     * every row.
     */
    rowLabel(event) {
      const channel = this.channelLabel(event.signal, event.channel);
      return this.chartShowsSignal ? `${event.signal || "—"} · ${channel}` : channel;
    },
    /** Date and clock, for an axis label that has to stay narrow. */
    stampLabel(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("LL/dd HH:mm:ss");
    },
    distance(feet) {
      return formatDistance(feet);
    },
    /** A viewing window around a run, with room either side to see it arrive. */
    windowAround(startMs, endMs) {
      const pad = Math.max((endMs - startMs) * 0.6, 120000);
      return { min: startMs - pad, max: endMs + pad };
    },
    /** Move the chart to a run picked from the table below it. */
    focusRun(run) {
      this.timeSpaceFocus = this.windowAround(run.startMs, run.endMs);
      this.resetZoom();
    },
    showEverything() {
      const points = this.timeSpacePoints;
      if (!points.length) return;
      this.timeSpaceFocus = {
        min: points[0].startMs - 60000,
        max: points[points.length - 1].startMs + 60000,
      };
      this.resetZoom();
    },
    dateOnly(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("yyyy-LL-dd");
    },
    /**
     * What a GTSS export says a channel serves, split into the two columns
     * the table and the export both want. Empty strings when nothing is
     * loaded, so every caller can print it unconditionally.
     */
    channelInfo(signalName, channel) {
      const signal = this.gtssById[signalName];
      const entry = signal && signal.channels.find((c) => c.channel === channel);
      if (!entry) return { direction: "", phases: "", travel: "" };
      return {
        direction: describeChannel(entry),
        phases: entry.phases.join(", "),
        travel: entry.travel || "",
      };
    },
    /**
     * "Preempt 3/WB". The channel number says which input fired; the travel
     * direction says what it does, and on a chart axis or a legend there is
     * only room for the short form of both.
     */
    channelLabel(signalName, channel) {
      const travel = this.channelInfo(signalName, channel).travel;
      return travel ? `Preempt ${channel}/${travel}` : `Preempt ${channel}`;
    },
    /**
     * The same label for a filter chip, which spans every signal. Two signals
     * can point their channel 3 in different directions, and claiming one of
     * them on a control that filters both would be worse than staying quiet.
     */
    chipLabel(channel) {
      const travels = new Set(
        this.signals.map((signal) => this.channelInfo(signal, channel).travel).filter(Boolean),
      );
      return travels.size === 1 ? `Preempt ${channel}/${[...travels][0]}` : `Preempt ${channel}`;
    },
    /** Says when a typed signal number is not one the export knows. */
    isFocused(run) {
      if (!this.timeSpaceFocus) return false;
      return run.startMs >= this.timeSpaceFocus.min && run.endMs <= this.timeSpaceFocus.max;
    },
    signalNote(signalId) {
      const id = String(signalId ?? "").trim();
      if (!id || !this.gtss) return "";
      return this.gtssById[id] ? "" : "not in the export — channels stay numbers";
    },
    num(value) {
      return Number(value || 0).toLocaleString();
    },
    secs(ms) {
      const value = toSeconds(ms);
      if (value === null) return "—";
      if (value < 60) return `${value}s`;
      const minutes = Math.floor(value / 60);
      const remainder = Math.round(value - minutes * 60);
      return `${minutes}m ${remainder}s`;
    },
    clockTime(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("HH:mm:ss");
    },
    fullTime(ms) {
      if (!Number.isFinite(ms)) return "";
      return DateTime.fromMillis(ms).toFormat("yyyy-LL-dd HH:mm:ss.S");
    },
    evaluate() {
      this.error = "";
      this.processing = true;
      // Let the button paint its spinner before the parse takes the thread.
      setTimeout(() => {
        try {
          const result = evaluateSources(
            this.sources.map((source, index) => ({
              // The label becomes the event's signal, and the signal is the
              // GTSS key, so no separate linking step is needed.
              label: String(source.signalId ?? "").trim() || String(index + 1),
              text: source.text,
            })),
            { maxEventSeconds: this.maxEventSeconds || DEFAULT_MAX_EVENT_SECONDS },
          );
          if (!result.events.length) {
            this.error =
              "No preemption events found. Expecting CSV lines of timestamp, enumeration, channel.";
          }
          this.events = result.events;
          this.summary = result.summary;
          this.stats = result.stats;
          this.signals = result.signals;
          this.visibleChannels = [];
          this.chartSignal = ALL_SIGNALS;
          this.timeSpaceFocus = null;
          this.ranOnce = true;
        } catch (err) {
          this.error = `Could not process this data: ${err.message}`;
          this.events = [];
          this.summary = { channels: [], totals: {} };
          this.signals = [];
        } finally {
          this.processing = false;
        }
      }, 0);
    },
    /**
     * Cell shading. Scaled against the busiest cell in that channel's own grid,
     * so a quiet channel is still readable next to a busy one -- the shape of
     * the week is the point here, not the absolute count.
     */
    cellStyle(count, max) {
      if (!count) return { background: "rgba(var(--v-theme-on-surface), 0.04)" };
      const intensity = 0.18 + 0.82 * (count / (max || 1));
      return { background: `rgba(0, 105, 92, ${intensity.toFixed(3)})`, color: intensity > 0.55 ? "#fff" : "inherit" };
    },
    hourLabel(hour) {
      return String(hour).padStart(2, "0");
    },
    cellTitle(weekday, hour, count) {
      const plural = count === 1 ? "event" : "events";
      return `${weekday} ${this.hourLabel(hour)}:00 — ${count} ${plural}`;
    },
    /**
     * What a channel serves, from the GTSS export. Empty when nothing is
     * loaded or the signal is not linked, so every caller can print it
     * unconditionally.
     */
    servesLabel(signalName, channel) {
      return this.channelInfo(signalName, channel).direction;
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
            // preempt.txt often ships alongside the archive rather than inside it.
            collected[file.name.split("/").pop()] = await file.text();
          }
        }
        const directory = buildPreemptDirectory(collected);
        if (!directory.signals.length) {
          this.gtssError =
            "No preempt channels found. The export needs preempt.txt, plus phases.txt and approaches.txt for directions.";
          this.gtss = null;
        } else {
          this.gtss = directory;
          this.gtssWarnings = directory.warnings;
          this.gtssName = files.map((f) => f.name).join(", ");
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
      this.gtssWarnings = [];
      this.gtssError = "";
    },
    addSource() {
      this.sources.push({ id: this.nextSourceId, signalId: "", text: "" });
      this.nextSourceId += 1;
    },
    removeSource(index) {
      this.sources.splice(index, 1);
    },
    resetZoom() {
      const chart = this.$refs.gantt && this.$refs.gantt.chart;
      if (chart) chart.resetZoom();
    },
    downloadCsv() {
      const csv = eventsToCsv(this.filteredEvents, (ms) => this.fullTime(ms), {
        date: (ms) => this.dateOnly(ms),
        channel: (event) => this.channelInfo(event.signal, event.channel),
      });
      this.download(new Blob([csv], { type: "text/csv" }), "preemption-events.csv");
    },
    /**
     * The same events as a real workbook rather than a .csv renamed.
     *
     * It matters for exactly one reason: a timestamp arrives as a timestamp.
     * Handed a csv, Excel guesses at the format, and a column of preemption
     * start times is where guessing wrong about day and month does damage.
     * Here the dates are date-typed, so sorting, filtering by day and
     * pivoting on the date column all work without touching the data.
     */
    exportExcel() {
      const columns = [
        "Signal",
        "Channel",
        "Date",
        "Start",
        "End",
        "Duration (s)",
        "Status",
        ...(this.hasDirections ? ["Direction", "Phases"] : []),
        "Call to entry (s)",
        "Track clearance (s)",
        "Dwell (s)",
        "Codes",
      ];
      const rows = this.filteredEvents.map((event) => {
        const info = this.channelInfo(event.signal, event.channel);
        return [
          event.signal || "",
          event.channel,
          { day: event.startMs },
          { date: event.startMs },
          { date: event.endMs },
          toSeconds(event.durationMs),
          STATUS_LABELS[event.status],
          ...(this.hasDirections ? [info.direction, info.phases] : []),
          toSeconds(event.segments.callToEntry),
          toSeconds(event.segments.trackClearance),
          toSeconds(event.segments.dwell),
          event.codes.map((c) => c.code).join(" "),
        ];
      });
      this.download(
        xlsxBlob({ sheetName: "Preemption events", columns, rows }),
        "preemption-events.xlsx",
      );
    },
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
/*
 * The export and each signal get their own bordered card. Before this they
 * were an unboxed run of fields, and the export -- loaded once for the whole
 * page -- sat below them reading as though it belonged to the last one.
 */
.setup-card {
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
}
.gtss-card {
  background: rgba(var(--v-theme-primary), 0.04);
}
.setup-card__head {
  margin-bottom: 12px;
}
.setup-card__title {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.setup-card__optional {
  margin-left: 8px;
  font-size: 0.72rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
}
.setup-card__hint {
  margin: 4px 0 0;
  font-size: 0.82rem;
  opacity: 0.75;
  text-align: left;
}
.gtss-tick {
  color: rgb(var(--v-theme-primary));
}
.signal-note {
  font-size: 0.78rem;
  opacity: 0.7;
}
.run-toggle {
  flex: 0 0 auto;
}
.run-title {
  text-align: left;
  font-size: 1rem;
  margin: 16px 0 8px;
}
.run-row {
  cursor: pointer;
}
.run-row:hover td {
  background: rgba(var(--v-theme-primary), 0.06);
}
.run-row--active td {
  background: rgba(var(--v-theme-primary), 0.12);
  font-weight: 600;
}
.source-block {
  margin-bottom: 20px;
}
.source-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.source-name {
  max-width: 320px;
}
.source-name--narrow {
  max-width: 160px;
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.gap-field {
  max-width: 220px;
}
.section-title {
  text-align: left;
  font-size: 1.15rem;
  font-weight: 600;
  margin: 28px 0 8px;
}
.muted {
  font-weight: 400;
  font-size: 0.85rem;
  opacity: 0.7;
}
.metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.metric-tile {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 12px;
}
.metric-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
.metric-label {
  font-size: 0.8rem;
  opacity: 0.75;
}
.chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.chart-hint {
  text-align: left;
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 8px;
}
.chart-wrapper {
  position: relative;
  width: 100%;
}
.gtss-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 8px 0 12px;
}
.gtss-file {
  display: none;
}
.gtss-name,
.gtss-hint {
  font-size: 0.82rem;
  opacity: 0.75;
}
.heatmap-serves {
  font-weight: 400;
  font-size: 0.85rem;
  opacity: 0.75;
}
.heatmaps {
  margin-top: 8px;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.chart-signal {
  max-width: 260px;
  flex: 0 0 auto;
}
.heatmap-signal-name {
  font-weight: 400;
  opacity: 0.75;
}
.heatmap {
  margin-bottom: 24px;
  overflow-x: auto;
}
.heatmap-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.heatmap-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.heatmap-facts {
  font-size: 0.8rem;
  opacity: 0.75;
}
.heatmap-grid {
  display: grid;
  /* A day label, then one column per hour. */
  grid-template-columns: 38px repeat(24, minmax(22px, 1fr));
  gap: 2px;
  min-width: 600px;
}
.heatmap-corner {
  /* empty cell above the day labels */
}
.heatmap-hour {
  font-size: 0.65rem;
  text-align: center;
  opacity: 0.6;
  padding-bottom: 2px;
}
.heatmap-day {
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  opacity: 0.85;
}
.heatmap-day--weekend {
  opacity: 0.5;
}
.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  line-height: 1;
}
.table-wrapper {
  overflow-x: auto;
}
.code-table {
  max-width: 420px;
}
.nowrap {
  white-space: nowrap;
}
/*
 * "Main Street from the ESE (WB)" is five words in a column sized to its
 * four-letter heading, which wrapped it onto five lines and made every row
 * in the table five lines tall. Wide enough for two.
 */
.direction {
  min-width: 190px;
}
.codes {
  font-family: monospace;
  font-size: 0.8rem;
  white-space: nowrap;
}
.row-unserved td {
  background: rgba(198, 40, 40, 0.08);
}
</style>
