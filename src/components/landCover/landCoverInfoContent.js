/** Short help copy and design bullets for Land Cover panels. */

/** Canonical Landsat 30 m class glossary for i-icon tips. */
const LC_LANDSAT_CLASS_KEY = [
  'Built-up — hard / impervious cover such as roofs, dense paving, and packed urban fabric.',
  'Vegetation — denser green cover and tree canopy (stronger green signal than sparse grass).',
  'Open / bare — soil, sparse grass/scrub, yards, sports grounds, cleared or construction land. Not “empty lots only,” not dense canopy, not hard roofs/roads, and not coastal beach/sand.',
  'Water / wetland — open water and wet areas.',
  'Beach / sand — bright coastal sand strip (mainly along the shore).',
  'Each Landsat 30 m pixel (~30×30 m) gets one colour even if the square mixes several surfaces.',
]

export const LC_INFO = {
  section: {
    title: 'Land cover change — two satellite sources',
    points: [
      'This section uses two different satellite products. Read each card’s title for which one applies.',
      'Landsat 30 m (~2000 / ~2015 / ~2025) drives the map overlays, left-panel headlines, and the long-term change story across all five GNs.',
      'Sentinel-2 10 m (~2018 / ~2020 / ~2025) drives per-GN built / green / soft shares when you select a division.',
      'Landsat Open / bare includes yards, fields, sparse grass, and cleared land — do not read it as empty vacant land only.',
      'Landsat classes: built-up, vegetation, open/bare, water/wetland, beach/sand. Sentinel-2 “soft surface” is broader (veg + open + water + beach) — do not mix the two % scales.',
      'Neighbourhood-scale only — not plot or cadastral accuracy.',
    ],
  },
  kpis: {
    title: 'Landsat headline change (2000→2025)',
    points: [
      'These three cards show net area change (hectares) for the full five-GN study area.',
      'Source: Landsat 30 m dry-season classifications, comparing ~2000 with ~2025.',
      'Built-up and open/bare rose; vegetation fell sharply — that is the main long-term signal.',
      'Open / bare rising often means more sparse, cleared, or yard-like ground — not only unused empty plots.',
      'These are absolute ha changes from Landsat, not the same as Sentinel-2 percentage shares on GN cards.',
    ],
  },
  classTrend: {
    title: 'Landsat class area trend (~2000 / ~2015 / ~2025)',
    points: [
      'Stacked chart of class area (ha) for the whole five-GN AOI at each Landsat epoch.',
      'Epochs are dry-season composites: ~2000, ~2015, and ~2025 (30 m Random Forest maps).',
      ...LC_LANDSAT_CLASS_KEY,
      'Do not compare these hectare stacks with Sentinel-2 built / green / soft percentages.',
    ],
  },
  transitions: {
    title: 'Main transitions (Landsat 2000→2025)',
    points: [
      'These rows show the main from → to class pathways across the five GNs (Landsat 30 m, ~2000 to ~2025).',
      'Read each line as: what the land was → what it commonly became.',
      'When vegetation becomes Open / bare, that often means thinning or clearing into soil, sparse grass, yards, or fields — not only “empty land.”',
      'Hectare totals for how much area changed are on the left headline cards — this box is the pathway story only.',
      'Turn on the map layer “Landsat change 2000→2025” to see where those shifts concentrate.',
    ],
  },
  classDefinitions: {
    title: 'Landsat 30 m class meanings',
    points: [
      'These five colours are Landsat land-cover classes for the map and left/right Landsat panels.',
      ...LC_LANDSAT_CLASS_KEY,
      'Sentinel-2 GN cards use different metrics (built / green / soft). Soft surface ≠ Open / bare alone.',
    ],
  },
  landsatClassShares: {
    title: 'Landsat class shares (map epoch)',
    points: [
      'Bars show how much of the five-GN area falls in each Landsat class for the epoch selected on the map.',
      'Source: Landsat 30 m (~2000 / ~2015 / ~2025). Change the map “Landsat epoch” chips to update these bars.',
      ...LC_LANDSAT_CLASS_KEY,
      'Percentages and hectares here are Landsat-only — they will not match Sentinel-2 GN percentages.',
    ],
  },
  landsatDeepDive: {
    title: 'Landsat 30 m deep dive — Mount Lavinia (2000→2025)',
    points: [
      'Net hectare change for Mount Lavinia GN only, from Landsat ~2000 to ~2025.',
      'Hints under each card show start → end area (ha) for that class.',
      'Open / bare here means soil, sparse grass, yards, fields, or cleared ground — not dense canopy and not only vacant lots.',
      'This is the long-term Landsat story for this GN; Sentinel-2 cards below are a shorter, finer 2018–2025 window.',
      'Do not treat these ha changes as plot-accurate or as comparable % to Sentinel-2 shares.',
    ],
  },
  s2Metrics: {
    title: 'Sentinel-2 GN metrics (2018–2025)',
    points: [
      'Per-GN metrics from Sentinel-2 10 m dry-season maps at ~2018, ~2020, and ~2025.',
      'Built-up = hard / impervious share. Green = vegetation share. Soft surface = vegetation + open/bare + water + beach.',
      'Soft surface is broader than Landsat “Open / bare” alone — do not treat them as the same class.',
      'Snapshot cards show ~2025 levels (% of GN area). Built-up change is percentage points from 2018→2025 (not hectares).',
      'The trend chart plots the same three metrics across 2018 / 2020 / 2025 for this GN.',
      'Finer than Landsat, but a shorter time span. Never mix these % values with Landsat class shares or headline ha.',
    ],
  },
}

/** Scannable Landsat from → to pathways for the Main transitions card. */
export const LC_TRANSITION_PATHWAYS = [
  {
    id: 'veg_to_open',
    from: { label: 'Vegetation', color: '#1a9850' },
    to: { label: 'Open / bare', color: '#fdae61' },
    hint: 'Common first step when canopy is lost or thinned',
  },
  {
    id: 'open_to_built',
    from: { label: 'Open / bare', color: '#fdae61' },
    to: { label: 'Built-up', color: '#d73027' },
    hint: 'Transitional or cleared ground hardens over time',
  },
  {
    id: 'veg_to_built',
    from: { label: 'Vegetation', color: '#1a9850' },
    to: { label: 'Built-up', color: '#d73027' },
    hint: 'Direct conversion along corridors and dense patches',
  },
]

export const LC_DESIGN_BULLETS_STUDY = [
  'Protect remaining tree canopy and street trees — vegetation fell by about 70 ha across the five GNs.',
  'Treat residual soft / open patches as candidate public or landscape inserts before further hard coverage.',
  'Limit hard expansion onto beach and coastal soft surfaces; keep shore access and identity.',
  'Use Galle Road as a design armature for shade, frontage, and pedestrian continuity — not only traffic.',
]

export const LC_DESIGN_BULLETS_MOUNT = [
  'Coastal edge and hotel/promenade frontage are identity-critical in Mount Lavinia.',
  'Local veg→built conversion sites mark priority cooling and pocket-green opportunities.',
  'Keep permeable soft cover where densification pressure is highest.',
  'Read Galle Road as the main structuring corridor for shade and frontage upgrades.',
]
