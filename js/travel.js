// Travel Map — MapLibre GL + CARTO, hearts + visited-country highlight + popups
// Data: window.TRAVEL_CITIES (js/travel-data.js) + data/visited_countries.geojson
(function () {
  'use strict';

  var VOYAGER = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

  var cities = (window.TRAVEL_CITIES || []).slice();
  var countriesGeojson = 'data/visited_countries.geojson';
  var map = null;
  var didFit = false;

  // Build a heart icon image (color emoji painted to canvas -> ImageData).
  function makeHeartImage(size) {
    size = size || 96;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.font = Math.floor(size * 0.82) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2764\uFE0F', size / 2, size / 2 + size * 0.04);
    return ctx.getImageData(0, 0, size, size);
  }

  function toFeature(c) {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(c.lon), Number(c.lat)] },
      properties: { name: c.name, country: c.country, cc: c.cc }
    };
  }

  // Runs on every style load (initial + theme swap), so added layers survive setStyle.
  function addLayers() {
    if (!map.getSource('cities')) {
      map.addSource('cities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: cities.map(toFeature) },
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 36
      });
    }
    if (!map.getSource('visited')) {
      map.addSource('visited', { type: 'geojson', data: countriesGeojson });
    }

    if (!map.hasImage('heart')) {
      map.addImage('heart', makeHeartImage());
    }

    if (!map.getLayer('visited-fill')) {
      map.addLayer({
        id: 'visited-fill',
        type: 'fill',
        source: 'visited',
        paint: { 'fill-color': '#e0245e', 'fill-opacity': 0.22 }
      });
      map.addLayer({
        id: 'visited-border',
        type: 'line',
        source: 'visited',
        paint: { 'line-color': '#e0245e', 'line-width': 0.7, 'line-opacity': 0.55 }
      });
    }

    if (!map.getLayer('clusters')) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'cities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#e0245e',
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 21, 60, 26],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'cities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Open Sans Regular']
        },
        paint: { 'text-color': '#ffffff' }
      });
      map.addLayer({
        id: 'hearts',
        type: 'symbol',
        source: 'cities',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'heart',
          'icon-size': 0.5,
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'viewport'
        }
      });
    }

    if (!didFit && cities.length) {
      didFit = true;
      var b = new maplibregl.LngLatBounds();
      cities.forEach(function (c) { b.extend([Number(c.lon), Number(c.lat)]); });
      map.fitBounds(b, { padding: { top: 50, right: 50, bottom: 50, left: 340 }, maxZoom: 5, duration: 900 });
    }
  }

  function openPopup(props, coords) {
    new maplibregl.Popup({ offset: 16, closeButton: true })
      .setLngLat(coords)
      .setHTML('<div class="travel-popup"><div class="popup-city">' + props.name + '</div>' +
        '<div class="popup-country">' + (props.country || '') + '</div></div>')
      .addTo(map);
  }

  function init() {
    var container = document.getElementById('map');
    if (!container || typeof maplibregl === 'undefined') return;

    map = new maplibregl.Map({
      container: 'map',
      style: VOYAGER,
      center: [50, 45],
      zoom: 1.4,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Add custom layers once the initial style is loaded (guaranteed event).
    map.on('load', addLayers);

    // Click handlers bound once; they key off layer ids at dispatch time.
    map.on('click', 'hearts', function (e) {
      if (e.features && e.features.length) {
        openPopup(e.features[0].properties, e.features[0].geometry.coordinates);
      }
    });
    map.on('mouseenter', 'hearts', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'hearts', function () { map.getCanvas().style.cursor = ''; });

    map.on('click', 'clusters', function (e) {
      var feat = e.features[0];
      map.getSource('cities').getClusterExpansionZoom(feat.properties.cluster_id, function (err, zoom) {
        if (err) return;
        map.easeTo({ center: feat.geometry.coordinates, zoom: zoom });
      });
    });

    map.on('click', 'visited-fill', function (e) {
      var props = e.features[0] && e.features[0].properties;
      if (!props) return;
      var cc = props.ISO_A2 || '';
      var list = cities.filter(function (c) { return c.cc === cc; });
      var html = '<div class="travel-popup"><div class="popup-city">' + (props.NAME || cc) + '</div>' +
        '<div class="popup-country">' + (list.length ? '📍 ' + list.length + ' ' + (list.length === 1 ? 'город' : 'городов') : '') + '</div></div>';
      new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    renderSidebar();
  }

  function countByCountry(citiesArr) {
    var m = {};
    citiesArr.forEach(function (c) { m[c.cc] = (m[c.cc] || 0) + 1; });
    return m;
  }

  function buildList(listEl, citiesArr, q) {
    listEl.innerHTML = '';
    var filtered = citiesArr.filter(function (c) {
      if (!q) return true;
      return (c.name + ' ' + c.country + ' ' + c.cc).toLowerCase().indexOf(q) !== -1;
    });
    var grouped = {};
    filtered.forEach(function (c) { (grouped[c.country] = grouped[c.country] || []).push(c); });
    var countries = Object.keys(grouped).sort(function (a, b) { return a.localeCompare(b, 'ru'); });
    if (!countries.length) {
      listEl.innerHTML = '<div class="travel-item" style="cursor:default;color:var(--travel-panel-muted)">Ничего не найдено</div>';
      return;
    }
    countries.forEach(function (country) {
      var title = document.createElement('div');
      title.className = 'travel-list-group-title';
      title.textContent = country + ' (' + grouped[country].length + ')';
      listEl.appendChild(title);
      grouped[country].forEach(function (c) {
        var it = document.createElement('div');
        it.className = 'travel-item';
        it.innerHTML = '<span class="dot"></span><span class="name">' + c.name + '</span><span class="country">' + c.cc + '</span>';
        it.addEventListener('click', function () {
          var pt = [Number(c.lon), Number(c.lat)];
          openPopup(c, pt);
          map.flyTo({ center: pt, zoom: 6.5, duration: 900 });
        });
        listEl.appendChild(it);
      });
    });
  }

  function renderSidebar() {
    var elStats = document.getElementById('travel-stats');
    if (elStats) {
      elStats.innerHTML = '<span><b>' + cities.length + '</b> городов</span><span><b>' + Object.keys(countByCountry(cities)).length + '</b> стран</span>';
    }
    var listEl = document.getElementById('travel-list');
    var searchEl = document.getElementById('travel-search');
    if (listEl) buildList(listEl, cities, '');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        buildList(listEl, cities, searchEl.value.trim().toLowerCase());
      });
    }
    var showCountries = document.getElementById('filter-countries');
    var showCities = document.getElementById('filter-cities');
    if (showCountries) showCountries.checked = true;
    if (showCities) showCities.checked = true;
    if (showCountries) showCountries.addEventListener('change', function () { toggleLayer('visited-fill', showCountries.checked); toggleLayer('visited-border', showCountries.checked); });
    if (showCities) showCities.addEventListener('change', function () { toggleLayer('hearts', showCities.checked); });
  }

  function toggleLayer(id, on) {
    if (!map) return;
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }

  document.addEventListener('DOMContentLoaded', init);

  // Basemap stays on CARTO Voyager (light). The site theme toggle only affects the
  // header/sidebar chrome via main.js; swapping the vector style live would require
  // re-adding all custom sources/layers, which is fragile, so we keep the map light
  // for a consistent, always-working render.
})();
