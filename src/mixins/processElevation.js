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
        return { dataset: [], metrics: null }
      }
      const pts = gpx.tracks[0].points
      const dataset = []
      let cumDist = 0
      let totalGain = 0
      let totalLoss = 0
      let totalTimeSeconds = 0
      let uphillDistance = 0
      let downhillDistance = 0
      let uphillTime = 0
      let downhillTime = 0
      let maxUphillGradePercent = null
      let minElevation = Number.POSITIVE_INFINITY
      let maxElevation = Number.NEGATIVE_INFINITY
      let previousElevation = null

      for (let i = 0; i < pts.length; i++) {
        const eleFt = pts[i].ele ? pts[i].ele * 3.28084 : 0
        if (eleFt < minElevation) {
          minElevation = eleFt
        }
        if (eleFt > maxElevation) {
          maxElevation = eleFt
        }

        if (i > 0) {
          const p1 = [pts[i - 1].lat, pts[i - 1].lon]
          const p2 = [pts[i].lat, pts[i].lon]
          const segmentDistance = this.earthDistance(p1, p2, false)
          cumDist += segmentDistance

          if (previousElevation !== null) {
            const deltaElevation = eleFt - previousElevation
            if (deltaElevation > 0) {
              totalGain += deltaElevation
            } else if (deltaElevation < 0) {
              totalLoss += Math.abs(deltaElevation)
            }
            if (deltaElevation > 0 && segmentDistance > 0) {
              const gradePercent = (deltaElevation / segmentDistance) * 100
              if (
                maxUphillGradePercent === null ||
                gradePercent > maxUphillGradePercent
              ) {
                maxUphillGradePercent = gradePercent
              }
            }

            if (pts[i].time && pts[i - 1].time) {
              const timeDelta =
                (new Date(pts[i].time).getTime() -
                  new Date(pts[i - 1].time).getTime()) /
                1000
              if (timeDelta > 0) {
                totalTimeSeconds += timeDelta
                if (deltaElevation > 0) {
                  uphillDistance += segmentDistance
                  uphillTime += timeDelta
                } else if (deltaElevation < 0) {
                  downhillDistance += segmentDistance
                  downhillTime += timeDelta
                }
              }
            }
          }
        }

        dataset.push({
          x: cumDist,
          y: eleFt,
          lat: pts[i].lat,
          lon: pts[i].lon
        })
        previousElevation = eleFt
      }

      const totalDistanceMiles = cumDist / 5280
      const averageSpeedMph =
        totalTimeSeconds > 0
          ? totalDistanceMiles / (totalTimeSeconds / 3600)
          : null
      const averageUphillSpeedMph =
        uphillTime > 0 ? (uphillDistance / 5280) / (uphillTime / 3600) : null
      const averageDownhillSpeedMph =
        downhillTime > 0
          ? (downhillDistance / 5280) / (downhillTime / 3600)
          : null

      return {
        dataset,
        metrics: {
          totalDistanceFeet: cumDist,
          totalDistanceMiles,
          totalElevationGainFeet: totalGain,
          totalElevationLossFeet: totalLoss,
          totalTimeSeconds: totalTimeSeconds || null,
          averageSpeedMph,
          averageUphillSpeedMph,
          averageDownhillSpeedMph,
          minElevationFeet: Number.isFinite(minElevation) ? minElevation : null,
          maxElevationFeet: Number.isFinite(maxElevation) ? maxElevation : null,
          maxUphillGradePercent
        }
      }
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
