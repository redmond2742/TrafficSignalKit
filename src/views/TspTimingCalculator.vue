<template>
  <div class="tsp-tool">
    &nbsp;
    <h1 class="h1-center-text">TSP Timing Calculator</h1>

    <div class="left-justify-text">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel title="About: TSD and TED" value="about">
          <v-expansion-panel-text>
            <p>
              When a bus asks for transit signal priority, the request tells the
              controller two times: when the bus expects to reach the stop bar
              &mdash; the <b>Time of Service Desired (TSD)</b> &mdash; and when
              it expects to be through the intersection &mdash; the
              <b>Time of Estimated Departure (TED)</b>. NTCIP&nbsp;1211 counts
              both in whole seconds from the moment the controller receives the
              request.
            </p>
            <p class="mt-2">
              Too short, and the controller ends the priority before the bus
              gets there. Too long, and the side street waits through green the
              bus never needed. This works both out for each approach from where
              the request starts, the approach speed and the time the bus loses
              on the way, and shows the bus making the trip.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Where the Request Starts" value="technologies">
          <v-expansion-panel-text>
            <ul class="steps">
              <li>
                <b>Emitter</b> (optical, infrared or GPS radio): the request
                starts when the bus comes into the detector's range. The range
                is measured from the detector, so a detector on a far-side mast
                arm spends part of it inside the intersection: the bus is the
                range <i>less</i> the detector's distance past the stop bar away.
              </li>
              <li class="mt-1">
                <b>Cloud</b> (GPS or AVL over cellular): the request starts at a
                check-in point, or when the bus's predicted arrival drops below a
                threshold. Either way the message spends time reaching the
                controller, and that latency comes off TSD.
              </li>
              <li class="mt-1">
                <b>Video</b>: the request starts when a camera recognises the bus
                in a detection zone. Recognising it takes a moment, which also
                comes off TSD.
              </li>
            </ul>
            <p class="mt-2">
              The latency defaults (2&nbsp;s cloud, 0.5&nbsp;s video) are typical
              figures, not anyone's specification. Use your vendor's.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="The Formula" value="formula">
          <v-expansion-panel-text>
            <p class="formula">
              ETA = request distance &divide; (1.4667 &times; speed) + lost time &minus; latency
            </p>
            <p class="mt-2">
              <b>TSD</b> is the ETA, rounded <b>down</b> to a whole second.
              <b>TED</b> adds the time to cross the intersection, from the stop
              bar to the far side, and is rounded <b>up</b>. Both round the way
              that favours the bus: green a fraction early, held a fraction long.
              Under <i>Advanced</i>, TED can count the bus's length too, so it is
              the time the back of the bus clears.
            </p>
            <p class="mt-2">
              1.4667 turns miles per hour into feet per second. Lost time is the
              time the bus loses to slowing, queuing or a near-side stop;
              <i>Build up lost time</i> adds it up from its parts. NTCIP&nbsp;1211
              carries TSD and TED from 1 to 65,535&nbsp;s.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="What It Does Not Do" value="limits">
          <v-expansion-panel-text>
            <p>
              It assumes the bus drives at one speed and loses all its lost time
              in one place. Real buses do neither, which is why the lost time is
              yours to set. It does not know the timing plan, so it cannot tell
              whether the controller can actually serve the request: that depends
              on the controller's priority settings, coordination and minimum
              times.
            </p>
            <p class="mt-2">
              Check the numbers against what the controller logs: the
              <router-link to="/tsp-dashboard">TSP Dashboard</router-link> pairs
              real check-ins with check-outs from high-resolution data.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <br />

    <div class="tsp-layout">
      <!-- 1. Intersection and approaches -->
      <v-card class="setup-card tsp-area-approaches" variant="outlined">
        <div class="setup-card__head">
          <h2 class="setup-card__title">1. Intersection and approaches</h2>
        </div>
        <v-text-field
          v-model="intersection"
          label="Intersection"
          placeholder="e.g. Ygnacio Valley Rd & Civic Dr"
          density="compact"
          variant="outlined"
          hide-details
          class="mb-3"
        ></v-text-field>
        <v-tabs v-model="activeId" color="primary" density="compact" show-arrows class="approach-tabs">
          <v-tab v-for="a in approaches" :key="a.id" :value="a.id">
            {{ a.name || "Approach" }} &middot; &Oslash;{{ a.phase }}
          </v-tab>
        </v-tabs>
        <div class="settings-row mt-3">
          <v-text-field
            v-model="active.name"
            label="Approach"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--mid"
          ></v-text-field>
          <v-select
            v-model="active.phase"
            :items="phaseOptions"
            label="Transit phase"
            density="compact"
            variant="outlined"
            hide-details
            class="setting setting--narrow"
          ></v-select>
        </div>
        <div class="settings-row mt-3">
          <v-btn
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            :disabled="approaches.length >= maxApproaches"
            @click="addApproach"
          >Add approach</v-btn>
          <v-btn
            variant="text"
            size="small"
            color="error"
            :disabled="approaches.length < 2"
            @click="deleteApproach"
          >Delete approach</v-btn>
        </div>
        <p class="setup-card__hint">A new approach starts as a copy of this one.</p>
      </v-card>

      <!-- Results and the drawing -->
      <div class="tsp-area-output">
        <v-card class="setup-card" variant="outlined">
          <div class="result-row">
            <div class="result-tile result-tile--tsd" :class="{ 'result-tile--off': timing.tsd === null || timing.errors.length }">
              <div class="metric-label">TSD &middot; time of service desired</div>
              <div class="result-value">{{ timing.tsd === null ? "—" : timing.tsd }}<span class="result-unit">s</span></div>
              <div class="muted">{{ timing.tsd === null ? "Check the inputs" : `${timing.tsdExact.toFixed(2)} s, rounded down` }}</div>
            </div>
            <div class="result-tile result-tile--ted" :class="{ 'result-tile--off': timing.ted === null || timing.errors.length }">
              <div class="metric-label">TED &middot; time of estimated departure</div>
              <div class="result-value">{{ timing.ted === null ? "—" : timing.ted }}<span class="result-unit">s</span></div>
              <div class="muted">{{ timing.ted === null ? "Check the inputs" : `${timing.tedExact.toFixed(2)} s, rounded up` }}</div>
            </div>
          </div>
          <div class="figure-row">
            <div v-for="fig in figures" :key="fig.label" class="figure">
              <div class="figure-value">{{ fig.value }}</div>
              <div class="figure-label">{{ fig.label }}</div>
            </div>
          </div>
          <v-alert
            v-for="message in timing.errors"
            :key="message"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >{{ message }}</v-alert>
          <v-alert
            v-for="message in timing.warnings"
            :key="message"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >{{ message }}</v-alert>
          <div v-if="timing.steps.length" class="mt-2">
            <v-btn variant="text" size="small" class="px-1" @click="showMath = !showMath">
              {{ showMath ? "Hide the math" : "Show the math" }}
            </v-btn>
            <table v-if="showMath" class="math-table">
              <tbody>
                <tr v-for="step in timing.steps" :key="step.label">
                  <th>{{ step.label }}</th>
                  <td>{{ step.text }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>

        <v-card class="setup-card" variant="outlined">
          <div ref="sceneWrap" class="scene-wrap">
            <svg
              class="tsp-scene"
              xmlns="http://www.w3.org/2000/svg"
              :viewBox="`0 0 ${g.width} ${g.height}`"
              :width="g.width"
              :height="g.height"
              role="img"
              :aria-label="sceneLabel"
            >
              <rect :width="g.width" :height="g.height" fill="#e9efe7" />
              <!-- Sidewalks and the road -->
              <rect x="0" :y="S.sidewalkTop" :width="g.width" :height="S.laneTop - S.sidewalkTop" fill="#d5d9de" />
              <rect x="0" :y="S.laneBottom" :width="g.width" :height="S.curb - S.laneBottom" fill="#d5d9de" />
              <rect x="0" :y="S.laneTop" :width="g.width" :height="S.laneBottom - S.laneTop" fill="#424a55" />
              <!-- The cross street -->
              <rect
                :x="g.stopBar + 3"
                :y="S.crossTop"
                :width="Math.max(0, g.farSide - g.stopBar - 3)"
                :height="S.crossBottom - S.crossTop"
                fill="#424a55"
              />
              <g v-for="walk in crosswalks" :key="walk.x">
                <rect
                  v-for="y in crosswalkStripes"
                  :key="y"
                  :x="walk.x"
                  :y="y"
                  :width="walk.w"
                  height="3"
                  fill="#f1f5f9"
                />
              </g>
              <!-- Lane lines, which stop at the intersection -->
              <g v-for="run in laneLineRuns" :key="run.x0">
                <line :x1="run.x0" :x2="run.x1" :y1="S.centerLine - 1.5" :y2="S.centerLine - 1.5" stroke="#facc15" stroke-width="1.5" />
                <line :x1="run.x0" :x2="run.x1" :y1="S.centerLine + 1.5" :y2="S.centerLine + 1.5" stroke="#facc15" stroke-width="1.5" />
                <line :x1="run.x0" :x2="run.x1" :y1="S.laneTop + 3" :y2="S.laneTop + 3" stroke="#e2e8f0" stroke-width="1.5" />
                <line :x1="run.x0" :x2="run.x1" :y1="S.laneBottom - 3" :y2="S.laneBottom - 3" stroke="#e2e8f0" stroke-width="1.5" />
              </g>
              <rect :x="g.stopBar - 4" :y="S.centerLine + 3" width="4" :height="S.laneBottom - S.centerLine - 6" fill="#ffffff" />
              <text :x="g.stopBar - 6" :y="S.laneTop - 3" font-size="10" fill="#334155" text-anchor="end" font-family="Helvetica, Arial, sans-serif">stop bar</text>

              <!-- Emitter: the detector's range -->
              <g v-if="g.detector">
                <polygon
                  :points="emitterCone"
                  fill="#facc15"
                  fill-opacity="0.2"
                  stroke="#ca8a04"
                  stroke-width="1"
                  stroke-dasharray="5 4"
                />
                <text
                  :x="g.detector.rangeEnd + 6"
                  :y="S.curb - 4"
                  font-size="10.5"
                  fill="#854d0e"
                  font-weight="700"
                  font-family="Helvetica, Arial, sans-serif"
                >{{ g.detector.label }}</text>
              </g>

              <!-- Video: the camera's view and its zone -->
              <g v-if="g.zone">
                <polygon :points="cameraCone" fill="#3b82f6" fill-opacity="0.12" />
                <rect
                  :x="g.zone.x0"
                  :y="S.centerLine + 4"
                  :width="Math.max(2, g.zone.x1 - g.zone.x0)"
                  :height="S.laneBottom - S.centerLine - 8"
                  :fill="zoneOccupied ? '#22c55e' : '#3b82f6'"
                  :fill-opacity="zoneOccupied ? 0.55 : 0.18"
                  stroke="#2563eb"
                  stroke-width="1.5"
                  stroke-dasharray="4 3"
                />
              </g>

              <!-- Cloud: the check-in line, and the server -->
              <g v-if="g.checkIn">
                <line
                  :x1="g.checkIn.x"
                  :x2="g.checkIn.x"
                  :y1="S.laneTop"
                  :y2="S.laneBottom"
                  stroke="#7c3aed"
                  stroke-width="2"
                  stroke-dasharray="6 4"
                />
                <polyline :points="messagePath" fill="none" stroke="#7c3aed" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="2 3" />
                <g :transform="`translate(${g.cloud.x}, ${g.cloud.y})`">
                  <circle cx="-9" cy="2" r="8" fill="#ede9fe" stroke="#7c3aed" />
                  <circle cx="2" cy="-3" r="10" fill="#ede9fe" stroke="#7c3aed" />
                  <circle cx="12" cy="3" r="7" fill="#ede9fe" stroke="#7c3aed" />
                  <rect x="-10" y="2" width="22" height="7" fill="#ede9fe" />
                  <text x="1" y="5" font-size="8" fill="#5b21b6" text-anchor="middle" font-weight="700" font-family="Helvetica, Arial, sans-serif">TSP</text>
                </g>
              </g>
              <circle v-if="messageDot" :cx="messageDot.x" :cy="messageDot.y" r="4.5" fill="#7c3aed" stroke="#ffffff" stroke-width="1.5" />

              <!-- Where the request starts -->
              <g v-if="g.request !== null">
                <line :x1="g.request" :x2="g.request" :y1="S.sidewalkTop - 12" :y2="S.laneTop" stroke="#0f172a" stroke-width="1" />
                <text
                  :x="flagX"
                  :y="S.sidewalkTop - 16"
                  font-size="11"
                  fill="#0f172a"
                  font-weight="700"
                  :text-anchor="flagAnchor"
                  font-family="Helvetica, Arial, sans-serif"
                >{{ requestFlag }}</text>
              </g>

              <!-- Near-side stop -->
              <g v-if="g.stop">
                <rect :x="g.stop.x - 27" :y="S.laneBottom + 4" width="19" height="9" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="0.8" />
                <rect :x="g.stop.x - 4" :y="S.laneBottom + 2" width="7" height="7" rx="1" fill="#1d4ed8" />
                <text :x="g.stop.x - 12" :y="S.curb + 12" font-size="10" fill="#1e3a8a" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">bus stop</text>
              </g>

              <!-- Mast arm, signal head, detector or camera -->
              <line :x1="g.mast" :x2="g.mast" :y1="S.curb - 3" :y2="S.centerLine + 3" stroke="#1f2937" stroke-width="3" />
              <circle :cx="g.mast" :cy="S.curb - 3" r="4.5" fill="#1f2937" />
              <rect :x="g.mast - 4" :y="S.centerLine + 5" width="8" height="13" rx="1.5" fill="#111827" />
              <circle :cx="g.mast" :cy="S.centerLine + 8.5" r="1.6" fill="#7f1d1d" />
              <circle :cx="g.mast" :cy="S.centerLine + 11.5" r="1.6" fill="#78350f" />
              <circle :cx="g.mast" :cy="S.centerLine + 14.5" r="1.6" fill="#14532d" />
              <g v-if="g.detector">
                <rect :x="g.mast - 12" :y="APPROACH_Y + 1" width="8" height="7" rx="1" fill="#0f172a" />
                <circle :cx="g.mast - 12" :cy="APPROACH_Y + 4.5" r="2.2" fill="#38bdf8" />
              </g>
              <g v-if="g.camera">
                <rect :x="g.mast - 13" :y="APPROACH_Y + 1" width="10" height="7" rx="1.5" fill="#0f172a" />
                <circle :cx="g.mast - 13" :cy="APPROACH_Y + 4.5" r="2.4" fill="#93c5fd" />
              </g>

              <!-- Controller cabinet and its TSP light -->
              <g :transform="`translate(${g.cabinet.x}, ${g.cabinet.y})`">
                <title>Controller cabinet: the TSP call is on while the request is live</title>
                <rect x="0" y="0" width="36" height="16" rx="2" fill="#9ca3af" stroke="#4b5563" stroke-width="1" />
                <circle
                  cx="9"
                  cy="8"
                  r="4"
                  :fill="bus && bus.active ? '#22c55e' : '#475569'"
                  :class="{ 'tsp-light--on': bus && bus.active }"
                />
                <text x="16" y="11.5" font-size="8.5" font-weight="700" fill="#1f2937" font-family="Helvetica, Arial, sans-serif">TSP</text>
              </g>

              <!-- The bus -->
              <g v-if="bus" :transform="`translate(${busX - g.busPx}, ${APPROACH_Y - 10})`">
                <rect :width="g.busPx" height="20" rx="4" fill="#0f766e" stroke="#064e3b" stroke-width="1" />
                <rect x="3" y="3" :width="Math.max(0, g.busPx - 11)" height="4" rx="1.5" fill="#99f6e4" fill-opacity="0.7" />
                <rect x="3" y="13" :width="Math.max(0, g.busPx - 11)" height="4" rx="1.5" fill="#99f6e4" fill-opacity="0.7" />
                <rect :x="g.busPx - 6" y="3" width="4" height="14" rx="1.5" fill="#bae6fd" />
                <circle
                  v-if="g.detector"
                  :cx="g.busPx - 10"
                  cy="10"
                  r="2.6"
                  fill="#ffffff"
                  :class="{ 'emitter--on': emitterOn }"
                />
              </g>
              <g v-if="bus">
                <rect
                  :x="bubble.x - bubble.w / 2"
                  :y="S.centerLine - 26"
                  :width="bubble.w"
                  height="18"
                  rx="9"
                  :fill="bubbleFill"
                  fill-opacity="0.95"
                />
                <text
                  :x="bubble.x"
                  :y="S.centerLine - 13"
                  font-size="11"
                  fill="#ffffff"
                  text-anchor="middle"
                  font-weight="700"
                  font-family="Helvetica, Arial, sans-serif"
                >{{ bus.label }}</text>
              </g>

              <!-- Dimensions -->
              <line
                v-for="(ext, i) in extensionLines"
                :key="`ext-${i}`"
                :x1="ext.x"
                :x2="ext.x"
                :y1="ext.y1"
                :y2="ext.y2"
                stroke="#94a3b8"
                stroke-width="0.8"
                stroke-dasharray="3 3"
              />
              <g v-for="dim in g.dims" :key="dim.key">
                <line :x1="dim.x0" :x2="dim.x1" :y1="dim.y" :y2="dim.y" stroke="#334155" stroke-width="1" />
                <line :x1="dim.x0" :x2="dim.x0" :y1="dim.y - 4" :y2="dim.y + 4" stroke="#334155" stroke-width="1" />
                <line :x1="dim.x1" :x2="dim.x1" :y1="dim.y - 4" :y2="dim.y + 4" stroke="#334155" stroke-width="1" />
                <text
                  :x="dim.tx"
                  :y="dim.y - 3"
                  font-size="11"
                  fill="#1e293b"
                  :text-anchor="dim.anchor"
                  font-family="Helvetica, Arial, sans-serif"
                >{{ dim.text }}</text>
              </g>

              <!-- Distance axis -->
              <line :x1="S.pad" :x2="g.width - S.pad" :y1="g.axis" :y2="g.axis" stroke="#64748b" stroke-width="1" />
              <g v-for="tick in g.ticks" :key="tick.ft">
                <line :x1="tick.x" :x2="tick.x" :y1="g.axis" :y2="g.axis + 4" stroke="#64748b" stroke-width="1" />
                <text :x="tick.x" :y="g.axis + 15" font-size="10" fill="#475569" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">{{ tick.label }}</text>
              </g>
              <text :x="g.width - S.pad" :y="g.axis + 27" font-size="9" fill="#64748b" text-anchor="end" font-family="Helvetica, Arial, sans-serif">
                distance from the stop bar{{ g.busToScale ? "" : " · bus drawn larger than scale" }}
              </text>
            </svg>
          </div>

          <!-- Timeline: also the scrubber -->
          <svg
            v-if="line"
            ref="timeline"
            class="tsp-timeline"
            :viewBox="`0 0 ${line.width} ${line.height}`"
            :width="line.width"
            :height="line.height"
            role="slider"
            tabindex="0"
            aria-label="Playback time, seconds from when the controller receives the request"
            :aria-valuemin="motion.start.toFixed(1)"
            :aria-valuemax="motion.end.toFixed(1)"
            :aria-valuenow="t.toFixed(1)"
            :aria-valuetext="`${t.toFixed(1)} seconds`"
            @pointerdown="startScrub"
            @pointermove="moveScrub"
            @pointerup="endScrub"
            @pointercancel="endScrub"
            @keydown="scrubKey"
          >
            <rect
              v-if="line.latency"
              :x="line.latency.x0"
              :y="T.latencyTop"
              :width="line.latency.x1 - line.latency.x0"
              :height="T.latencyHeight"
              rx="2"
              fill="#a855f7"
            />
            <rect
              v-for="(span, i) in line.spans"
              :key="i"
              :x="span.x0"
              :y="T.barTop"
              :width="Math.max(0, span.x1 - span.x0)"
              :height="T.barHeight"
              :fill="spanColors[span.kind]"
            />
            <line :x1="line.received" :x2="line.received" :y1="T.latencyTop - 4" :y2="T.barTop + T.barHeight + 4" stroke="#0f172a" stroke-width="1.5" />
            <line :x1="line.tsd.exact" :x2="line.tsd.exact" :y1="T.barTop - 4" :y2="T.barTop + T.barHeight + 4" stroke="#0f172a" stroke-width="1" />
            <line :x1="line.tsd.programmed" :x2="line.tsd.programmed" :y1="T.barTop - 4" :y2="T.labelY - 10" stroke="#0f766e" stroke-width="2" stroke-dasharray="3 2" />
            <text :x="line.tsd.tx" :y="T.labelY" font-size="11" font-weight="700" fill="#0f766e" text-anchor="end" font-family="Helvetica, Arial, sans-serif">{{ line.tsd.label }}</text>
            <line :x1="line.ted.exact" :x2="line.ted.exact" :y1="T.barTop - 4" :y2="T.barTop + T.barHeight + 4" stroke="#0f172a" stroke-width="1" />
            <line :x1="line.ted.programmed" :x2="line.ted.programmed" :y1="T.barTop - 4" :y2="T.labelY - 10" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="3 2" />
            <text :x="line.ted.tx" :y="T.labelY" font-size="11" font-weight="700" fill="#1d4ed8" text-anchor="start" font-family="Helvetica, Arial, sans-serif">{{ line.ted.label }}</text>
            <line :x1="T.pad" :x2="line.width - T.pad" :y1="T.axisY" :y2="T.axisY" stroke="#94a3b8" stroke-width="1" />
            <g v-for="tick in line.ticks" :key="tick.label">
              <line :x1="tick.x" :x2="tick.x" :y1="T.axisY" :y2="T.axisY + 3" stroke="#94a3b8" stroke-width="1" />
              <text :x="tick.x" :y="T.axisY + 13" font-size="9.5" fill="#475569" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">{{ tick.label }}</text>
            </g>
            <line :x1="line.T(t)" :x2="line.T(t)" :y1="2" :y2="T.axisY" stroke="#dc2626" stroke-width="2" />
            <circle :cx="line.T(t)" cy="4" r="4" fill="#dc2626" />
          </svg>

          <div class="legend">
            <span v-if="timing.latency > 0" class="legend-item"><i class="swatch" style="background: #a855f7"></i>Latency</span>
            <span class="legend-item"><i class="swatch" style="background: #3b82f6"></i>Travel</span>
            <span v-if="timing.lostTime > 0" class="legend-item"><i class="swatch" style="background: #f59e0b"></i>{{ active.nearSideStop ? "Dwell" : "Lost time" }}</span>
            <span class="legend-item"><i class="swatch" style="background: #16a34a"></i>Crossing</span>
            <span class="legend-item">Solid mark: exact &middot; dashed: the whole second sent</span>
            <span class="legend-item"><i class="swatch swatch--dot" style="background: #22c55e"></i>TSP call on</span>
          </div>

          <div class="player">
            <v-btn
              :icon="playing ? 'mdi-pause' : 'mdi-play'"
              size="small"
              color="primary"
              variant="flat"
              :aria-label="playing ? 'Pause' : 'Play'"
              :disabled="!motion"
              @click="togglePlay"
            ></v-btn>
            <v-btn size="small" variant="text" :disabled="!motion" @click="restart">Restart</v-btn>
            <v-btn-toggle v-model="playbackSpeed" mandatory density="compact" variant="outlined" divided>
              <v-btn v-for="speed in [1, 2, 4, 8]" :key="speed" :value="speed" size="small">{{ speed }}&times;</v-btn>
            </v-btn-toggle>
            <v-switch v-model="loop" label="Loop" color="primary" density="compact" hide-details class="loop-switch"></v-switch>
          </div>
          <div v-if="bus" class="readout">
            <span><b>t</b> = {{ t.toFixed(1) }} s</span>
            <span>{{ distanceText }}</span>
            <span>{{ countdown("TSD", timing.tsdExact) }}</span>
            <span>{{ countdown("TED", timing.tedExact) }}</span>
          </div>
          <p class="setup-card__hint">
            t = 0 is when the controller receives the request. Drag the timeline,
            or use the arrow keys on it, to step through.
          </p>
        </v-card>
      </div>

      <!-- 2. Detection, and 3. the approach -->
      <div class="tsp-area-inputs">
        <v-card class="setup-card" variant="outlined">
          <div class="setup-card__head">
            <h2 class="setup-card__title">2. How the bus asks</h2>
          </div>
          <v-btn-toggle v-model="active.technology" mandatory color="primary" variant="outlined" divided density="comfortable" class="mb-2">
            <v-btn v-for="(tech, key) in technologies" :key="key" :value="key">{{ tech.label }}</v-btn>
          </v-btn-toggle>
          <p class="setup-card__hint mb-3">{{ technologies[active.technology].blurb }}</p>

          <template v-if="active.technology === 'emitter'">
            <SliderField v-model="active.emitterDistance" label="Emitter distance" :min="100" :max="2500" :step="25" unit="ft" hint="The detector's range, measured from the detector." />
            <SliderField v-model="active.detectorToStopBar" label="Detector to stop bar" :min="0" :max="250" :step="5" unit="ft" :hint="active.detectorPosition === 'before' ? 'The detector is before the stop bar (change under Advanced).' : 'The detector is past the stop bar, on a far-side mast arm (change under Advanced).'" />
          </template>
          <template v-else-if="active.technology === 'cloud'">
            <v-btn-toggle v-model="active.cloudTrigger" mandatory variant="outlined" divided density="compact" class="mb-3">
              <v-btn value="distance" size="small">Check-in point</v-btn>
              <v-btn value="eta" size="small">ETA threshold</v-btn>
            </v-btn-toggle>
            <SliderField
              v-if="active.cloudTrigger === 'distance'"
              v-model="active.checkInDistance"
              label="Check-in distance"
              :min="100"
              :max="3000"
              :step="25"
              unit="ft"
              hint="How far before the stop bar the request is sent."
            />
            <SliderField
              v-else
              v-model="active.checkInEta"
              label="ETA threshold"
              :min="5"
              :max="120"
              :step="1"
              unit="s"
              hint="The request is sent when the predicted arrival, lost time included, drops to this."
            />
            <SliderField v-model="active.latency.cloud" label="Latency" :min="0" :max="10" :step="0.1" unit="s" hint="From the bus reaching the point to the controller receiving the request." />
          </template>
          <template v-else>
            <SliderField v-model="active.zoneSetback" label="Detection zone setback" :min="25" :max="800" :step="5" unit="ft" hint="The zone's upstream edge, measured from the stop bar." />
            <SliderField v-model="active.latency.video" label="Latency" :min="0" :max="5" :step="0.1" unit="s" hint="Time for the camera to recognise the bus and place the call." />
          </template>
        </v-card>

        <v-card class="setup-card" variant="outlined">
          <div class="setup-card__head">
            <h2 class="setup-card__title">3. The approach</h2>
          </div>
          <SliderField v-model="active.speed" label="Approach speed" :min="10" :max="65" :step="5" unit="mph" hint="Posted speed, or the speed buses actually run." />
          <SliderField v-model="active.lostTime" label="Lost time" :min="0" :max="60" :step="0.5" unit="s" hint="Slowing, queuing, or dwell at a near-side stop." />
          <v-btn variant="text" size="small" class="px-1 mb-2" @click="showHelper = !showHelper">
            {{ showHelper ? "Hide" : "Build up lost time" }}
          </v-btn>
          <div v-if="showHelper" class="helper">
            <v-switch v-model="active.helper.stops" label="The bus stops (brakes, then pulls away)" color="primary" density="compact" hide-details></v-switch>
            <div class="settings-row">
              <v-text-field v-model.number="active.helper.braking" type="number" step="0.5" label="Braking" suffix="ft/s²" density="compact" variant="outlined" hide-details :disabled="!active.helper.stops" class="setting setting--narrow"></v-text-field>
              <v-text-field v-model.number="active.helper.accel" type="number" step="0.5" label="Pulling away" suffix="ft/s²" density="compact" variant="outlined" hide-details :disabled="!active.helper.stops" class="setting setting--narrow"></v-text-field>
              <v-text-field v-model.number="active.helper.dwell" type="number" step="1" label="Dwell" suffix="s" density="compact" variant="outlined" hide-details class="setting setting--narrow"></v-text-field>
              <v-text-field v-model.number="active.helper.queue" type="number" step="1" label="Queue" suffix="s" density="compact" variant="outlined" hide-details class="setting setting--narrow"></v-text-field>
            </div>
            <p class="setup-card__hint">
              {{ helperText }}
            </p>
            <p class="setup-card__hint">
              The 4&nbsp;ft/s² rates are assumptions, about what city bus drivers use. Use your fleet's.
            </p>
            <v-btn variant="tonal" size="small" class="mt-2" @click="useHelper">Use {{ lostHelper.total.toFixed(1) }} s</v-btn>
          </div>
          <v-switch v-model="active.nearSideStop" label="Near-side bus stop" color="primary" density="compact" hide-details></v-switch>
          <SliderField v-if="active.nearSideStop" v-model="active.stopDistance" label="Stop before the stop bar" :min="20" :max="500" :step="5" unit="ft" />
          <SliderField v-model="active.intersectionLength" label="Intersection length" :min="30" :max="250" :step="5" unit="ft" hint="From the stop bar to the far side." />

          <v-expansion-panels class="mt-3" variant="accordion">
            <v-expansion-panel title="Advanced">
              <v-expansion-panel-text>
                <template v-if="active.technology === 'emitter'">
                  <p class="sub-title">The detector is</p>
                  <v-btn-toggle v-model="active.detectorPosition" mandatory variant="outlined" divided density="compact" class="mb-3">
                    <v-btn value="past" size="small">Past the stop bar</v-btn>
                    <v-btn value="before" size="small">Before the stop bar</v-btn>
                  </v-btn-toggle>
                  <SliderField v-model="active.latency.emitter" label="Latency" :min="0" :max="3" :step="0.1" unit="s" hint="Usually none: the detector calls the controller directly." />
                </template>
                <SliderField v-if="active.technology === 'video'" v-model="active.zoneLength" label="Zone length" :min="10" :max="150" :step="5" unit="ft" hint="For the drawing only; the request starts at the zone's upstream edge." />
                <v-switch v-model="active.includeBusLength" label="Count the bus's length in TED (the back of the bus clears)" color="primary" density="compact" hide-details></v-switch>
                <SliderField v-if="active.includeBusLength" v-model="active.busLength" label="Bus length" :min="20" :max="65" :step="1" unit="ft" />
                <v-text-field
                  v-model.number="active.crossingSpeed"
                  type="number"
                  label="Speed through the intersection"
                  placeholder="Same as the approach"
                  persistent-placeholder
                  suffix="mph"
                  density="compact"
                  variant="outlined"
                  clearable
                  hide-details
                  class="mt-3"
                  @click:clear="active.crossingSpeed = null"
                ></v-text-field>
                <p class="setup-card__hint">A bus pulling away from a near-side stop crosses slower than it approached.</p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </div>
    </div>

    <!-- 4. All approaches -->
    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">4. All approaches{{ intersection ? ` · ${intersection}` : "" }}</h2>
        <p class="setup-card__hint">Click a row to edit that approach.</p>
      </div>
      <v-table density="compact" class="summary-table">
        <thead>
          <tr>
            <th>Approach</th>
            <th class="num">Phase</th>
            <th>Detection</th>
            <th class="num">Request at</th>
            <th class="num">Lost</th>
            <th class="num">TSD</th>
            <th class="num">TED</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in summaryRows"
            :key="row.id"
            :class="{ 'row--active': row.id === activeId }"
            tabindex="0"
            @click="activeId = row.id"
            @keydown.enter="activeId = row.id"
          >
            <td>{{ row.name }}</td>
            <td class="num">{{ row.phase }}</td>
            <td>{{ row.detection }}</td>
            <td class="num nowrap">{{ row.request }}</td>
            <td class="num nowrap">{{ row.lost }}</td>
            <td class="num"><b>{{ row.tsd }}</b></td>
            <td class="num"><b>{{ row.ted }}</b></td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- 5. Keep it -->
    <v-card class="setup-card" variant="outlined">
      <div class="setup-card__head">
        <h2 class="setup-card__title">5. Keep it</h2>
        <p class="setup-card__hint">
          Every approach saves itself in this browser as you work. Save a file to
          send the setup to someone, or to keep a copy.
        </p>
      </div>
      <div class="settings-row">
        <v-btn variant="tonal" @click="saveFile">Save file</v-btn>
        <v-btn variant="tonal" prepend-icon="mdi-tray-arrow-up" @click="$refs.fileInput.click()">Open file</v-btn>
        <v-btn variant="text" color="error" @click="startOver">Start over</v-btn>
        <input ref="fileInput" type="file" accept=".json,application/json" class="hidden-file" @change="openFile" />
      </div>
      <p v-if="fileError" class="setup-card__hint warn-text">{{ fileError }}</p>
    </v-card>

    <v-snackbar v-model="undoOpen" :timeout="8000" location="bottom">
      {{ undo ? undo.message : "" }}
      <template #actions>
        <v-btn variant="text" color="primary" @click="undoLast">Undo</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import SliderField from "../components/foundational/SliderField.vue";
import {
  MAX_APPROACHES,
  PHASES,
  TECHNOLOGIES,
  busAt,
  busMotion,
  computeTiming,
  fromSaveFile,
  lostTimeEstimate,
  newApproach,
  normalizeConfig,
  toSaveFile,
} from "../utils/tspTiming.js";
import { APPROACH_Y, SCENE, TIMELINE, sceneGeometry, timelineGeometry } from "../utils/tspScene.js";

const STORAGE_KEY = "tsk:tspTiming:v1";

/** Holds on the last frame this long before a loop starts over, so "Cleared" can be read. */
const LOOP_PAUSE = 1.5;

const SPAN_COLORS = {
  lead: "#cbd5e1",
  travel: "#3b82f6",
  hold: "#f59e0b",
  crossing: "#16a34a",
  trail: "#cbd5e1",
};

const STATE_COLORS = {
  approaching: "#475569",
  sending: "#7c3aed",
  requested: "#0f766e",
  holding: "#b45309",
  crossing: "#15803d",
  cleared: "#334155",
};

const ft = (value) => `${Math.round(value).toLocaleString("en-US")} ft`;

let measureContext = null;
/** A label's width as the drawing will render it, so dimensions pack to real text. */
function measureLabel(text) {
  if (!measureContext && typeof document !== "undefined") {
    measureContext = document.createElement("canvas").getContext("2d");
    if (measureContext) measureContext.font = "11px Helvetica, Arial, sans-serif";
  }
  return measureContext ? measureContext.measureText(String(text)).width : String(text).length * 6.2;
}

export default {
  name: "TspTimingCalculator",
  components: { SliderField },
  data() {
    const config = normalizeConfig(null);
    return {
      panel: [],
      intersection: config.intersection,
      approaches: config.approaches,
      activeId: config.activeId,
      showMath: false,
      showHelper: false,
      fileError: "",
      // The last thing that threw work away, and how to get it back.
      undo: null,
      undoOpen: false,
      // Playback
      t: 0,
      playing: false,
      playbackSpeed: 1,
      loop: true,
      lastFrame: null,
      frame: null,
      scrubbing: false,
      sceneWidth: 900,
      // Constants the template reads.
      S: SCENE,
      T: TIMELINE,
      APPROACH_Y,
      spanColors: SPAN_COLORS,
      technologies: TECHNOLOGIES,
      maxApproaches: MAX_APPROACHES,
      phaseOptions: PHASES.map((p) => ({ title: `Phase ${p}`, value: p })),
    };
  },
  computed: {
    active() {
      return this.approaches.find((a) => a.id === this.activeId) || this.approaches[0];
    },
    timing() {
      return computeTiming(this.active);
    },
    motion() {
      return busMotion(this.active, this.timing);
    },
    g() {
      return sceneGeometry(this.active, this.timing, { width: this.sceneWidth, motion: this.motion, measure: measureLabel });
    },
    line() {
      return timelineGeometry(this.motion, this.timing, { width: this.sceneWidth });
    },
    bus() {
      return busAt(this.motion, this.t);
    },
    busX() {
      return this.bus ? this.g.X(this.bus.x) : 0;
    },
    figures() {
      const t = this.timing;
      const s = (v) => (v === null || v === undefined ? "—" : `${v.toFixed(1)} s`);
      return [
        { label: "Request distance", value: t.d > 0 ? ft(t.d) : "—" },
        { label: "Travel", value: s(t.travel) },
        { label: "Lost time", value: s(t.lostTime) },
        { label: "Latency", value: s(t.latency) },
        { label: "ETA", value: s(t.eta) },
        { label: "Crossing", value: s(t.crossTime) },
      ];
    },
    crosswalks() {
      const width = Math.max(6, 10 * this.g.scale);
      const span = this.g.farSide - this.g.stopBar;
      if (span < 2 * width + 12) return [];
      return [
        { x: this.g.stopBar + 5, w: width },
        { x: this.g.farSide - width - 3, w: width },
      ];
    },
    crosswalkStripes() {
      const stripes = [];
      for (let y = SCENE.laneTop + 3; y < SCENE.laneBottom - 3; y += 6) stripes.push(y);
      return stripes;
    },
    laneLineRuns() {
      return [
        { x0: 0, x1: this.g.stopBar },
        { x0: this.g.farSide, x1: this.g.width },
      ].filter((run) => run.x1 > run.x0);
    },
    emitterCone() {
      const d = this.g.detector;
      if (!d) return "";
      const x0 = this.g.mast - 12;
      return [
        [x0, APPROACH_Y + 2],
        [d.rangeEnd, SCENE.laneTop + 1],
        [d.rangeEnd, SCENE.laneBottom - 1],
        [x0, APPROACH_Y + 7],
      ].map((p) => p.join(",")).join(" ");
    },
    cameraCone() {
      const z = this.g.zone;
      if (!z) return "";
      const x0 = this.g.mast - 13;
      return [
        [x0, APPROACH_Y + 4.5],
        [z.x0, SCENE.centerLine + 2],
        [z.x0, SCENE.laneBottom - 2],
      ].map((p) => p.join(",")).join(" ");
    },
    zoneOccupied() {
      const z = this.g.zone;
      return Boolean(z && this.bus && this.busX >= z.x0 && this.busX - this.g.busPx <= z.x1);
    },
    emitterOn() {
      return Boolean(this.bus && this.bus.state !== "approaching" && this.bus.state !== "cleared");
    },
    /** The message's route: the bus at the check-in point, the server, the cabinet. */
    messagePoints() {
      if (!this.g.checkIn) return [];
      return [
        [this.g.checkIn.x, APPROACH_Y],
        [this.g.cloud.x, this.g.cloud.y + 10],
        [this.g.cabinet.x + 9, this.g.cabinet.y + 8],
      ];
    },
    messagePath() {
      return this.messagePoints.map((p) => p.join(",")).join(" ");
    },
    /** The request on its way, while it is in transit. */
    messageDot() {
      if (!this.bus || !this.bus.inTransit || !this.timing.latency) return null;
      const progress = (this.t + this.timing.latency) / this.timing.latency;
      let points = this.messagePoints;
      if (!points.length && this.g.camera) {
        // Video: the camera to the cabinet.
        points = [
          [this.g.mast - 13, APPROACH_Y + 4.5],
          [this.g.cabinet.x + 9, this.g.cabinet.y + 8],
        ];
      }
      if (points.length < 2) return null;
      const legs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
      let along = progress * legs.reduce((a, b) => a + b, 0);
      for (let i = 0; i < legs.length; i += 1) {
        if (along <= legs[i] || i === legs.length - 1) {
          const f = legs[i] ? Math.min(1, along / legs[i]) : 1;
          return {
            x: points[i][0] + (points[i + 1][0] - points[i][0]) * f,
            y: points[i][1] + (points[i + 1][1] - points[i][1]) * f,
          };
        }
        along -= legs[i];
      }
      return null;
    },
    requestFlag() {
      const a = this.active;
      if (a.technology === "emitter") return "Bus enters range";
      if (a.technology === "cloud") return a.cloudTrigger === "eta" ? `ETA reaches ${a.checkInEta} s` : "Check-in point";
      return "Detection zone";
    },
    flagAnchor() {
      const w = this.requestFlag.length * 6.4;
      if (this.g.request - w / 2 < SCENE.pad) return "start";
      return "middle";
    },
    flagX() {
      return this.flagAnchor === "start" ? Math.max(SCENE.pad, this.g.request - 4) : this.g.request;
    },
    bubble() {
      const label = this.bus ? this.bus.label : "";
      const w = label.length * 6.6 + 16;
      const x = Math.min(this.g.width - SCENE.pad - w / 2, Math.max(SCENE.pad + w / 2, this.busX - this.g.busPx / 2));
      return { x, w };
    },
    bubbleFill() {
      return STATE_COLORS[this.bus?.state] || "#334155";
    },
    /**
     * Dashed lines from the road down to each dimension's ends, broken
     * wherever one would cross a label in a row above.
     */
    extensionLines() {
      const top = SCENE.crossBottom - 6;
      const reach = new Map();
      for (const dim of this.g.dims) {
        for (const x of [dim.x0, dim.x1]) {
          const key = Math.round(x * 10) / 10;
          reach.set(key, Math.max(reach.get(key) ?? 0, dim.y + 4));
        }
      }
      const boxes = this.g.dims.map((d) => ({ x0: d.labL - 2, x1: d.labR + 2, y0: d.y - 13, y1: d.y + 1 }));
      const lines = [];
      for (const [x, bottom] of reach) {
        const cuts = boxes.filter((b) => x >= b.x0 && x <= b.x1 && b.y0 < bottom).sort((a, b) => a.y0 - b.y0);
        let y = top;
        for (const cut of cuts) {
          if (cut.y0 > y) lines.push({ x, y1: y, y2: cut.y0 });
          y = Math.max(y, cut.y1);
        }
        if (bottom > y) lines.push({ x, y1: y, y2: bottom });
      }
      return lines;
    },
    distanceText() {
      if (!this.bus) return "";
      const x = this.bus.x;
      if (x < -0.5) return `${ft(-x)} to the stop bar`;
      if (x <= this.timing.crossDistance) return `${ft(x)} past the stop bar`;
      return "Through the intersection";
    },
    sceneLabel() {
      const t = this.timing;
      if (t.tsd === null) return "Approach drawing. The request cannot start where it is set.";
      return `Approach drawing: the request starts ${ft(t.d)} before the stop bar. `
        + `TSD ${t.tsd} seconds, TED ${t.ted} seconds.`;
    },
    lostHelper() {
      return lostTimeEstimate({ speed: this.active.speed, ...this.active.helper });
    },
    helperText() {
      const h = this.lostHelper;
      const parts = [];
      if (this.active.helper.stops) {
        parts.push(`braking ${h.braking.toFixed(1)} s`, `pulling away ${h.accel.toFixed(1)} s`);
      }
      parts.push(`dwell ${h.dwell.toFixed(1)} s`, `queue ${h.queue.toFixed(1)} s`);
      return `At ${this.active.speed || 0} mph: ${parts.join(" + ")} = ${h.total.toFixed(1)} s.`;
    },
    summaryRows() {
      return this.approaches.map((a) => {
        const t = computeTiming(a);
        const ok = t.tsd !== null && !t.errors.length;
        const tech = TECHNOLOGIES[a.technology] ? a.technology : "emitter";
        return {
          id: a.id,
          name: a.name || "Approach",
          phase: a.phase,
          detection: tech === "cloud" && a.cloudTrigger === "eta" ? "Cloud (ETA)" : TECHNOLOGIES[tech].label,
          request: t.d > 0 ? ft(t.d) : "—",
          lost: `${(t.lostTime || 0).toFixed(1)} s`,
          tsd: ok ? `${t.tsd} s` : "check",
          ted: ok ? `${t.ted} s` : "check",
        };
      });
    },
    snapshot() {
      return toSaveFile({ intersection: this.intersection, approaches: this.approaches, activeId: this.activeId });
    },
  },
  watch: {
    snapshot: {
      deep: true,
      handler(value) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch {
          // Private windows and full storage: everything still works, it just
          // will not be here after a refresh.
        }
      },
    },
    motion(motion) {
      // New inputs, new trip: keep the playhead, inside the new one.
      if (motion) this.t = Math.min(motion.end, Math.max(motion.start, this.t));
    },
    activeId() {
      this.restart();
    },
  },
  created() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      saved = null;
    }
    if (saved) this.applyConfig(normalizeConfig(saved));
    this.t = this.motion ? this.motion.start : 0;
  },
  mounted() {
    if (typeof ResizeObserver !== "undefined") {
      this.resizer = new ResizeObserver(([entry]) => {
        this.sceneWidth = Math.max(260, Math.round(entry.contentRect.width));
      });
      this.resizer.observe(this.$refs.sceneWrap);
    }
    const reduced = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) this.play();
  },
  beforeUnmount() {
    this.pause();
    if (this.resizer) this.resizer.disconnect();
  },
  methods: {
    applyConfig(config) {
      this.intersection = config.intersection;
      this.approaches = config.approaches;
      this.activeId = config.activeId;
    },
    addApproach() {
      const next = newApproach(this.approaches, this.active);
      this.approaches.push(next);
      this.activeId = next.id;
    },
    /**
     * Deleting, starting over and opening a file all throw work away, so each
     * offers Undo rather than asking first: a confirm() dialog is one more
     * click every time, and some embedded browsers block it outright.
     */
    offerUndo(message) {
      this.undo = { message, saved: JSON.parse(JSON.stringify(this.snapshot)) };
      this.undoOpen = true;
    },
    undoLast() {
      if (this.undo) this.applyConfig(normalizeConfig(this.undo.saved));
      this.undo = null;
      this.undoOpen = false;
    },
    deleteApproach() {
      if (this.approaches.length < 2) return;
      this.offerUndo(`Deleted ${this.active.name || "the approach"}.`);
      const index = this.approaches.findIndex((a) => a.id === this.active.id);
      // Move off the tab first: the tab bar scrolls to the selected tab, and
      // one that no longer exists cannot be scrolled to.
      this.activeId = this.approaches[index === 0 ? 1 : index - 1].id;
      this.approaches.splice(index, 1);
    },
    useHelper() {
      this.active.lostTime = Math.round(this.lostHelper.total * 10) / 10;
    },
    countdown(name, at) {
      if (at === null || at === undefined) return "";
      const left = at - this.t;
      return left > 0 ? `${name} in ${left.toFixed(1)} s` : `${name} passed`;
    },
    /* Playback */
    togglePlay() {
      if (this.playing) this.pause();
      else this.play();
    },
    play() {
      if (!this.motion || this.playing) return;
      if (this.t >= this.motion.end) this.t = this.motion.start;
      this.playing = true;
      this.lastFrame = null;
      this.frame = requestAnimationFrame(this.tick);
    },
    pause() {
      this.playing = false;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = null;
    },
    restart() {
      this.t = this.motion ? this.motion.start : 0;
    },
    tick(now) {
      if (!this.playing) return;
      const motion = this.motion;
      if (!motion) {
        this.pause();
        return;
      }
      if (this.lastFrame !== null && !this.scrubbing) {
        // A background tab stops frames; do not jump the whole gap on return.
        const dt = Math.min(0.1, (now - this.lastFrame) / 1000) * this.playbackSpeed;
        let next = this.t + dt;
        if (next >= motion.end + LOOP_PAUSE) {
          if (this.loop) {
            next = motion.start;
          } else {
            this.t = motion.end;
            this.pause();
            return;
          }
        }
        this.t = next;
      }
      this.lastFrame = now;
      this.frame = requestAnimationFrame(this.tick);
    },
    /* Scrubbing on the timeline */
    timeAt(event) {
      const svg = this.$refs.timeline;
      if (!svg || !this.motion) return this.t;
      const rect = svg.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * this.line.width;
      const f = (px - TIMELINE.pad) / (this.line.width - 2 * TIMELINE.pad);
      const { start, end } = this.motion;
      return Math.min(end, Math.max(start, start + f * (end - start)));
    },
    startScrub(event) {
      this.scrubbing = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      this.t = this.timeAt(event);
    },
    moveScrub(event) {
      if (this.scrubbing) this.t = this.timeAt(event);
    },
    endScrub() {
      this.scrubbing = false;
    },
    scrubKey(event) {
      if (!this.motion) return;
      const { start, end } = this.motion;
      const moves = { ArrowLeft: -0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowUp: 0.5, PageDown: -5, PageUp: 5 };
      if (event.key in moves) {
        this.pause();
        this.t = Math.min(end, Math.max(start, this.t + moves[event.key]));
      } else if (event.key === "Home") {
        this.pause();
        this.t = start;
      } else if (event.key === "End") {
        this.pause();
        this.t = end;
      } else if (event.key === " ") {
        this.togglePlay();
      } else {
        return;
      }
      event.preventDefault();
    },
    /* Files */
    fileStem() {
      const slug = this.intersection.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return slug ? `${slug}-tsp-timing` : "tsp-timing";
    },
    saveFile() {
      const blob = new Blob([JSON.stringify(this.snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${this.fileStem()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    async openFile(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      this.fileError = "";
      try {
        const config = fromSaveFile(await file.text());
        this.offerUndo(`Opened ${file.name}.`);
        this.applyConfig(config);
      } catch (err) {
        this.fileError = `Could not open ${file.name}: ${err.message}`;
      }
    },
    startOver() {
      this.offerUndo("Started over.");
      this.applyConfig(normalizeConfig(null));
      this.fileError = "";
    },
  },
};
</script>

<style scoped>
.tsp-layout {
  display: grid;
  grid-template-columns: minmax(320px, 440px) minmax(0, 1fr);
  grid-template-areas:
    "approaches output"
    "inputs output";
  grid-template-rows: auto 1fr;
  column-gap: 16px;
  align-items: start;
}
.tsp-area-approaches {
  grid-area: approaches;
}
.tsp-area-inputs {
  grid-area: inputs;
}
.tsp-area-output {
  grid-area: output;
  position: sticky;
  top: 76px;
}
@media (max-width: 1100px) {
  .tsp-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "approaches"
      "output"
      "inputs";
  }
  .tsp-area-output {
    position: static;
  }
}
.setup-card {
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  text-align: left;
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
.warn-text {
  color: rgb(var(--v-theme-error));
  opacity: 1;
}
.sub-title {
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 6px;
}
.steps {
  padding-left: 1.2rem;
}
.formula {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  padding: 8px 12px;
}
.settings-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.setting--mid {
  flex: 1 1 180px;
  min-width: 160px;
}
.setting--narrow {
  flex: 0 1 140px;
  min-width: 120px;
}
.slider-field {
  margin-bottom: 12px;
}
.result-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.result-tile {
  flex: 1 1 200px;
  border-radius: 12px;
  padding: 12px 16px;
  color: #fff;
}
.result-tile--tsd {
  background: #0f766e;
}
.result-tile--ted {
  background: #1d4ed8;
}
.result-tile--off {
  background: #94a3b8;
}
.result-tile .metric-label,
.result-tile .muted {
  color: rgba(255, 255, 255, 0.85);
  opacity: 1;
}
.result-value {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.result-unit {
  font-size: 1.1rem;
  font-weight: 600;
  margin-left: 4px;
}
.metric-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.muted {
  opacity: 0.7;
  font-size: 0.8rem;
}
.figure-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.figure {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  padding: 6px 10px;
}
.figure-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.figure-label {
  font-size: 0.72rem;
  opacity: 0.7;
}
.math-table {
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-top: 4px;
}
.math-table th {
  text-align: left;
  font-weight: 600;
  padding: 2px 12px 2px 0;
  white-space: nowrap;
  vertical-align: top;
}
.math-table td {
  padding: 2px 0;
  font-variant-numeric: tabular-nums;
}
.scene-wrap {
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
}
.tsp-scene,
.tsp-timeline {
  display: block;
  width: 100%;
  height: auto;
}
.tsp-timeline {
  margin-top: 6px;
  cursor: ew-resize;
  touch-action: none;
  border-radius: 6px;
}
.tsp-timeline:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.78rem;
  opacity: 0.85;
  margin-top: 2px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 8px;
  border-radius: 2px;
}
.swatch--dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.player {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.loop-switch {
  flex: 0 0 auto;
}
.readout {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  font-size: 0.85rem;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.helper {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 4px 0 8px 12px;
  margin-bottom: 12px;
}
.summary-table tbody tr {
  cursor: pointer;
}
.row--active td {
  background: rgba(var(--v-theme-primary), 0.1);
}
.num {
  text-align: right;
}
.nowrap {
  white-space: nowrap;
}
.hidden-file {
  display: none;
}
/* The TSP call light glows while the request is live; the emitter flashes. */
.tsp-light--on {
  animation: tsp-glow 1s ease-in-out infinite;
}
.emitter--on {
  animation: emitter-flash 0.4s steps(2, jump-none) infinite;
}
@keyframes tsp-glow {
  50% {
    opacity: 0.55;
  }
}
@keyframes emitter-flash {
  0% {
    fill: #ffffff;
  }
  100% {
    fill: #fde047;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tsp-light--on,
  .emitter--on {
    animation: none;
  }
}
</style>
