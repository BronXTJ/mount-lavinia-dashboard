"""Build snap_nodes.geojson from centrality network endpoints + cul-de-sac junctions."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CENT = ROOT / "public/data/urban-morpho/centrality/betweenness_500.geojson"
JUNCTIONS = ROOT / "public/data/network-form"
OUT = ROOT / "public/data/urban-morpho/what-if/snap_nodes.geojson"


def endpoints_from_line(coords):
    if not coords:
        return []
    return [coords[0][:2], coords[-1][:2]]


def collect_from_centrality(path: Path) -> list[tuple[float, float]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    pts = []
    for f in data["features"]:
        g = f["geometry"]
        if g["type"] == "LineString":
            pts.extend(endpoints_from_line(g["coordinates"]))
        elif g["type"] == "MultiLineString":
            for ring in g["coordinates"]:
                pts.extend(endpoints_from_line(ring))
    return pts


def collect_culdesacs() -> list[tuple[float, float, dict]]:
    """Prefer network-form geojson if present."""
    candidates = list((ROOT / "public/data").rglob("*culde*.geojson"))
    candidates += list((ROOT / "public/data").rglob("*junction*.geojson"))
    out = []
    for path in candidates:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for f in data.get("features") or []:
            props = f.get("properties") or {}
            jtype = str(props.get("jtype") or props.get("type") or props.get("junction_type") or "").lower()
            g = f.get("geometry") or {}
            if g.get("type") == "Point":
                coords = g["coordinates"][:2]
                role = "culdesac" if "cul" in jtype or "dead" in jtype else "junction"
                out.append((float(coords[0]), float(coords[1]), {"role": role, "source": path.name}))
    return out


def dedupe(points, ndigits=5):
    seen = {}
    for item in points:
        if len(item) == 2:
            x, y = item
            meta = {"role": "endpoint"}
        else:
            x, y, meta = item
        key = (round(x, ndigits), round(y, ndigits))
        # Prefer culdesac over endpoint
        if key not in seen or meta.get("role") == "culdesac":
            seen[key] = meta
    return seen


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pts = [(x, y, {"role": "endpoint"}) for x, y in collect_from_centrality(CENT)]
    pts += collect_culdesacs()
    deduped = dedupe(pts)
    features = []
    for i, ((x, y), meta) in enumerate(deduped.items()):
        features.append(
            {
                "type": "Feature",
                "properties": {"id": i, "role": meta.get("role", "endpoint")},
                "geometry": {"type": "Point", "coordinates": [x, y]},
            }
        )
    fc = {"type": "FeatureCollection", "features": features}
    OUT.write_text(json.dumps(fc), encoding="utf-8")
    print(f"wrote {OUT} n={len(features)}")


if __name__ == "__main__":
    main()
