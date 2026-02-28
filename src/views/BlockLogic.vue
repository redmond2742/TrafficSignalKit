<template>
  <v-container fluid>
    <v-card class="pa-4 mb-4">
      <v-row align="center" dense>
        <v-col cols="12" md="3">
          <v-select :items="templateOptions" item-title="name" item-value="name" label="Load template" density="compact" @update:modelValue="applyTemplateByName" />
        </v-col>
        <v-col cols="12" md="9" class="d-flex ga-2 flex-wrap">
          <v-btn color="primary" @click="runRules">Run</v-btn>
          <v-btn color="secondary" @click="stepRules">Step</v-btn>
          <v-btn @click="resetRuntime">Reset</v-btn>
          <v-btn @click="parseDatasetText">Parse HR Data</v-btn>
          <v-btn @click="exportRules">Export Rules JSON</v-btn>
          <v-btn @click="triggerImport">Import Rules JSON</v-btn>
          <v-btn v-if="workerRef" color="error" variant="outlined" @click="cancelRun">Cancel</v-btn>
          <input ref="importInput" type="file" accept="application/json" class="d-none" @change="importRules" />
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <div class="text-subtitle-2 mb-1">High Resolution Data Input</div>
          <InputBox v-model="datasetText" default-text="Paste HR CSV with headers (timestamp,eventType,channel,state,value) or JSON array of events." />
          <div class="text-caption mt-1">Parsed events: {{ datasetEvents.length }}</div>
        </v-col>
      </v-row>
      <v-progress-linear v-if="runProgress.total" :model-value="(runProgress.cursor / runProgress.total) * 100" class="mt-2" color="primary" height="8" />
    </v-card>

    <v-row>
      <v-col cols="12" md="3">
        <v-card title="Block Palette" class="pa-2">
          <div class="text-subtitle-2 mb-2">Conditions / Operators</div>
          <v-chip v-for="item in conditionPalette" :key="item.type" class="ma-1" draggable="true" @dragstart="startDrag('condition', item.type)">{{ item.label }}</v-chip>
          <div class="text-subtitle-2 mt-4 mb-2">Actions</div>
          <v-chip v-for="item in actionPalette" :key="item.type" color="teal" class="ma-1" draggable="true" @dragstart="startDrag('action', item.type)">{{ item.label }}</v-chip>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card title="Canvas Workspace" class="pa-3">
          <v-btn size="small" class="mb-3" @click="addRule">+ Add Rule Block</v-btn>
          <v-alert v-if="validationErrors.length" type="warning" density="compact" class="mb-2">
            <div v-for="error in validationErrors" :key="error">{{ error }}</div>
          </v-alert>
          <v-card v-for="rule in schema.rules" :key="rule.id" class="mb-3 pa-3" :style="{ borderLeft: `6px solid ${rule.color}` }">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-subtitle-1" @click="selectNode('rule', rule)">{{ rule.name }}</div>
                <div class="text-caption">WHEN: {{ rule.trigger.type }}</div>
              </div>
              <v-switch v-model="rule.enabled" label="Enabled" hide-details density="compact" />
            </div>

            <div class="drop-zone mt-2" @dragover.prevent @drop="dropCondition(rule)">
              <strong>IF:</strong> <span v-if="rule.if" @click="selectNode('condition', rule.if)">{{ describeCondition(rule.if) }}</span>
              <span v-else class="text-medium-emphasis">Drop a condition block here</span>
            </div>

            <div class="drop-zone mt-2" @dragover.prevent @drop="dropAction(rule)">
              <strong>THEN Actions:</strong>
              <v-list density="compact" class="py-0">
                <v-list-item v-for="action in rule.actions" :key="action.id" @click="selectNode('action', action)">
                  <v-list-item-title>{{ describeAction(action) }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <span class="text-medium-emphasis">Drop action blocks here</span>
            </div>
          </v-card>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card title="Inspector" class="pa-3">
          <div v-if="!selected.obj" class="text-medium-emphasis">Select a block to edit.</div>
          <template v-else>
            <div class="text-subtitle-2 mb-2">{{ selected.kind }}: {{ selected.obj.type || selected.obj.name }}</div>

            <template v-if="selected.kind === 'rule'">
              <v-text-field v-model="selected.obj.name" label="Rule name" density="compact" />
              <v-text-field v-model="selected.obj.color" label="Color tag" density="compact" />
              <v-select v-model="selected.obj.trigger.type" :items="[{title:'continuous',value:'continuous'},{title:'onChange',value:'onChange'}]" label="Trigger mode" density="compact" />
              <v-text-field v-model.number="selected.obj.rateLimitPerMinute" type="number" label="Max firings / minute" density="compact" />
            </template>

            <template v-if="selected.kind === 'condition'">
              <v-select v-model="selected.obj.type" :items="conditionPalette" item-title="label" item-value="type" label="Condition type" density="compact" />
              <v-select v-if="selected.obj.type === 'phase'" v-model="selected.obj.signal" :items="['green','yellow','red']" label="Signal" density="compact" />
              <v-text-field v-if="selected.obj.type === 'phase'" v-model.number="selected.obj.phase" type="number" label="Phase" density="compact" />
              <v-select v-if="selected.obj.type === 'phase' || selected.obj.type==='detector' || selected.obj.type==='ped'" v-model="selected.obj.mode" :items="['level','edgeRising','edgeFalling']" label="Mode" density="compact" />
              <v-select v-if="selected.obj.type === 'phase' || selected.obj.type==='detector' || selected.obj.type==='ped'" v-model.number="selected.obj.target" :items="[{title:'ON',value:1},{title:'OFF',value:0}]" label="Target" density="compact" />
              <v-text-field v-if="selected.obj.type === 'detector'" v-model.number="selected.obj.channel" type="number" label="Detector channel" density="compact" />
              <v-text-field v-if="selected.obj.type === 'threshold'" v-model="selected.obj.metric" label="Metric" density="compact" />
              <v-text-field v-if="selected.obj.type === 'threshold'" v-model.number="selected.obj.phase" label="Phase" density="compact" />
              <v-select v-if="selected.obj.type === 'threshold'" v-model="selected.obj.op" :items="['>','>=','<','<=','==']" label="Operator" density="compact" />
              <v-text-field v-if="selected.obj.type === 'threshold'" v-model.number="selected.obj.value" type="number" label="Threshold value" density="compact" />
              <v-text-field v-if="selected.obj.type === 'timeWindow'" v-model="selected.obj.start" label="Start HH:MM" density="compact" />
              <v-text-field v-if="selected.obj.type === 'timeWindow'" v-model="selected.obj.end" label="End HH:MM" density="compact" />
              <v-text-field v-if="selected.obj.type === 'hold'" v-model.number="selected.obj.holdSec" type="number" label="Hold true seconds" density="compact" />
              <v-text-field v-if="selected.obj.type === 'sequence'" v-model.number="selected.obj.withinSec" type="number" label="Within seconds" density="compact" />
            </template>

            <template v-if="selected.kind === 'action'">
              <v-select v-model="selected.obj.type" :items="actionPalette" item-title="label" item-value="type" label="Action type" density="compact" />
              <v-text-field v-if="selected.obj.type === 'plotPoint' || selected.obj.type === 'plotRange'" v-model.number="selected.obj.phase" type="number" label="Phase/Y value" density="compact" />
              <v-text-field v-if="selected.obj.type === 'emitFlag'" v-model="selected.obj.severity" label="Severity" density="compact" />
              <v-text-field v-if="selected.obj.type === 'emitFlag'" v-model="selected.obj.message" label="Message template" density="compact" />
              <v-text-field v-if="selected.obj.type === 'setVar' || selected.obj.type === 'incrementCounter' || selected.obj.type === 'startTimer' || selected.obj.type === 'stopTimer'" v-model="selected.obj.key" label="Key" density="compact" />
              <v-text-field v-if="selected.obj.type === 'setVar'" v-model="selected.obj.value" label="Value" density="compact" />
              <v-text-field v-if="selected.obj.type === 'incrementCounter'" v-model.number="selected.obj.amount" type="number" label="Increment by" density="compact" />
            </template>
          </template>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4">
      <v-tabs v-model="resultsTab" color="primary">
        <v-tab value="events">Events Table</v-tab>
        <v-tab value="plots">Plots</v-tab>
        <v-tab value="logs">Logs</v-tab>
        <v-tab value="diagnostics">Diagnostics</v-tab>
      </v-tabs>
      <v-window v-model="resultsTab">
        <v-window-item value="events">
          <v-data-table :items="outputs.events" :headers="eventHeaders" density="compact" />
        </v-window-item>
        <v-window-item value="plots" class="pa-4">
          <Scatter v-if="plotDatasets.length" :data="plotData" :options="plotOptions" />
          <div v-else class="text-medium-emphasis">No plot points yet.</div>
        </v-window-item>
        <v-window-item value="logs">
          <v-list density="compact">
            <v-list-item v-for="(log, i) in outputs.logs" :key="`log-${i}`">{{ log }}</v-list-item>
          </v-list>
        </v-window-item>
        <v-window-item value="diagnostics">
          <v-data-table :items="outputs.diagnostics" :headers="diagHeaders" density="compact" />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { Scatter } from 'vue-chartjs';
import { Chart as ChartJS, PointElement, LinearScale, Tooltip, Legend } from 'chart.js';
import InputBox from '../components/foundational/InputBox.vue';
import { actionPalette, builtInTemplates, conditionPalette, createAction, createCondition, createEmptySchema, createRule, validateSchema } from '../utils/blockLogicSchema.js';
import { createRuntime } from '../utils/blockLogicEngine.js';

ChartJS.register(PointElement, LinearScale, Tooltip, Legend);

const schema = reactive(createEmptySchema());
const templateOptions = builtInTemplates();
const selected = reactive({ kind: null, obj: null });
const datasetText = ref('');
const datasetEvents = ref([]);
const outputs = reactive({ events: [], table: [], plots: [], logs: [], diagnostics: [] });
const resultsTab = ref('events');
const runtimeRef = ref(null);
const workerRef = ref(null);
const runProgress = reactive({ cursor: 0, total: 0 });
const importInput = ref(null);
let dragPayload = null;

const eventHeaders = [
  { title: 'Timestamp', key: 'timestamp' }, { title: 'Rule', key: 'ruleName' }, { title: 'Type', key: 'eventType' }, { title: 'Value', key: 'value' },
];
const diagHeaders = [{ title: 'Timestamp', key: 'timestamp' }, { title: 'Severity', key: 'severity' }, { title: 'Message', key: 'message' }];

const validationErrors = computed(() => validateSchema(schema));
const plotDatasets = computed(() => outputs.plots.filter((plot) => plot.type === 'point'));
const plotData = computed(() => ({ datasets: [{ label: 'Rule Points', data: plotDatasets.value.map((p) => ({ x: p.x, y: p.y })), backgroundColor: '#1976D2' }] }));
const plotOptions = { responsive: true, scales: { x: { type: 'linear', ticks: { callback: (v) => new Date(Number(v)).toLocaleTimeString() } }, y: { type: 'linear' } } };

function addRule() { schema.rules.push(createRule(`Rule ${schema.rules.length + 1}`)); }
function selectNode(kind, obj) { selected.kind = kind; selected.obj = obj; }
function startDrag(kind, type) { dragPayload = { kind, type }; }
function dropCondition(rule) { if (dragPayload?.kind !== 'condition') return; rule.if = createCondition(dragPayload.type); dragPayload = null; }
function dropAction(rule) { if (dragPayload?.kind !== 'action') return; rule.actions.push(createAction(dragPayload.type)); dragPayload = null; }

function describeCondition(cond) {
  if (!cond) return 'None';
  if (cond.type === 'phase') return `IF ${cond.signal?.toUpperCase()} phase ${cond.phase} ${cond.mode}=${cond.target ? 'ON' : 'OFF'}`;
  if (cond.type === 'detector') return `IF detector ${cond.channel} ${cond.mode}=${cond.target ? 'ON' : 'OFF'}`;
  if (cond.type === 'hold') return `HOLD (${describeCondition(cond.condition)}) for ${cond.holdSec}s`;
  if (cond.type === 'sequence') return `(${describeCondition(cond.first)}) THEN (${describeCondition(cond.second)}) <= ${cond.withinSec}s`;
  if (cond.type === 'and' || cond.type === 'or') return `${cond.type.toUpperCase()}(${(cond.conditions || []).map(describeCondition).join(', ')})`;
  if (cond.type === 'threshold') return `${cond.metric} ${cond.op} ${cond.value}`;
  return cond.type;
}
function describeAction(action) { return `${action.type}${action.key ? ` (${action.key})` : ''}`; }

function parseDatasetText() {
  const trimmed = datasetText.value?.trim();
  if (!trimmed) {
    datasetEvents.value = [];
    return;
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    datasetEvents.value = Array.isArray(parsed) ? parsed : parsed.events || [];
    return;
  }

  const [header, ...lines] = trimmed.split(/\r?\n/).filter(Boolean);
  const cols = header.split(',').map((cell) => cell.trim());
  datasetEvents.value = lines
    .map((line) => line.split(','))
    .map((cells) => Object.fromEntries(cols.map((col, index) => [col, cells[index]?.trim()])));
}

function applyTemplateByName(name) {
  const template = templateOptions.find((t) => t.name === name);
  if (!template) return;
  schema.version = template.schema.version;
  schema.rules = template.schema.rules;
}

function triggerImport() { importInput.value?.click(); }
async function importRules(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  schema.version = parsed.version;
  schema.rules = parsed.rules;
}

function exportRules() {
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'block-logic-rules.json';
  a.click();
  URL.revokeObjectURL(url);
}

function syncOutputs(next) {
  outputs.events = [...next.events];
  outputs.table = [...next.table];
  outputs.plots = [...next.plots];
  outputs.logs = [...next.logs];
  outputs.diagnostics = [...next.diagnostics];
}

function resetRuntime() {
  runtimeRef.value?.reset();
  syncOutputs({ events: [], table: [], plots: [], logs: [], diagnostics: [] });
  runProgress.cursor = 0;
  runProgress.total = runtimeRef.value?.total || 0;
}

function stepRules() {
  if (!datasetEvents.value.length) parseDatasetText();
  if (!runtimeRef.value) runtimeRef.value = createRuntime(schema, datasetEvents.value);
  const status = runtimeRef.value.step();
  runProgress.cursor = status.cursor;
  runProgress.total = runtimeRef.value.total;
  syncOutputs(status.outputs);
}

function runRules() {
  if (validationErrors.value.length) return;
  if (!datasetEvents.value.length) parseDatasetText();
  if (!datasetEvents.value.length) return;
  runtimeRef.value = createRuntime(schema, datasetEvents.value);
  runProgress.cursor = 0;
  runProgress.total = runtimeRef.value.total;

  if (datasetEvents.value.length > 10000) {
    const worker = new Worker(new URL('../workers/blockLogicWorker.js', import.meta.url), { type: 'module' });
    workerRef.value = worker;
    worker.onmessage = (event) => {
      if (event.data.type === 'progress') Object.assign(runProgress, event.data.payload);
      if (event.data.type === 'done') {
        syncOutputs(event.data.payload);
        runProgress.cursor = runProgress.total;
        worker.terminate();
        workerRef.value = null;
      }
    };
    worker.postMessage({ type: 'run', payload: { schema, events: datasetEvents.value } });
    return;
  }

  const result = runtimeRef.value.run((progress) => Object.assign(runProgress, progress));
  syncOutputs(result.outputs);
  runProgress.cursor = runProgress.total;
}

function cancelRun() {
  workerRef.value?.terminate();
  workerRef.value = null;
}
</script>

<style scoped>
.drop-zone {
  border: 1px dashed #90a4ae;
  border-radius: 6px;
  padding: 8px;
  min-height: 56px;
}
</style>
