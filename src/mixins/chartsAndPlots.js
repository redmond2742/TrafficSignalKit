import { Chart } from "chart.js/auto"; // https://www.chartjs.org/
import zoomPlugin from "chartjs-plugin-zoom"; // https://www.chartjs.org/chartjs-plugin-zoom/latest/guide/animations.html
Chart.register(zoomPlugin);

export default {
  data() {
    return {

    }
  },
    methods: {
        renderChart(ScatterPlotData) {
            const ctx = this.$refs.scatterPlotCanvas.getContext("2d");
            var chartOptions = {
              title: {
                display: true,
                text: "Scatter Plot with Line Connecting Dots",
              },
              scales: {
                xAxes: [
                  {
                    type: "linear",
                    position: "bottom",
                  },
                ],
                yAxes: [
                  {
                    type: "linear",
                    position: "left",
                  },
                ],
              },
              plugins: {
                zoom: {
                  zoom: {
                    wheel: {
                      enabled: true,
                    },
                    pinch: {
                      enabled: true,
                    },
                    drag: {
                      enabled: true,
                    },
                    mode: "xy",
                  },
                },
              },
            };
            //console.log(this.signalPlotData[0]);
            /*var tempScatterData = {
              datasets: this.chartDataSet,
            };
            */
      
            window.myPlot = new Chart(ctx, {
              type: "scatter",
              data: ScatterPlotData, //tempScatterData,
              options: chartOptions,
            });
          },
          resetZoom() {
            window.myPlot.resetZoom();
          },
    }
}