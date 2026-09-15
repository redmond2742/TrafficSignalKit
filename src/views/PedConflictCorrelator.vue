<template>
  <div class="ped-conflict-tool">
    &nbsp;
    <h1 class="h1-center-text">Pedestrian Conflict Correlator</h1>
    <p class="intro-text">
      Pair any detector channel with any pedestrian phase and see when the two
      are active at the same time. Detector ON/OFF edges are lined up against
      WALK and pedestrian clearance intervals so turning-vehicle exposure
      &mdash; permissive lefts, right turns on red, late crossings &mdash;
      shows up as a pattern instead of a pile of log rows. High-resolution
      files are parsed and analyzed entirely in your browser; nothing is
      uploaded.
    </p>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panels" multiple>
        <v-expansion-panel title="About: what this tool correlates" value="about">
          <v-expansion-panel-text>
            A <b>correlation rule</b> is one detector channel paired with one
            pedestrian phase. For every pedestrian service the tool builds a
            window from the interval you pick (WALK, ped clearance, both, or the
            ped call wait), pads it by the lead/lag seconds you set, and checks
            whether the detector trigger you chose lands inside it. Overlaps are
            counted, timed, and plotted relative to the start of WALK.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Inputs needed" value="inputs">
          <v-expansion-panel-text>
            Paste or upload high-resolution controller data as
            <b>timestamp, event code, event parameter</b>. Example:
            <code>1/6/2024 15:00:03.3, 82, 5</code>. A leading signal ID column
            and a header row are both tolerated, and commas, semicolons, or tabs
            all work. Timestamps may be
            <code>M/D/YYYY HH:MM:SS.s</code>, <code>YYYY-MM-DD HH:MM:SS.sss</code>,
            ISO 8601, or epoch seconds/milliseconds. Multiple files selected in
            file mode are concatenated.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Red-light runs into a crosswalk" value="rlr">
          <v-expansion-panel-text>
            Set a rule's trigger to <b>Red-light run</b> to chain three events
            together: the stop bar detector drops out while the vehicle phase
            you name is showing yellow or red, a downstream detector then turns
            on and back off within the travel time you allow, and that traversal
            overlaps the pedestrian interval you selected. The downstream
            confirmation is what separates a vehicle that actually entered the
            intersection from one shuffling forward in queue, and each
            downstream call is matched to only one departure. Yellow runs
            <code>8 → 9</code>; red runs from the end of yellow (or the start of
            red clearance) until that phase's next begin green, so a legal right
            turn on red will also appear &mdash; use the <i>seconds into state</i>
            column and the movement label to tell them apart.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Enumerations used" value="enums">
          <v-expansion-panel-text>
            Pedestrian intervals come from
            <b>21</b> (begin walk), <b>22</b> (begin ped clearance / FDW),
            <b>23</b> (begin solid don't walk), <b>24</b> (ped dark), and
            <b>45</b> (ped call registered). Detector activity comes from
            <b>82/81</b> (vehicle detector on/off), <b>90/89</b> (ped detector
            on/off), or <b>94/93</b> (TSP detector on/off), depending on the
            detector type set on each rule. Red-light-run rules additionally
            read vehicle phase state from <b>1</b> (begin green), <b>7</b>
            (green termination), <b>8</b> (begin yellow), <b>9</b> (end yellow),
            and <b>10</b> (begin red clearance).
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Estimating speed through the intersection" value="speed">
          <v-expansion-panel-text>
            Give a red-light-run rule a <b>detector setback</b> and it also
            estimates how fast each vehicle crossed. Measure the setback as the
            distance the vehicle travels between the two detection points
            &mdash; from the downstream edge of the stop bar loop to the leading
            edge of the downstream loop.
            <br /><br />
            The vehicle length is subtracted because the two events watch
            different ends of the car: the stop bar detector drops out when the
            <b>rear</b> bumper clears it, and the downstream detector picks up
            when the <b>front</b> bumper arrives. The front bumper is therefore
            already a vehicle length down the road at the first event, so it
            only covers <b>setback &minus; vehicle length</b>. With the 20 ft
            default, a 100 ft setback means 80 ft of travel; cover it in 2.0
            seconds and the estimate is 40 ft/s, or 27.3 mph.
            <br /><br />
            This is an average over that distance, not a spot speed, and it
            inherits the controller's 0.1 second resolution &mdash; over a short
            setback, one tenth of a second moves the answer several mph. A
            setback no longer than the vehicle produces no estimate rather than
            a negative distance. Leave the setback at 0 to skip the calculation
            entirely; everything else about the rule works the same.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="Exporting clips for video review" value="clips">
          <v-expansion-panel-text>
            Once conflicts are found, section 6 exports a timestamp CSV for the
            <router-link to="/video-frame-extractor">Video Frame Extractor</router-link>.
            It carries the seven columns that tool reads &mdash; timestamp,
            signal ID, signal name, phase, detector channel, light state, and
            seconds into that state &mdash; plus the rule, movement, ped phase,
            ped interval, offset from WALK start, and the estimated speed for
            your own review.
            Timestamps are ISO 8601 written as the controller's wall clock
            marked <code>Z</code>, because the extractor compares a row's UTC
            time of day against the sync clock you read off the video. Turn on
            clip start/end rows to bracket each incident by the padding you set,
            and the downstream arrival row to catch the vehicle mid-intersection;
            a red-light run therefore yields a lead-in frame, the stop bar
            drop-out, the downstream arrival, and a trailing frame. Rows whose
            light state reads yellow or red are flagged as running events by the
            extractor, which also numbers the event frame.
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="How to read the results" value="reading">
          <v-expansion-panel-text>
            The conflict timeline draws one row per pedestrian service, with
            time measured from the start of WALK. Green is WALK and amber is ped
            clearance; the blue end markers bracket the window actually
            being evaluated, including any lead/lag buffer you added. Detector
            occupancy is drawn in slate, and the part of it that falls inside
            the evaluated window is drawn in red. For red-light-run rules, a
            diamond marks the stop bar drop-out, a dashed line follows the
            vehicle to the downstream detector, and the purple bar is the
            downstream call &mdash; all of it turns crimson when the traversal
            overlaps the crossing. The offset histogram collapses
            every service into one picture: a spike near zero means the detector
            fires just as WALK starts. The exposure index compares the detector
            event rate inside ped windows against its rate across the whole
            file &mdash; above 1.0 means activity is concentrated during
            pedestrian service.
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-card class="mt-6" variant="outlined">
      <v-card-title>1. High-Resolution Data</v-card-title>
      <v-card-text>
        <InputBox v-model="rawData" :default-text="defaultText" />
        <div class="action-row">
          <v-btn color="primary" :disabled="!hasRawData || parsing" :loading="parsing" @click="loadData">
            Load &amp; Scan Data
          </v-btn>
          <v-btn variant="outlined" @click="loadSample">Load Sample Data</v-btn>
          <v-btn v-if="dataLoaded" variant="text" @click="resetAll">Clear</v-btn>
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="sampleLoaded" class="note-text">
          Sample data: pedestrian phase 4, a permissive left turn on channel 5, a
          phase 2 through movement on stop bar channel 2, and a downstream
          detector on channel 21 that confirms vehicles entering on yellow or
          red.
        </p>

        <v-row dense class="signal-identity">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="signalId"
              label="Signal ID (for exports)"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-text-field
              v-model="signalName"
              label="Signal name (for exports)"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
        </v-row>

        <div v-if="dataLoaded" class="scan-summary">
          <v-chip class="ma-1" color="primary" variant="tonal">
            {{ summary.eventCount.toLocaleString() }} events
          </v-chip>
          <v-chip class="ma-1" variant="tonal">{{ spanLabel }}</v-chip>
          <v-chip class="ma-1" variant="tonal">
            Vehicle channels: {{ listLabel(summary.channels.vehicle) }}
          </v-chip>
          <v-chip v-if="summary.channels.pedestrian.length" class="ma-1" variant="tonal">
            Ped detector channels: {{ listLabel(summary.channels.pedestrian) }}
          </v-chip>
          <v-chip v-if="summary.channels.tsp.length" class="ma-1" variant="tonal">
            TSP channels: {{ listLabel(summary.channels.tsp) }}
          </v-chip>
          <v-chip class="ma-1" color="secondary" variant="tonal">
            Ped phases: {{ listLabel(summary.pedPhases) }}
          </v-chip>
          <v-chip v-if="skippedRows" class="ma-1" color="warning" variant="tonal">
            {{ skippedRows }} rows skipped
          </v-chip>
        </div>
        <p v-if="dataLoaded && !summary.pedPhases.length" class="warning-text">
          No pedestrian events (21/22/23/24/45) were found. Pedestrian intervals
          cannot be built from this file.
        </p>
      </v-card-text>
    </v-card>

    <v-card class="mt-6" variant="outlined">
      <v-card-title>2. Correlation Rules</v-card-title>
      <v-card-text>
        <div class="preset-row">
          <span class="preset-label">Start from a preset:</span>
          <v-btn
            v-for="preset in presets"
            :key="preset.key"
            size="small"
            variant="outlined"
            class="ma-1"
            @click="addRule(preset.rule)"
          >
            {{ preset.label }}
          </v-btn>
        </div>

        <div v-for="(rule, index) in rules" :key="rule.id" class="rule-card">
          <div class="rule-card-header">
            <h3>{{ ruleLabel(rule) }}</h3>
            <div class="rule-card-actions">
              <v-switch
                v-model="rule.enabled"
                color="primary"
                density="compact"
                hide-details
                label="Enabled"
              />
              <v-btn variant="text" size="small" @click="duplicateRule(index)">Duplicate</v-btn>
              <v-btn
                v-if="rules.length > 1"
                color="error"
                variant="text"
                size="small"
                @click="removeRule(index)"
              >
                Remove
              </v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="rule.name"
                label="Rule name (optional)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="rule.movement"
                :items="movementOptions"
                label="Vehicle movement"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="rule.detectorType"
                :items="detectorTypeOptions"
                item-title="title"
                item-value="value"
                label="Detector type"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" md="3">
              <v-combobox
                v-model="rule.detectorChannel"
                :items="channelItems(rule.detectorType)"
                :label="channelLabel(rule)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-combobox
                v-model="rule.pedPhase"
                :items="summary.pedPhases"
                label="Pedestrian phase"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="rule.trigger"
                :items="triggerOptions"
                item-title="title"
                item-value="value"
                label="Correlate when"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="rule.pedWindow"
                :items="pedWindowOptions"
                item-title="title"
                item-value="value"
                label="Pedestrian interval"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>

          <v-row v-if="isRlr(rule)" dense class="rlr-row">
            <v-col cols="12" md="3">
              <v-combobox
                v-model="rule.downstreamChannel"
                :items="channelItems(rule.detectorType)"
                label="Downstream detector channel"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-combobox
                v-model="rule.vehiclePhase"
                :items="summary.vehiclePhases"
                label="Vehicle phase (signal state)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="rule.signalStates"
                :items="signalStateOptions"
                item-title="title"
                item-value="value"
                label="Departure happens during"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="rule.maxTravelSec"
                type="number"
                min="0.5"
                step="0.5"
                label="Max travel to downstream (s)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>

          <v-row v-if="isRlr(rule)" dense class="rlr-row">
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="rule.setbackFt"
                type="number"
                min="0"
                step="5"
                label="Detector setback (ft)"
                hint="0 skips the speed estimate"
                persistent-hint
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="rule.vehicleLengthFt"
                type="number"
                min="1"
                step="1"
                label="Assumed vehicle length (ft)"
                density="compact"
                variant="outlined"
                hide-details
                :disabled="!Number(rule.setbackFt)"
              />
            </v-col>
            <v-col cols="12" md="6">
              <p class="rule-summary">{{ speedSentence(rule) }}</p>
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="rule.leadSec"
                type="number"
                min="0"
                step="0.5"
                label="Lead buffer (s before)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="rule.lagSec"
                type="number"
                min="0"
                step="0.5"
                label="Lag buffer (s after)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col v-if="rule.trigger === 'overlap'" cols="12" md="3">
              <v-text-field
                v-model.number="rule.minOverlapSec"
                type="number"
                min="0"
                step="0.5"
                label="Min overlap (s)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <p class="rule-summary">{{ ruleSentence(rule) }}</p>
            </v-col>
          </v-row>
        </div>

        <div class="action-row">
          <v-btn variant="outlined" @click="addRule()">Add Rule</v-btn>
          <v-btn color="primary" :disabled="!canAnalyze || analyzing" :loading="analyzing" @click="analyze">
            Find Conflicts
          </v-btn>
          <v-text-field
            v-model.number="binSec"
            type="number"
            min="0.5"
            step="0.5"
            label="Histogram bin (s)"
            density="compact"
            variant="outlined"
            hide-details
            class="setting-field"
          />
          <v-text-field
            v-model.number="contextSec"
            type="number"
            min="0"
            step="5"
            label="Timeline context (s)"
            density="compact"
            variant="outlined"
            hide-details
            class="setting-field"
          />
        </div>
        <p v-if="!dataLoaded" class="note-text">Load data first to populate channel and phase choices.</p>
      </v-card-text>
    </v-card>

    <template v-if="results.length">
      <v-card class="mt-6" variant="outlined">
        <v-card-title>3. Correlation Summary</v-card-title>
        <v-card-text>
          <v-table density="compact" class="summary-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Movement</th>
                <th>Detector</th>
                <th>Ped phase</th>
                <th>Correlated when</th>
                <th>Ped interval</th>
                <th class="numeric">Ped services</th>
                <th class="numeric">Conflict events</th>
                <th class="numeric">Services w/ conflict</th>
                <th class="numeric">% of services</th>
                <th class="numeric">Per service</th>
                <th class="numeric">Occupied (s)</th>
                <th class="numeric">Exposure index</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="result in results"
                :key="result.ruleId"
                :class="{ 'row-selected': result.ruleId === selectedRuleId }"
                @click="selectedRuleId = result.ruleId"
              >
                <td>{{ result.label }}</td>
                <td>{{ result.rule.movement }}</td>
                <td>
                  Ch {{ result.rule.detectorChannel }}
                  <template v-if="result.isRedLightRun"> → Ch {{ result.rule.downstreamChannel }}</template>
                </td>
                <td>{{ result.rule.pedPhase }}</td>
                <td>{{ result.triggerLabel }}</td>
                <td>{{ result.pedWindowLabel }}</td>
                <td class="numeric">{{ result.totals.pedServices }}</td>
                <td class="numeric">{{ result.totals.conflictEvents }}</td>
                <td class="numeric">{{ result.totals.conflictServices }}</td>
                <td class="numeric">{{ fmt(result.totals.conflictRatePct, 1) }}</td>
                <td class="numeric">{{ fmt(result.totals.conflictsPerService) }}</td>
                <td class="numeric">{{ fmt(result.totals.overlapSec, 1) }}</td>
                <td class="numeric">{{ fmt(result.totals.exposureIndex) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p class="note-text">
            Exposure index = detector event rate inside the evaluated pedestrian
            windows divided by the same detector's rate across the whole file.
            Above 1.0 means the detector is busier while pedestrians are being
            served than it is on average.
          </p>
          <p v-if="skippedServiceNote" class="warning-text">{{ skippedServiceNote }}</p>
        </v-card-text>
      </v-card>

      <v-card v-if="selectedResult" class="mt-6" variant="outlined">
        <v-card-title>4. {{ selectedResult.label }}</v-card-title>
        <v-card-text>
          <v-select
            v-if="results.length > 1"
            v-model="selectedRuleId"
            :items="ruleItems"
            item-title="title"
            item-value="value"
            label="Rule shown below"
            density="compact"
            variant="outlined"
            hide-details
            class="rule-picker"
          />

          <div v-if="selectedResult.isRedLightRun" class="stat-row">
            <div class="stat-tile">
              <span class="stat-value">{{ selectedResult.totals.conflictEvents }}</span>
              <span class="stat-label">Runs through an active crossing</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ selectedResult.totals.redLightRuns }}</span>
              <span class="stat-label">Confirmed runs in the file</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.conflictRatePct, 1) }}%</span>
              <span class="stat-label">Ped services affected</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">
                {{ selectedResult.totals.conflictRunsYellow }} / {{ selectedResult.totals.conflictRunsRed }}
              </span>
              <span class="stat-label">Yellow / red entries</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.avgTravelSec) }}s</span>
              <span class="stat-label">Avg stop bar to downstream</span>
            </div>
            <div v-if="selectedResult.totals.speedSamples" class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.avgSpeedMph, 1) }} mph</span>
              <span class="stat-label">
                Avg speed over {{ fmt(selectedResult.totals.travelDistanceFt, 0) }} ft
                (peak {{ fmt(selectedResult.totals.maxSpeedMph, 1) }})
              </span>
            </div>
          </div>
          <div v-else class="stat-row">
            <div class="stat-tile">
              <span class="stat-value">{{ selectedResult.totals.conflictEvents }}</span>
              <span class="stat-label">Correlated events</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.conflictRatePct, 1) }}%</span>
              <span class="stat-label">Ped services affected</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.conflictsPerService) }}</span>
              <span class="stat-label">Events per ped service</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.overlapPerServiceSec, 1) }}s</span>
              <span class="stat-label">Detector occupancy per service</span>
            </div>
            <div class="stat-tile">
              <span class="stat-value">{{ fmt(selectedResult.totals.exposureIndex) }}</span>
              <span class="stat-label">Exposure index</span>
            </div>
          </div>

          <p v-if="selectedResult.speedWarning" class="warning-text">
            {{ selectedResult.speedWarning }}
          </p>

          <p class="rule-sentence-banner">{{ ruleSentence(selectedResult.rule) }}</p>

          <h3 class="section-title">Conflict Timeline</h3>
          <div class="timeline-controls">
            <v-switch
              v-model="conflictsOnly"
              color="primary"
              density="compact"
              hide-details
              label="Only show services with conflicts"
            />
            <span class="timeline-count">
              {{ timelineServices.length }} of {{ selectedResult.services.length }} ped services
            </span>
          </div>

          <div v-if="pagedServices.length" class="timeline-wrap">
            <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" class="timeline-svg" role="img"
                 aria-label="Pedestrian service timeline with detector occupancy">
              <rect :x="plotLeft" y="0" :width="plotWidth" :height="svgHeight" class="plot-bg" />

              <g v-for="tick in axisTicks" :key="`tick-${tick}`">
                <line :x1="xScale(tick)" :x2="xScale(tick)" :y1="plotTop - 6" :y2="svgHeight - 22"
                      :class="tick === 0 ? 'axis-zero' : 'axis-grid'" />
                <text :x="xScale(tick)" :y="svgHeight - 8" class="axis-label">{{ tick }}</text>
              </g>
              <text :x="plotLeft + plotWidth / 2" :y="plotTop - 16" class="axis-title">
                Seconds from start of WALK (0 = WALK begins)
              </text>

              <g v-for="(service, i) in pagedServices" :key="`svc-${service.index}`">
                <text :x="plotLeft - 8" :y="rowY(i) + rowHeight - 4" class="row-label">
                  #{{ service.index }} {{ shortTime(service.walkStartTs) }}
                </text>

                <rect
                  :x="xScale(clamp(service.conflictStartSec))"
                  :y="rowY(i) + 2"
                  :width="barWidth(service.conflictStartSec, service.conflictEndSec)"
                  :height="rowHeight - 5"
                  class="buffer-band"
                >
                  <title>Evaluated window: {{ service.conflictStartSec }}s to {{ service.conflictEndSec }}s</title>
                </rect>

                <rect
                  v-if="service.walkSec"
                  :x="xScale(clamp(0))"
                  :y="rowY(i) + 2"
                  :width="barWidth(0, service.walkSec)"
                  :height="rowHeight - 5"
                  class="walk-band"
                >
                  <title>WALK {{ service.walkSec }}s starting {{ fullTime(service.walkStartTs) }}</title>
                </rect>

                <rect
                  v-if="service.clearanceSec"
                  :x="xScale(clamp(service.walkSec))"
                  :y="rowY(i) + 2"
                  :width="barWidth(service.walkSec, service.walkSec + service.clearanceSec)"
                  :height="rowHeight - 5"
                  class="clearance-band"
                >
                  <title>Ped clearance {{ service.clearanceSec }}s</title>
                </rect>

                <line
                  v-for="edge in [service.conflictStartSec, service.conflictEndSec]"
                  :key="`edge-${service.index}-${edge}`"
                  :x1="xScale(clamp(edge))"
                  :x2="xScale(clamp(edge))"
                  :y1="rowY(i) + 1"
                  :y2="rowY(i) + rowHeight - 2"
                  class="window-edge"
                >
                  <title>
                    Evaluated window: {{ service.conflictStartSec }}s to
                    {{ service.conflictEndSec }}s from WALK start
                  </title>
                </line>

                <g v-for="(pulse, p) in service.pulses" :key="`p-${service.index}-${p}`">
                  <rect
                    :x="xScale(clamp(pulse.startSec))"
                    :y="rowY(i) + 4"
                    :width="barWidth(pulse.startSec, pulse.endSec)"
                    :height="rowHeight - 9"
                    :class="pulse.conflict ? 'pulse-conflict' : 'pulse-clear'"
                  >
                    <title>
                      Detector {{ selectedResult.rule.detectorChannel }} on for
                      {{ pulse.durationSec }}s ({{ pulse.startSec }}s to {{ pulse.endSec }}s);
                      {{ pulse.overlapSec }}s inside the pedestrian window
                    </title>
                  </rect>
                </g>

                <g v-for="(run, r) in service.runs || []" :key="`r-${service.index}-${r}`">
                  <line
                    :x1="xScale(clamp(run.offsetSec))"
                    :x2="xScale(clamp(run.downstreamOnSec))"
                    :y1="rowY(i) + rowHeight / 2"
                    :y2="rowY(i) + rowHeight / 2"
                    :class="run.conflict ? 'run-travel-conflict' : 'run-travel'"
                  />
                  <rect
                    :x="xScale(clamp(run.downstreamOnSec))"
                    :y="rowY(i) + 4"
                    :width="barWidth(run.downstreamOnSec, run.downstreamOffSec)"
                    :height="rowHeight - 9"
                    :class="run.conflict ? 'downstream-conflict' : 'downstream-clear'"
                  />
                  <polygon
                    :points="diamondPoints(xScale(clamp(run.offsetSec)), rowY(i) + rowHeight / 2, 4)"
                    :class="run.conflict ? 'run-marker-conflict' : 'run-marker'"
                  >
                    <title>
                      Stop bar off during {{ run.state }} at {{ run.offsetSec }}s;
                      downstream detector on {{ run.travelSec }}s later
                      ({{ run.downstreamOnSec }}s to {{ run.downstreamOffSec }}s);
                      {{ run.overlapSec }}s of the crossing overlapped<template
                        v-if="run.speedMph != null"
                      >; about {{ run.speedMph }} mph through the intersection</template>
                    </title>
                  </polygon>
                </g>

                <g v-for="(trigger, t) in service.triggers" :key="`t-${service.index}-${t}`">
                  <circle
                    :cx="xScale(clamp(trigger.offsetSec))"
                    :cy="rowY(i) + rowHeight / 2"
                    :r="2.6"
                    :class="trigger.conflict ? 'trigger-conflict' : 'trigger-clear'"
                  >
                    <title>Detector {{ trigger.type }} at {{ trigger.offsetSec }}s</title>
                  </circle>
                </g>
              </g>
            </svg>

            <div class="legend">
              <span class="legend-item"><span class="swatch walk-swatch"></span>WALK</span>
              <span class="legend-item"><span class="swatch clearance-swatch"></span>Ped clearance</span>
              <span class="legend-item"><span class="swatch buffer-swatch"></span>Lead/lag buffer</span>
              <span class="legend-item"><span class="swatch window-swatch"></span>Evaluated window edges</span>
              <span class="legend-item"><span class="swatch pulse-swatch"></span>Detector on (outside window)</span>
              <span class="legend-item"><span class="swatch conflict-swatch"></span>Detector on (in window)</span>
              <span class="legend-item"><span class="dot conflict-dot"></span>Correlated ON/OFF edge</span>
              <template v-if="selectedResult.isRedLightRun">
                <span class="legend-item"><span class="diamond run-diamond"></span>Stop bar off in {{ selectedResult.signalStateLabel.toLowerCase() }}</span>
                <span class="legend-item"><span class="swatch downstream-swatch"></span>Downstream detector (confirms entry)</span>
              </template>
            </div>
            <v-pagination
              v-if="timelinePageCount > 1"
              v-model="timelinePage"
              :length="timelinePageCount"
              density="compact"
              total-visible="7"
            />
          </div>
          <p v-else class="empty-state">No pedestrian services to plot for this rule.</p>

          <h3 class="section-title">Detector Timing Relative to WALK</h3>
          <div v-if="histogramChartData" class="chart-wrap">
            <Bar :data="histogramChartData" :options="histogramOptions" />
          </div>
          <p v-else class="empty-state">No detector events landed near this pedestrian phase.</p>

          <h3 class="section-title">Conflicts by Hour of Day</h3>
          <div v-if="hourChartData" class="chart-wrap">
            <Bar :data="hourChartData" :options="hourOptions" />
          </div>
          <p v-else class="empty-state">No pedestrian services were served in this file.</p>
        </v-card-text>
      </v-card>

      <v-card class="mt-6" variant="outlined">
        <v-card-title>5. Correlated Events</v-card-title>
        <v-card-text>
          <div class="table-controls">
            <v-text-field
              v-model="tableFilter"
              label="Filter events"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              class="filter-field"
            />
            <v-btn color="secondary" :disabled="!allConflicts.length" @click="downloadCsv">
              Download CSV
            </v-btn>
          </div>

          <v-table v-if="pagedConflicts.length" density="compact">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Movement</th>
                <th>Ped service</th>
                <th>WALK start</th>
                <th>Detector event</th>
                <th>Type</th>
                <th>Ped interval</th>
                <th class="numeric">Offset (s)</th>
                <th class="numeric">Overlap (s)</th>
                <template v-if="showRlrColumns">
                  <th>Signal state</th>
                  <th class="numeric">Into state (s)</th>
                  <th class="numeric">Travel (s)</th>
                  <th class="numeric">Downstream (s)</th>
                  <th class="numeric">Speed (mph)</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in pagedConflicts" :key="`conflict-${index}`">
                <td>{{ row.ruleLabel }}</td>
                <td>{{ row.movement }}</td>
                <td>#{{ row.serviceIndex }}</td>
                <td>{{ fullTime(row.walkStartTs) }}</td>
                <td>{{ fullTime(row.eventTs) }}</td>
                <td>{{ row.eventType }}</td>
                <td>{{ row.interval }}</td>
                <td class="numeric">{{ fmt(row.offsetSec) }}</td>
                <td class="numeric">{{ fmt(row.overlapSec) }}</td>
                <template v-if="showRlrColumns">
                  <td>{{ row.signalState || "—" }}</td>
                  <td class="numeric">{{ fmt(row.secIntoStateSec, 1) }}</td>
                  <td class="numeric">{{ fmt(row.travelSec) }}</td>
                  <td class="numeric">{{ fmt(row.downstreamSec) }}</td>
                  <td class="numeric">{{ fmt(row.speedMph, 1) }}</td>
                </template>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="empty-state">
            No correlated events were found. Try widening the lead/lag buffer or
            changing the trigger.
          </p>
          <v-pagination
            v-if="conflictPageCount > 1"
            v-model="conflictPage"
            :length="conflictPageCount"
            density="compact"
            total-visible="7"
          />
        </v-card-text>
      </v-card>

      <v-card class="mt-6" variant="outlined">
        <v-card-title>6. Video Clip Timestamps</v-card-title>
        <v-card-text>
          <p>
            Export the correlated events as a timestamp CSV for the
            <router-link to="/video-frame-extractor">Video Frame Extractor</router-link>,
            which pulls a frame (and optionally a GIF clip) at each row using the
            sync time you set from the video. Timestamps are ISO 8601, written as
            the controller's wall clock marked <code>Z</code>, which is what the
            extractor's sync clock compares against.
          </p>

          <v-row dense class="mt-2">
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="clipPadSec"
                type="number"
                min="0"
                step="1"
                label="Clip padding (s)"
                density="compact"
                variant="outlined"
                hide-details
                :disabled="!includeClipBounds"
              />
            </v-col>
            <v-col cols="12" md="9" class="clip-toggles">
              <v-switch
                v-model="includeClipBounds"
                color="primary"
                density="compact"
                hide-details
                label="Clip start & end rows"
              />
              <v-switch
                v-model="includeWalkStart"
                color="primary"
                density="compact"
                hide-details
                label="WALK start row"
              />
              <v-switch
                v-model="includeDownstream"
                color="primary"
                density="compact"
                hide-details
                label="Downstream arrival row (red-light runs)"
              />
            </v-col>
          </v-row>

          <div class="action-row">
            <v-btn color="secondary" :disabled="!clipRows.length" @click="downloadClipCsv">
              Download Timestamp CSV
            </v-btn>
            <span class="note-text">
              {{ clipRows.length }} rows from {{ allConflicts.length }} correlated events
            </span>
            <span v-if="clipRows.length && !signalId" class="note-text">
              Add a Signal ID above to label the extracted frames.
            </span>
          </div>

          <template v-if="clipRows.length">
            <h3 class="section-title">Preview</h3>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Timestamp (ISO)</th>
                  <th>Signal ID</th>
                  <th>Signal name</th>
                  <th>Phase</th>
                  <th>Detector</th>
                  <th>Light state</th>
                  <th class="numeric">Into state (s)</th>
                  <th>Moment</th>
                  <th v-if="clipHasSpeed" class="numeric">Speed (mph)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in clipPreviewRows" :key="`clip-${index}`">
                  <td>{{ row.timestampIso }}</td>
                  <td>{{ row.signalId || "—" }}</td>
                  <td>{{ row.signalName || "—" }}</td>
                  <td>{{ row.phase }}</td>
                  <td>{{ row.detectorChannel }}</td>
                  <td>{{ row.lightState }}</td>
                  <td class="numeric">{{ row.secondsIntoState }}</td>
                  <td>{{ row.moment }}</td>
                  <td v-if="clipHasSpeed" class="numeric">{{ row.speedMph || "—" }}</td>
                </tr>
              </tbody>
            </v-table>
            <p v-if="clipRows.length > clipPreviewRows.length" class="note-text">
              Showing the first {{ clipPreviewRows.length }} of
              {{ clipRows.length }} rows. The download includes all of them, plus
              columns for the rule, movement, ped phase, ped interval, and offset
              from WALK start.
            </p>
          </template>
        </v-card-text>
      </v-card>
    </template>

    <p class="disclaimer">
      Results describe the timing relationship recorded in the controller log.
      They indicate potential exposure between vehicle and pedestrian movements,
      not confirmed conflicts &mdash; field observation is still required before
      changing phasing or protection.
    </p>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import InputBox from "../components/foundational/InputBox.vue";
import {
  DETECTOR_TYPES,
  PED_WINDOW_MODES,
  TRIGGER_MODES,
  SIGNAL_STATE_MODES,
  DEFAULT_VEHICLE_LENGTH_FT,
  parseHighResEvents,
  summarizeEvents,
  correlateAll,
  conflictsToCsv,
  buildVideoClipRows,
  videoClipRowsToCsv,
} from "../utils/pedConflictCorrelator";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const EMPTY_SUMMARY = {
  eventCount: 0,
  firstTs: null,
  lastTs: null,
  spanSec: 0,
  channels: { vehicle: [], pedestrian: [], tsp: [] },
  pedPhases: [],
  vehiclePhases: [],
};

let ruleSequence = 0;

function makeRule(overrides = {}) {
  ruleSequence += 1;
  return {
    id: `rule-${ruleSequence}`,
    name: "",
    enabled: true,
    detectorChannel: 1,
    detectorType: "vehicle",
    pedPhase: 2,
    pedWindow: "walk-clearance",
    trigger: "on",
    leadSec: 0,
    lagSec: 0,
    minOverlapSec: 0,
    movement: "Permissive left turn",
    // Red-light-run mode only.
    downstreamChannel: 1,
    vehiclePhase: 2,
    signalStates: "yellow-red",
    maxTravelSec: 6,
    setbackFt: 0,
    vehicleLengthFt: DEFAULT_VEHICLE_LENGTH_FT,
    ...overrides,
  };
}

export default {
  name: "PedConflictCorrelator",
  components: { InputBox, Bar },
  data() {
    return {
      panels: ["about"],
      rawData: "",
      defaultText:
        "Paste high-resolution data: timestamp, event code, event parameter",
      parsing: false,
      analyzing: false,
      dataLoaded: false,
      errorMessage: "",
      skippedRows: 0,
      summary: { ...EMPTY_SUMMARY },
      events: [],
      rules: [makeRule()],
      results: [],
      selectedRuleId: null,
      binSec: 1,
      contextSec: 10,
      conflictsOnly: false,
      sampleLoaded: false,
      detectedSignalIds: [],
      signalId: "",
      signalName: "",
      clipPadSec: 5,
      includeClipBounds: true,
      includeWalkStart: false,
      includeDownstream: true,
      timelinePage: 1,
      timelinePageSize: 25,
      tableFilter: "",
      conflictPage: 1,
      conflictPageSize: 25,
      worker: null,
      svgWidth: 1000,
      plotLeft: 92,
      plotRight: 24,
      plotTop: 34,
      rowHeight: 16,
      movementOptions: [
        "Permissive left turn",
        "Protected-permissive left turn",
        "Right turn",
        "Right turn on red",
        "Through",
        "Driveway / channelized",
        "Other",
      ],
    };
  },
  computed: {
    hasRawData() {
      return this.rawData.trim().length > 0 && this.rawData.trim() !== this.defaultText;
    },
    canAnalyze() {
      return this.dataLoaded && this.rules.some((rule) => rule.enabled);
    },
    detectorTypeOptions() {
      return Object.values(DETECTOR_TYPES).map((type) => ({ title: type.label, value: type.key }));
    },
    pedWindowOptions() {
      return Object.values(PED_WINDOW_MODES).map((mode) => ({ title: mode.label, value: mode.key }));
    },
    triggerOptions() {
      return Object.values(TRIGGER_MODES).map((mode) => ({ title: mode.label, value: mode.key }));
    },
    signalStateOptions() {
      return Object.values(SIGNAL_STATE_MODES).map((mode) => ({ title: mode.label, value: mode.key }));
    },
    showRlrColumns() {
      return this.results.some((result) => result.isRedLightRun);
    },
    presets() {
      return [
        {
          key: "permissive-left",
          label: "Permissive left vs. WALK",
          rule: { trigger: "on", pedWindow: "walk-clearance", movement: "Permissive left turn" },
        },
        {
          key: "rtor",
          label: "Right turn occupancy during WALK",
          rule: { trigger: "overlap", pedWindow: "walk", movement: "Right turn on red", minOverlapSec: 1 },
        },
        {
          key: "departure",
          label: "Vehicle departs as WALK begins",
          rule: { trigger: "off", pedWindow: "walk", leadSec: 2, lagSec: 0, movement: "Through" },
        },
        {
          key: "late-crossing",
          label: "Late crossing during clearance",
          rule: { trigger: "either", pedWindow: "clearance", lagSec: 3, movement: "Permissive left turn" },
        },
        {
          key: "red-light-run",
          label: "Red-light run into crosswalk",
          rule: {
            trigger: "red-light-run",
            pedWindow: "walk-clearance",
            signalStates: "yellow-red",
            maxTravelSec: 6,
            movement: "Through",
          },
        },
        {
          key: "call-wait",
          label: "Traffic while ped waits",
          rule: { trigger: "on", pedWindow: "call-to-walk", movement: "Other" },
        },
      ];
    },
    spanLabel() {
      if (!this.summary.firstTs || !this.summary.lastTs) return "No time span";
      const hours = this.summary.spanSec / 3600;
      return `${this.fullTime(this.summary.firstTs)} → ${this.fullTime(this.summary.lastTs)} (${hours.toFixed(
        1,
      )} h)`;
    },
    ruleItems() {
      return this.results.map((result) => ({ title: result.label, value: result.ruleId }));
    },
    selectedResult() {
      return this.results.find((result) => result.ruleId === this.selectedRuleId) || this.results[0] || null;
    },
    skippedServiceNote() {
      const skipped = this.results.reduce((sum, result) => sum + result.totals.skippedServices, 0);
      if (!skipped) return "";
      return `${skipped} pedestrian service(s) were skipped because the selected interval was missing from the data (for example a service with no ped clearance event).`;
    },
    timelineServices() {
      if (!this.selectedResult) return [];
      const services = this.selectedResult.services;
      return this.conflictsOnly ? services.filter((service) => service.conflictCount > 0) : services;
    },
    timelinePageCount() {
      return Math.max(1, Math.ceil(this.timelineServices.length / this.timelinePageSize));
    },
    pagedServices() {
      const start = (this.timelinePage - 1) * this.timelinePageSize;
      return this.timelineServices.slice(start, start + this.timelinePageSize);
    },
    plotWidth() {
      return this.svgWidth - this.plotLeft - this.plotRight;
    },
    svgHeight() {
      return this.plotTop + this.pagedServices.length * this.rowHeight + 30;
    },
    domain() {
      let min = 0;
      let max = 1;
      for (const service of this.pagedServices) {
        min = Math.min(min, service.rasterStartSec);
        max = Math.max(max, service.rasterEndSec);
      }
      return { min: Math.max(min, -300), max: Math.min(Math.max(max, min + 1), 900) };
    },
    axisTicks() {
      const { min, max } = this.domain;
      const span = max - min;
      const step = span <= 40 ? 5 : span <= 120 ? 10 : span <= 300 ? 30 : 60;
      const ticks = [];
      for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
        ticks.push(Number(value.toFixed(3)));
      }
      if (!ticks.includes(0) && min <= 0 && max >= 0) ticks.push(0);
      return ticks.sort((a, b) => a - b);
    },
    histogramChartData() {
      const histogram = this.selectedResult?.histogram || [];
      if (!histogram.length) return null;
      return {
        labels: histogram.map((bin) => `${bin.binStart}`),
        datasets: [
          {
            label: "Correlated (in window)",
            data: histogram.map((bin) => bin.conflict),
            backgroundColor: "rgba(211, 47, 47, 0.85)",
          },
          {
            label: "Outside window",
            data: histogram.map((bin) => bin.clear),
            backgroundColor: "rgba(120, 144, 156, 0.6)",
          },
        ],
      };
    },
    histogramOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: "Seconds from start of WALK" },
          },
          y: { stacked: true, title: { display: true, text: "Detector events" }, beginAtZero: true },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => `${items[0].label}s to ${Number(items[0].label) + this.binSec}s from WALK start`,
            },
          },
        },
      };
    },
    hourChartData() {
      const byHour = this.selectedResult?.byHour || [];
      if (!byHour.length) return null;
      return {
        labels: byHour.map((row) => `${String(row.hour).padStart(2, "0")}:00`),
        datasets: [
          {
            label: "Correlated events",
            data: byHour.map((row) => row.conflicts),
            backgroundColor: "rgba(211, 47, 47, 0.85)",
          },
          {
            label: "Ped services",
            data: byHour.map((row) => row.services),
            backgroundColor: "rgba(56, 142, 60, 0.6)",
          },
        ],
      };
    },
    hourOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { title: { display: true, text: "Hour of day" } },
          y: { beginAtZero: true, title: { display: true, text: "Count" } },
        },
      };
    },
    allConflicts() {
      return this.results.flatMap((result) => result.conflicts);
    },
    clipRows() {
      if (!this.results.length) return [];
      return buildVideoClipRows({
        results: this.results,
        signalId: this.signalId,
        signalName: this.signalName,
        clipPadSec: this.clipPadSec,
        includeClipBounds: this.includeClipBounds,
        includeWalkStart: this.includeWalkStart,
        includeDownstream: this.includeDownstream,
      });
    },
    clipPreviewRows() {
      return this.clipRows.slice(0, 10);
    },
    clipHasSpeed() {
      return this.clipRows.some((row) => row.speedMph !== "" && row.speedMph != null);
    },
    filteredConflicts() {
      const filter = (this.tableFilter || "").trim().toLowerCase();
      if (!filter) return this.allConflicts;
      return this.allConflicts.filter((row) =>
        [
          row.ruleLabel,
          row.movement,
          row.eventType,
          row.interval,
          row.serviceIndex,
          this.fullTime(row.eventTs),
          this.fullTime(row.walkStartTs),
        ]
          .join(" ")
          .toLowerCase()
          .includes(filter),
      );
    },
    conflictPageCount() {
      return Math.max(1, Math.ceil(this.filteredConflicts.length / this.conflictPageSize));
    },
    pagedConflicts() {
      const start = (this.conflictPage - 1) * this.conflictPageSize;
      return this.filteredConflicts.slice(start, start + this.conflictPageSize);
    },
  },
  watch: {
    tableFilter() {
      this.conflictPage = 1;
    },
    selectedRuleId() {
      this.timelinePage = 1;
    },
    conflictsOnly() {
      this.timelinePage = 1;
    },
  },
  beforeUnmount() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  },
  methods: {
    fmt(value, digits = 2) {
      return Number.isFinite(value) ? Number(value).toFixed(digits) : "—";
    },
    listLabel(values) {
      if (!values || !values.length) return "none found";
      if (values.length <= 12) return values.join(", ");
      return `${values.slice(0, 12).join(", ")} … (${values.length} total)`;
    },
    fullTime(ts) {
      return ts == null ? "—" : DateTime.fromMillis(ts).toFormat("M/d/yyyy HH:mm:ss.S");
    },
    shortTime(ts) {
      return ts == null ? "" : DateTime.fromMillis(ts).toFormat("HH:mm:ss");
    },
    isRlr(rule) {
      return rule.trigger === "red-light-run";
    },
    speedSentence(rule) {
      const setback = Number(rule.setbackFt) || 0;
      if (!setback) {
        return "Enter a setback distance to estimate speed through the intersection.";
      }
      const length = Number(rule.vehicleLengthFt) || DEFAULT_VEHICLE_LENGTH_FT;
      const distance = setback - length;
      if (distance <= 0) {
        return `A ${setback} ft setback is not longer than the ${length} ft vehicle, so no speed can be derived.`;
      }
      return `Speed is measured over ${distance} ft: the ${setback} ft between detectors less the ${length} ft the front bumper is already past the stop bar loop.`;
    },
    channelLabel(rule) {
      return this.isRlr(rule) ? "Stop bar detector channel" : "Detector channel";
    },
    ruleLabel(rule) {
      if (rule.name && rule.name.trim()) return rule.name.trim();
      if (this.isRlr(rule)) {
        return `Red-light run ${rule.detectorChannel} → ${rule.downstreamChannel} × Ped phase ${rule.pedPhase}`;
      }
      return `Detector ${rule.detectorChannel} × Ped phase ${rule.pedPhase}`;
    },
    ruleSentence(rule) {
      const window = PED_WINDOW_MODES[rule.pedWindow]?.label || rule.pedWindow;
      const lead = Number(rule.leadSec) || 0;
      const lag = Number(rule.lagSec) || 0;
      const buffer = lead || lag ? ` extended ${lead}s before and ${lag}s after` : "";
      if (this.isRlr(rule)) {
        const states = (SIGNAL_STATE_MODES[rule.signalStates]?.label || rule.signalStates).toLowerCase();
        return `Flag when stop bar channel ${rule.detectorChannel} drops out during ${states} on phase ${rule.vehiclePhase} and channel ${rule.downstreamChannel} then turns on and off within ${rule.maxTravelSec}s, while ped phase ${rule.pedPhase} is in ${window}${buffer}.`;
      }
      const trigger = TRIGGER_MODES[rule.trigger]?.label || rule.trigger;
      return `Flag when ${trigger.toLowerCase()} on channel ${rule.detectorChannel} during ${window}${buffer} on ped phase ${rule.pedPhase}.`;
    },
    channelItems(detectorType) {
      return this.summary.channels[detectorType] || [];
    },
    addRule(overrides = {}) {
      const channels = this.summary.channels.vehicle;
      const rule = makeRule({
        detectorChannel: channels[0] ?? 1,
        downstreamChannel: channels[channels.length - 1] ?? 1,
        vehiclePhase: this.summary.vehiclePhases[0] ?? 2,
        pedPhase: this.summary.pedPhases[0] ?? 2,
        ...overrides,
      });
      this.rules.push(rule);
    },
    duplicateRule(index) {
      const source = this.rules[index];
      this.rules.splice(index + 1, 0, makeRule({ ...source, name: source.name ? `${source.name} copy` : "" }));
    },
    removeRule(index) {
      this.rules.splice(index, 1);
    },
    normalizedRules() {
      return this.rules.map((rule) => ({
        ...rule,
        label: this.ruleLabel(rule),
        detectorChannel: Number(rule.detectorChannel),
        pedPhase: Number(rule.pedPhase),
        leadSec: Number(rule.leadSec) || 0,
        lagSec: Number(rule.lagSec) || 0,
        minOverlapSec: Number(rule.minOverlapSec) || 0,
        downstreamChannel: Number(rule.downstreamChannel),
        vehiclePhase: Number(rule.vehiclePhase),
        maxTravelSec: Number(rule.maxTravelSec) || 0,
        setbackFt: Number(rule.setbackFt) || 0,
        vehicleLengthFt: Number(rule.vehicleLengthFt) || DEFAULT_VEHICLE_LENGTH_FT,
      }));
    },
    ensureWorker() {
      if (this.worker) return this.worker;
      try {
        this.worker = new Worker(new URL("../workers/pedConflictWorker.js", import.meta.url), {
          type: "module",
        });
        this.worker.onmessage = (event) => this.handleWorkerMessage(event.data || {});
        this.worker.onerror = () => {
          this.worker = null;
          this.parsing = false;
          this.analyzing = false;
          this.errorMessage = "Background processing failed; falling back to the main thread.";
        };
      } catch (error) {
        this.worker = null;
      }
      return this.worker;
    },
    handleWorkerMessage({ type, payload }) {
      if (type === "parsed") {
        this.applyParsed(payload.summary, payload.skipped, payload.signalIds);
        return;
      }
      if (type === "results") {
        this.applyResults(payload.results);
        return;
      }
      if (type === "error") {
        this.parsing = false;
        this.analyzing = false;
        this.errorMessage = payload;
      }
    },
    applyParsed(summary, skipped, signalIds = []) {
      this.parsing = false;
      this.summary = summary;
      this.skippedRows = skipped;
      if (!this.signalId && signalIds.length === 1) this.signalId = signalIds[0];
      this.detectedSignalIds = signalIds;
      this.results = [];
      if (!summary.eventCount) {
        this.dataLoaded = false;
        this.errorMessage =
          "No valid high-resolution rows were found. Expected timestamp, event code, event parameter.";
        return;
      }
      this.dataLoaded = true;
      this.seedRuleDefaults();
    },
    seedRuleDefaults() {
      const vehicleChannel = this.summary.channels.vehicle[0];
      const pedPhase = this.summary.pedPhases[0];
      for (const rule of this.rules) {
        const channels = this.summary.channels[rule.detectorType] || [];
        if (channels.length && !channels.includes(Number(rule.detectorChannel))) {
          rule.detectorChannel = rule.detectorType === "vehicle" ? vehicleChannel ?? channels[0] : channels[0];
        }
        if (pedPhase != null && !this.summary.pedPhases.includes(Number(rule.pedPhase))) {
          rule.pedPhase = pedPhase;
        }
        if (channels.length && !channels.includes(Number(rule.downstreamChannel))) {
          rule.downstreamChannel = channels[channels.length - 1];
        }
        const vehiclePhase = this.summary.vehiclePhases[0];
        if (vehiclePhase != null && !this.summary.vehiclePhases.includes(Number(rule.vehiclePhase))) {
          rule.vehiclePhase = vehiclePhase;
        }
      }
    },
    applyResults(results) {
      this.analyzing = false;
      this.results = results;
      this.timelinePage = 1;
      this.conflictPage = 1;
      if (!results.some((result) => result.ruleId === this.selectedRuleId)) {
        this.selectedRuleId = results.length ? results[0].ruleId : null;
      }
    },
    loadData() {
      this.errorMessage = "";
      this.parsing = true;
      const worker = this.ensureWorker();
      if (worker) {
        worker.postMessage({ type: "parse", payload: { text: this.rawData } });
        return;
      }
      // Fallback: parse on the main thread when workers are unavailable.
      try {
        const { events, skipped, signalIds } = parseHighResEvents(this.rawData);
        this.events = events;
        this.applyParsed(summarizeEvents(events), skipped, signalIds);
      } catch (error) {
        this.parsing = false;
        this.errorMessage = String(error.message || error);
      }
    },
    analyze() {
      this.errorMessage = "";
      this.analyzing = true;
      const payload = {
        rules: this.normalizedRules(),
        binSec: Number(this.binSec) > 0 ? Number(this.binSec) : 1,
        contextSec: Number(this.contextSec) >= 0 ? Number(this.contextSec) : 10,
      };
      const worker = this.ensureWorker();
      if (worker) {
        worker.postMessage({ type: "correlate", payload });
        return;
      }
      try {
        // The worker may have died after parsing; re-parse locally if needed.
        if (!this.events.length) this.events = parseHighResEvents(this.rawData).events;
        this.applyResults(correlateAll({ events: this.events, ...payload }));
      } catch (error) {
        this.analyzing = false;
        this.errorMessage = String(error.message || error);
      }
    },
    resetAll() {
      this.rawData = "";
      this.dataLoaded = false;
      this.summary = { ...EMPTY_SUMMARY };
      this.events = [];
      this.results = [];
      this.skippedRows = 0;
      this.errorMessage = "";
      this.sampleLoaded = false;
      if (this.worker) this.worker.postMessage({ type: "reset" });
    },
    downloadCsv() {
      this.downloadBlob(
        conflictsToCsv(this.results, (ts) => this.fullTime(ts)),
        "ped-conflict-correlations.csv",
        "text/csv",
      );
    },
    downloadBlob(content, name, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    },
    downloadClipCsv() {
      const name = (this.signalId || "signal").toString().replace(/[^A-Za-z0-9_-]+/g, "-");
      this.downloadBlob(
        videoClipRowsToCsv(this.clipRows),
        `${name}-ped-conflict-clip-timestamps.csv`,
        "text/csv",
      );
    },
    clamp(seconds) {
      const { min, max } = this.domain;
      return Math.min(Math.max(seconds, min), max);
    },
    xScale(seconds) {
      const { min, max } = this.domain;
      const span = max - min || 1;
      return this.plotLeft + ((seconds - min) / span) * this.plotWidth;
    },
    barWidth(startSec, endSec) {
      const left = this.xScale(this.clamp(startSec));
      const right = this.xScale(this.clamp(endSec));
      return Math.max(1, right - left);
    },
    rowY(index) {
      return this.plotTop + index * this.rowHeight;
    },
    diamondPoints(cx, cy, r) {
      return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    },
    loadSample() {
      this.rawData = this.buildSampleData();
      this.errorMessage = "";
      this.sampleLoaded = true;
    },
    /**
     * Deterministic demo file: ped phase 4 served every cycle with a permissive
     * left turn detector (channel 5) that frequently calls during WALK, plus a
     * quieter through detector (channel 2) for comparison.
     */
    buildSampleData() {
      const start = DateTime.fromObject({ year: 2024, month: 1, day: 6, hour: 7, minute: 0, second: 0 });
      const rows = [];
      let seed = 42;
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const push = (offsetSec, code, param) => {
        rows.push({ offsetSec, code, param });
      };

      const cycleLength = 100;
      for (let cycle = 0; cycle < 60; cycle += 1) {
        const cycleStart = cycle * cycleLength;
        const servesPed = cycle % 2 === 0 || random() > 0.5;

        push(cycleStart, 1, 2);
        push(cycleStart + 45, 8, 2);
        push(cycleStart + 48.5, 10, 2);
        push(cycleStart + 50, 1, 4);
        push(cycleStart + 82, 8, 4);
        push(cycleStart + 85.5, 10, 4);

        if (servesPed) {
          push(cycleStart + 44 - random() * 20, 45, 4);
          push(cycleStart + 50.2, 21, 4);
          push(cycleStart + 57.2, 22, 4);
          push(cycleStart + 75.2, 23, 4);
        }

        // Channel 5: permissive left, most calls arrive during ped service.
        const leftCalls = 2 + Math.floor(random() * 3);
        for (let i = 0; i < leftCalls; i += 1) {
          const on = cycleStart + 50 + random() * 30;
          push(on, 82, 5);
          push(on + 1.5 + random() * 4, 81, 5);
        }
        // Channel 2: through movement on phase 2, arriving on green.
        const throughCalls = 3 + Math.floor(random() * 3);
        for (let i = 0; i < throughCalls; i += 1) {
          const on = cycleStart + random() * 38;
          push(on, 82, 2);
          push(on + 1 + random() * 2, 81, 2);
        }

        // Some cycles include a vehicle that leaves the phase 2 stop bar during
        // yellow or red and is confirmed by downstream channel 21.
        const runnerRoll = random();
        if (runnerRoll > 0.55) {
          const intoRed = runnerRoll > 0.78;
          const stopBarOff = intoRed
            ? cycleStart + 49.5 + random() * 4
            : cycleStart + 46 + random() * 2.3;
          push(stopBarOff - 2.5 - random(), 82, 2);
          push(stopBarOff, 81, 2);
          const downstreamOn = stopBarOff + 1.4 + random() * 1.2;
          push(downstreamOn, 82, 21);
          push(downstreamOn + 0.6 + random() * 0.6, 81, 21);
        }
      }

      return rows
        .sort((a, b) => a.offsetSec - b.offsetSec)
        .map(({ offsetSec, code, param }) => {
          const ts = start.plus({ milliseconds: Math.round(offsetSec * 10) * 100 });
          return `${ts.toFormat("M/d/yyyy HH:mm:ss.S")},${code},${param}`;
        })
        .join("\n");
    },
  },
};
</script>

<style scoped>
.ped-conflict-tool {
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

.setting-field {
  max-width: 180px;
}

.scan-summary {
  margin-top: 16px;
}

.rule-card {
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.rule-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.rule-card-header h3 {
  font-size: 1.05rem;
}

.rule-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-summary {
  font-size: 0.8rem;
  opacity: 0.75;
  margin: 0;
}

.rule-sentence-banner {
  margin: 12px 0 4px;
  font-style: italic;
  opacity: 0.8;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.preset-label {
  margin-right: 8px;
  font-weight: 600;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0;
}

.stat-tile {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  flex: 1 1 160px;
  max-width: 320px;
  padding: 12px;
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.75;
}

.section-title {
  margin-top: 28px;
  margin-bottom: 8px;
}

.rule-picker {
  max-width: 420px;
}

.timeline-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.timeline-count {
  font-size: 0.85rem;
  opacity: 0.75;
}

.timeline-wrap {
  overflow-x: auto;
}

.timeline-svg {
  width: 100%;
  min-width: 640px;
}

.plot-bg {
  fill: rgba(128, 128, 128, 0.07);
}

.axis-grid {
  stroke: rgba(128, 128, 128, 0.35);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.axis-zero {
  stroke: #2e7d32;
  stroke-width: 1.5;
}

.axis-label,
.row-label {
  font-size: 10px;
  fill: currentColor;
  opacity: 0.8;
}

.axis-label {
  text-anchor: middle;
}

.row-label {
  text-anchor: end;
}

.axis-title {
  font-size: 11px;
  fill: currentColor;
  text-anchor: middle;
  opacity: 0.85;
}

.buffer-band {
  fill: rgba(120, 144, 156, 0.22);
}

.walk-band {
  fill: rgba(56, 142, 60, 0.45);
}

.clearance-band {
  fill: rgba(239, 108, 0, 0.42);
}

.window-edge {
  stroke: #1976d2;
  stroke-width: 1.4;
}

.pulse-clear {
  fill: rgba(55, 71, 79, 0.75);
}

.pulse-conflict {
  fill: rgba(211, 47, 47, 0.9);
}

.run-travel {
  stroke: rgba(94, 53, 177, 0.75);
  stroke-width: 1.2;
  stroke-dasharray: 2 2;
}

.run-travel-conflict {
  stroke: #b71c1c;
  stroke-width: 1.4;
  stroke-dasharray: 2 2;
}

.downstream-clear {
  fill: rgba(94, 53, 177, 0.7);
}

.downstream-conflict {
  fill: rgba(183, 28, 28, 0.95);
}

.run-marker {
  fill: #5e35b1;
}

.run-marker-conflict {
  fill: #b71c1c;
  stroke: #fff;
  stroke-width: 0.7;
}

.trigger-clear {
  fill: #37474f;
}

.trigger-conflict {
  fill: #b71c1c;
  stroke: #fff;
  stroke-width: 0.6;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 8px 0 12px;
  font-size: 0.8rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 16px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.walk-swatch {
  background: rgba(56, 142, 60, 0.45);
}

.clearance-swatch {
  background: rgba(239, 108, 0, 0.42);
}

.buffer-swatch {
  background: rgba(120, 144, 156, 0.22);
}

.window-swatch {
  border-left: 2px solid #1976d2;
  border-right: 2px solid #1976d2;
}

.pulse-swatch {
  background: rgba(55, 71, 79, 0.75);
}

.conflict-swatch {
  background: rgba(211, 47, 47, 0.9);
}

.conflict-dot {
  background: #b71c1c;
}

.diamond {
  width: 10px;
  height: 10px;
  display: inline-block;
  transform: rotate(45deg);
}

.run-diamond {
  background: #b71c1c;
}

.downstream-swatch {
  background: rgba(94, 53, 177, 0.7);
}

.chart-wrap {
  height: 320px;
}

.summary-table tbody tr {
  cursor: pointer;
}

.row-selected {
  background: rgba(25, 118, 210, 0.12);
}

.numeric {
  text-align: right;
}

.signal-identity {
  margin-top: 16px;
}

.clip-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.table-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-field {
  max-width: 320px;
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

.empty-state {
  opacity: 0.75;
  margin: 12px 0;
}

.disclaimer {
  max-width: 900px;
  margin: 32px auto 0;
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: center;
}
</style>
