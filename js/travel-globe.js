// Travel 3D globe — powered by globe.gl (three.js).
// Single source of truth for data: window.TRAVEL_CITIES (js/travel-data.js).
// The globe reads the SAME list as the flat MapLibre map below, so editing the
// list in one place updates both. Visited countries are resolved to polygons via
// the SAME country dataset the flat map uses (data/visited_countries.geojson),
// so the globe's highlighted countries always match the flat map's.
(function () {
  'use strict';

  // ---- palette (site accent / hearts pink, from travel.css) ----
  var ACCENT = 'rgba(224,36,94,0.75)';      // visited-country fill  (site accent #e0245e)
  var ACCENT_EDGE = 'rgba(244,77,117,0.95)';
  var ACCENT_SIDE = 'rgba(224,36,94,0.30)';
  var NEUTRAL_FILL = 'rgba(255,255,255,0.035)'; // "others": almost transparent / neutral
  var NEUTRAL_EDGE = 'rgba(255,255,255,0.10)';
  var NEUTRAL_SIDE = 'rgba(255,255,255,0.02)';
  // Textures are vendored locally (assets/) so the globe never depends on a
  // CDN fetch at runtime — a stalled unpkg request is what left a blank screen.
  var DARK_TEX = 'assets/earth-dark.jpg';
  var BUMP_TEX = 'assets/earth-topology.png';

  var container = document.getElementById('globe');
  if (!container) return;
  if (typeof Globe === 'undefined') {
    // globe.gl failed to load (offline / CDN blocked) — drop the spinner and
    // say so instead of leaving a silent dark screen.
    var loader = document.getElementById('globe-loading');
    if (loader) loader.classList.add('hidden');
    var st = document.querySelector('.globe-stats');
    if (st) st.textContent = 'Глобус не загрузился — нет доступа к globe.gl (CDN). Проверь интернет.';
    return;
  }

  var cities = window.TRAVEL_CITIES || [];

  // Safety net: any uncaught error during init (e.g. WebGL unavailable) must
  // never leave the loading layer stuck over a blank section.
  window.addEventListener('error', function () { hideLoading(); });
  window.addEventListener('unhandledrejection', function () { hideLoading(); });

  var w = container.clientWidth || window.innerWidth;
  var h = container.clientHeight || 620;

  // Reuse the SAME city list (no manual duplication). Build HTML flag markers,
  // collapsing same-country cities that sit close together into ONE flag so
  // overlapping country flags (e.g. several nearby US cities) don't stack.
  var flagsData = buildFlagsData(cities);

  // Visited country codes (ISO alpha-2) derived from the single data source.
  var visitedCC = {};
  cities.forEach(function (c) { visitedCC[c.cc] = true; });

  // NOTE: globe.gl is a Kapsule factory — `Globe()` returns the *configurator*,
  // and the live globe object (with .controls(), .pointOfView(), .onGlobeReady())
  // exists only after you CALL it with the container: `Globe()(container)`.
  var globe = Globe()(container)
    .globeImageUrl(DARK_TEX)
    .bumpImageUrl(BUMP_TEX)
    .showAtmosphere(true)
    .atmosphereColor('lightblue')
    .atmosphereAltitude(0.28)
    .backgroundColor('rgba(0,0,0,0)') // transparent -> the section's gradient shows through
    .width(w)
    .height(h)

    // ---- country-flag layer (HTML) — rendered OVER the polygons ----
    .htmlElementsData(flagsData)
    .htmlLat(function (d) { return d.lat; })
    .htmlLng(function (d) { return d.lng; })
    .htmlAltitude(0.01)
    .htmlElement(function (d) { return flagElement(d); })
    .htmlTransitionDuration(400)

    .onGlobeReady(function () {
      // Start over the region with the most places; auto-rotate takes it from here.
      globe.pointOfView({ lat: 38, lng: 55, altitude: 2.4 }, 0);
      hideLoading();
    });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  // gentle auto-rotation with smooth damping (guard: controls may be null in
  // some globe.gl builds; never let this throw and kill the globe)
  var controls = globe.controls();
  if (controls) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Wheel must scroll the PAGE (the globe sits above the map on a scrollable
    // page), not zoom the globe. Zoom-to-a-city still works via point clicks.
    controls.enableZoom = false;
  }

  buildStats();
  fetchPolygons();

  // Guaranteed fallback: if globe.gl never fires onGlobeReady (e.g. the texture
  // stalls), force the start view and drop the loading layer so the section can
  // never sit on a blank dark screen. The sphere + points render immediately;
  // anything still loading pops in a moment later.
  setTimeout(function () {
    globe.pointOfView({ lat: 38, lng: 55, altitude: 2.4 }, 0);
    hideLoading();
  }, 1300);

  // ---- click a city: fly the camera, highlight the matching row in the list,
  //      and (if the flat map is live) glide the MapLibre map there too ----
  function flyToCity(d) {
    globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.7 }, 1100);
    if (!d.isCluster) highlightCity(d);
    if (window.travelMap && window.travelMap.flyToCity) {
      window.travelMap.flyToCity(d.lat, d.lng);
    }
  }

  function highlightCity(d) {
    var items = document.querySelectorAll('#travel-list .travel-item');
    var best = null;
    for (var i = 0; i < items.length; i++) {
      var n = items[i].querySelector('.name');
      if (n && n.textContent.trim() === d.city) {
        var ccEl = items[i].querySelector('.country');
        if (!ccEl || ccEl.textContent.trim() === d.cc) { best = items[i]; break; }
      }
    }
    if (!best) {
      for (var j = 0; j < items.length; j++) {
        var n2 = items[j].querySelector('.name');
        if (n2 && n2.textContent.trim() === d.city) { best = items[j]; break; }
      }
    }
    if (!best) return;
    best.classList.add('globe-highlight');
    setTimeout(function () { best.classList.remove('globe-highlight'); }, 2200);
    best.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---- country-flag helpers (HTML layer) ----
  // Merge threshold (degrees): same-country cities closer than this collapse
  // into ONE flag so several nearby fills (e.g. US east-coast cities) don't
  // sit on top of each other. The flag is placed at the cluster centroid.
  var FLAG_CLUSTER_DEG = 2.0;

  // ISO alpha-2 (e.g. "RU") -> regional-indicator flag emoji (🇷🇺). Each letter
  // maps to its own regional indicator symbol via 0x1F1E6 (127398) base.
  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return '📍';
    return String.fromCodePoint(127397 + cc.toUpperCase().charCodeAt(0),
                                127397 + cc.toUpperCase().charCodeAt(1));
  }

  // Approx great-circle distance in degrees (delta-lon scaled by cos(lat)).
  function ccDist(a, b) {
    var dLat = b.lat - a.lat;
    var avgLat = (a.lat + b.lat) / 2 * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.cos(avgLat);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }

  // Cluster same-country cities by proximity -> one flag per cluster, plus the
  // full city list in the tooltip so no city is lost from the data.
  function buildFlagsData(cities) {
    var byCC = {};
    cities.forEach(function (c) {
      (byCC[c.cc] = byCC[c.cc] || []).push(c);
    });

    var flags = [];
    Object.keys(byCC).forEach(function (cc) {
      var group = byCC[cc];
      var clusters = [];
      group.forEach(function (c) {
        var p = { lat: Number(c.lat), lng: Number(c.lon) };
        var placed = false;
        for (var i = 0; i < clusters.length; i++) {
          if (ccDist(p, clusters[i].rep) < FLAG_CLUSTER_DEG) {
            clusters[i].cities.push(c);
            clusters[i].latSum += p.lat;
            clusters[i].lngSum += p.lng;
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push({ rep: p, cities: [c], latSum: p.lat, lngSum: p.lng });
        }
      });

      clusters.forEach(function (cl) {
        var n = cl.cities.length;
        var names = cl.cities.map(function (c) { return c.name; });
        flags.push({
          cc: cc,
          country: cl.cities[0].country,
          city: names[0],
          cities: names,
          lat: cl.latSum / n,
          lng: cl.lngSum / n,
          isCluster: n > 1,
          tip: n === 1
            ? names[0] + ' — ' + cl.cities[0].country
            : cl.cities[0].country + ': ' + names.join(', ')
        });
      });
    });

    return flags;
  }

  // Build the clickable DOM marker for each flag cluster.
  function flagElement(d) {
    var el = document.createElement('div');
    el.className = 'globe-flag';
    el.textContent = flagEmoji(d.cc);
    el.setAttribute('data-city', d.city);
    el.title = d.tip; // native tooltip: city + country (kept for accessibility)
    // globe.gl 2.x has no onHtmlElementClick — bind the fly-to directly on the
    // marker so clicking a flag glides the camera to that city/cluster.
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      flyToCity(d);
    });
    return el;
  }

  // ---- polygon layers (visited accent over neutral "others") ----
  function fetchPolygons() {
    Promise.all([
      fetch('data/world_countries.geojson').then(function (r) {
        if (!r.ok) throw new Error('world geojson ' + r.status);
        return r.json();
      }),
      fetch('data/visited_countries.geojson').then(function (r) {
        if (!r.ok) throw new Error('visited geojson ' + r.status);
        return r.json();
      })
    ]).then(function (res) {
      buildPolygons(res[0], res[1]);
    }).catch(function (err) {
      console.warn('[travel-globe] polygon layer failed (points still show):', err);
      buildStats();
    });
  }

  function buildPolygons(world, visited) {
    // Resolve each visited alpha-2 code (from TRAVEL_CITIES) to an ISO alpha-3 code
    // using the SAME country dataset the flat map renders, so matching is exact.
    var iso2ToIso3 = {};
    (visited.features || []).forEach(function (f) {
      var p = f.properties;
      if (p && p.ISO_A2 && p.ISO_A3) iso2ToIso3[p.ISO_A2] = p.ISO_A3;
    });
    var visitedIso3 = {};
    Object.keys(visitedCC).forEach(function (cc) {
      var a3 = iso2ToIso3[cc];
      if (a3) visitedIso3[a3] = true;
    });

    // ONE layer: world geometry (globe-friendly resolution). Visited accent, others neutral.
    var polygons = (world.features || []).map(function (f) {
      var a3 = f.properties && f.properties.ADM0_A3;
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: f.properties,
        __visited: !!(a3 && visitedIso3[a3])
      };
    });

    globe
      .polygonsData(polygons)
      .polygonAltitude(function (d) { return d.__visited ? 0.012 : 0.0; })
      .polygonCapColor(function (d) { return d.__visited ? ACCENT : NEUTRAL_FILL; })
      .polygonSideColor(function (d) { return d.__visited ? ACCENT_SIDE : NEUTRAL_SIDE; })
      .polygonStrokeColor(function (d) { return d.__visited ? ACCENT_EDGE : NEUTRAL_EDGE; })
      .polygonLabel(function (d) {
        if (!d.__visited) return '';
        var p = d.properties || {};
        return '<div class="globe-tip"><b>🌍 ' + esc(p.NAME || p.ADMIN || '') + '</b></div>';
      });

    buildStats();
  }

  function buildStats() {
    var elStats = document.querySelector('.globe-stats');
    if (elStats) {
      elStats.innerHTML =
        '<b>' + cities.length + '</b> городов · <b>' + Object.keys(visitedCC).length + '</b> стран';
    }
  }

  function hideLoading() {
    var loader = document.getElementById('globe-loading');
    if (loader) loader.classList.add('hidden');
  }

  // responsive: re-size the Three renderer with the container
  window.addEventListener('resize', function () {
    globe.width(container.clientWidth).height(container.clientHeight);
  });
})();
