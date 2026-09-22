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

