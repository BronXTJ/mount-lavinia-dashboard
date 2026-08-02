#!/usr/bin/env python3
"""Phase 5: assemble synthesis-ready findings from Phase 3–4 accessibility outputs."""

from __future__ import annotations

import json
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]

ACCESS_SUMMARY = PACKAGE_ROOT / "05_accessibility" / "access_primary_summary.json"
CLASSIFIED = PACKAGE_ROOT / "05_accessibility" / "access_hex_classified.geojson"
MAPS_SUMMARY = PACKAGE_ROOT / "06_maps" / "maps_summary.json"
OUT_DIR = PACKAGE_ROOT / "07_findings"
OUT_MD = OUT_DIR / "findings.md"
OUT_JSON = OUT_DIR / "findings_summary.json"
OUT_DESERTS = OUT_DIR / "desert_hex_ids.json"

DEST_GROUPS = ["food", "education", "health", "transit", "finance", "open_space"]


def pct(x: float) -> str:
    return f"{100.0 * float(x):.1f}%"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    for path in (ACCESS_SUMMARY, CLASSIFIED, MAPS_SUMMARY):
        if not path.is_file():
            raise SystemExit(f"Missing required input: {path}")

    s3 = load_json(ACCESS_SUMMARY)
    maps = load_json(MAPS_SUMMARY)
    classified = load_json(CLASSIFIED)
    feats = classified["features"]

    desert_ids = sorted(
        int(f["properties"]["hex_id"])
        for f in feats
        if f["properties"].get("access_tier") == "low"
    )
    mismatch_ids = sorted(
        int(f["properties"]["hex_id"])
        for f in feats
        if f["properties"].get("mismatch_flag") is True
    )

    cov = s3.get("coverage_analysis_ok") or s3.get("coverage_non_edge_snap_ok") or {}
    coverage_10 = {g: float(cov[g]["within_10_min"]) for g in DEST_GROUPS}
    ranked = sorted(coverage_10.items(), key=lambda kv: kv[1])
    weakest = ranked[0]
    strongest = ranked[-1]

    tiers = maps.get("tier_counts") or {}
    desert_count = int(s3.get("desert_count") or tiers.get("low") or len(desert_ids))
    if desert_count != len(desert_ids):
        raise SystemExit(
            f"Desert count mismatch: summary={desert_count} tier/list={len(desert_ids)}"
        )
    if int(tiers.get("low") or -1) != desert_count:
        raise SystemExit(
            f"maps_summary.tier_counts.low={tiers.get('low')} != desert_count={desert_count}"
        )

    analysis_n = int(s3["analysis_hex_count"])
    mean_score = float(s3["mean_access_score"])
    mismatch_n = int(maps.get("mismatch_count") or len(mismatch_ids))

    kpis = {
        "analysis_definition": s3.get("analysis_definition"),
        "analysis_hex_count": analysis_n,
        "mean_access_score": mean_score,
        "median_access_score": s3.get("median_access_score"),
        "coverage_within_10_min": {g: round(coverage_10[g], 4) for g in DEST_GROUPS},
        "weakest_group_10min": {"group": weakest[0], "share": round(weakest[1], 4)},
        "strongest_group_10min": {"group": strongest[0], "share": round(strongest[1], 4)},
        "tier_counts": {k: int(v) for k, v in tiers.items()},
        "desert_count": desert_count,
        "desert_share": s3.get("desert_share"),
        "mismatch_count": mismatch_n,
        "walk_speed_kmh": s3.get("walk_speed_kmh"),
        "completeness_counts": s3.get("completeness_counts"),
    }

    draft_findings = [
        {
            "id": "WA1",
            "label": "Food Access Is Strong; Health and Education Lag",
            "observation": [
                f"Among {analysis_n} analysis hexes (area_ratio≥0.90 and snapped within 100 m), mean destination access_score is {mean_score:.3f}.",
                f"Within a 10-minute walk, food coverage is {pct(coverage_10['food'])} while health is {pct(coverage_10['health'])} and education is {pct(coverage_10['education'])}.",
                f"Transit ({pct(coverage_10['transit'])}), finance ({pct(coverage_10['finance'])}), and open space ({pct(coverage_10['open_space'])}) sit between those extremes.",
            ],
            "interpretation": [
                "Daily retail/food destinations are already dense relative to other essential services.",
                "Health and education remain the thinnest 10-minute destination groups, so ‘accessibility’ is uneven by function rather than uniformly poor.",
                "Five-minute coverage is much lower for health/education than for food, so short-trip equity gaps are sharper than 10-minute totals alone suggest.",
            ],
            "implication": [
                "Prioritise pharmacies/clinics and school-adjacent walking links where 10-minute health/education reach is weakest.",
                "Do not treat high food coverage as proof that all daily needs are walkable.",
                "Use map03 (time by group) and map04 (coverage bars) to target service insertion or crossing upgrades.",
            ],
        },
        {
            "id": "WA2",
            "label": "Destination Deserts Are Localized",
            "observation": [
                f"{desert_count} analysis hexes are low-tier deserts (groups_within_10 ≤ 2), about {pct(float(s3.get('desert_share') or 0))} of the analysis set.",
                f"Tier among all 447 hexes: high {tiers.get('high', 0)}, medium {tiers.get('medium', 0)}, low {tiers.get('low', 0)}, excluded {tiers.get('excluded', 0)}.",
                "Excluded cells are incomplete (<90% area) or unsnapped (>100 m from the walk network); they remain mapped but are outside KPI denominators.",
            ],
            "interpretation": [
                "Most of the primary area already reaches five or more destination groups within 10 minutes.",
                "Deserts are concentrated pockets, not an area-wide failure of walk access.",
                "Treating only legacy is_edge cells as ‘invalid’ would mis-state the problem; the analysis_ok gate keeps near-complete boundary hexes in the evidence.",
            ],
            "implication": [
                f"Treat the {desert_count} desert hexes as priority zones for missing daily destinations or safer walk links into existing clusters.",
                "Keep deserts visible on map02 alongside high-access fabric so interventions stay place-specific.",
                "Re-check deserts after any POI inventory update (health/education especially).",
            ],
        },
        {
            "id": "WA3",
            "label": "A Few High-Betweenness Cells Still Lack Daily Destinations",
            "observation": [
                f"{mismatch_n} analysis hexes combine top-quartile mean BtA5000 with access_score < 0.5.",
                "These cells sit on structurally important movement corridors but still fail to reach half of the six destination groups within 10 minutes.",
                "This is the spatial bridge to synthesis finding F8 (network centrality concentrates pressure).",
            ],
            "interpretation": [
                "Network importance (space-syntax betweenness) is not the same as destination reach.",
                "UMI ‘accessibility’ (~0.11 from NQPDA/BtA) measures network potential; destination walk scores measure lived reach to services.",
                "Mismatch hexes show where movement spines still under-serve daily needs.",
            ],
            "implication": [
                "Put service insertion, sidewalk continuity, and shade packages first on mismatch corridors (map05).",
                "When updating F8/F15, cite destination walk results alongside centrality so ‘accessibility lag’ is not read as network topology alone.",
                "Avoid assuming high betweenness streets already have complete daily amenity catchments.",
            ],
        },
    ]

    priorities = [
        {
            "rank": 1,
            "action": "Close health and education 10-minute gaps",
            "why": f"Weakest groups at 10 min: health {pct(coverage_10['health'])}, education {pct(coverage_10['education'])}.",
        },
        {
            "rank": 2,
            "action": f"Target the {desert_count} destination-desert hexes for service insertion or walk-link upgrades",
            "why": "Localized low-tier cells with ≤2 destination groups within 10 minutes.",
        },
        {
            "rank": 3,
            "action": f"Upgrade the {mismatch_n} centrality–access mismatch corridors",
            "why": "High betweenness with weak destination reach — align with F8 pressure corridors.",
        },
        {
            "rank": 4,
            "action": "Keep food/retail strength while diversifying essential services",
            "why": f"Food already at {pct(coverage_10['food'])} within 10 min; do not mistake that for full daily access.",
        },
    ]

    map_index = maps.get("maps") or {}

    summary_out = {
        "phase": 5,
        "kpis": kpis,
        "draft_findings": draft_findings,
        "priorities": priorities,
        "desert_hex_ids": desert_ids,
        "mismatch_hex_ids": mismatch_ids,
        "maps": map_index,
        "umi_contrast_note": (
            "UMI accessibility (~0.11) is normalized NQPDA5000/BtA5000 network potential; "
            "destination access_score is share of six daily groups within a 10-minute network walk."
        ),
    }

    desert_out = {
        "desert_definition": "access_tier==low (analysis_ok AND groups_within_10<=2)",
        "count": len(desert_ids),
        "hex_ids": desert_ids,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_DESERTS.open("w", encoding="utf-8") as f:
        json.dump(desert_out, f, indent=2)
        f.write("\n")
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(summary_out, f, indent=2)
        f.write("\n")

    # Markdown report
    cov_rows = "\n".join(
        f"| {g} | {pct(coverage_10[g])} | {cov[g].get('median_dist_m')} |"
        for g in DEST_GROUPS
    )
    map_rows = "\n".join(f"| `{k}` | `{v}` |" for k, v in map_index.items())

    md = f"""# Destination-based walk accessibility — findings

## Method (one line)

Network walk distance/time from primary hexes to six daily destination groups at **{s3.get('walk_speed_kmh')} km/h**, with KPI set **`{s3.get('analysis_definition')}`** ({analysis_n} hexes).

## Key results

| Metric | Value |
|--------|-------|
| Analysis hexes | {analysis_n} |
| Mean access_score | {mean_score:.3f} |
| Deserts (≤2 groups / 10 min) | {desert_count} ({pct(float(s3.get('desert_share') or 0))}) |
| High / medium / low / excluded | {tiers.get('high')} / {tiers.get('medium')} / {tiers.get('low')} / {tiers.get('excluded')} |
| Centrality–access mismatch | {mismatch_n} |

### 10-minute coverage by group

| Group | Within 10 min | Median dist (m) |
|-------|---------------|-----------------|
{cov_rows}

## Draft synthesis cards

### WA1 — {draft_findings[0]['label']}

**Observation**
{chr(10).join('- ' + x for x in draft_findings[0]['observation'])}

**Interpretation**
{chr(10).join('- ' + x for x in draft_findings[0]['interpretation'])}

**Implication**
{chr(10).join('- ' + x for x in draft_findings[0]['implication'])}

### WA2 — {draft_findings[1]['label']}

**Observation**
{chr(10).join('- ' + x for x in draft_findings[1]['observation'])}

**Interpretation**
{chr(10).join('- ' + x for x in draft_findings[1]['interpretation'])}

**Implication**
{chr(10).join('- ' + x for x in draft_findings[1]['implication'])}

### WA3 — {draft_findings[2]['label']}

**Observation**
{chr(10).join('- ' + x for x in draft_findings[2]['observation'])}

**Interpretation**
{chr(10).join('- ' + x for x in draft_findings[2]['interpretation'])}

**Implication**
{chr(10).join('- ' + x for x in draft_findings[2]['implication'])}

## UMI accessibility vs destination reach

{summary_out['umi_contrast_note']}

Destination walk results should update the F8/F15 story: network centrality can be high while lived reach to health/education (and desert pockets) still lags.

## Design priorities

{chr(10).join(f"{p['rank']}. **{p['action']}** — {p['why']}" for p in priorities)}

## Map index

| Id | File |
|----|------|
{map_rows}

Figures live under `06_maps/` (`map01_access_score.png` … `map05_centrality_mismatch.png`).
"""

    with OUT_MD.open("w", encoding="utf-8") as f:
        f.write(md)

    print(f"Wrote {OUT_MD} ({len(md)} chars)")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_DESERTS} ({len(desert_ids)} deserts)")
    print(f"mean_access_score={mean_score:.3f} mismatch={mismatch_n}")


if __name__ == "__main__":
    main()
