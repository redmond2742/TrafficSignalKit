<template>
  <div>
    <h4>Time Remaining: {{ formattedTime }}</h4>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

export default {
  name: "Timer",
  props: {
    // The starting time for the countdown (in seconds)
    initialTime: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const remainingTime = ref(props.initialTime); // Reactive reference for remaining time
    let timer = null;

    // Decrease the time by 1 second every interval
    const countDown = () => {
      if (remainingTime.value > 0) {
        remainingTime.value--;
      } else {
        clearInterval(timer); // Stop the timer when it reaches zero
      }
    };

    // Start the countdown when the component is mounted
    onMounted(() => {
      timer = setInterval(countDown, 1000); // Update every second
    });

    // Clear the timer when the component is destroyed
    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer);
      }
    });

    // Computed property to format the time as HH:MM:SS
    const formattedTime = computed(() => {
      const hours = Math.floor(remainingTime.value / 3600)
        .toString()
        .padStart(2, "0"); // Get hours
      const minutes = Math.floor((remainingTime.value % 3600) / 60)
        .toString()
        .padStart(2, "0"); // Get minutes
      const seconds = (remainingTime.value % 60).toString().padStart(2, "0"); // Get seconds
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
  font-size: 24px;
  color: #333;
}
</style>
