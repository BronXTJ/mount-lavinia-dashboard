---
uid: 946d0cd3-840d-4539-bcbc-978630a931f9
slug: project
kind: project
title: Mount Lavinia Urban Analytics Dashboard
display_ko: 마운트 라비니아 도시 분석 대시보드
display_en: Mount Lavinia Urban Analytics Dashboard
domains: [domains/environmental-analysis, domains/evidence-pipeline, domains/export-maps, domains/focus-area, domains/issues-potentials, domains/land-cover-change, domains/movement-behaviour, domains/overview, domains/synthesis]
capabilities: []
elements: []
---

# Mount Lavinia Urban Analytics Dashboard

Interactive web dashboard for spatial and urban analysis along the Galle Road corridor, Mount Lavinia, Sri Lanka. It brings maps, KPIs, charts, and planning evidence into one place for studio work and public presentation.

Live demo: https://bronxtj.github.io/mount-lavinia-dashboard/

Study area: five Grama Niladhari divisions — Mount Lavinia, Kawdana West, Watarappala, Wathumulla, and Wedikanda.

## One-line mission

Give planners and studio reviewers a single hosted place to read measured evidence of problems and potentials on the Galle Road corridor.

## In scope

- The GitHub Pages dashboard: Overview, Focus Area, Movement and Behaviour, Land Cover Change, Environmental Analysis, Synthesis, Issues and Potentials, and Export Maps
- The evidence pipeline that prepares web data and deploys that app

## Out of scope

- Social media analysis (separate assignment, not on GitHub Pages)
- Condo inventory research
- Park and site intervention folders
- The unused `/land-use` route stub, which is not in the sidebar

## Competency answers

### scope: answered

What product/system outcome and user problem define the ontology scope?

The hosted Mount Lavinia Urban Analytics Dashboard gives planners and studio reviewers one GitHub Pages app for measured evidence on the Galle Road corridor, covering the five GN divisions and the pipeline that publishes that dashboard.

- Concepts: `project`
- Evidence: `src/tabs/Tab1_Overview.jsx`, `src/features/behaviour-analysis/BehaviourAnalysisPage.jsx`, `scripts/prepare-data.mjs`, `package.json`

### domains: answered

Which stable business responsibilities or decision boundaries form its domains?

Nine product domains bound the live site and how it is built: Overview, Focus Area, Movement and Behaviour, Land Cover Change, Environmental Analysis, Synthesis, Issues and Potentials, Export Maps, and Evidence Pipeline.

- Concepts: `project`, `domains/overview`, `domains/focus-area`, `domains/movement-behaviour`, `domains/land-cover-change`, `domains/environmental-analysis`, `domains/synthesis`, `domains/issues-potentials`, `domains/export-maps`, `domains/evidence-pipeline`
- Relations: `project` --domains--> `domains/overview`, `project` --domains--> `domains/focus-area`, `project` --domains--> `domains/movement-behaviour`, `project` --domains--> `domains/land-cover-change`, `project` --domains--> `domains/environmental-analysis`, `project` --domains--> `domains/synthesis`, `project` --domains--> `domains/issues-potentials`, `project` --domains--> `domains/export-maps`, `project` --domains--> `domains/evidence-pipeline`
- Evidence: `src/tabs/Tab1_Overview.jsx`, `src/components/focusArea/CentralityAnalysisView.jsx`, `src/features/behaviour-analysis/BehaviourAnalysisPage.jsx`, `src/tabs/TabLandCover.jsx`, `src/tabs/Tab5_Environmental.jsx`, `src/tabs/Tab7_Synthesis.jsx`, `src/tabs/Tab6_Problems.jsx`, `src/tabs/ExportMaps.jsx`, `scripts/prepare-data.mjs`, `package.json`

### abilities: answered

Which observable abilities realize those outcomes inside each domain?

Each domain has a shipped ability on the live site or its publish path: corridor KPIs and live weather, five Focus Area analyses including centrality what-if, junction movement behaviour, land-cover change, thermal-comfort grids, synthesis findings, issues framing, report-map export, web-data preparation, public GeoJSON serving, and GitHub Pages publish.

- Concepts: `domains/overview`, `domains/focus-area`, `domains/movement-behaviour`, `domains/land-cover-change`, `domains/environmental-analysis`, `domains/synthesis`, `domains/issues-potentials`, `domains/export-maps`, `domains/evidence-pipeline`, `capabilities/show-corridor-kpis-and-live-conditions`, `capabilities/analyse-network-centrality`, `capabilities/analyse-built-density`, `capabilities/score-urban-maturation`, `capabilities/measure-walk-accessibility`, `capabilities/read-network-form`, `capabilities/show-junction-movement-behaviour`, `capabilities/compare-land-cover-change`, `capabilities/map-thermal-comfort-grids`, `capabilities/integrate-planning-findings`, `capabilities/frame-issues-and-potentials`, `capabilities/export-report-maps`, `capabilities/prepare-web-data`, `capabilities/serve-public-geojson`, `capabilities/publish-github-pages`
- Relations: `domains/overview` --capabilities--> `capabilities/show-corridor-kpis-and-live-conditions`, `domains/focus-area` --capabilities--> `capabilities/analyse-network-centrality`, `domains/focus-area` --capabilities--> `capabilities/analyse-built-density`, `domains/focus-area` --capabilities--> `capabilities/score-urban-maturation`, `domains/focus-area` --capabilities--> `capabilities/measure-walk-accessibility`, `domains/focus-area` --capabilities--> `capabilities/read-network-form`, `domains/movement-behaviour` --capabilities--> `capabilities/show-junction-movement-behaviour`, `domains/land-cover-change` --capabilities--> `capabilities/compare-land-cover-change`, `domains/environmental-analysis` --capabilities--> `capabilities/map-thermal-comfort-grids`, `domains/synthesis` --capabilities--> `capabilities/integrate-planning-findings`, `domains/issues-potentials` --capabilities--> `capabilities/frame-issues-and-potentials`, `domains/export-maps` --capabilities--> `capabilities/export-report-maps`, `domains/evidence-pipeline` --capabilities--> `capabilities/prepare-web-data`, `domains/evidence-pipeline` --capabilities--> `capabilities/serve-public-geojson`, `domains/evidence-pipeline` --capabilities--> `capabilities/publish-github-pages`
- Evidence: `src/tabs/Tab1_Overview.jsx`, `src/components/focusArea/CentralityAnalysisView.jsx`, `src/components/focusArea/DensityAnalysisView.jsx`, `src/components/focusArea/UrbanMaturationView.jsx`, `src/components/focusArea/WalkAccessibilityView.jsx`, `src/components/focusArea/NetworkFormView.jsx`, `src/features/behaviour-analysis/BehaviourAnalysisPage.jsx`, `src/tabs/TabLandCover.jsx`, `src/tabs/Tab5_Environmental.jsx`, `src/tabs/Tab7_Synthesis.jsx`, `src/tabs/Tab6_Problems.jsx`, `src/tabs/ExportMaps.jsx`, `scripts/prepare-data.mjs`, `package.json`

### evidence: answered

Which source artifacts provide implementation evidence for each ability?

Each capability has one canonical repository entrypoint. Analytic maps consume prepared layers after `scripts/prepare-data.mjs`; the public GeoJSON folder itself is not a file witness in the current truncated source inventory.

- Concepts: `capabilities/show-corridor-kpis-and-live-conditions`, `capabilities/analyse-network-centrality`, `capabilities/analyse-built-density`, `capabilities/score-urban-maturation`, `capabilities/measure-walk-accessibility`, `capabilities/read-network-form`, `capabilities/show-junction-movement-behaviour`, `capabilities/compare-land-cover-change`, `capabilities/map-thermal-comfort-grids`, `capabilities/integrate-planning-findings`, `capabilities/frame-issues-and-potentials`, `capabilities/export-report-maps`, `capabilities/prepare-web-data`, `capabilities/serve-public-geojson`, `capabilities/publish-github-pages`
- Evidence: `src/tabs/Tab1_Overview.jsx`, `src/components/focusArea/CentralityAnalysisView.jsx`, `src/components/focusArea/DensityAnalysisView.jsx`, `src/components/focusArea/UrbanMaturationView.jsx`, `src/components/focusArea/WalkAccessibilityView.jsx`, `src/components/focusArea/NetworkFormView.jsx`, `src/features/behaviour-analysis/BehaviourAnalysisPage.jsx`, `src/tabs/TabLandCover.jsx`, `src/tabs/Tab5_Environmental.jsx`, `src/tabs/Tab7_Synthesis.jsx`, `src/tabs/Tab6_Problems.jsx`, `src/tabs/ExportMaps.jsx`, `scripts/prepare-data.mjs`, `package.json`
- Paths: `src/tabs/Tab1_Overview.jsx`, `src/components/focusArea/CentralityAnalysisView.jsx`, `src/components/focusArea/DensityAnalysisView.jsx`, `src/components/focusArea/UrbanMaturationView.jsx`, `src/components/focusArea/WalkAccessibilityView.jsx`, `src/components/focusArea/NetworkFormView.jsx`, `src/features/behaviour-analysis/BehaviourAnalysisPage.jsx`, `src/tabs/TabLandCover.jsx`, `src/tabs/Tab5_Environmental.jsx`, `src/tabs/Tab7_Synthesis.jsx`, `src/tabs/Tab6_Problems.jsx`, `src/tabs/ExportMaps.jsx`, `scripts/prepare-data.mjs`, `package.json`

### impact: answered

Which typed dependencies explain change impact across the model?

Declared depends_on edges say Focus Area, land-cover, environmental, and export abilities consume served public GeoJSON; that serving step depends on prepare-web-data; Overview KPIs depend on prepare-web-data; and GitHub Pages publish depends on those prepared layers being present in the build. These are bounded declarations with written rationales, not a claim that every runtime import is modeled.

- Concepts: `capabilities/show-corridor-kpis-and-live-conditions`, `capabilities/analyse-network-centrality`, `capabilities/analyse-built-density`, `capabilities/score-urban-maturation`, `capabilities/measure-walk-accessibility`, `capabilities/read-network-form`, `capabilities/compare-land-cover-change`, `capabilities/map-thermal-comfort-grids`, `capabilities/export-report-maps`, `capabilities/serve-public-geojson`, `capabilities/prepare-web-data`, `capabilities/publish-github-pages`
- Relations: `capabilities/show-corridor-kpis-and-live-conditions` --depends_on--> `capabilities/prepare-web-data`, `capabilities/analyse-network-centrality` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/analyse-built-density` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/score-urban-maturation` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/measure-walk-accessibility` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/read-network-form` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/compare-land-cover-change` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/map-thermal-comfort-grids` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/export-report-maps` --depends_on--> `capabilities/serve-public-geojson`, `capabilities/serve-public-geojson` --depends_on--> `capabilities/prepare-web-data`, `capabilities/publish-github-pages` --depends_on--> `capabilities/serve-public-geojson`
- Evidence: `src/tabs/Tab1_Overview.jsx`, `src/components/focusArea/CentralityAnalysisView.jsx`, `src/tabs/TabLandCover.jsx`, `src/tabs/Tab5_Environmental.jsx`, `src/tabs/ExportMaps.jsx`, `scripts/prepare-data.mjs`, `package.json`
