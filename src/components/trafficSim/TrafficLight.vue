<template>
  <div class="traffic-light" :style="childStyle"></div>
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
        backgroundColor: this.state,
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
  width: 50px;
  height: 50px;
  padding: 10px;
  border-radius: 50%;
  z-index: 91;
}

.light {
  width: 40px;
  height: 40px;
  z-index: 91;
}

.light.active {
  background-color: inherit; /* This ensures the active light takes its background color from inline styles */
  z-index: 91;
}
</style>
