import { useState } from 'react'
import { Download, FileJson, Image as ImageIcon, Layers } from 'lucide-react'
import ExportCrsBadges from '../components/exportMaps/ExportCrsBadges.jsx'
import ExportMapDownloadLink from '../components/exportMaps/ExportMapDownloadLink.jsx'
import ExportMapPreviewModal from '../components/exportMaps/ExportMapPreviewModal.jsx'
import { EXPORT_MAP_SECTIONS, EXPORT_MAPS_ACCENT } from '../constants/exportMaps.js'

const EXPORT_GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'

function MapCard({ item, compact = false, onPreview }) {
  const hasGeo = Boolean(item.geojson)
  const hasRaster = Boolean(item.raster)

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-card">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${item.title}`}
        className={`group relative block w-full cursor-pointer bg-surface-900 text-left ${compact ? 'aspect-[5/4]' : 'aspect-[4/3]'}`}
      >
        <img
          src={item.image}
          alt=""
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-surface-950/0 transition group-hover:bg-surface-950/45">
          <span className="rounded-lg bg-surface-900/90 px-3 py-1.5 text-xs font-semibold text-surface-50 opacity-0 shadow-card transition group-hover:opacity-100">
            Preview
          </span>
        </span>
      </button>
      <div className={`flex flex-1 flex-col gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        <h3 className="font-display text-sm font-semibold leading-snug text-surface-50">
          {item.title}
        </h3>
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <ExportMapDownloadLink href={item.image} download={item.imageName} primary>
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              Download Map
            </ExportMapDownloadLink>
            {hasGeo ? (
              <ExportMapDownloadLink href={item.geojson} download={item.geojsonName}>
                <FileJson className="h-3.5 w-3.5" aria-hidden />
                Download GeoJSON
              </ExportMapDownloadLink>
            ) : null}
            {hasRaster ? (
              <ExportMapDownloadLink href={item.raster} download={item.rasterName}>
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Download raster
              </ExportMapDownloadLink>
            ) : null}
          </div>
          <ExportCrsBadges item={item} />
        </div>
      </div>
    </article>
  )
}

function MapGrid({ items, compact = false, className, onPreview }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <MapCard
          key={item.id}
          item={item}
          compact={compact}
          onPreview={() => onPreview(item)}
        />
      ))}
    </div>
  )
}

/** Export Maps — downloadable analysis maps + paired GeoJSON by sidebar section. */
export default function ExportMaps() {
  const [previewItem, setPreviewItem] = useState(null)

  return (
    <div className="py-2">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${EXPORT_MAPS_ACCENT}22` }}
        >
          <Download className="h-5 w-5" style={{ color: EXPORT_MAPS_ACCENT }} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-surface-50">Export Maps</h1>
          <p className="mt-1 text-sm text-surface-200">
            Download analysis maps with matching GeoJSON (WGS 84) and rasters (CRS labeled per file)
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {EXPORT_MAP_SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={`export-${section.id}`}>
            <h2
              id={`export-${section.id}`}
              className="mb-4 font-display text-lg font-semibold text-surface-50"
            >
              {section.label}
            </h2>
            {section.subsections ? (
              section.subsections.map((sub, index) => (
                <div key={sub.id}>
                  <h3
                    className={`mb-3 text-base font-semibold text-surface-200 ${
                      index === 0 ? '' : 'mt-6'
                    }`}
                  >
                    {sub.label}
                  </h3>
                  <MapGrid
                    items={sub.items}
                    compact
                    onPreview={setPreviewItem}
                    className={EXPORT_GRID_CLASS}
                  />
                </div>
              ))
            ) : (
              <MapGrid
                items={section.items}
                compact
                onPreview={setPreviewItem}
                className={EXPORT_GRID_CLASS}
              />
            )}
          </section>
        ))}
      </div>

      <ExportMapPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  )
}
