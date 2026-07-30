import { APP_BASEMAPS } from '../constants/basemaps.js'

/** Streets | Satellite (or custom) chip row for map layer FABs. */
export default function BasemapChips({ basemapId, onBasemapChange, options = APP_BASEMAPS }) {
  return (
    <div className="px-4 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-surface-400">
        Basemap
      </p>
      <div className="flex gap-1">
        {options.map((bm) => {
          const active = basemapId === bm.id
          return (
            <button
              key={bm.id}
              type="button"
              onClick={() => onBasemapChange(bm.id)}
              className="flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium"
              style={{
                backgroundColor: active ? '#00b4d8' : 'rgba(255,255,255,0.06)',
                color: active ? '#0f172a' : '#e2e8f0',
              }}
            >
              {bm.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
