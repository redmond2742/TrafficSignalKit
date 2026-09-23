/**
 * GeoJSON from an already-parsed GPX.
 *
 * The map used to get its GeoJSON by parsing the raw GPX text a second time,
 * with @xmldom/xmldom's pure-JavaScript DOMParser (imported in a way that
 * shadowed the browser's native one) and then @mapbox/togeojson. On a 4.2MB
 * track that second parse cost as much as the entire rest of the pipeline.
 *
 * gpxparser has already produced tracks, routes and waypoints, so this just
 * reshapes them. Its own toGeoJSON() would have done the job, but it is
 * written with an undeclared `for (idx in ...)` global and therefore throws
 * in an ES module, which is always strict mode.
 *
 * Output matches what gpxparser and @mapbox/togeojson both emit: a
 * FeatureCollection of LineStrings for tracks and routes, Points for
 * waypoints, coordinates in [lon, lat, ele] order.
 *
 * Framework free, so it runs under `node --test`.
 */

/** GeoJSON puts longitude first, and omits elevation when there is none. */
function coordinate(point) {
  return point.ele === null || point.ele === undefined
    ? [point.lon, point.lat]
    : [point.lon, point.lat, point.ele];
}

function lineString(segment) {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: (segment.points || []).map(coordinate),
    },
    properties: {
      name: segment.name ?? null,
      cmt: segment.cmt ?? null,
      desc: segment.desc ?? null,
      src: segment.src ?? null,
      number: segment.number ?? null,
      link: segment.link ?? null,
      type: segment.type ?? null,
    },
  };
}

function waypoint(point) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: coordinate(point) },
    properties: {
      name: point.name ?? null,
      sym: point.sym ?? null,
      cmt: point.cmt ?? null,
      desc: point.desc ?? null,
    },
  };
}

/**
 * @param {{tracks?: Array, routes?: Array, waypoints?: Array, metadata?: object}} gpx
 *        a parsed gpxparser instance, or anything with the same shape
 */
export function gpxToGeoJson(gpx) {
  const { tracks = [], routes = [], waypoints = [], metadata = {} } = gpx || {};
  return {
    type: "FeatureCollection",
    features: [
      // Tracks first: the map centres itself on features[0].
      ...tracks.map(lineString),
      ...routes.map(lineString),
      ...waypoints.map(waypoint),
    ],
    properties: {
      name: metadata.name ?? null,
      desc: metadata.desc ?? null,
      time: metadata.time ?? null,
      author: metadata.author ?? null,
      link: metadata.link ?? null,
    },
  };
}
