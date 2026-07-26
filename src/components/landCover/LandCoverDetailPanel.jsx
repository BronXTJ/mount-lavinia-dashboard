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
  getGnS2Kpis,
} from '../../constants/landCover.js'
import {
  LC_DESIGN_BULLETS_MOUNT,
  LC_DESIGN_BULLETS_STUDY,
  LC_INFO,
  LC_TRANSITION_PATHWAYS,
} from './landCoverInfoContent.js'

function formatSignedHa(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} ha`
}

function formatSignedPp(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} pp`
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

function GnS2KpiCards({ gnName }) {
  const kpis = getGnS2Kpis(gnName)
  if (!kpis) return null

  return (
    <FocusAreaPanelCard>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-surface-100">
          Sentinel-2 10 m snapshot (~2025 · change 2018→2025)
        </h3>
        <MetricInfoButton title={LC_INFO.s2Metrics.title} points={LC_INFO.s2Metrics.points} />
      </div>
      <p className="mb-3 text-[11px] text-surface-400">Area ≈ {kpis.area_ha} ha</p>
      <div className="grid grid-cols-2 gap-3">
        <DensityStatCard
          label="Built-up"
          value={`${kpis.built_up_pct.toFixed(1)}%`}
          hint="Share of GN area · Sentinel-2 ~2025"
          topBorderColor="#d73027"
        />
        <DensityStatCard
          label="Green"
          value={`${kpis.green_pct.toFixed(1)}%`}
          hint="Vegetation share · Sentinel-2 ~2025"
          topBorderColor="#1a9850"
        />
        <DensityStatCard
          label="Soft surface"
          value={`${kpis.soft_surface_pct.toFixed(1)}%`}
          hint="Veg + open + water + beach · Sentinel-2 ~2025"
          topBorderColor="#4575b4"
        />
        <DensityStatCard
          label="Built-up change"
          value={formatSignedPp(kpis.built_up_change_pp)}
          hint="Percentage points · Sentinel-2 2018→2025"
          topBorderColor="#fc8d59"
        />
      </div>
    </FocusAreaPanelCard>
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

function TransitionPathways() {
  return (
    <ul className="space-y-3">
      {LC_TRANSITION_PATHWAYS.map((row) => (
        <li key={row.id} className="rounded-md border border-surface-700/80 bg-surface-900/40 px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-surface-100">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-black/20"
              style={{ backgroundColor: row.from.color }}
              aria-hidden
            />
            <span>{row.from.label}</span>
            <span className="text-surface-500" aria-hidden>
              →
            </span>
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-black/20"
              style={{ backgroundColor: row.to.color }}
              aria-hidden
            />
            <span>{row.to.label}</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-surface-400">{row.hint}</p>
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
              ? 'Landsat 30 m (2000→2025) + Sentinel-2 10 m (2018–2025)'
              : 'Sentinel-2 10 m built / green / soft (2018–2025)'
            : `Landsat 30 m class shares (${epochRow.label})`}
        </p>
      </div>

      {!hasGn && (
        <>
          <FocusAreaPanelCard>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">
                Landsat class shares ({epochRow.label})
              </h3>
              <MetricInfoButton
                title={LC_INFO.classDefinitions.title}
                points={LC_INFO.classDefinitions.points}
              />
            </div>
            <ClassShareBars epochRow={epochRow} />
            <p className="mt-3 text-[11px] leading-snug text-surface-500">
              Open / bare includes yards, fields, sparse grass, and cleared lots — not only empty
              land. Tap the info icon for the full Landsat class key.
            </p>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">
                Main transitions (Landsat 2000→2025)
              </h3>
              <MetricInfoButton
                title={LC_INFO.transitions.title}
                points={LC_INFO.transitions.points}
              />
            </div>
            <TransitionPathways />
            <p className="mt-3 text-[11px] leading-snug text-surface-500">
              Turn on the map layer <span className="text-surface-300">Landsat change 2000→2025</span>{' '}
              to see where these shifts concentrate.
            </p>
          </FocusAreaPanelCard>

          <FocusAreaPanelCard>
            <h3 className="mb-3 text-sm font-semibold text-surface-100">Design implications</h3>
            <DesignBullets items={LC_DESIGN_BULLETS_STUDY} />
          </FocusAreaPanelCard>
        </>
      )}

      {hasGn && (
        <>
          {isMount && (
            <FocusAreaPanelCard>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-surface-100">
                  Landsat 30 m deep dive (2000→2025)
                </h3>
                <MetricInfoButton
                  title={LC_INFO.landsatDeepDive.title}
                  points={LC_INFO.landsatDeepDive.points}
                />
              </div>
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
          )}

          <GnS2KpiCards gnName={selectedGn} />

          <FocusAreaPanelCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-100">
                Sentinel-2 trend (2018 / 2020 / 2025)
              </h3>
              <MetricInfoButton
                title={LC_INFO.s2Metrics.title}
                points={LC_INFO.s2Metrics.points}
              />
            </div>
            {!isMount && (
              <p className="mb-2 text-[11px] text-surface-400">
                Landsat long-term change (~2000–2025) is on the map layers and Mount Lavinia deep
                dive; this GN uses Sentinel-2 10 m (2018–2025).
              </p>
            )}
            <S2MetricsChart gnName={selectedGn} />
          </FocusAreaPanelCard>

          {isMount ? (
            <FocusAreaPanelCard>
              <h3 className="mb-3 text-sm font-semibold text-surface-100">Design focus</h3>
              <DesignBullets items={LC_DESIGN_BULLETS_MOUNT} />
            </FocusAreaPanelCard>
          ) : (
            <FocusAreaPanelCard>
              <h3 className="mb-3 text-sm font-semibold text-surface-100">Reading tip</h3>
              <p className="text-xs leading-relaxed text-surface-300">
                Use the map epoch and change layers for the Landsat 30 m long-term story (~2000 /
                ~2015 / ~2025) across all five GNs. These Sentinel-2 10 m cards and bars give finer
                2018–2025 built / green / soft texture for {selectedGn}.
              </p>
            </FocusAreaPanelCard>
          )}
        </>
      )}
    </div>
  )
}
