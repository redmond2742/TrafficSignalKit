/*
    GPX2GeoJSON - Small and fast GPX to GeoJSON converter for JavaScript
    Copyright © 2024  Manuel Reimer <manuel.reimer@gmx.de>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const GPX2GeoJSON = {
  fromURL: async function(url, options) {
    const response = await fetch(url);
    return this.fromText(await response.text(), options);
  },

  fromText: function(text, options) {
    const doc = (new DOMParser()).parseFromString(text, "application/xml");
    return this.fromDocument(doc, options);
  },

  fromDocument: function(document, options) {
    const features = []
    for (const n of document.firstChild.childNodes) {
      switch (n.tagName) {
      case "wpt":
        features.push(this._wptToPoint(n, options));
        break;
      case "trk":
        features.push(this._trkToMultiLineString(n, options));
        break;
      case "rte":
        features.push(this._rteToLineString(n, options));
        break;
      }
    }

    return {
      "type": "FeatureCollection",
      "features": features
    };
  },

  _coordFromNode: function(node, options) {
    const coord = [];
    coord.push(parseFloat(node.getAttribute("lon")));
    coord.push(parseFloat(node.getAttribute("lat")));
    if (options && options.addAltitude) {
      const ele = node.getElementsByTagName("ele");
      if (ele.length == 1)
        coord.push(parseFloat(ele[0].textContent));
    }
    return coord;
  },

  _makeFeature: function(type, coords, props) {
    return {
      "type": "Feature",
      "geometry": {
        "type": type,
        "coordinates": coords
      },
      "properties": props
    }
  },

  _wptToPoint: function(node, options) {
    const coord = this._coordFromNode(node, options);
    const props = {};
    for (const n of node.childNodes) {
      if (n.nodeType == Node.ELEMENT_NODE)
        props[n.tagName] = n.textContent;
    }
    return this._makeFeature("Point", coord, props);
  },

  _trkToMultiLineString: function(node, options) {
    const coordslst = [];
    const props = {};
    for (const n of node.childNodes) {
      if (n.tagName == "trkseg") {
        const coords = [];
        coordslst.push(coords);
        for (const trkpt of n.getElementsByTagName("trkpt")) {
          coords.push(this._coordFromNode(trkpt, options));
        }
      }
      else if (n.nodeType == Node.ELEMENT_NODE)
        props[n.tagName] = n.textContent;
    }
    return this._makeFeature("MultiLineString", coordslst, props);
  },

  _rteToLineString: function(node, options) {
    const coords = [];
    const props = {}
    for (const n of node.childNodes) {
      if (n.tagName == "rtept")
        coords.push(this._coordFromNode(n, options));
      else if (n.nodeType == Node.ELEMENT_NODE)
        props[n.tagName] = n.textContent;
    }
    return this._makeFeature("LineString", coords, props);
  }
};
