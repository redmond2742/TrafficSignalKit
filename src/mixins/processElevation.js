import gpxParser from 'gpxparser'
import { Chart, Colors } from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
Chart.register(zoomPlugin)
Chart.register(Colors)

export default {
  data() {
    return {}
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
        dataset.push({ x: cumDist, y: eleFt })
      }
      return dataset
    },
    renderElevationChart(dataset) {
      const ctx = this.$refs.scatterPlotCanvas.getContext('2d')
      const data = {
        datasets: [
          {
            label: 'Elevation',
            data,
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
        plugins: {
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
