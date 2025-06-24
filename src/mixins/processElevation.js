import gpxParser from 'gpxparser'
import { Colors } from 'chart.js'
import { Chart } from 'chart.js/auto'

import zoomPlugin from 'chartjs-plugin-zoom'
Chart.register(zoomPlugin)
Chart.register(Colors)

export default {
  data() {
    return {

      hoveredPoint: null,
      hoveredPoints: []

    }
  },
  methods: {
    earthDistance(point1, point2, miles = true) {
      const R = 6371
      const [lat1, lon1] = point1
      const [lat2, lon2] = point2
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      if (miles) {
        return distance * 0.621371
      } else {
        return distance * 0.621371 * 5280
      }
    },
    processGPXElevation(gpxText) {
      const gpx = new gpxParser()
      gpx.parse(gpxText)
      if (!gpx.tracks || gpx.tracks.length === 0) {
        return []
      }
      const pts = gpx.tracks[0].points
      const dataset = []
      let cumDist = 0
      for (let i = 0; i < pts.length; i++) {
        if (i > 0) {
          const p1 = [pts[i - 1].lat, pts[i - 1].lon]
          const p2 = [pts[i].lat, pts[i].lon]
          cumDist += this.earthDistance(p1, p2, false)
        }
        const eleFt = pts[i].ele ? pts[i].ele * 3.28084 : 0
        dataset.push({
          x: cumDist,
          y: eleFt,
          lat: pts[i].lat,
          lon: pts[i].lon
        })
      }
      return dataset
    },
    renderElevationChart(dataset) {
      const ctx = this.$refs.scatterPlotCanvas.getContext('2d')
      const data = {
        datasets: [
          {
            label: 'Elevation',
            data: dataset,
            borderColor: 'rgba(30, 139, 195, 1)',
            backgroundColor: 'rgba(30, 139, 195, 0.5)',
            showLine: true,
            fill: false,
            pointRadius: 2
          }
        ]
      }
      const options = {
        scales: {
          x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Distance (ft)' } },
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Elevation (ft)' } }
        },
        onHover: (event, activeElements, chart) => {
          if (activeElements.length) {
            const raw = activeElements[0].element.$context.raw

            const newPoint = {

              distance: raw.x,
              elevation: raw.y,
              lat: raw.lat,
              lon: raw.lon
            }

            if (!this.hoveredPoint || this.hoveredPoint.lat !== newPoint.lat || this.hoveredPoint.lon !== newPoint.lon) {
              this.hoveredPoints.unshift(newPoint)
            }
            this.hoveredPoint = newPoint

          } else {
            this.hoveredPoint = null
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const { x, y, lat, lon } = context.raw
                return `Dist: ${x.toFixed(1)} ft, Elev: ${y.toFixed(1)} ft, ` +
                  `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`
              }
            }
          },
          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              drag: { enabled: true },
              mode: 'xy'
            }
          }
        }
      }
      if (this.elevationChart) {
        this.elevationChart.destroy()
      }
      this.elevationChart = new Chart(ctx, { type: 'scatter', data, options })
    },
    resetZoom() {
      if (this.elevationChart && this.elevationChart.resetZoom) {
        this.elevationChart.resetZoom()
      }
    }
  }
}
