// Travel Map — MapLibre GL + CARTO, hearts + visited-country highlight + popups
// Data: window.TRAVEL_CITIES (js/travel-data.js) + data/visited_countries.geojson
(function () {
  'use strict';

  var VOYAGER = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

  var cities = (window.TRAVEL_CITIES || []).slice();
  var MEDIA = (window.TRAVEL_MEDIA || {});
  cities.forEach(function (c) { if (MEDIA[c.name]) c.media = MEDIA[c.name]; });
  var countriesGeojson = 'data/visited_countries.geojson';
  var map = null;
  var didFit = false;

  // Build a Google-Maps-style heart marker: a pink disc with a white heart,
  // a white ring and a soft drop shadow (painted to canvas -> ImageData).
  function drawHeart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.28);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.28);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.58, x, y + s * 0.88, x, y + s * 1.0);
    ctx.bezierCurveTo(x, y + s * 0.88, x + s * 0.5, y + s * 0.58, x + s * 0.5, y + s * 0.28);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.28);
    ctx.closePath();
    ctx.fill();
  }
  function makeHeartImage(size) {
    size = size || 96;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var cx = size / 2, cy = size / 2;
    var R = size * 0.40;
    // white disc + soft drop shadow (forms the white ring under the pink disc)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.30)';
    ctx.shadowBlur = size * 0.07;
    ctx.shadowOffsetY = size * 0.02;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // pink disc
    ctx.fillStyle = '#f2325f';
    ctx.beginPath(); ctx.arc(cx, cy, R - size * 0.06, 0, Math.PI * 2); ctx.fill();
    // white heart
    ctx.fillStyle = '#ffffff';
    var hs = size * 0.34;
    drawHeart(ctx, cx, cy - hs * 0.34, hs);
    return ctx.getImageData(0, 0, size, size);
  }

  function toFeature(c) {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(c.lon), Number(c.lat)] },
      properties: { name: c.name, country: c.country, cc: c.cc, media: c.media }
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
    // Flat (un-clustered) copy so every heart is always rendered on every zoom.
    if (!map.getSource('cities_flat')) {
      map.addSource('cities_flat', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: cities.map(toFeature) }
      });
    }
    if (!map.getSource('visited')) {
      map.addSource('visited', { type: 'geojson', data: countriesGeojson });
    }

    if (!map.hasImage('heart')) {
      map.addImage('heart', makeHeartImage(), { pixelRatio: 2 });
    }

    if (!map.getLayer('visited-fill')) {
      map.addLayer({
        id: 'visited-fill',
        type: 'fill',
        source: 'visited',
        paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.6 }
      });
      map.addLayer({
        id: 'visited-border',
        type: 'line',
        source: 'visited',
        paint: { 'line-color': ['get', 'fillColor'], 'line-width': 1.1, 'line-opacity': 0.9 }
      });
    }

    if (!map.getLayer('clusters')) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'cities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#f2325f',
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 21, 60, 26],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });
      map.addLayer({
        id: 'hearts',
        type: 'symbol',
        source: 'cities_flat',
        layout: {
          'icon-image': 'heart',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.42, 6, 0.62],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'viewport'
        }
      });
      // Cluster count text drawn above the hearts so it stays readable.
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
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#c2103f', 'text-halo-width': 1.5 }
      });
    }

    if (!didFit && cities.length) {
      didFit = true;
      var b = new maplibregl.LngLatBounds();
      cities.forEach(function (c) { b.extend([Number(c.lon), Number(c.lat)]); });
      map.fitBounds(b, { padding: { top: 50, right: 50, bottom: 50, left: 340 }, maxZoom: 5, duration: 900 });
    }
  }

  function mediaHTML(props) {
    var m = props.media;
    if (!m) return '';
    var h = '';
    if (m.photo) h += '<img class="popup-photo" src="' + m.photo + '" alt="' + (props.name || '') + '">';
    if (m.video) h += '<video class="popup-video" controls muted preload="none" poster="' + (m.poster || m.photo || '') + '" src="' + m.video + '"></video>';
    return h;
  }

  function openPopup(props, coords) {
    new maplibregl.Popup({ offset: 16, closeButton: true })
      .setLngLat(coords)
      .setHTML('<div class="travel-popup">' + mediaHTML(props) +
        '<div class="popup-city">' + props.name + '</div>' +
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

    // One click handler with layer priority: a cluster expands first, then a single
    // heart opens its city popup, and only a bare country fill shows the aggregate
    // "N городов". This stops a heart/cluster click from ALSO firing the country
    // popup that sits underneath (old bug: clicking a heart showed the whole
    // country's city count instead of just that one city).
    map.on('mouseenter', 'hearts', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'hearts', function () { map.getCanvas().style.cursor = ''; });

    function openCountryPopup(props, lngLat) {
      var cc = props && props.ISO_A2 ? props.ISO_A2 : '';
      var list = cities.filter(function (c) { return c.cc === cc; });
      var html = '<div class="travel-popup"><div class="popup-city">' + (props && (props.NAME || cc)) + '</div>' +
        '<div class="popup-country">' + (list.length ? '📍 ' + list.length + ' ' + (list.length === 1 ? 'город' : 'городов') : '') + '</div></div>';
      new maplibregl.Popup().setLngLat(lngLat).setHTML(html).addTo(map);
    }

    map.on('click', function (e) {
      var pt = e.point;
      // 1) cluster -> expand to reveal the cities inside it.
      // getClusterExpansionZoom() is unreliable in this build (its callback never
      // fires), so we zoom just past the clustering threshold (clusterMaxZoom 5)
      // where every city renders as an individual heart.
      var cluster = map.queryRenderedFeatures(pt, { layers: ['clusters'] });
      if (cluster.length) {
        map.easeTo({ center: cluster[0].geometry.coordinates, zoom: 6 });
        return;
      }
      // 2) heart -> the exact city popup for THIS heart
      var heart = map.queryRenderedFeatures(pt, { layers: ['hearts'] });
      if (heart.length) {
        openPopup(heart[0].properties, heart[0].geometry.coordinates);
        return;
      }
      // 3) bare country fill -> aggregate count
      var fill = map.queryRenderedFeatures(pt, { layers: ['visited-fill'] });
      if (fill.length) {
        openCountryPopup(fill[0].properties, e.lngLat);
      }
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
        var dot = (c.media && c.media.photo) ? '<img class="list-thumb" src="' + c.media.photo + '" alt="">' : '<span class="dot"></span>';
        it.innerHTML = dot + '<span class="name">' + c.name + '</span><span class="country">' + c.cc + '</span>';
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
