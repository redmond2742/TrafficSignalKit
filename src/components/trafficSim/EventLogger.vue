<template>
  <div>
    <h3>Event Log</h3>
    &nbsp;
    <div class="log-window">
      <div class="log-messages">
        <p v-for="(log, index) in logs" :key="index">{{ log }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      logs: [],
    };
  },
  methods: {
    addLog(message) {
      this.logs.push(message);
    },
  },
};
</script>

