<template>
  <div class="traffic-light" :style="childStyle">
    <div class="light red" :class="{ active: state === 'red' }"></div>
    <div class="light green" :class="{ active: state === 'green' }"></div>
  </div>
</template>

<script>
export default {
  props: {
    state: {
      type: String,
      required: true,
      validator: function (value) {
        return ["red", "green"].includes(value);
      },
    },

    rotate: {
      type: String,
      default: "rotate(0deg)",
    },
    adjustL: {
      type: String,
      default: "0px",
    },
    adjustT: {
      type: String,
      default: "0px",
    },
    position: {
      type: String,
      default: "absolute",
    },
  },
  computed: {
    childStyle() {
      return {
        transform: this.rotate,
        left: this.adjustL,
        position: this.position,
        top: this.adjustT,
      };
    },
  },
};
</script>

<style scoped>
.traffic-light {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 54px;
  height: 120px;
  padding: 10px 8px;
  border-radius: 28px;
  background-color: #1f2328;
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.08),
    0 6px 12px rgba(15, 23, 42, 0.2);
  z-index: 91;
}

.light {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #2f343b;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.08);
  z-index: 91;
}

.light.active {
  box-shadow:
    0 0 12px rgba(255, 255, 255, 0.4),
    inset 0 0 0 2px rgba(255, 255, 255, 0.2);
  z-index: 91;
}

.light.red.active {
  background-color: #e11d48;
}

.light.green.active {
  background-color: #22c55e;
}
</style>
