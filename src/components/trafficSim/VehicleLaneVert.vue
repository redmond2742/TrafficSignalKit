<template>
  <div class="vrtlane horizontal">
    <div
      v-for="vehicle in vehicles"
      :key="vehicle.id"
      class="vehicle"
      :style="{ top: vehicle.position + 'px' }"
    ></div>
  </div>
</template>

<script>
export default {
  props: ["vehicles"],
};
</script>

<style>
.vrtlane {
  position: absolute;
  width: 50px;
  height: 500px;
  background-color: lightgray;
  margin: 10px 0;
}
.vrtlane.horizontal {
  left: 350px;
  top: 100px;
}
.vehicle {
  position: absolute;
  width: 20px;
  height: 30px;
  background-color: blue;
  z-index: 90;
}
</style>
