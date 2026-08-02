import { HIGHLIGHT_COLOR, LAND_USE_COLORS, MAP_LAYERS, SELECTED_GN_COLOR } from '../constants/mapLayers.js'
import { useMapFullscreen } from './MapFullscreenShell.jsx'

function Swatch({ color, dashed }) {
  if (dashed) {
    return (
      <span
        className="inline-block h-0 w-4 border-t-2"
        style={{ borderColor: color, borderStyle: 'dashed' }}
        aria-hidden="true"
      />
    )
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
}

/**
 * Small floating legend reflecting whichever map layers are currently active.
 * Expands the Land Use entry into its per-category color key when active.
 */
export default function Legend({ activeLayers, highlightedRoadName, selectedGnName }) {
  const fullscreen = useMapFullscreen()
  const active = MAP_LAYERS.filter((layer) => activeLayers.includes(layer.id))

  if (!active.length && !highlightedRoadName && !selectedGnName) return null

  return (
    <div
      className={
        fullscreen
          ? 'pointer-events-auto absolute bottom-4 left-4 z-[1000] max-h-[70vh] max-w-[260px] overflow-y-auto rounded-lg border border-surface-700 bg-surface-850/95 p-3 text-xs shadow-card backdrop-blur'
          : 'pointer-events-auto absolute bottom-4 left-4 z-[1000] max-w-[200px] rounded-lg border border-surface-700 bg-surface-850/95 p-3 text-xs shadow-card backdrop-blur'
      }
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-surface-200">Legend</p>
      <ul className="space-y-1.5">
        {active.map((layer) =>
          layer.isChoropleth ? (
            <li key={layer.id}>
              <p className="mb-1 text-surface-100">{layer.label}</p>
              <ul className="ml-1 space-y-1 border-l border-surface-700 pl-2">
                {Object.entries(LAND_USE_COLORS).map(([name, color]) => (
                  <li key={name} className="flex items-center gap-1.5 text-surface-200">
                    <Swatch color={color} />
                    {name}
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={layer.id} className="flex items-center gap-1.5 text-surface-100">
              <Swatch color={layer.swatchColor} dashed={layer.dashed} />
              {layer.label}
            </li>
          ),
        )}
        {highlightedRoadName && (
          <li className="flex items-center gap-1.5 border-t border-surface-700 pt-1.5 text-surface-100">
            <Swatch color={HIGHLIGHT_COLOR} />
            Selected: {highlightedRoadName}
          </li>
        )}
        {selectedGnName && (
          <li className="flex items-center gap-1.5 border-t border-surface-700 pt-1.5 text-surface-100">
            <Swatch color={SELECTED_GN_COLOR} />
            Selected: {selectedGnName}
          </li>
        )}
      </ul>
    </div>
  )
}
