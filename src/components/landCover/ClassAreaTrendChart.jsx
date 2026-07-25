import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LC_CLASS_AREA_BY_EPOCH, LC_CLASS_LEGEND } from '../../constants/landCover.js'

const chartData = LC_CLASS_AREA_BY_EPOCH.map((row) => ({
  label: row.label,
  built_up: row.built_up,
  vegetation: row.vegetation,
  open_bare: row.open_bare,
  water_wetland: row.water_wetland,
  beach_sand: row.beach_sand,
}))

const SERIES = LC_CLASS_LEGEND.map((c) => ({
  key: c.id,
  label: c.label,
  color: c.color,
}))

/** Stacked area — Landsat class hectares by epoch. */
export default function ClassAreaTrendChart() {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
            unit=" ha"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value, name) => {
              const meta = SERIES.find((s) => s.key === name)
              return [`${Number(value).toFixed(1)} ha`, meta?.label ?? name]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            formatter={(value) => SERIES.find((s) => s.key === value)?.label ?? value}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stackId="1"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.75}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
