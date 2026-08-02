# Snap sensitivity — 50 m vs 100 m

## Purpose

Test how walk-accessibility KPIs and empty mid-area hexes change when the network snap tolerance
widens from **50 m** (sensitivity archive) to **100 m** (locked baseline / dashboard).

## Headline differences

| Metric | 50 m | 100 m | Delta |
|--------|------|-------|-------|
| Hex snap OK | 389 | 429 | 40 |
| Hex snap fail | 58 | 18 | -40 |
| Analysis hexes | 323 | 341 | 18 |
| Mean access score | 0.8731 | 0.8719 | -0.0012 |
| Deserts | 27 | 29 | 2 |
| Mismatch | 5 | 5 | 0 |

## Hex ID changes

- **Newly snapped at 100 m (40):** [1, 10, 19, 29, 38, 46, 54, 55, 63, 71, 72, 82, 83, 113, 127, 157, 158, 160, 175, 176, 184, 205, 206, 220, 221, 234, 247, 248, 262, 263, 278, 295, 313, 332, 351, 370, 389, 405, 418, 439]
- **Still unsnapped (18):** [28, 37, 45, 62, 97, 112, 126, 141, 174, 190, 219, 233, 350, 369, 388, 404, 417, 430]
- **Deserts gained at 100 m:** [29, 38]
- **Deserts lost at 100 m:** []

## How to read this

Widening snap to 100 m attaches more hex centroids (and nearly all POIs) to the road network,
so fewer mid-area holes remain empty. Some newly included hexes can be low-access, so desert
count may rise even while mean score stays similar.

## Dashboard

The live dashboard (`public/data/walk-accessibility/`) uses the **100 m** baseline.
