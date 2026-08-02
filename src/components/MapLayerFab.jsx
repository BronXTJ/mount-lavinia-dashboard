import { useState } from 'react'
import { MAP_LAYERS } from '../constants/mapLayers.js'
import LayerToggle from './LayerToggle.jsx'
import BasemapChips from './BasemapChips.jsx'
import { useMapFullscreen } from './MapFullscreenShell.jsx'

/**
 * Round teal floating action button (top-right of the map) that expands
 * into a panel listing all 6 map layers, in a fixed order, with toggle
 * switches. Props: activeLayers (string[]), onToggle(layerId, nextChecked).
 */
export default function MapLayerFab({ activeLayers, onToggle, basemapId, onBasemapChange }) {
  const [open, setOpen] = useState(false)
  const fullscreen = useMapFullscreen()

  return (
    <div
      className={`pointer-events-auto absolute top-4 z-[1000] flex flex-col items-end gap-2 ${
        fullscreen ? 'right-16' : 'right-4'
      }`}
    >
      {open && (
        <div className="w-64 rounded-lg border border-surface-700 bg-surface-850/95 p-3 shadow-card backdrop-blur">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-surface-200">
            Map Layers
          </p>
          <div className="-mx-3 mb-1 border-t border-surface-700" />
          <div className="-mx-3">
            <BasemapChips basemapId={basemapId} onBasemapChange={onBasemapChange} />
          </div>
          <div className="-mx-3 mb-1 border-t border-surface-700" />
          <div>
            {MAP_LAYERS.map((layer) => (
              <LayerToggle
                key={layer.id}
                label={layer.label}
                swatchColor={layer.swatchColor}
                checked={activeLayers.includes(layer.id)}
                onChange={(checked) => onToggle(layer.id, checked)}
              />
            ))}
          </div>
        </div>
      )}

      <span className="relative flex h-12 w-12">
        {!open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-60" />}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle map layers panel"
          aria-expanded={open}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-surface-950 shadow-card transition-transform hover:scale-105 hover:bg-primary-400 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5zm0 4.5l9 4.5 9-4.5m-18 4.5l9 4.5 9-4.5"
              />
            )}
          </svg>
        </button>
      </span>
    </div>
  )
}
