<template>
  <div>
    <select v-model="rotationAngle" @change="rotateImage">
      <option value="0">0°</option>
      <option value="90">90°</option>
      <option value="180">180°</option>
      <option value="270">270°</option>
    </select>

    <img
      src="../assets/Arrow-Up.png"
      :style="imageStyle"
      class="rotated-image"
    />
  </div>
</template>

<script>
export default {
  data() {
    rotationAngle: 0;
  },
  computed: {
    imageStyle() {
      return {
        transform: `rotate(${this.rotationAngle}deg)`,
      };
    },
  },
  methods: {
    rotateImage() {
      // Additional logic if needed when rotation changes
    },
  },
};
</script>

<style>
.rotated-image {
  transition: transform 0.5s ease;
}
</style>
