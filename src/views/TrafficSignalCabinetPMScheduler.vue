<template>
  <v-container class="tool-container">
    <h1 class="h1-center-text">Traffic Signal Cabinet PM Scheduler</h1>
    <v-card class="tool-card" elevation="2">
      <v-card-text>
        <p class="tool-intro">
          Paste GTSS-formatted signal locations (from
          <a href="https://gtss.dev" target="_blank" rel="noopener">gtss.dev</a>),
          set the technician count, and choose default preventative maintenance
          frequencies. Adjust individual cabinet frequencies, then rebuild the
          schedule to assign each visit by month.
        </p>
        <v-row>
          <v-col cols="12" md="6">
            <label class="input-label">GTSS Signal List</label>
            <InputBox
              v-model="signalsInput"
              :default-text="defaultSignals"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-card class="settings-card" variant="outlined">
              <v-card-text>
                <v-text-field
                  v-model.number="technicianCount"
                  type="number"
                  min="1"
                  label="Number of technicians"
                  variant="outlined"
                  density="comfortable"
                />
                <v-select
                  v-model.number="defaultFrequency"
                  :items="frequencyOptions"
                  item-title="label"
                  item-value="value"
                  label="Default frequency (months)"
                  variant="outlined"
                  density="comfortable"
                />
                <v-btn
                  color="primary"
                  class="mt-2"
                  @click="rebuildSchedule"
                >
                  Rebuild schedule
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="tool-card" elevation="2">
      <v-card-title class="section-title">Cabinet Frequencies</v-card-title>
      <v-card-text>
        <p v-if="signalRows.length === 0" class="muted-text">
          Add GTSS signal lines to generate cabinet frequency controls.
        </p>
        <v-table v-else class="cabinet-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Agency</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Frequency</th>
              <th>Map</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="signal in signalRows" :key="signal.key">
              <td class="signal-id">{{ signal.signalId }}</td>
              <td>{{ signal.agencyId }}</td>
              <td>{{ signal.latitude }}</td>
              <td>{{ signal.longitude }}</td>
              <td class="frequency-cell">
                <v-select
                  v-model.number="frequencyOverrides[signal.key]"
                  :items="frequencyOptions"
                  item-title="label"
                  item-value="value"
                  label="Frequency"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </td>
              <td>
                <div class="map-box">
                  <iframe
                    :src="signal.mapUrl"
                    loading="lazy"
                    title="Signal map"
                  ></iframe>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-card class="tool-card" elevation="2">
      <v-card-title class="section-title">Monthly Technician Schedule</v-card-title>
      <v-card-text>
        <p v-if="scheduleRows.length === 0" class="muted-text">
          Enter signals and click “Rebuild schedule” to populate the table.
        </p>
        <v-table v-else class="schedule-table">
          <thead>
            <tr>
              <th>Technician</th>
              <th v-for="month in months" :key="month">{{ month }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in scheduleRows" :key="row.name">
              <td class="tech-name">{{ row.name }}</td>
              <td v-for="month in months" :key="month">
                <ul v-if="row.assignments[month].length" class="assignment-list">
                  <li v-for="cabinet in row.assignments[month]" :key="cabinet">
                    {{ cabinet }}
                  </li>
                </ul>
                <span v-else class="muted-text">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import InputBox from "@/components/foundational/InputBox.vue";

export default {
  name: "TrafficSignalCabinetPMScheduler",
  components: {
    InputBox,
  },
  data() {
    return {
      defaultSignals:
        "signal_id,agency_id,latitude,longitude\n16,WC,37.92745102883522,-122.01467865377727\n2,WC,37.90499423048438,-122.06572811915521\n3,WC,37.906184628902054,-122.06432758290217\n28,WC,37.89260882839668,-122.06111411892594\n43,WC,37.89737707796012,-122.05995082855226\n36,WC,37.91166672982153,-122.06015467643739",
      signalsInput: "",
      technicianCount: 3,
      defaultFrequency: 3,
      frequencyOverrides: {},
      scheduleRows: [],
      months: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      frequencyOptions: [
        { label: "Monthly", value: 1 },
        { label: "Every 2 months", value: 2 },
        { label: "Quarterly", value: 3 },
        { label: "Every 4 months", value: 4 },
        { label: "Semiannual", value: 6 },
        { label: "Annual", value: 12 },
      ],
    };
  },
  computed: {
    signalRows() {
      const text = this.signalsInput || this.defaultSignals;
      const rows = this.parseSignals(text);
      return rows.map((row) => ({
        ...row,
        frequency: this.getFrequencyForSignal(row.key),
        mapUrl: this.buildMapUrl(row.latitude, row.longitude),
      }));
    },
  },
  watch: {
    defaultFrequency() {
      this.rebuildSchedule();
    },
    technicianCount() {
      this.rebuildSchedule();
    },
    signalsInput() {
      this.initializeOverrides();
    },
  },
  mounted() {
    this.initializeOverrides();
    this.rebuildSchedule();
  },
  methods: {
    parseSignals(text) {
      return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.toLowerCase().startsWith("signal_id"))
        .map((line) => line.split(",").map((value) => value.trim()))
        .map(([signalId, agencyId, latitude, longitude]) => {
          const lat = Number(latitude);
          const lon = Number(longitude);
          if (!signalId || !agencyId || Number.isNaN(lat) || Number.isNaN(lon)) {
            return null;
          }
          const key = `${signalId}-${agencyId}`;
          return {
            key,
            signalId,
            agencyId,
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6),
            displayName: `Signal ${signalId} (${agencyId})`,
          };
        })
        .filter(Boolean);
    },
    buildMapUrl(latitude, longitude) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return "";
      }
      const delta = 0.002;
      const minLon = (lon - delta).toFixed(6);
      const minLat = (lat - delta).toFixed(6);
      const maxLon = (lon + delta).toFixed(6);
      const maxLat = (lat + delta).toFixed(6);
      return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lon}`;
    },
    initializeOverrides() {
      const updated = {};
      this.signalRows.forEach((signal) => {
        updated[signal.key] =
          this.frequencyOverrides[signal.key] ?? this.defaultFrequency;
      });
      this.frequencyOverrides = updated;
      this.rebuildSchedule();
    },
    getFrequencyForSignal(signalKey) {
      return this.frequencyOverrides[signalKey] ?? this.defaultFrequency;
    },
    rebuildSchedule() {
      const techCount = Math.max(1, Number(this.technicianCount) || 1);
      const signals = this.signalRows;
      if (signals.length === 0) {
        this.scheduleRows = [];
        return;
      }

      const visits = [];
      signals.forEach((signal) => {
        const frequency = this.getFrequencyForSignal(signal.key);
        const monthsToVisit = this.months.filter((_, index) => {
          return index % frequency === 0;
        });
        monthsToVisit.forEach((month) => {
          visits.push({ month, signal: signal.displayName });
        });
      });

      const technicians = Array.from({ length: techCount }, (_, index) => ({
        name: `Technician ${index + 1}`,
        assignments: Object.fromEntries(this.months.map((month) => [month, []])),
      }));

      visits.forEach((visit, index) => {
        const techIndex = index % techCount;
        technicians[techIndex].assignments[visit.month].push(visit.signal);
      });

      this.scheduleRows = technicians;
    },
  },
};
</script>

<style scoped>
.tool-container {
  padding: 24px 16px 48px;
}

.tool-card {
  margin-bottom: 24px;
}

.tool-intro {
  margin-bottom: 16px;
  line-height: 1.6;
}

.tool-intro a {
  color: inherit;
  font-weight: 600;
}

.input-label {
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
}

.settings-card {
  background: rgba(0, 150, 136, 0.06);
}

.section-title {
  font-weight: 600;
}

.cabinet-table {
  width: 100%;
}

.cabinet-table th,
.cabinet-table td {
  vertical-align: top;
  padding: 8px 12px;
}

.signal-id {
  font-weight: 600;
}

.frequency-cell {
  min-width: 180px;
}

.map-box {
  width: 160px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.map-box iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.schedule-table {
  width: 100%;
  overflow-x: auto;
}

.tech-name {
  font-weight: 600;
  white-space: nowrap;
}

.assignment-list {
  padding-left: 16px;
  margin: 0;
}

.muted-text {
  color: rgba(0, 0, 0, 0.6);
}
</style>
