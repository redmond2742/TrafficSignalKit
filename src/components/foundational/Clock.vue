<template>
  <div>
    <h2>Current Time: {{ formattedTime }}</h2>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

export default {
  name: "Clock",
  setup() {
    const currentTime = ref(new Date());

    let timer = null;

    // Function to update the time
    const updateClock = () => {
      currentTime.value = new Date();
    };

    // When the component is mounted, start the clock update
    onMounted(() => {
      timer = setInterval(updateClock, 1000); // Update every second
    });

    // Cleanup the interval when the component is unmounted
    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer);
      }
    });

    // Format the time as HH:MM:SS
    const formattedTime = computed(() => {
      const hours = currentTime.value.getHours().toString().padStart(2, "0");
      const minutes = currentTime.value
        .getMinutes()
        .toString()
        .padStart(2, "0");
      const seconds = currentTime.value
        .getSeconds()
        .toString()
        .padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    });

    return {
      formattedTime,
    };
  },
};
</script>

<style scoped>
h2 {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  font-size: 24px;
  color: #333;
}
</style>
