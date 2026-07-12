import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { SVF_FOCUS_LABEL, SVF_FOCUS_LANDMARKS } from '../../constants/environmental.js'
import { ENV_INFO } from './environmentalInfoContent.js'

/**
 * SVF openness as a single stacked horizontal bar (not a donut — left panel owns donuts).
 */
export default function SvfStackedBar({ breakdown, sampleCount }) {
  const segments = breakdown ?? []
  const hasData = segments.length > 0

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-sm font-semibold text-surface-50">
          Sky View Openness
        </h3>
        <MetricInfoButton
          title={ENV_INFO.svfStack.title}
          points={ENV_INFO.svfStack.points}
          ariaLabel={ENV_INFO.svfStack.ariaLabel}
        />
      </div>
      <p className="mt-1 text-xs font-medium text-surface-200">
        Sample streetscape: {SVF_FOCUS_LABEL}
      </p>
      <p className="mt-1 text-xs text-surface-300">
        Sky openness along this path — not the whole study area. Colours run from very enclosed to
        very open.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SVF_FOCUS_LANDMARKS.map((name) => (
          <span
            key={name}
            className="rounded-md border border-surface-600 bg-surface-900/60 px-2 py-0.5 text-[11px] font-medium text-surface-100"
          >
            {name}
          </span>
        ))}
      </div>

      {!hasData ? (
        <p className="mt-6 text-center text-xs text-surface-400">No SVF samples loaded</p>
      ) : (
        <>
          <div
            className="mt-4 flex h-8 w-full overflow-hidden rounded-md border border-surface-700"
            role="img"
            aria-label="SVF class stacked bar"
          >
            {segments.map((s) => (
              <div
                key={s.label}
                className="relative flex h-full items-center justify-center"
                style={{
                  width: `${Math.max(s.pct, 0)}%`,
                  backgroundColor: s.color,
                  minWidth: s.pct > 0 ? 4 : 0,
                }}
                title={`${s.label}: ${s.pct}%`}
              >
                {s.pct >= 12 && (
                  <span className="text-[10px] font-bold tabular-nums text-white drop-shadow">
                    {s.pct}%
                  </span>
                )}
              </div>
            ))}
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {segments.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between text-xs text-surface-200"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  {s.label}
                </span>
                <span className="tabular-nums text-surface-100">
                  {s.pct}% · {s.count}
                </span>
              </li>
            ))}
          </ul>

          {sampleCount != null && (
            <p className="mt-2 text-[11px] text-surface-400">
              {sampleCount} sample points · turn on SVF Sample Points to zoom the map here
            </p>
          )}
        </>
      )}
    </div>
  )
}
