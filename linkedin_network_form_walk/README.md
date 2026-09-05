---
uid: 76f9cc41-a23e-42f7-84dd-331d5a62d6ee
kind: element
title: LinkedIn maps — dashboard-accurate (no overlapping themes)
domain: linkedin_network_form_walk
---

# LinkedIn maps — dashboard-accurate (no overlapping themes)

Regenerate:
```bash
python scripts/network_form/render_linkedin_maps.py
```

## Design rules (matched to the live Network Form map)
- **Carto Dark Matter** basemap (same family as dashboard default “Dark”)
- Colours / fill opacity from `src/constants/networkForm.js`
- **One thematic layer per figure** (no hex + points stacked)
- Legend in a **separate band under the map** (nothing drawn on top of the geography)
- No place-name callouts added by us (only faint basemap labels)

## Files — attach these three on LinkedIn (in order)

| Order | File | Dashboard layer equivalent | Caption |
|-------|------|----------------------------|---------|
| 1 | `maps/01_street_pathways_gn.png` | Street Pathways + GN Boundaries | Street pathways and five GN boundaries in the Mount Lavinia primary study area. Network Form context layers; colours match the dashboard. |
| 2 | `maps/02_junction_typology.png` | 4-way / 3-way / Cul-de-sacs | Junction typology: red triangles = 4-way, blue squares = 3-way, orange circles = cul-de-sac. Same symbols and colours as the Network Form map. |
| 3 | `maps/03_culdesac_walk_access_hex.png` | Cul-de-sac × Walk Access | Destination walk-access tier on 100 m cells (hex fill only, opacity 0.55). Teal = high, amber = medium, red = low/desert, grey = excluded. |

Optional fourth (if you want density instead of / as well as walk):
- `maps/04_culdesac_hex_density.png` — Cul-de-sac count per 100 m cell (dashboard stepped ramp).

## Post body
Paste `LINKEDIN_POST.txt` (1,873 characters). Numbers are locked to Synthesis NF1–NF3.
