<template>
  <div v-if="dataIsPresent" class="metric">
    <div class="label">{{ data.label }}</div>
    <div class="value-box">
      <span class="value">{{ data.value }}</span
      ><br />
      <span class="unit">{{ data.unit }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  computed: {
    dataIsPresent() {
      return this.data !== null || this.data.length > 0;
    },
  },
};
</script>

<style scoped>
.metric {
  text-align: center;
}

.label {
  font-size: 20px;
  color: #888;
  margin-bottom: 5px;
}

.value {
  font-size: 24px;
  font-weight: bold;
}
.value-box {
  display: inline-block;
  padding: 5px 10px;
  border: 2px solid #333;
  border-radius: 5px;
}
.unit {
  font-size: 14px;
  color: #333;
}
</style>
