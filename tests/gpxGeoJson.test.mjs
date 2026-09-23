import test from 'node:test';
import assert from 'node:assert/strict';
import { gpxToGeoJson } from '../src/utils/gpxGeoJson.js';

const track = (name, points) => ({ name, points });
const pt = (lat, lon, ele = null) => ({ lat, lon, ele });

test('a track becomes a LineString in [lon, lat, ele] order', () => {
  const geo = gpxToGeoJson({ tracks: [track('ride', [pt(37.1, -122.5, 12), pt(37.2, -122.6, 14)])] });
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(geo.features.length, 1);
  const [feature] = geo.features;
  assert.equal(feature.type, 'Feature');
  assert.equal(feature.geometry.type, 'LineString');
  // GeoJSON is longitude-first; getting this backwards puts the track in the ocean.
  assert.deepEqual(feature.geometry.coordinates, [[-122.5, 37.1, 12], [-122.6, 37.2, 14]]);
  assert.equal(feature.properties.name, 'ride');
});

test('a point with no elevation yields a two-element coordinate', () => {
  const geo = gpxToGeoJson({ tracks: [track('t', [pt(1, 2), pt(3, 4, 0)])] });
  assert.deepEqual(geo.features[0].geometry.coordinates, [[2, 1], [4, 3, 0]]);
});

test('elevation of zero is kept, not treated as missing', () => {
  const geo = gpxToGeoJson({ tracks: [track('t', [pt(1, 2, 0)])] });
  assert.deepEqual(geo.features[0].geometry.coordinates, [[2, 1, 0]], 'sea level is a real elevation');
});

test('routes are LineStrings and waypoints are Points', () => {
  const geo = gpxToGeoJson({
    routes: [track('route', [pt(1, 2, 3), pt(4, 5, 6)])],
    waypoints: [{ name: 'start', lat: 9, lon: 8, ele: 7, sym: 'flag', cmt: 'c', desc: 'd' }],
  });
  assert.equal(geo.features.length, 2);
  assert.equal(geo.features[0].geometry.type, 'LineString');
  const point = geo.features[1];
  assert.equal(point.geometry.type, 'Point');
  assert.deepEqual(point.geometry.coordinates, [8, 9, 7]);
  assert.equal(point.properties.name, 'start');
  assert.equal(point.properties.sym, 'flag');
});

/** Map3.vue centres the map on features[0], so a waypoint must not come first. */
test('tracks come before routes and waypoints', () => {
  const geo = gpxToGeoJson({
    waypoints: [{ name: 'w', lat: 1, lon: 1 }],
    routes: [track('r', [pt(2, 2)])],
    tracks: [track('t', [pt(3, 3)])],
  });
  assert.deepEqual(
    geo.features.map((f) => f.properties.name),
    ['t', 'r', 'w'],
    'the map centres on features[0]; it must be the track',
  );
});

test('multiple tracks each become their own feature', () => {
  const geo = gpxToGeoJson({ tracks: [track('a', [pt(1, 1)]), track('b', [pt(2, 2)])] });
  assert.equal(geo.features.length, 2);
  assert.deepEqual(geo.features.map((f) => f.properties.name), ['a', 'b']);
});

test('metadata is carried onto the collection', () => {
  const geo = gpxToGeoJson({ tracks: [], metadata: { name: 'My ride', desc: 'd', time: '2026-01-01' } });
  assert.equal(geo.properties.name, 'My ride');
  assert.equal(geo.properties.desc, 'd');
  assert.equal(geo.properties.time, '2026-01-01');
});

test('missing sections and missing input do not throw', () => {
  for (const input of [{}, { tracks: [] }, null, undefined]) {
    const geo = gpxToGeoJson(input);
    assert.equal(geo.type, 'FeatureCollection');
    assert.deepEqual(geo.features, []);
  }
});

test('a track with no points yields an empty LineString rather than throwing', () => {
  const geo = gpxToGeoJson({ tracks: [{ name: 'empty' }] });
  assert.deepEqual(geo.features[0].geometry.coordinates, []);
});

test('every feature is shaped the way Leaflet expects', () => {
  const geo = gpxToGeoJson({
    tracks: [track('t', [pt(1, 2, 3)])],
    waypoints: [{ name: 'w', lat: 4, lon: 5 }],
  });
  for (const feature of geo.features) {
    assert.equal(feature.type, 'Feature');
    assert.ok(feature.geometry && feature.geometry.type, 'no geometry');
    assert.ok(Array.isArray(feature.geometry.coordinates), 'coordinates must be an array');
    assert.ok(feature.properties && typeof feature.properties === 'object', 'no properties');
  }
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(geo)));
});

test('it scales linearly and does not choke on a large track', () => {
  const points = Array.from({ length: 50000 }, (_, i) => pt(37 + i * 1e-6, -122 + i * 1e-6, 10));
  const started = performance.now();
  const geo = gpxToGeoJson({ tracks: [track('big', points)] });
  const elapsed = performance.now() - started;
  assert.equal(geo.features[0].geometry.coordinates.length, 50000);
  assert.ok(elapsed < 2000, `took ${elapsed.toFixed(0)}ms`);
});
