<template>
  <div class="hzlane vertical">
    <div class="stop-bar vertical"></div>
    <div
      v-for="vehicle in vehicles"
      :key="vehicle.id"
      class="vehicle"
      :style="{ left: vehicle.position + 'px' }"
    ></div>
  </div>
</template>

<script>
export default {
  props: ["vehicles"],
};
</script>

<style scoped>
.hzlane {
  position: absolute;
  width: 800px;
  height: 50px;
  background-color: lightgray;
  margin: 10px 0;
}
.hzlane.vertical {
  top: 200px;
  position: absolute;
}

.vehicle {
  position: absolute;
  width: 30px;
  height: 20px;
  background-color: rgb(136, 0, 255);
  z-index: 90;
}
.stop-bar {
  width: 50px;
  height: 8px;
  background-color: white;
  position: absolute;
}
.stop-bar.vertical {
  top: 21px;
  left: 335px;
  transform: rotate(90deg);
  background-color: white;
}
.stop-bar.horizontal {
  top: 175px;
  left: 200px;
}
</style>
