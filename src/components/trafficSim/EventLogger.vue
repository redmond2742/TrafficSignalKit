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

<style>
.log-window {
  border: 1px solid #ccc;
  padding: 10px;
  width: 100%;
  max-width: 520px;
  height: 200px;
  overflow-y: auto;
  position: relative;
  bottom: 10px;
  margin-left: auto;
  margin-right: auto;

  background-color: white;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}

.log-messages {
  max-height: 100%;
  overflow-y: auto;
}

.log-messages p {
  margin: 0;
  padding: 2px 0;
}
</style>
