# Marshall structural ratios

Ratios in this note use confirmed classifications only. Uncertain cases are listed in `marshall_uncertainties.csv` and are excluded from T, X, Cells, and Culs.

Unflagged T and X junctions stay as stored in `marshall_junctions.gpkg`. The junction review then removes original T or X nodes whose final class is not `CONFIRMED_T` or `CONFIRMED_X`. Endpoints, bends, rejected junctions, and unresolved crossings are not counted. Cells and cul-de-sacs are the genuine rows only. GN-boundary clip ends, rejected candidates, and uncertain candidates are not counted.

The study-area row sums those confirmed counts. The five GN divisions are not dissolved. No network cleaning, snapping, polygonization, or junction detection was repeated.

T-ratio = T / (T + X). X-ratio = X / (T + X). Cell-ratio = Cells / (Cells + Culs). Cul-ratio = Culs / (Cells + Culs). Each pair sums to 1.

The Marshall matrix is not calculated. These ratios are not interpreted as residential, commercial, accessible, inaccessible, good, or bad.

## Ratios

| GN | T | X | T_ratio | X_ratio | Cells | Culs | Cell_ratio | Cul_ratio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mount Lavinia | 111 | 13 | 0.8951612903 | 0.1048387097 | 21 | 67 | 0.2386363636 | 0.7613636364 |
| Kawdana West | 76 | 4 | 0.9500000000 | 0.0500000000 | 5 | 56 | 0.0819672131 | 0.9180327869 |
| Watarappala | 74 | 8 | 0.9024390244 | 0.0975609756 | 8 | 44 | 0.1538461538 | 0.8461538462 |
| Wathumulla | 56 | 4 | 0.9333333333 | 0.0666666667 | 10 | 38 | 0.2083333333 | 0.7916666667 |
| Wedikanda | 77 | 6 | 0.9277108434 | 0.0722891566 | 7 | 54 | 0.1147540984 | 0.8852459016 |
| TOTAL | 394 | 35 | 0.9184149184 | 0.0815850816 | 51 | 259 | 0.1645161290 | 0.8354838710 |

## Excluded uncertainties

| kind | id | GN | reason |
|---|---|---|---|

