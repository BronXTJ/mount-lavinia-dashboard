/**
 * User Guide copy — short, action-oriented bullets for the sidebar help modal.
 * Teal “i” buttons still cover metric deep-dives; this guide is how to use the UI.
 */

/** @typedef {{ id: string, title: string, icon: string, bullets: string[] }} UserGuideSection */

/** @type {UserGuideSection[]} */
export const USER_GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: 'Compass',
    bullets: [
      'Use the left sidebar to move between sections of the dashboard.',
      'Overview introduces the study area; Focus Area holds the map analyses; later tabs build toward Synthesis and Issues.',
      'Collapse the sidebar with the chevron if you need more map space.',
      'Open this User Guide any time from the bottom of the sidebar.',
    ],
  },
  {
    id: 'overview',
    title: 'Overview',
    icon: 'LayoutDashboard',
    bullets: [
      'Click a GN division on the map (or related cards) to select it.',
      'Charts and demographic panels update to match the selected GN.',
      'Use the map layer button (FAB) to show or hide boundaries, land use, roads, and other context layers.',
      'In the FAB Basemap row, switch Streets (default) or Satellite to see present-day ground photos.',
      'Clear or change the selection to compare another division.',
    ],
  },
  {
    id: 'focus-shared',
    title: 'Focus Area — maps',
    icon: 'MapPin',
    bullets: [
      'Open Centrality, Density, Urban Maturation, Walk Accessibility, or Network Form from under Focus Area in the sidebar.',
      'Use the floating layer button (FAB) on the map to toggle analysis and context layers on or off.',
      'Use the FAB Basemap chips to switch Streets (default) or Satellite.',
      'Click a hex cell (or street segment on Centrality) to inspect its values in the side panel.',
      'Where you see Minimum / Highest Cell ID cards, click them to fly the map to those hex cells.',
      'Teal “i” icons explain metrics in more detail when you need them.',
    ],
  },
  {
    id: 'centrality',
    title: 'Centrality Analysis',
    icon: 'Layers',
    bullets: [
      'Switch between closeness and betweenness, and pick a distance scale (for example 500 m or 2000 m).',
      'The map colours streets by how central they are at that scale.',
      'Use the FAB to show analysis boundaries and other reference layers.',
      'Compare scales to see which corridors stay important as the search radius grows.',
    ],
  },
  {
    id: 'density',
    title: 'Density Analysis',
    icon: 'Grid3x3',
    bullets: [
      'Explore FSI, GSI, OSR, and density across the hex grid. Nearly complete cells are coloured; partial cells are dimmed; scraps stay unfilled.',
      'Toggle map layers with the FAB (hex metrics, buildings, roads, POIs, analysis boundary).',
      'Switch Streets / Satellite basemap in the FAB when you want present-day imagery under the hexes.',
      'Charts and KPIs use analysis-grade hexes (≥90% of full area). Click a coloured hex for layer-specific facts.',
      'Use typology charts and the scatter plot to see how built form types cluster.',
      'Open Key Findings for short takeaways, then jump to Synthesis when you are ready.',
    ],
  },
  {
    id: 'maturation',
    title: 'Urban Maturation',
    icon: 'TrendingUp',
    bullets: [
      'Switch metrics such as UMI, Shannon entropy, and accessibility on the map — each metric has its own popup facts card.',
      'Click Minimum / Highest Cell ID cards to jump to extreme hex cells (requires a metric layer on).',
      'Use the FAB to control which layers appear with the maturation choropleth, and Streets / Satellite basemap.',
      'Charts use analysis-grade hexes (≥90% complete); partial cells are dimmed on the map and omitted from KPIs.',
      'Key Findings chips link straight into related Synthesis claims.',
    ],
  },
  {
    id: 'walk-access',
    title: 'Walk Accessibility',
    icon: 'Footprints',
    bullets: [
      'Explore access score, access tier, and walk-time layers by destination group on the hex grid. Nearly complete cells are coloured; partial cells are dimmed; scraps stay unfilled.',
      'Analysis-ok hexes (≥90% of full area and snapped to the walk network within 100 m) drive all KPI cards. Excluded hexes failed that gate — incomplete or unsnapped — and stay grey on Access Tier.',
      'Access Tier: High ≥5 destination groups within 10 minutes; Medium 3–4; Low (desert) ≤2; Excluded = not analysis-ok.',
      'Toggle map layers with the FAB (metrics, desert / mismatch outlines, buildings, roads, access-destination POIs, analysis boundary).',
      'POIs use the same pink pulse ring + filled dot as Density; switch Streets / Satellite basemap in the FAB when you want imagery under the hexes.',
      'Click a coloured hex for layer-specific facts; click Minimum / Highest Cell ID to fly to extremes. Desert and mismatch Cell ID chips on the right fly the map to those hexes.',
      'Destination reach is not the same as UMI network accessibility. Key Findings chips (WA1–WA3) link straight into Synthesis.',
    ],
  },
  {
    id: 'network-form',
    title: 'Network Form',
    icon: 'Waypoints',
    bullets: [
      'Classifies junctions as 4-way (permeable), 3-way (tree-like), or cul-de-sac (dead-end) from street topology across the five GN study area.',
      'Cul-de-sac stub length and depth class (short <50 m / medium 50–150 m / long >150 m) come from Phase 1 depth attributes.',
      'Use the scope selector to view All GNs or one GN division; the map fits to that boundary.',
      'Toggle junction types, cul-de-sac hex density, walk-access and UMI overlays, street pathways, and GN boundaries with the FAB.',
      'The right panel lists sample cul-de-sacs with stub depth — click a row to fly the map to that dead-end.',
      'Key Findings chips (NF1–NF3) link straight into Synthesis with depth, GN density, and walk/UMI cross claims.',
    ],
  },
  {
    id: 'movement',
    title: 'Movement & Behaviour',
    icon: 'Car',
    bullets: [
      'Select a junction on the map to load its traffic and pedestrian charts.',
      'Change day and time-period filters to compare weekday vs weekend and morning / midday / evening.',
      'Charts (flows, vehicle mix, ped–vehicle ratio) always follow the selected junction.',
      'Use tooltips on map features for quick labels while you explore.',
      'Key Findings on this page link into Synthesis (MB1): counted pedestrian load sits on the same Galle Road spines as centrality and heat.',
    ],
  },
  {
    id: 'land-cover',
    title: 'Land Cover Change',
    icon: 'Trees',
    bullets: [
      'Use the map FAB to switch Landsat 30 m classified epochs (~2000 / ~2015 / ~2025) or change theme, pick Satellite or Streets basemap, and toggle OSM buildings / roads / GN boundaries.',
      'Click a GN on the map or in the left list to load its detail panel.',
      'Left KPIs and the stacked chart show Landsat 30 m change across all five GNs (2000→2025).',
      'Per-GN cards use Sentinel-2 10 m (2018–2025): Built-up, Green, and Soft surface. Green is inside Soft — do not add them. Mount Lavinia also includes a Landsat 30 m deep dive (2000→2025). Do not mix Landsat % with Sentinel-2 %.',
      'Key Findings chips (LC1–LC3) link straight into Synthesis: five-GN vegetation loss, shrinking beach/sand, and the Mount Lavinia GN vs rest-of-GN split.',
    ],
  },
  {
    id: 'environmental',
    title: 'Environmental Analysis',
    icon: 'Thermometer',
    bullets: [
      'Open the FAB to toggle the 800 m analysis boundary, thermal metrics, and SVF points.',
      'Use the FAB Basemap chips for Streets (default) or Satellite under the thermal grid.',
      'Turn on one main metric at a time (UTCI, UHI, air temperature, Tmrt, or shadow) to keep the map readable.',
      'Click a grid cell for that layer’s facts card — colours match the legend for the selected cell.',
      'Use teal “i” help on gauges and charts when you need to interpret a panel.',
    ],
  },
  {
    id: 'synthesis',
    title: 'Key Findings → Synthesis',
    icon: 'GitBranch',
    bullets: [
      'Key Findings boxes on analysis tabs summarise what matters most and link into Synthesis.',
      'In Synthesis, follow the Key Argument steps for a guided reading order (mix → access → corridors → canopy → heat → identity → coupled response).',
      'The relationships graph shows how findings amplify, co-locate, mitigate, or cause each other.',
      'Open All findings in the header to browse every claim (F, WA, NF, LC, MB); selecting one updates the detail panel and URL.',
      'Use evidence links on a finding to jump back to the map or analysis that supports it.',
    ],
  },
  {
    id: 'issues',
    title: 'Issues & Potentials',
    icon: 'AlertTriangle',
    bullets: [
      'Click any node on the network to explore root causes, issues, potentials, and stakeholders.',
      'Colours and groups show how ideas are typed; zoom and drag to rearrange your view.',
      'Use the teal “i” / How to explore controls for section-specific help.',
      'Links from Synthesis findings can land you on a related Issues node.',
    ],
  },
  {
    id: 'export-maps',
    title: 'Export Maps',
    icon: 'Download',
    bullets: [
      'Browse maps by section (Overview, Focus Area analyses, Environmental, and so on).',
      'Click a map card to preview it; use the Map tab for the image and GeoJSON / Raster tabs when available.',
      'Download Map, GeoJSON, or Raster from the card or the preview footer.',
      'Check the CRS badges: GeoJSON is WGS 84; most rasters are WGS 84, while the shadow aggregated raster is SLD99 (EPSG:5235).',
    ],
  },
]
