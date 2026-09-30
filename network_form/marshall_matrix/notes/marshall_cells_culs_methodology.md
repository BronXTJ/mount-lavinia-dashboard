# Marshall cells and cul-de-sacs

Cells and cul-de-sacs in this note come from the ready street lines in `roads_marshall_ready.gpkg`. Each of the five GN divisions is polygonized and counted on its own. The five areas are not dissolved.

The old green polygon layer (`cells_all.geojson`, `cells_marshall.geojson`) and the 100 m hexagonal grid are not inputs. A polygonize face is only a candidate. The face counts in the network snap table are not Marshall cells. No minimum area is applied. The old 100 m² cutoff is not used.

No T-ratio, X-ratio, cell ratio, cul ratio, or Marshall matrix is calculated.

## Cell rules

For each face, the exterior ring is matched to ready street segments within 0.25 m.

1. `NOT_A_CELL` when the ring is not a closed chain of at least three connected street segments.
2. `NOT_A_CELL` when the ring uses both OSM ids of a `manual_review` dual-carriageway pair, including D001 (`48701240` with `1498946138`) and D002 (`48701240` with `687500136`). That face is the gap between carriageways.
3. `UNCERTAIN` when the ring uses both OSM ids of a `kept_separate` parallel pair.
4. `NOT_A_CELL` when two boundary segments overlap by at least 2 m within 0.6 m and are not an already recorded dual pair.
5. `UNCERTAIN` when an unknown crossing lies on the face, or a bridge-tagged ring segment crosses another street in the interior rather than only at shared endpoints. A bridge landing that only meets other streets at endpoints does not reject the face.
6. `NOT_A_CELL` when the ring uses a segment that ends at a degree-1 `boundary_endpoints` point. Touching the GN boundary at a vertex is not enough.
7. `UNCERTAIN` when the minimum rotated-rectangle width is under 2 m, or the longest edge is more than 20 times that width. These slivers stay in the review table.
8. Otherwise `GENUINE_CELL`.

## Cul-de-sac rules

Candidates are degree-1 ends of the ready graph. Node identity is the existing 0.01 m endpoint cell. Nothing is snapped again.

- `NOT_A_CUL` when the end is a `boundary_endpoints` point.
- `NOT_A_CUL` when the only incident segment is a short fragment under 0.5 m.
- `UNCERTAIN` when the end is J0620 / crossing C0340, or the incident segment is bridge-tagged.
- `GENUINE_CUL` otherwise. The geometry is the degree-1 segment plus following degree-2 segments until the first node of degree 3 or more.

## Counts

### Cells

| GN | candidates | genuine | uncertain | rejected |
|---|---:|---:|---:|---:|
| Mount Lavinia | 0 | 0 | 0 | 0 |
| Kawdana West | 0 | 0 | 0 | 0 |
| Watarappala | 0 | 0 | 0 | 0 |
| Wathumulla | 0 | 0 | 0 | 0 |
| Wedikanda | 0 | 0 | 0 | 0 |
| TOTAL | 0 | 0 | 0 | 0 |

### Cul-de-sacs

| GN | candidates | genuine | uncertain | rejected |
|---|---:|---:|---:|---:|
| Mount Lavinia | 94 | 2 | 65 | 27 |
| Kawdana West | 112 | 0 | 58 | 54 |
| Watarappala | 86 | 0 | 45 | 41 |
| Wathumulla | 83 | 0 | 39 | 44 |
| Wedikanda | 106 | 0 | 54 | 52 |
| TOTAL | 481 | 2 | 261 | 218 |

These counts are a review of the ready street faces and dead ends. They are not a claim that every cell or cul-de-sac is error-free.
