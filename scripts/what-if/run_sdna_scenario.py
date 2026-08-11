"""Merge proposed links into prepared sDNA network and run Integral (ANGULAR).

Usage:
  python scripts/what-if/run_sdna_scenario.py \\
    --links public/data/urban-morpho/what-if/scenarios/custom/proposed_links.geojson \\
    --out-dir public/data/urban-morpho/what-if/scenarios/custom

Requires: sDNA at C:\\Program Files (x86)\\sDNA, geopandas/shapefile/proj4.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
import time
from pathlib import Path

if not hasattr(time, "clock"):
    time.clock = time.perf_counter  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[2]
PREPARED = (
    ROOT
    / "json_files/Urban_morpho_analysis/betweeness_centrality/ClosenessCentrality/ClosenessCentrality/500_closeness.shp"
)
SDNA_ROOT = Path(r"C:\Program Files (x86)\sDNA")
WORK = ROOT / "json_files/Urban_morpho_analysis/_what_if_work"
RADII = [500, 2000, 3000, 5000]

# SLD99 approx affine from WGS84 for Mount Lavinia (same region as prepare-data)
# Prefer proj4 if available
try:
    import proj4  # type: ignore
except ImportError:
    proj4 = None


def wgs84_to_sld99(lon: float, lat: float) -> tuple[float, float]:
    if proj4 is not None:
        # proj4 python package API varies; use pyproj-style if present
        pass
    try:
        from pyproj import Transformer

        t = Transformer.from_crs("EPSG:4326", "EPSG:5235", always_xy=True)
        return t.transform(lon, lat)
    except Exception:
        pass
    # Fallback: use relative offset from known point if shapefile mid available
    # Approximate using local meters (not for production precision — prefer pyproj)
    raise SystemExit("Install pyproj for WGS84→SLD99 (EPSG:5235) conversion")


def load_proposed(path: Path) -> list[list[tuple[float, float]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    lines = []
    for f in data["features"]:
        g = f["geometry"]
        if g["type"] == "LineString":
            lines.append([(c[0], c[1]) for c in g["coordinates"]])
        elif g["type"] == "MultiLineString":
            for ring in g["coordinates"]:
                lines.append([(c[0], c[1]) for c in ring])
    return lines


def copy_prepared(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    import shapefile

    r = shapefile.Reader(str(PREPARED))
    fields = ["ID", "LConn", "LLen", "LFrac", "LAC", "LSin", "LBear"]
    all_fields = r.fields[1:]
    names = [f[0] for f in all_fields]
    idxs = [names.index(n) for n in fields]
    name_to_field = {f[0]: f for f in all_fields}

    w = shapefile.Writer(str(dest), shapeType=r.shapeType)
    w.autoBalance = 1
    for n in fields:
        w.field(*name_to_field[n])

    max_id = 0
    for shape, rec in zip(r.shapes(), r.records()):
        w.shape(shape)
        row = [rec[i] for i in idxs]
        max_id = max(max_id, int(row[0]))
        w.record(*row)

    # Append proposed links projected to SLD99
    return w, max_id, r


def append_links_and_close(w, max_id, lines_wgs, prj_src: Path, dest: Path, vert_index=None):
    next_id = max_id + 1
    for line in lines_wgs:
        sld = []
        for lon, lat in line:
            x, y = wgs84_to_sld99(lon, lat)
            if vert_index is not None:
                snapped, _d = vert_index(x, y)
                if snapped:
                    x, y = snapped
            sld.append((x, y))
        if len(sld) < 2:
            continue
        if math.hypot(sld[0][0] - sld[-1][0], sld[0][1] - sld[-1][1]) < 1:
            continue
        pts = [[x, y, 0.0] for x, y in sld]
        length = 0.0
        for i in range(len(sld) - 1):
            length += math.hypot(sld[i + 1][0] - sld[i][0], sld[i + 1][1] - sld[i][1])
        w.linez([pts])
        w.record(next_id, 2, length, 1.0, 0.0, 1.0, 0.0)
        next_id += 1
    w.close()
    if prj_src.exists():
        dest.with_suffix(".prj").write_text(prj_src.read_text(encoding="utf-8"), encoding="utf-8")


def build_vert_snapper(shp_path: Path, lim_m: float = 50.0):
    import shapefile

    r = shapefile.Reader(str(shp_path))
    verts = [(p[0], p[1]) for shape in r.shapes() for p in shape.points]

    def snap(x, y):
        best = None
        bd = lim_m
        for vx, vy in verts:
            d = math.hypot(x - vx, y - vy)
            if d < bd:
                bd = d
                best = (vx, vy)
        return best, bd

    return snap


def run_sdna(infile: Path, outfile: Path) -> None:
    sys.path.insert(0, str(SDNA_ROOT))
    os.chdir(SDNA_ROOT)
    from runcalculation import runcalculation
    import sdna_environment

    class DummyOutputMap:
        def __init__(self, outputbase):
            self.outputbase = outputbase

        def __getitem__(self, outputname):
            if outputname == "net":
                return self.outputbase
            return self.outputbase + "_" + outputname

    radii = ",".join(str(r) for r in RADII)
    config = (
        f"metric=ANGULAR;radii={radii};nojunctions;nohull;weight_type=Link;"
    )
    env = sdna_environment.SdnaShapefileEnvironment(str(infile))
    for p in outfile.parent.glob(outfile.stem + "*"):
        try:
            p.unlink()
        except OSError:
            pass
    runcalculation(
        env,
        "sdnaintegral",
        config,
        {"net": str(infile)},
        DummyOutputMap(env.get_out_base(str(outfile))),
        dll="",
    )


def shp_to_public_geojson(integral_shp: Path, out_dir: Path, baseline_dir: Path) -> dict:
    """Export WGS84 geojson per radius for closeness/betweenness; compute summary vs baseline."""
    import shapefile
    from pyproj import Transformer

    to_wgs = Transformer.from_crs("EPSG:5235", "EPSG:4326", always_xy=True)
    r = shapefile.Reader(str(integral_shp))
    fields = [f[0] for f in r.fields[1:]]
    id_ix = fields.index("ID")

    def geom_wgs(shape):
        parts = []
        # shape.points are (x,y) or (x,y,z)
        pts = shape.points
        if shape.parts:
            idxs = list(shape.parts) + [len(pts)]
            for a, b in zip(idxs, idxs[1:]):
                ring = []
                for p in pts[a:b]:
                    lon, lat = to_wgs.transform(p[0], p[1])
                    ring.append([round(lon, 6), round(lat, 6)])
                parts.append(ring)
        else:
            ring = [[round(to_wgs.transform(p[0], p[1])[0], 6), round(to_wgs.transform(p[0], p[1])[1], 6)] for p in pts]
            parts = [ring]
        if len(parts) == 1:
            return {"type": "LineString", "coordinates": parts[0]}
        return {"type": "MultiLineString", "coordinates": parts}

    records = list(r.records())
    shapes = list(r.shapes())

    summary = {"radii": RADII, "metrics": {}}
    for radius in RADII:
        for metric, prefix in [("closeness", "NQPDA"), ("betweenness", "BtA")]:
            field = f"{prefix}{radius}"
            if field not in fields:
                continue
            fx = fields.index(field)
            features = []
            values = {}
            for rec, shape in zip(records, shapes):
                iid = int(rec[id_ix])
                val = float(rec[fx])
                values[iid] = val
                features.append(
                    {
                        "type": "Feature",
                        "properties": {"ID": iid, field: val},
                        "geometry": geom_wgs(shape),
                    }
                )
            out_name = f"{metric}_{radius}.geojson"
            (out_dir / out_name).write_text(
                json.dumps({"type": "FeatureCollection", "features": features}),
                encoding="utf-8",
            )

            # Delta vs baseline public file
            base_path = baseline_dir / f"{metric}_{radius}.geojson"
            deltas = []
            if base_path.exists():
                base = json.loads(base_path.read_text(encoding="utf-8"))
                for f in base["features"]:
                    iid = int(f["properties"]["ID"])
                    bval = float(f["properties"][field])
                    sval = values.get(iid)
                    if sval is None:
                        continue
                    d = sval - bval
                    if abs(d) > 1e-12:
                        deltas.append({"ID": iid, "baseline": bval, "scenario": sval, "delta": d})
                deltas.sort(key=lambda x: x["delta"], reverse=True)
            summary["metrics"][f"{metric}_{radius}"] = {
                "n_changed": len(deltas),
                "max_delta": deltas[0]["delta"] if deltas else 0,
                "min_delta": deltas[-1]["delta"] if deltas else 0,
                "top_gainers": deltas[:5],
                "top_losers": list(reversed(deltas[-5:])) if deltas else [],
            }

    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def run_scenario(links: Path, out_dir: Path) -> dict:
    """Merge proposed links, run sDNA Integral, write GeoJSON + summary to out_dir."""
    links_path = links.resolve()
    out_dir = out_dir.resolve()

    if not PREPARED.exists():
        raise SystemExit(f"missing prepared network: {PREPARED}")
    if not SDNA_ROOT.exists():
        raise SystemExit(f"missing sDNA: {SDNA_ROOT}")

    lines = load_proposed(links_path)
    if not lines:
        raise SystemExit("no proposed links")

    WORK.mkdir(parents=True, exist_ok=True)
    merged = WORK / "merged_net.shp"
    integral = WORK / "integral_scenario.shp"

    import shapefile

    r = shapefile.Reader(str(PREPARED))
    fields = ["ID", "LConn", "LLen", "LFrac", "LAC", "LSin", "LBear"]
    all_fields = r.fields[1:]
    names = [f[0] for f in all_fields]
    idxs = [names.index(n) for n in fields]
    name_to_field = {f[0]: f for f in all_fields}

    for p in WORK.glob("merged_net*"):
        try:
            p.unlink()
        except OSError:
            pass

    w = shapefile.Writer(str(merged), shapeType=r.shapeType)
    w.autoBalance = 1
    for n in fields:
        w.field(*name_to_field[n])
    max_id = 0
    for shape, rec in zip(r.shapes(), r.records()):
        w.shape(shape)
        row = [rec[i] for i in idxs]
        max_id = max(max_id, int(row[0]))
        w.record(*row)

    append_links_and_close(
        w,
        max_id,
        lines,
        PREPARED.with_suffix(".prj"),
        merged,
        vert_index=build_vert_snapper(PREPARED),
    )
    print("merged network ready", merged)

    run_sdna(merged, integral)
    print("sDNA done", integral)

    out_dir.mkdir(parents=True, exist_ok=True)
    dest_links = out_dir / "proposed_links.geojson"
    if links_path != dest_links.resolve():
        shutil.copy2(links_path, dest_links)

    baseline = ROOT / "public/data/urban-morpho/centrality"
    summary = shp_to_public_geojson(integral, out_dir, baseline)
    print("wrote scenario to", out_dir)
    print(json.dumps({k: v.get("n_changed") for k, v in summary["metrics"].items()}, indent=2))
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--links", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    args = ap.parse_args()
    # Resolve before sDNA chdirs into its install folder
    run_scenario(args.links, args.out_dir)


if __name__ == "__main__":
    main()
