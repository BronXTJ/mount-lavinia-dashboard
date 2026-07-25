/** Short help copy and design bullets for Land Cover panels. */

export const LC_INFO = {
  section: {
    title: 'Land cover change',
    points: [
      'Dry-season Landsat composites (~2000 / ~2015 / ~2025) for the five GN study area.',
      'Five classes: built-up, vegetation, open/bare, water/wetland, beach/sand.',
      'Neighbourhood-scale only — not plot or cadastral accuracy.',
    ],
  },
  kpis: {
    title: 'Headline change',
    points: [
      'Net area change across the full five GN AOI from Landsat ~2000 to ~2025.',
      'Built-up and open/bare rose while vegetation declined sharply.',
    ],
  },
  classTrend: {
    title: 'Class area trend',
    points: [
      'Stacked class areas (ha) by epoch from the Landsat Random Forest maps.',
      'Compare shares over time rather than absolute pixel counts across sensors.',
    ],
  },
  transitions: {
    title: 'Main transitions',
    points: [
      'Vegetation loss often moves first into open/bare ground.',
      'Built-up gain follows along corridors and densifying patches.',
    ],
  },
  s2Metrics: {
    title: 'Sentinel-2 GN metrics',
    points: [
      'Built-up, green, and soft-surface shares at 10 m for 2018 / 2020 / 2025.',
      'Soft surface = vegetation + open/bare + water + beach.',
      'Do not compare absolute % with Landsat class shares.',
    ],
  },
}

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
