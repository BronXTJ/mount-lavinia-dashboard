/** Export Maps catalog — sidebar section order, on-map titles, download paths. */

const EMERALD = '#34d399'

/** Raster CRS labels for Export Maps badges. */
export const RASTER_CRS_WGS84 = 'WGS 84'
export const RASTER_CRS_SLD99 = 'SLD99 (EPSG:5235)'

function asset(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** @typedef {{ id: string, title: string, image: string, imageName: string, geojson?: string|null, geojsonName?: string|null, raster?: string|null, rasterName?: string|null, rasterCrs?: string|null }} ExportMapItem */
/** @typedef {{ id: string, label: string, items: ExportMapItem[] }} ExportMapSubsection */
/** @typedef {{ id: string, label: string, items?: ExportMapItem[], subsections?: ExportMapSubsection[] }} ExportMapSection */

const CENTRALITY_SCALES = [500, 1000, 2000, 3000, 4000, 5000]

function closenessItems() {
  return CENTRALITY_SCALES.map((m) => ({
    id: `cl-${m}`,
    title: `Closeness Centrality Map (${m}m)`,
    image: asset(`exports/centrality/closeness-${m}m.png`),
    imageName: `closeness-centrality-${m}m.png`,
    geojson: asset(`data/urban-morpho/centrality/closeness_${m}.geojson`),
    geojsonName: `closeness_${m}.geojson`,
  }))
}

function betweennessItems() {
  return CENTRALITY_SCALES.map((m) => ({
    id: `bt-${m}`,
    title: `Betweenness Centrality Map (${m}m)`,
    image: asset(`exports/centrality/betweenness-${m}m.png`),
    imageName: `betweenness-centrality-${m}m.png`,
    geojson: asset(`data/urban-morpho/centrality/betweenness_${m}.geojson`),
    geojsonName: `betweenness_${m}.geojson`,
  }))
}

/** @type {ExportMapSection[]} */
export const EXPORT_MAP_SECTIONS = [
  {
    id: 'overview',
    label: 'Primary Study Area Related Maps',
    items: [
      {
        id: 'ov-buildings',
        title: 'Building Footprint Distribution of the Study Area',
        image: asset('exports/overview/buildings.jpeg'),
        imageName: 'building-footprint-distribution.jpeg',
        geojson: asset('data/geo/buildings.geojson'),
        geojsonName: 'buildings.geojson',
      },
      {
        id: 'ov-transport',
        title: 'Transportation Network of the Study Area',
        image: asset('exports/overview/roads-railway.jpeg'),
        imageName: 'transportation-network.jpeg',
        geojson: asset('data/geo/roads.geojson'),
        geojsonName: 'roads.geojson',
      },
      {
        id: 'ov-pois',
        title: 'Spatial Distribution of Points of Interest (POIs) in the Study Area',
        image: asset('exports/overview/pois.jpeg'),
        imageName: 'pois-distribution.jpeg',
        geojson: asset('data/geo/pois.geojson'),
        geojsonName: 'pois.geojson',
      },
      {
        id: 'ov-landuse',
        title: 'Land Use Distribution of the Study Area',
        image: asset('exports/overview/land-use.jpeg'),
        imageName: 'land-use-distribution.jpeg',
        geojson: asset('data/geo/landuse.geojson'),
        geojsonName: 'landuse.geojson',
      },
    ],
  },
  {
    id: 'centrality',
    label: 'Centrality Analysis',
    subsections: [
      { id: 'closeness', label: 'Closeness Centrality', items: closenessItems() },
      { id: 'betweenness', label: 'Betweenness Centrality', items: betweennessItems() },
    ],
  },
  {
    id: 'density',
    label: 'Density Analysis',
    items: [
      {
        id: 'den-fsi',
        title: 'Floor Space Index (FSI) Analysis of the Mount Lavinia Study Area',
        image: asset('exports/density/fsi.jpeg'),
        imageName: 'fsi-analysis.jpeg',
        geojson: asset('data/density-analysis/hex_grid_500m.geojson'),
        geojsonName: 'hex_grid_500m.geojson',
      },
      {
        id: 'den-gsi',
        title: 'Ground Space Index (GSI) Analysis of the Mount Lavinia Study Area',
        image: asset('exports/density/gsi.jpeg'),
        imageName: 'gsi-analysis.jpeg',
        geojson: asset('data/density-analysis/hex_grid_500m.geojson'),
        geojsonName: 'hex_grid_500m.geojson',
      },
      {
        id: 'den-osr',
        title: 'Open Space Ratio (OSR) Analysis of the Mount Lavinia Study Area',
        image: asset('exports/density/osr.jpeg'),
        imageName: 'osr-analysis.jpeg',
        geojson: asset('data/density-analysis/hex_grid_500m.geojson'),
        geojsonName: 'hex_grid_500m.geojson',
      },
      {
        id: 'den-landuse',
        title: 'Land Use Distribution within the 500 m Mount Lavinia Study Area',
        image: asset('exports/density/land-use.jpeg'),
        imageName: 'land-use-500m.jpeg',
        geojson: asset('data/urban-morpho/urban-maturation/landuse_500m.geojson'),
        geojsonName: 'landuse_500m.geojson',
      },
      {
        id: 'den-landuse-dmmc',
        title: 'Land Use Map -DMMC',
        image: asset('exports/density/land-use-dmmc.jpeg'),
        imageName: 'land-use-dmmc.jpeg',
        geojson: asset('data/geo/landuse.geojson'),
        geojsonName: 'landuse.geojson',
      },
      {
        id: 'den-pois-landuse',
        title:
          'Land Use and Point of Interest Distribution within the 500 m Mount Lavinia Study Area',
        image: asset('exports/density/pois-land-use.jpeg'),
        imageName: 'pois-land-use-500m.jpeg',
        geojson: asset('data/density-analysis/pois_clipped_500m.geojson'),
        geojsonName: 'pois_clipped_500m.geojson',
      },
      {
        id: 'den-surrounding',
        title: 'Study Area with Surrounding Context (Analysis Area Boundary — 500m)',
        image: asset('exports/density/study-area-surrounding.jpeg'),
        imageName: 'study-area-surrounding.jpeg',
        geojson: asset('data/urban-morpho/boundary_500m.geojson'),
        geojsonName: 'boundary_500m.geojson',
      },
    ],
  },
  {
    id: 'maturation',
    label: 'Urban Maturation',
    items: [
      {
        id: 'mat-urban',
        title: 'Urban Maturation Analysis of the Mount Lavinia Study Area',
        image: asset('exports/maturation/urban-maturation.jpg'),
        imageName: 'urban-maturation-analysis.jpg',
        geojson: asset('data/urban-morpho/urban-maturation/urban_maturation_analysis.geojson'),
        geojsonName: 'urban_maturation_analysis.geojson',
      },
      {
        id: 'mat-shannon',
        title: 'Shannon Entropy Index of the Mount Lavinia Study Area',
        image: asset('exports/maturation/shannon.jpg'),
        imageName: 'shannon-entropy-index.jpg',
        geojson: asset('data/urban-morpho/urban-maturation/shanon_entropy_index.geojson'),
        geojsonName: 'shanon_entropy_index.geojson',
      },
      {
        id: 'mat-mui',
        title: 'Mixed Use Index (MUI) of the Mount Lavinia Study Area',
        image: asset('exports/maturation/umi.jpg'),
        imageName: 'mixed-use-index-mui.jpg',
        geojson: asset('data/urban-morpho/urban-maturation/urban_maturation_analysis.geojson'),
        geojsonName: 'urban_maturation_analysis.geojson',
      },
      {
        id: 'mat-density',
        title: 'Density Value Analysis of the Mount Lavinia Study Area',
        image: asset('exports/maturation/density-analysis.jpg'),
        imageName: 'maturation-density-value.jpg',
        geojson: asset('data/density-analysis/Density_value.geojson'),
        geojsonName: 'Density_value.geojson',
      },
      {
        id: 'mat-centrality',
        title: 'Centrality Analysis of the Mount Lavinia Study Area',
        image: asset('exports/maturation/centrality-analysis.jpg'),
        imageName: 'maturation-centrality-analysis.jpg',
        geojson: asset('data/urban-morpho/centrality/closeness_500.geojson'),
        geojsonName: 'closeness_500.geojson',
      },
    ],
  },
  {
    id: 'environmental',
    label: 'Environmental Analysis',
    items: [
      {
        id: 'env-uhi',
        title: 'Urban Heat Island : Target Analysis',
        image: asset('exports/environmental/uhi.jpeg'),
        imageName: 'uhi-target-analysis.jpeg',
        geojson: asset('data/environmental-analysis/thermal_grid.geojson'),
        geojsonName: 'thermal_grid.geojson',
      },
      {
        id: 'env-tmrt',
        title: 'Spatial Distribution of Mean Radiant Temperature (Tmrt) within the Study Area',
        image: asset('exports/environmental/tmrt.jpeg'),
        imageName: 'tmrt-distribution.jpeg',
        geojson: asset('data/environmental-analysis/thermal_grid.geojson'),
        geojsonName: 'thermal_grid.geojson',
      },
      {
        id: 'env-svf',
        title: 'Sky View Factor (SVF) of the Study Area',
        image: asset('exports/environmental/svf.jpeg'),
        imageName: 'svf-study-area.jpeg',
        geojson: asset('data/environmental-analysis/svf_points.geojson'),
        geojsonName: 'svf_points.geojson',
      },
      {
        id: 'env-dem',
        title: 'Digital Elevation Model (DEM) of the Study Area',
        image: asset('exports/environmental/dem.jpeg'),
        imageName: 'dem-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/dem.tif'),
        rasterName: 'dem-study-area.tif',
        rasterCrs: RASTER_CRS_WGS84,
      },
      {
        id: 'env-dsm',
        title: 'DSM of the Study Area',
        image: asset('exports/environmental/dsm.jpeg'),
        imageName: 'dsm-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/dsm.tif'),
        rasterName: 'dsm-study-area.tif',
        rasterCrs: RASTER_CRS_WGS84,
      },
      {
        id: 'env-cdsm',
        title: 'CDSM of the Study Area',
        image: asset('exports/environmental/cdsm.jpeg'),
        imageName: 'cdsm-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/cdsm.tif'),
        rasterName: 'cdsm-study-area.tif',
        rasterCrs: RASTER_CRS_WGS84,
      },
      {
        id: 'env-wall-height',
        title: 'Wall Height of the Study Area',
        image: asset('exports/environmental/wall-height.jpeg'),
        imageName: 'wall-height-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/wall-height.tif'),
        rasterName: 'wall-height-study-area.tif',
        rasterCrs: RASTER_CRS_WGS84,
      },
      {
        id: 'env-wall-aspect',
        title: 'Wall Aspect of the Study Area',
        image: asset('exports/environmental/wall-aspect.jpeg'),
        imageName: 'wall-aspect-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/wall-aspect.tif'),
        rasterName: 'wall-aspect-study-area.tif',
        rasterCrs: RASTER_CRS_WGS84,
      },
      {
        id: 'env-shadow',
        title: 'Shadow Analysis of the Study Area',
        image: asset('exports/environmental/shadow.jpeg'),
        imageName: 'shadow-analysis-study-area.jpeg',
        geojson: null,
        geojsonName: null,
        raster: asset('data/environmental-analysis/rasters/shadow-aggregated.tif'),
        rasterName: 'shadow-aggregated.tif',
        rasterCrs: RASTER_CRS_SLD99,
      },
      {
        id: 'env-boundary-800',
        title: '800 m Analysis Area Boundary — Environmental Analysis',
        image: asset('exports/environmental/boundary-800m.jpeg'),
        imageName: 'boundary-800m-environmental-analysis.jpeg',
        geojson: asset('data/environmental-analysis/boundary_800m.geojson'),
        geojsonName: 'boundary_800m.geojson',
      },
    ],
  },
]

export const EXPORT_MAPS_ACCENT = EMERALD
