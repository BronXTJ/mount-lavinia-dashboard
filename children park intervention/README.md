---
uid: b0c5a220-64bd-4949-a68b-a3c96a9f5c75
kind: element
title: "Mount Lavinia Children's Park — Intervention Package"
domain: children park intervention
---

# Mount Lavinia Children's Park — Intervention Package

Self-contained folder for the urban design intervention at Mount Lavinia Children's Park.

## Contents

| Path | Description |
|------|-------------|
| `data/reviews/` | Google Maps reviews (239 rows), raw Apify JSON, scrape metadata |
| `data/demographics/` | GN population catchment snapshot (Census 2024) |
| `data/site_context.json` | Site coordinates, hours, stakeholders, capacity assumptions |
| `scripts/build_proposal_report.py` | Builds the intervention proposal DOCX and PDF |
| `scripts/build_site_plan_figure.py` | Builds the conceptual site plan PNG/PDF figure |
| `outputs/` | Generated reports and figures |

## Rebuild the proposal

```bash
cd "children park intervention"
pip install -r requirements.txt
python scripts/build_site_plan_figure.py
python scripts/build_proposal_report.py
```

Outputs:

- `outputs/figures/park_concept_site_plan.png` / `.pdf`
- `outputs/Mount_Lavinia_Childrens_Park_Intervention_Proposal.docx`
- `outputs/Mount_Lavinia_Childrens_Park_Intervention_Proposal.pdf` (requires Microsoft Word for auto-conversion)

If PDF conversion fails, open the DOCX in Word and use **File → Save As → PDF**.

## Site location

6.832110°N, 79.863887°E — Mount Lavinia Children's Park, Dehiwala–Mount Lavinia MC.
