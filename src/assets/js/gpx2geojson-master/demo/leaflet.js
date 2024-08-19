var map = L.map('map').setView([42.4367, -71.115], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

GPX2GeoJSON.fromURL("fells_loop.gpx").then((geojson) => {
  L.geoJSON(geojson).addTo(map);
});
