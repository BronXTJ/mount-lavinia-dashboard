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
      'In the FAB Basemap row, switch Streets (default) or Satellite (current) to see present-day ground photos.',
      'Clear or change the selection to compare another division.',
    ],
  },
  {
    id: 'focus-shared',
    title: 'Focus Area — maps',
    icon: 'MapPin',
    bullets: [
      'Open Centrality, Density, or Urban Maturation from under Focus Area in the sidebar.',
      'Use the floating layer button (FAB) on the map to toggle analysis and context layers on or off.',
      'Use the FAB Basemap chips to switch Streets (default) or Satellite (current).',
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
      'Explore FSI, GSI, OSR, and density across the hex grid.',
      'Toggle map layers with the FAB (hex metrics, buildings, roads, POIs, analysis boundary).',
      'Switch Streets / Satellite basemap in the FAB when you want present-day imagery under the hexes.',
      'Use typology charts and the scatter plot to see how built form types cluster.',
      'Open Key Findings for short takeaways, then jump to Synthesis when you are ready.',
    ],
  },
  {
    id: 'maturation',
    title: 'Urban Maturation',
    icon: 'TrendingUp',
    bullets: [
      'Switch metrics such as UMI, Shannon entropy, and accessibility on the map.',
      'Click Minimum / Highest Cell ID cards to jump to extreme hex cells.',
      'Use the FAB to control which layers appear with the maturation choropleth, and Streets / Satellite basemap.',
      'Key Findings chips link straight into related Synthesis claims.',
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
    ],
  },
  {
    id: 'land-cover',
    title: 'Land Cover Change',
    icon: 'Trees',
    bullets: [
      'Use the map FAB to switch Landsat 30 m classified epochs (~2000 / ~2015 / ~2025) or change theme, pick Satellite (current) or Streets basemap, and toggle OSM buildings / roads / GN boundaries.',
      'Click a GN on the map or in the left list to load its detail panel.',
      'Left KPIs and the stacked chart show Landsat 30 m change across all five GNs (2000→2025).',
      'Per-GN cards use Sentinel-2 10 m (2018–2025): Built-up, Green, and Soft surface. Green is inside Soft — do not add them. Mount Lavinia also includes a Landsat 30 m deep dive (2000→2025). Do not mix Landsat % with Sentinel-2 %.',
    ],
  },
  {
    id: 'environmental',
    title: 'Environmental Analysis',
    icon: 'Thermometer',
    bullets: [
      'Open the FAB to toggle the 800 m analysis boundary, thermal metrics, and SVF points.',
      'Use the FAB Basemap chips for Streets (default) or Satellite (current) under the thermal grid.',
      'Turn on one main metric at a time (UTCI, UHI, air temperature, Tmrt, or shadow) to keep the map readable.',
      'Click a grid cell to see its values; gauges and charts summarise the wider study area.',
      'Use teal “i” help on gauges and charts when you need to interpret a panel.',
    ],
  },
  {
    id: 'synthesis',
    title: 'Key Findings → Synthesis',
    icon: 'GitBranch',
    bullets: [
      'Key Findings boxes on analysis tabs summarise what matters most and link into Synthesis.',
      'In Synthesis, follow the Key Argument steps (1–6) for a guided reading order.',
      'The relationships graph shows how findings amplify, co-locate, mitigate, or cause each other.',
      'Open All findings in the header to browse every claim (F1…); selecting one updates the detail panel and URL.',
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
