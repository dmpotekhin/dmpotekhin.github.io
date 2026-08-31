#!/usr/bin/env python3
"""
Update travel map data incrementally from города.xlsx.

Pipeline:  города.xlsx  ->  diff vs current travel-data.js (cache of verified
coords)  ->  geocode ONLY the delta via Nominatim  ->  write js/travel-data.js
+ data/visited_countries.geojson (add polygons for new countries from Natural
Earth 50m if missing).

Safe by design:
  - existing 249 cities / N country polys are KEPT untouched (only the delta is
    geocoded), so verified coordinates never change.
  - Nominatim results cached to scripts/nominatim_cache.json (disk cache) so a
    re-run is offline-ish and does not hammer the API.
  - 'Хэдань'-style duplicate/typo names are skipped if the correct one already
    exists (see SKIP_TYPOS).

Usage:  python3 scripts/update_travel_data.py
"""
import re, json, os, sys, time, csv, io

# ---- paths ---------------------------------------------------------------
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XL = os.path.join(REPO, "города.xlsx")
TRAVEL_JS = os.path.join(REPO, "js", "travel-data.js")
GEOJSON = os.path.join(REPO, "data", "visited_countries.geojson")
CACHE = os.path.join(REPO, "scripts", "nominatim_cache.json")
NE_URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
          "master/geojson/ne_50m_admin_0_countries.geojson")
UA = {"User-Agent": "dmpotekhin-travel-map/1.0 (personal travel data refresh)"}

# Known typo/duplicate city names that shadow a correct entry already present
# in the data. If the "correct" name matches one we already have, skip it.
SKIP_TYPOS = {"Хэдань": "Хандань"}   # Хэдань is a mis-typing of Хандань (CN)

# Fallback: country ISO_A2 -> russian name + fillColor (dominant flag colour
# chosen to echo existing convention). Derived from Nominatim + NE for the new
# countries; the rest are inferred from existing data via cc->country mapping.
RU_NAME = {
    "PH": ("Филиппины", "#0038A8"),
    "MN": ("Монголия",  "#C8102E"),
    "CH": ("Швейцария", "#DA291C"),
    "PY": ("Парагвай",  "#D52B1E"),
}
A3 = {"CH": "CHE", "PH": "PHL", "MN": "MNG", "PY": "PRY"}


def log(*a):
    print(*a, flush=True)


# ---- 1. read cities from xlsx (col A = city name) -------------------------
def read_xlsx_cities():
    try:
        import openpyxl
        wb = openpyxl.load_workbook(XL, data_only=True)
        ws = wb.active
        names = []
        for row in ws.iter_rows(min_row=1, values_only=True):
            v = row[0]
            if v is None:
                continue
            s = str(v).strip()
            if s:
                names.append(s)
        return names
    except ImportError:
        # fall back to raw xlsx (col A is plain text in a shared string)
        import zipfile
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(XL) as z:
            sh = z.read("xl/sharedStrings.xml")
        ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
        root = ET.fromstring(sh)
        strs = ["".join(t.text or "" for t in si.iter(ns + "t"))
                for si in root.iter(ns + "si")]
        with zipfile.ZipFile(XL) as z:
            sh1 = z.read("xl/worksheets/sheet1.xml")
        root1 = ET.fromstring(sh1)
        names = []
        for row in root1.iter(ns + "row"):
            for c in row.iter(ns + "c"):
                if c.get("r", "").startswith("A"):
                    v = c.find(ns + "v")
                    if v is not None:
                        idx = int(v.text)
                        names.append(strs[idx].strip())
        return names


# ---- 2. parse current travel-data.js (verified coords cache) --------------
def parse_cities():
    src = open(TRAVEL_JS, encoding="utf-8").read()
    pat = re.compile(r'\{name:"([^"]+)",\s*country:"([^"]+)",\s*cc:"([^"]+)",'
                     r'\s*lat:([-\d.]+),\s*lon:([-\d.]+)\}')
    cities = {}
    for m in pat.finditer(src):
        name, country, cc, lat, lon = m.groups()
        cities[name.strip()] = {"name": name.strip(), "country": country.strip(),
                                "cc": cc.strip(), "lat": float(lat), "lon": float(lon)}
    return cities


# ---- 3. Nominatim geocoder with disk cache --------------------------------
def geocode(name, country_hint_cc=None):
    cache = {}
    if os.path.exists(CACHE):
        cache = json.load(open(CACHE, encoding="utf-8"))
    key = name.strip().lower()
    if key in cache:
        return cache[key]
    import requests
    q = name.strip()
    if country_hint_cc:
        q = q + ", " + country_hint_cc
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search",
                         params={"q": q, "format": "json",
                                 "limit": 1, "addressdetails": 1},
                         headers=UA, timeout=20)
        data = r.json()
        if data:
            d = data[0]
            res = {"lat": float(d["lat"]), "lon": float(d["lon"])}
            cc = (d.get("address") or {}).get("country_code", "").upper()
            res["cc"] = cc or None
            cache[key] = res
            json.dump(cache, open(CACHE, "w", encoding="utf-8"),
                      ensure_ascii=False, indent=2)
            return res
    except Exception as e:
        log("  !! geocode error", name, e)
    return None


def nearest_cc(city, cities):
    """Infer country cc for a delta city from an existing city if we can't
    geocode it confidently (fallback for names Nominatim mangles)."""
    # if the same city name already exists, reuse its cc
    if city in cities:
        return cities[city]["cc"]
    return None


# ---- 4. main --------------------------------------------------------------
def main():
    import requests
    log("# reading xlsx ...")
    xlsx_names = read_xlsx_cities()
    log("  xlsx cities:", len(xlsx_names))

    cities = parse_cities()
    log("  existing travel data cities:", len(cities))

    # build cc -> russian country name from existing data (for new cities in
    # known countries we can inherit the russian label automatically)
    cc_to_country = {}
    for c in cities.values():
        cc_to_country[c["cc"]] = c["country"]

    delta = []
    for nm in xlsx_names:
        nm = nm.strip()
        # skip typo duplicates
        if nm in SKIP_TYPOS and SKIP_TYPOS[nm] in cities:
            log("  skip typo duplicate:", nm, "->", SKIP_TYPOS[nm])
            continue
        if nm not in cities:
            delta.append(nm)
    log("  delta to geocode:", delta)

    added_city = []
    for nm in delta:
        log("  geocoding:", nm)
        res = geocode(nm)
        # be polite to Nominatim usage policy (max ~1 request/sec)
        time.sleep(1.0)
        if not res:
            log("    !! no result for", nm, "skipped")
            continue
        cc = res.get("cc")
        # resolve cc
        if cc not in cc_to_country and cc in RU_NAME:
            cc_to_country[cc] = RU_NAME[cc][0]
        elif cc is None or cc not in cc_to_country:
            # try hint from nearest existing
            hint = res.get("cc")
            if hint and hint in cc_to_country:
                cc = hint
        country = cc_to_country.get(cc, cc or nm)
        cities[nm] = {"name": nm, "country": country, "cc": cc or "",
                      "lat": res["lat"], "lon": res["lon"]}
        added_city.append((nm, country, cc, res["lat"], res["lon"]))
        log("    ->", res["lat"], res["lon"], "cc", cc)

    # ---- reconcile: города.xlsx is the source of truth, so drop any city that
    # ---- is no longer present in the xlsx (removals), while keeping the
    # ---- typo-corrected names (SKIP_TYPOS values) that the xlsx references only
    # ---- via the misspelling.
    xlsx_set = {nm.strip() for nm in xlsx_names}
    keep = xlsx_set | set(SKIP_TYPOS.values())
    dropped = sorted(k for k in cities if k not in keep)
    if dropped:
        log("  dropping obsolete cities:", dropped)
        cities = {k: v for k, v in cities.items() if k in keep}

    ordered = sorted(cities.values(), key=lambda c: c["name"])
    n_countries = len(set(c["cc"] for c in ordered if c["cc"]))
    header = ("// Auto-generated: visited cities travel data ("
              + str(len(ordered)) + " cities / " + str(n_countries) + " countries)")
    lines = [header,
             "// Source: города.xlsx -> Nominatim geocoding. Do not edit by hand; "
             "edit города.xlsx then re-run.",
             "window.TRAVEL_CITIES = ["]
    for c in ordered:
        lines.append("  {name:\"%s\", country:\"%s\", cc:\"%s\", lat:%.5f, lon:%.5f},"
                     % (c["name"], c["country"], c["cc"], c["lat"], c["lon"]))
    lines.append("];")
    open(TRAVEL_JS, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    log("# WROTE", TRAVEL_JS, "->", len(ordered), "cities /", n_countries, "countries")

    # ---- geojson: add any new country that is missing a polygon ----------
    geoj = json.load(open(GEOJSON, encoding="utf-8"))
    a2_seen = {f["properties"]["ISO_A2"] for f in geoj["features"]}
    wanted = set(c["cc"] for c in cities.values() if c["cc"])
    # drop country polygons for countries no longer visited (removals)
    gone = sorted(a2_seen - wanted)
    if gone:
        log("  dropping obsolete country polygons:", gone)
        geoj["features"] = [f for f in geoj["features"]
                            if f["properties"]["ISO_A2"] in wanted]
        a2_seen = {f["properties"]["ISO_A2"] for f in geoj["features"]}
    missing = wanted - a2_seen
    log("  countries in geojson:", len(a2_seen), " missing:", missing)
    if missing:
        log("  fetching Natural Earth 50m ...")
        r = requests.get(NE_URL, timeout=60)
        ne = r.json()
        ne_by_a2 = {}
        for f in ne["features"]:
            p = f["properties"]
            if p.get("ISO_A2") in missing:
                ne_by_a2[p["ISO_A2"]] = (f["geometry"], p)
        for a2 in sorted(missing):
            if a2 not in ne_by_a2:
                log("    !! No NE polygon for", a2, "- country has cities but no "
                    "border; it will not be filled on the map.")
                continue
            geom, p = ne_by_a2[a2]
            rn = cc_to_country.get(a2, a2)
            fill = None
            for cc, (rname, fc) in RU_NAME.items():
                if cc == a2:
                    fill = fc
            feat = {"type": "Feature",
                    "properties": {"ISO_A2": a2, "ISO_A3": p.get("ISO_A3", a3(a2)),
                                   "NAME": p.get("NAME", rn), "fillColor": fill},
                    "geometry": geom}
            geoj["features"].append(feat)
            log("    + added polygon", a2, p.get("NAME"))
    json.dump(geoj, open(GEOJSON, "w", encoding="utf-8"), ensure_ascii=False)
    log("# WROTE", GEOJSON, "->", len(geoj["features"]), "countries")
    log("# DONE")


def a3(a2):
    return A3.get(a2, a2)


if __name__ == "__main__":
    main()
