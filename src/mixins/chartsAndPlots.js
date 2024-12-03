import { Colors } from 'chart.js';
import { Chart } from "chart.js/auto"; // https://www.chartjs.org/
import zoomPlugin from "chartjs-plugin-zoom"; // https://www.chartjs.org/chartjs-plugin-zoom/latest/guide/animations.html
Chart.register(zoomPlugin);
Chart.register(Colors);

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
                text: "Time Space Plot",
              },
              scales: {
                x: 
                  {
                    type: "linear",
                    position: "bottom",
                  },
          
                y: 
                  {
                    type: "linear",
                    position: "left",
                  },
              
              },
              plugins: {
                beforeDraw: function (chart, easing) {
                  var ctx = this.$refs.scatterPlotCanvas.getContext("2d");//chart.chart.ctx;
                  ctx.save();
                  ctx.globalCompositeOperation = 'destination-over';
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, chart.width, chart.height);
                  ctx.restore();
                },
                
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
          zoomToDimensions(xMin, xMax, yMin, yMax) {
            window.myPlot.zoomScale('x', { min: xMin, max: xMax });
            window.myPlot.zoomScale('y', { min: yMin, max: yMax });
          },
          createScatterXY(x_data, y_data) {
            return {
              x: x_data,
              y: y_data,
            };
          },
          createScatterDataset(d) {
            return {
              datasets: d,
            };
          },
    }
}