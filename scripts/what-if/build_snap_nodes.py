"""Build snap_nodes.geojson from the centrality (sDNA) network only.

Each link endpoint is a snap target. Degree-1 ends are labelled culdesac;
degree ≥ 2 ends are junctions. No Network Form / orphan points are included,
so every snap sits on the same graph used for What-if drawing and analysis.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CENT = ROOT / "public/data/urban-morpho/centrality/betweenness_500.geojson"
OUT = ROOT / "public/data/urban-morpho/what-if/snap_nodes.geojson"
NDIGITS = 5


def endpoints_from_line(coords):
    if not coords:
        return []
    return [coords[0][:2], coords[-1][:2]]


def collect_endpoint_keys(path: Path) -> list[tuple[float, float]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    pts: list[tuple[float, float]] = []
    for f in data["features"]:
        g = f["geometry"]
        if g["type"] == "LineString":
            pts.extend(endpoints_from_line(g["coordinates"]))
        elif g["type"] == "MultiLineString":
            for ring in g["coordinates"]:
                pts.extend(endpoints_from_line(ring))
    return pts


def main() -> None:
    if not CENT.is_file():
        raise SystemExit(f"missing centrality network: {CENT}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw = collect_endpoint_keys(CENT)
    keys = [(round(x, NDIGITS), round(y, NDIGITS)) for x, y in raw]
    degree = Counter(keys)

    features = []
    for i, ((x, y), deg) in enumerate(sorted(degree.items())):
        role = "culdesac" if deg == 1 else "junction"
        features.append(
            {
                "type": "Feature",
                "properties": {"id": i, "role": role, "degree": deg},
                "geometry": {"type": "Point", "coordinates": [x, y]},
            }
        )

    fc = {"type": "FeatureCollection", "features": features}
    OUT.write_text(json.dumps(fc), encoding="utf-8")
    n_cul = sum(1 for f in features if f["properties"]["role"] == "culdesac")
    n_junc = len(features) - n_cul
    print(f"wrote {OUT} n={len(features)} culdesac={n_cul} junction={n_junc}")


if __name__ == "__main__":
    main()
