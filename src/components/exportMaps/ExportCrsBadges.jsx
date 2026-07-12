import { EXPORT_MAPS_ACCENT } from '../../constants/exportMaps.js'

function CrsBadge({ label }) {
  return (
    <p
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{
        background: `${EXPORT_MAPS_ACCENT}22`,
        color: EXPORT_MAPS_ACCENT,
        boxShadow: `inset 0 0 0 1px ${EXPORT_MAPS_ACCENT}55`,
      }}
    >
      {label}
    </p>
  )
}

/** CRS badges for GeoJSON / raster downloads on Export Maps cards and modal. */
export default function ExportCrsBadges({ item }) {
  const hasGeo = Boolean(item?.geojson)
  const rasterCrs = item?.rasterCrs
  if (!hasGeo && !rasterCrs) return null

  return (
    <div className="ml-auto flex flex-wrap justify-end gap-1.5">
      {hasGeo ? <CrsBadge label="GeoJSON CRS: WGS 84" /> : null}
      {rasterCrs ? <CrsBadge label={`Raster CRS: ${rasterCrs}`} /> : null}
    </div>
  )
}
