import { lazy, Suspense, useEffect, useId, useState } from 'react'
import { FileJson, Image as ImageIcon, Layers, X } from 'lucide-react'
import { EXPORT_MAPS_ACCENT } from '../../constants/exportMaps.js'
import ExportCrsBadges from './ExportCrsBadges.jsx'
import ExportMapDownloadLink from './ExportMapDownloadLink.jsx'

const ExportGeoJsonPreview = lazy(() => import('./ExportGeoJsonPreview.jsx'))
const ExportRasterPreview = lazy(() => import('./ExportRasterPreview.jsx'))

/**
 * Full-screen preview modal for export map cards — static image + optional GeoJSON/Raster tab.
 */
export default function ExportMapPreviewModal({ item, onClose }) {
  const [closing, setClosing] = useState(false)
  const [activeTab, setActiveTab] = useState('map')
  const titleId = useId()
  const hasGeo = Boolean(item?.geojson)
  const hasRaster = Boolean(item?.raster)
  const hasLayerTab = hasGeo || hasRaster
  const layerTabId = hasRaster ? 'raster' : 'geojson'
  const layerTabLabel = hasRaster ? 'Raster' : 'GeoJSON'

  function requestClose() {
    if (closing) return
    setClosing(true)
  }

  useEffect(() => {
    if (!item) return
    setActiveTab('map')
    setClosing(false)
  }, [item?.id])

  useEffect(() => {
    if (!item) return

    function onKeyDown(event) {
      if (event.key === 'Escape') requestClose()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [item])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      onClose()
      setClosing(false)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  if (!item) return null

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 ${
        closing ? 'typology-info-overlay-exit' : 'typology-info-overlay-enter'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={requestClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#2a3a4a] shadow-[0_16px_48px_rgba(0,0,0,0.6)] ${
          closing ? 'typology-info-modal-exit' : 'typology-info-modal-enter'
        }`}
        style={{ backgroundColor: '#1a2535' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#2a3a4a] px-5 py-4">
          <h2 id={titleId} className="font-display text-base font-bold leading-snug text-[#e0e0e0] sm:text-lg">
            {item.title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={`Close preview of ${item.title}`}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center text-[#94a3b8] transition-colors hover:text-[#e0e0e0]"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>

        {hasLayerTab ? (
          <div className="flex shrink-0 gap-1 border-b border-[#2a3a4a] px-5 pt-3">
            {[
              { id: 'map', label: 'Map' },
              { id: layerTabId, label: layerTabLabel },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'text-surface-950'
                    : 'text-surface-300 hover:text-surface-100'
                }`}
                style={
                  activeTab === tab.id ? { background: EXPORT_MAPS_ACCENT } : { background: 'transparent' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'map' ? (
            <div className="flex items-center justify-center rounded-lg bg-surface-900 p-2">
              <img
                src={item.image}
                alt={item.title}
                className="max-h-[70vh] w-full object-contain"
                loading="eager"
              />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                  <p className="text-sm text-surface-300">Loading map…</p>
                </div>
              }
            >
              {activeTab === 'raster' ? (
                <ExportRasterPreview url={item.raster} itemId={item.id} />
              ) : (
                <ExportGeoJsonPreview url={item.geojson} itemId={item.id} />
              )}
            </Suspense>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 border-t border-[#2a3a4a] px-5 py-4">
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
    </div>
  )
}
