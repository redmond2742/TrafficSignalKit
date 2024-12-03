<template>
  <div>
    <canvas ref="radarChart"></canvas>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ScatterController,
  BarController,
  BarElement,
  LinearScale,
} from "chart.js";

// Register only the required components to optimize the bundle size
Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ScatterController,
  LinearScale
);

export default {
  name: "RadarChart",
  setup() {
    const radarChart = ref(null);

    const renderRadarChart = () => {
      if (!radarChart.value) return;

      const ctx = radarChart.value.getContext("2d");

      new Chart(ctx, {
        data: {
          labels: ["Φ1", "Φ2", "Φ3", "Φ4", "Φ5", "Φ6", "Φ7", "Φ8"],
          datasets: [
            {
              type: "bar",
              label: "Yellow Phase",
              data: [3.5, 4.0, 3.0, 3.0, 3.5, 4.0, 3.0, 3.0],

              backgroundColor: "rgba(255, 255, 0, 0.2)",
              borderColor: "rgba(255, 255, 0, 1)",
              pointBackgroundColor: "rgba(255, 255, 0, 1)",
              borderWidth: 1,
              order: 1,
            },
            {
              type: "bar",
              label: "Yellow Phase",
              data: [1, 1, 1, 1, 1, 1, 1, 1],

              backgroundColor: "rgba(255, 0, 0, 0.2)",
              borderColor: "rgba(255, 0, 0, 1)",
              pointBackgroundColor: "rgba(255, 0, 0, 1)",
              borderWidth: 1,
              order: 1,
            },

            {
              type: "scatter",
              label: "scatter",
              backgroundColor: "rgb(0, 0, 0)",

              data: [
                { x: 2, y: 0 }, // first bar chart row, x is the value to set
                { x: 1, y: 1 }, //second bar chart row
                { x: 2, y: 2 },
                { x: 3, y: 3 },
              ],

              pointRadius: 5,
              order: 3,
            },
            {
              type: "scatter",
              label: "scatter",
              backgroundColor: "rgb(0, 0, 0)",

              data: [
                { x: -1, y: 0 }, // first bar chart row, x is the value to set
                { x: 1.5, y: 0 }, //second bar chart row
              ],

              pointRadius: 5,
              order: 3,
            },
            {
              type: "scatter",
              label: "scatter2",
              backgroundColor: "rgb(0, 0, 0)",

              data: [
                { x: 4 - 2, y: 0 }, // first bar chart row
                { x: 4 - 1, y: 1 },
                { x: 4 - 2, y: 2 },
                { x: 4 - 3, y: 3 },
              ],
              pointRadius: 5,
              order: 4,
            },
          ],
        },
        options: {
          responsive: true,
          indexAxis: "y",
          scales: {
            x: {
              // Scatter chart x-axis
              stacked: true,
              type: "linear",
              position: "bottom",
              alignToPixels: true,
              min: 0,
              max: 5, // Match the scatter chart scale
              ticks: {
                stepSize: 1, // Ensure consistent intervals
              },
            },
            y: {
              // Scatter chart y-axis
              stacked: true,
              min: 0,
              max: 8,
              ticks: {
                stepSize: 1,
              },
            },
          },
          plugins: {
            legend: {
              position: "top",
            },
          },
        },
      });
    };

    onMounted(() => {
      renderRadarChart();
    });

    return {
      radarChart,
    };
  },
};
</script>

<style scoped>
canvas {
  max-width: 100%;
}
</style>
