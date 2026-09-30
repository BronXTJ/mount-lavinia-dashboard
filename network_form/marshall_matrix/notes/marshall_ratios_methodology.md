# Marshall structural ratios

Ratios in this note use confirmed classifications only. Uncertain cases are listed in `marshall_uncertainties.csv` and are excluded from T, X, Cells, and Culs.

Unflagged T and X junctions stay as stored in `marshall_junctions.gpkg`. The junction review then removes original T or X nodes whose final class is not `CONFIRMED_T` or `CONFIRMED_X`. Endpoints, bends, rejected junctions, and unresolved crossings are not counted. Cells and cul-de-sacs are the genuine rows only. GN-boundary clip ends, rejected candidates, and uncertain candidates are not counted.

The study-area row sums those confirmed counts. The five GN divisions are not dissolved. No network cleaning, snapping, polygonization, or junction detection was repeated.

T-ratio = T / (T + X). X-ratio = X / (T + X). Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs). Each pair sums to 1.

The Marshall matrix is not calculated. These ratios are not interpreted as residential, commercial, accessible, inaccessible, good, or bad.

## Ratios

| GN | T | X | T_ratio | X_ratio | Cells | Culs | Cell_ratio | Cul_ratio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mount Lavinia | 115 | 9 | 0.9274193548 | 0.0725806452 | 21 | 63 | 0.2500000000 | 0.7500000000 |
| Kawdana West | 70 | 5 | 0.9333333333 | 0.0666666667 | 5 | 58 | 0.0793650794 | 0.9206349206 |
| Watarappala | 76 | 6 | 0.9268292683 | 0.0731707317 | 8 | 44 | 0.1538461538 | 0.8461538462 |
| Wathumulla | 56 | 4 | 0.9333333333 | 0.0666666667 | 10 | 38 | 0.2083333333 | 0.7916666667 |
| Wedikanda | 77 | 7 | 0.9166666667 | 0.0833333333 | 7 | 54 | 0.1147540984 | 0.8852459016 |
| TOTAL | 394 | 31 | 0.9270588235 | 0.0729411765 | 51 | 257 | 0.1655844156 | 0.8344155844 |

## Excluded uncertainties

| kind | id | GN | reason |
|---|---|---|---|
| cell | C0053 | Wedikanda | parallel streets (D017, D017); may be a real block or a divided road |
