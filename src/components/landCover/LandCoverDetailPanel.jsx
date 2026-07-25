import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DensityStatCard from '../focusArea/DensityStatCard.jsx'
import FocusAreaPanelCard from '../focusArea/FocusAreaPanelCard.jsx'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import {
  LC_CLASS_LEGEND,
  LC_MOUNT_LAVINIA_LANDSAT,
  LC_PER_GN_S2,
  LC_S2_EPOCHS,
  getEpochRow,
} from '../../constants/landCover.js'
import {
  LC_DESIGN_BULLETS_MOUNT,
  LC_DESIGN_BULLETS_STUDY,
  LC_INFO,
} from './landCoverInfoContent.js'

function formatSignedHa(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} ha`
}

function ClassShareBars({ epochRow }) {
  const items = LC_CLASS_LEGEND.map((c) => ({
    ...c,
    pct: epochRow[`${c.id}_pct`],
    ha: epochRow[c.id],
  }))

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id}>
          <div className="mb-0.5 flex items-center justify-between text-[11px] text-surface-300">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.label}
            </span>
            <span className="font-mono tabular-nums text-surface-200">
              {item.pct?.toFixed(1)}% · {item.ha?.toFixed(1)} ha
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-900">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, item.pct ?? 0))}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function S2MetricsChart({ gnName }) {
  const row = LC_PER_GN_S2[gnName]
  if (!row) return null

  const data = LC_S2_EPOCHS.map((ep) => {
    const e = row.epochs[ep.id]
    return {
      label: ep.label,
      built: e.built_up_pct,
      green: e.green_pct,
      soft: e.soft_surface_pct,
    }
  })

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit="%"
            width={36}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="built" name="Built-up" fill="#d73027" radius={[2, 2, 0, 0]} />
          <Bar dataKey="green" name="Green" fill="#1a9850" radius={[2, 2, 0, 0]} />
          <Bar dataKey="soft" name="Soft surface" fill="#4575b4" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DesignBullets({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((text) => (
        <li key={text} className="flex gap-2 text-xs leading-relaxed text-surface-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00b4d8]" aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

/** Right panel — study-wide or selected-GN detail. */
export default function LandCoverDetailPanel({ selectedGn, epochId }) {
  const epochRow = getEpochRow(epochId)
  const isMount = selectedGn === 'Mount Lavinia'
  const hasGn = Boolean(selectedGn)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-surface-50">
          {hasGn ? selectedGn : 'Study area overview'}
        </h2>
        <p className="mt-1 text-xs text-surface-400">
          {hasGn
            ? isMount
              ? 'Landsat deep dive + Sentinel-2 10 m shares'
              : 'Sentinel-2 10 m built / green / soft shares'
            : `Class shares for ${epochRow.label} · Landsat`}
        </p>
      </div>

      {!hasGn && (
        <>
          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">
              Class shares ({epochRow.label})
            </h3>
            <ClassShareBars epochRow={epochRow} />
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">Main transitions</h3>
              <MetricInfoButton
                title={LC_INFO.transitions.title}
                points={LC_INFO.transitions.points}
              />
            </div>
            <p className="text-xs leading-relaxed text-surface-300">
              Vegetation loss often shifts first into open/bare ground; built-up gain concentrates
              along corridors and densifying patches across the five GNs.
            </p>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">Design implications</h3>
            <DesignBullets items={LC_DESIGN_BULLETS_STUDY} />
          </FocusAreaPanelCard>
        </>
      )}

      {isMount && (
        <>
          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">
              Landsat deep dive (2000→2025)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DensityStatCard
                label="Built-up"
                value={formatSignedHa(LC_MOUNT_LAVINIA_LANDSAT.built_up.change)}
                hint={`${LC_MOUNT_LAVINIA_LANDSAT.built_up.y2000} → ${LC_MOUNT_LAVINIA_LANDSAT.built_up.y2025} ha`}
                topBorderColor="#d73027"
              />
              <DensityStatCard
                label="Vegetation"
                value={formatSignedHa(LC_MOUNT_LAVINIA_LANDSAT.vegetation.change)}
                hint={`${LC_MOUNT_LAVINIA_LANDSAT.vegetation.y2000} → ${LC_MOUNT_LAVINIA_LANDSAT.vegetation.y2025} ha`}
                topBorderColor="#1a9850"
              />
              <DensityStatCard
                label="Open / bare"
                value={formatSignedHa(LC_MOUNT_LAVINIA_LANDSAT.open_bare.change)}
                hint={`${LC_MOUNT_LAVINIA_LANDSAT.open_bare.y2000} → ${LC_MOUNT_LAVINIA_LANDSAT.open_bare.y2025} ha`}
                topBorderColor="#fdae61"
              />
              <DensityStatCard
                label="Beach / sand"
                value={formatSignedHa(LC_MOUNT_LAVINIA_LANDSAT.beach_sand.change)}
                hint={`${LC_MOUNT_LAVINIA_LANDSAT.beach_sand.y2000} → ${LC_MOUNT_LAVINIA_LANDSAT.beach_sand.y2025} ha`}
                topBorderColor="#ffffbf"
              />
            </div>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">Sentinel-2 10 m shares</h3>
              <MetricInfoButton
                title={LC_INFO.s2Metrics.title}
                points={LC_INFO.s2Metrics.points}
              />
            </div>
            <S2MetricsChart gnName="Mount Lavinia" />
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">Design focus</h3>
            <DesignBullets items={LC_DESIGN_BULLETS_MOUNT} />
          </FocusAreaPanelCard>
        </>
      )}

      {hasGn && !isMount && (
        <>
          <FocusAreaPanelCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">Sentinel-2 10 m shares</h3>
              <MetricInfoButton
                title={LC_INFO.s2Metrics.title}
                points={LC_INFO.s2Metrics.points}
              />
            </div>
            <p className="mb-2 text-[11px] text-surface-400">
              Area ≈ {LC_PER_GN_S2[selectedGn]?.area_ha ?? '—'} ha · long-term (~2000) change is
              summarised at the 5 GN / Mount Lavinia scale
            </p>
            <S2MetricsChart gnName={selectedGn} />
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">Reading tip</h3>
            <p className="text-xs leading-relaxed text-surface-300">
              Use the map epoch and change layers for the Landsat long-term story across all five
              GNs. These Sentinel-2 bars give finer 2018–2025 built / green / soft texture for{' '}
              {selectedGn}.
            </p>
          </FocusAreaPanelCard>
        </>
      )}
    </div>
  )
}
