function initMap() {
  var attr_osm = 'Map data &copy; <a href="http://openstreetmap.org/">OpenStreetMap</a> contributors',
      attr_mapbox = 'Imagery &copy; <a href="http://mapbox.com/about/maps/">MapBox</a>'
        attr_overpass = 'POI via <a href="http://www.overpass-api.de/">Overpass API</a>';

  var osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: [attr_osm, attr_overpass].join(', ')}),
      osm_bw = new L.TileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {opacity: 0.5, attribution: [attr_osm, attr_overpass].join(', ')}),
      osm_no = new L.TileLayer('http://{s}.www.toolserver.org/tiles/osm-no-labels/{z}/{x}/{y}.png', {attribution: [attr_osm, attr_overpass].join(', ')}),
      mapbox_streets = new L.TileLayer("https://www.mapbox.com/v3/base.mapbox-streets+bg-e8e0d8_landuse_water_buildings_streets/{z}/{x}/{y}.png", {attribution: [attr_mapbox, attr_osm, attr_overpass].join(', ')}),
      mapbox_pencil = new L.TileLayer("https://b.tiles.mapbox.com/v3/examples.a4c252ab/{z}/{x}/{y}.png", {attribution: [attr_mapbox, attr_osm, attr_overpass].join(', ')}),
//      mapbox_simple = new L.TileLayer("http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-simple/{z}/{x}/{y}.png", {attribution: [attr_mapbox, attr_osm, attr_overpass].join(', ')});

  map = new L.Map('map', {
    center: new L.LatLng(47.0766,15.4575),
      zoom: 13,
      layers: osm,
  });

  map.getControl = function () {
    var ctrl = new L.Control.Layers({
      'MapBox Streets': mapbox_streets,
       'MapBox Pencil': mapbox_pencil,
  //     'MapBox Simple': mapbox_simple,
       'OpenSteetMap': osm,
       'OpenSteetMap (no labels)': osm_no,
       'OpenSteetMap (black/white)': osm_bw,
    });
    return function () {
      return ctrl;
    }
  }();
  map.addControl(map.getControl());

  L.LatLngBounds.prototype.toOverpassBBoxString = function (){
    var a = this._southWest,
        b = this._northEast;
    return [a.lat, a.lng, b.lat, b.lng].join(",");
  }

  var path_style = L.Path.prototype._updateStyle;
  L.Path.prototype._updateStyle = function () {
    path_style.apply(this);
    for (k in this.options.svg) {
      this._path.setAttribute(k, this.options.svg[k]);
    }
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var center = new L.LatLng(position.coords.latitude, position.coords.longitude);
      map.setView(center, 13);
    });
  }

  return map;
}

function parseOverpassJSON(overpassJSON, callbackNode, callbackWay, callbackRelation) {
  var nodes = {}, ways = {};
  for (var i = 0; i < overpassJSON.elements.length; i++) {
    var p = overpassJSON.elements[i];
    switch (p.type) {
      case 'node':
        p.coordinates = [p.lon, p.lat];
        p.geometry = {type: 'Point', coordinates: p.coordinates};
        nodes[p.id] = p;
        // p has type=node, id, lat, lon, tags={k:v}, coordinates=[lon,lat], geometry
        if (typeof callbackNode === 'function') callbackNode(p);
        break;
      case 'way':
        p.coordinates = p.nodes.map(function (id) {
          return nodes[id].coordinates;
        });
        p.geometry = {type: 'LineString', coordinates: p.coordinates};
        ways[p.id] = p;
        // p has type=way, id, tags={k:v}, nodes=[id], coordinates=[[lon,lat]], geometry
        if (typeof callbackWay === 'function') callbackWay(p);
        break;
      case 'relation':
        p.members.map(function (mem) {
          mem.obj = (mem.type == 'way' ? ways : nodes)[mem.ref];
        });
        // p has type=relaton, id, tags={k:v}, members=[{role, obj}]
        if (typeof callbackRelation === 'function') callbackRelation(p);
        break;
    }
  }
}
