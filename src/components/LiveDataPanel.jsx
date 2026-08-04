import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CloudRain,
  Droplets,
  Gauge,
  Sun,
  Thermometer,
  ThermometerSun,
  Wind,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import LoadingSpinner from './LoadingSpinner.jsx'
import MetricInfoButton from './focusArea/MetricInfoButton.jsx'
import { useDocumentMapFullscreen } from './MapFullscreenShell.jsx'
import useChartAnimation from '../hooks/useChartAnimation.js'
import { MAP_CENTER } from '../constants/mapLayers.js'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const TEMP_COLOR = '#38bdf8'
const FEELS_COLOR = '#fbbf24'

function weatherUrl(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    timezone: 'Asia/Colombo',
    forecast_hours: '24',
    current:
      'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,apparent_temperature,uv_index',
    hourly: 'temperature_2m,apparent_temperature,precipitation',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

function airQualityUrl(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    timezone: 'Asia/Colombo',
    current: 'us_aqi,pm2_5',
  })
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`
}

function formatChipValue(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

function hourLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const part = String(iso).split('T')[1]
    return part ? part.slice(0, 5) : ''
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function StatChip({ label, value, unit, icon }) {
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-md border border-surface-700 bg-surface-900/60 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon && (
          <span className="flex h-5 w-5 items-center justify-center text-primary-400">{icon}</span>
        )}
        <p className="text-[10px] uppercase tracking-wide text-surface-200">{label}</p>
      </div>
      <p className="mt-0.5 font-display text-base font-semibold text-surface-50">
        {value ?? '—'}
        {value != null && unit && (
          <span className="ml-0.5 text-xs font-normal text-surface-200">{unit}</span>
        )}
      </p>
    </div>
  )
}

function ForecastTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-surface-50">{row?.label}</p>
      <p className="mt-0.5 text-sky-300">Temp: {row?.temp != null ? `${row.temp} °C` : '—'}</p>
      <p className="text-amber-300">
        Feels like: {row?.feels != null ? `${row.feels} °C` : '—'}
      </p>
      {row?.rain != null && (
        <p className="text-surface-300">Rain: {row.rain} mm</p>
      )}
    </div>
  )
}

/**
 * Live weather card for the Overview map. Fetches Open-Meteo current
 * conditions + 24h forecast and air quality for `coords` (defaults to the
 * study area center), auto-refreshes every 10 minutes, and re-fetches when
 * the user clicks a new spot on the map.
 */
export default function LiveDataPanel({ coords }) {
  const [weather, setWeather] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [aqError, setAqError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const requestId = useRef(0)
  const mapFullscreen = useDocumentMapFullscreen()

  const lat = coords?.lat ?? MAP_CENTER[0]
  const lng = coords?.lng ?? MAP_CENTER[1]
  const { isAnimationActive, animationDuration } = useChartAnimation(`${lat},${lng}`)

  useEffect(() => {
    let cancelled = false
    const thisRequest = ++requestId.current

    async function fetchLive() {
      setLoading(true)
      setError(null)
      setAqError(false)
      try {
        const weatherRes = await fetch(weatherUrl(lat, lng))
        if (!weatherRes.ok) throw new Error(`Weather request failed (${weatherRes.status})`)
        const weatherJson = await weatherRes.json()
        if (cancelled || thisRequest !== requestId.current) return
        setWeather(weatherJson)

        try {
          const aqRes = await fetch(airQualityUrl(lat, lng))
          if (!aqRes.ok) throw new Error(`Air quality request failed (${aqRes.status})`)
          const aqJson = await aqRes.json()
          if (cancelled || thisRequest !== requestId.current) return
          setAirQuality(aqJson)
        } catch {
          if (cancelled || thisRequest !== requestId.current) return
          setAirQuality(null)
          setAqError(true)
        }

        setUpdatedAt(new Date())
      } catch {
        if (cancelled || thisRequest !== requestId.current) return
        setWeather(null)
        setAirQuality(null)
        setError('Live weather is unavailable right now.')
      } finally {
        if (!cancelled && thisRequest === requestId.current) setLoading(false)
      }
    }

    fetchLive()
    const interval = setInterval(fetchLive, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [lat, lng])

  const current = weather?.current
  const units = weather?.current_units ?? {}
  const aqCurrent = airQuality?.current
  const aqUnits = airQuality?.current_units ?? {}
  const iconClass = 'h-3.5 w-3.5'

  const chartData = useMemo(() => {
    const hourly = weather?.hourly
    if (!hourly?.time?.length) return []
    return hourly.time.map((t, i) => ({
      label: hourLabel(t),
      temp:
        hourly.temperature_2m?.[i] != null
          ? Number(Number(hourly.temperature_2m[i]).toFixed(1))
          : null,
      feels:
        hourly.apparent_temperature?.[i] != null
          ? Number(Number(hourly.apparent_temperature[i]).toFixed(1))
          : null,
      rain:
        hourly.precipitation?.[i] != null
          ? Number(Number(hourly.precipitation[i]).toFixed(1))
          : null,
    }))
  }, [weather])

  return (
    <div
      className={`live-data-panel relative z-0 overflow-hidden rounded-lg border bg-surface-800 px-4 py-3.5 shadow-card transition-[border-color,box-shadow] duration-300 ${
        mapFullscreen ? 'hidden' : ''
      } ${
        loading
          ? 'border-primary-400/60 shadow-[0_0_0_1px_rgba(0,180,216,0.25),0_0_24px_rgba(0,180,216,0.18)]'
          : 'border-surface-700'
      }`}
      aria-hidden={mapFullscreen || undefined}
    >
      {loading && !mapFullscreen && (
        <div
          className="live-data-load-track pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-primary-500/25"
          aria-hidden
        >
          <div className="weather-load-bar h-full" />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="font-display text-sm font-semibold text-surface-50">
            Real-Time Environmental Conditions
          </h2>
          <MetricInfoButton
            title="Real-Time Environmental Conditions"
            ariaLabel="What does Real-Time Environmental Conditions show?"
            points={[
              'Live Open-Meteo forecast for the clicked map location (or study-area centre by default).',
              'Shows temperature, feels-like, humidity, wind, rainfall, UV index, US AQI, and PM2.5.',
              'The chart shows the next 24 hours of temperature and feels-like temperature.',
              'Air quality comes from Open-Meteo’s separate Air Quality API.',
              'This is modelled forecast data, not station observations. Environmental Analysis holds modelled UTCI / UHI maps, not live weather.',
              'Click the map to refresh for that point. Data auto-refreshes about every 10 minutes.',
            ]}
          />
        </div>
        {loading && <LoadingSpinner size={14} />}
      </div>

      <p className="mt-1.5 text-xs text-surface-200">
        {coords
          ? `Showing conditions at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
          : 'Showing conditions at study area center'}
      </p>

      {error ? (
        <p className="mt-2.5 text-sm text-rose-400">{error}</p>
      ) : (
        <>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <StatChip
              label="Temperature"
              value={formatChipValue(current?.temperature_2m)}
              unit={units.temperature_2m ?? '°C'}
              icon={<Thermometer className={iconClass} />}
            />
            <StatChip
              label="Feels like"
              value={formatChipValue(current?.apparent_temperature)}
              unit={units.apparent_temperature ?? '°C'}
              icon={<ThermometerSun className={iconClass} />}
            />
            <StatChip
              label="Humidity"
              value={formatChipValue(current?.relative_humidity_2m, 0)}
              unit={units.relative_humidity_2m ?? '%'}
              icon={<Droplets className={iconClass} />}
            />
            <StatChip
              label="Wind"
              value={formatChipValue(current?.wind_speed_10m)}
              unit={units.wind_speed_10m ?? 'km/h'}
              icon={<Wind className={iconClass} />}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <StatChip
              label="Rainfall"
              value={formatChipValue(current?.precipitation)}
              unit={units.precipitation ?? 'mm'}
              icon={<CloudRain className={iconClass} />}
            />
            <StatChip
              label="UV index"
              value={formatChipValue(current?.uv_index, 1)}
              unit={units.uv_index ?? ''}
              icon={<Sun className={iconClass} />}
            />
            <StatChip
              label="AQI"
              value={formatChipValue(aqCurrent?.us_aqi, 0)}
              unit={aqUnits.us_aqi ?? ''}
              icon={<Gauge className={iconClass} />}
            />
            <StatChip
              label="PM2.5"
              value={formatChipValue(aqCurrent?.pm2_5)}
              unit={aqUnits.pm2_5 ?? 'µg/m³'}
              icon={<Wind className={iconClass} />}
            />
          </div>

          {aqError && (
            <p className="mt-2 text-[11px] text-surface-400">
              Air quality is temporarily unavailable; weather data still shown.
            </p>
          )}

          <div className="mt-3.5">
            <h3 className="font-display text-sm font-semibold text-surface-50">Next 24 Hours</h3>
            <p className="mt-0.5 text-xs text-surface-300">
              Temperature and feels-like outlook (Asia/Colombo)
            </p>
            {chartData.length === 0 ? (
              <p className="mt-3 text-center text-xs text-surface-400">No hourly forecast yet</p>
            ) : (
              <div className="mt-2 h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      interval={3}
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={false}
                      tickFormatter={(v) => `${v}°`}
                      width={36}
                    />
                    <Tooltip content={<ForecastTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      name="Temp"
                      stroke={TEMP_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: TEMP_COLOR }}
                      isAnimationActive={isAnimationActive}
                      animationDuration={animationDuration}
                    />
                    <Line
                      type="monotone"
                      dataKey="feels"
                      name="Feels like"
                      stroke={FEELS_COLOR}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 4, fill: FEELS_COLOR }}
                      isAnimationActive={isAnimationActive}
                      animationDuration={animationDuration}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary-500/30 bg-primary-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400/40" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="relative h-4 w-4 text-primary-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a20.9 20.9 0 003.079-2.417c1.043-.998 2.5-2.5 3.674-4.24C20.487 13.897 21 12.19 21 10.5c0-4.97-4.03-9-9-9s-9 4.03-9 9c0 1.69.513 3.397 1.807 5.194 1.174 1.74 2.63 3.242 3.674 4.24a20.9 20.9 0 003.06 2.417zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="text-[11px] text-surface-100">
            <span className="font-semibold text-primary-300">Click anywhere on the map</span> to get
            live data for that location
          </span>
        </div>
        {updatedAt && (
          <span className="shrink-0 text-[11px] text-surface-200">
            Updated {updatedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-surface-400">
        Source:{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-300 underline-offset-2 hover:text-primary-200 hover:underline"
        >
          Open-Meteo Weather
        </a>
        {' · '}
        <a
          href="https://open-meteo.com/en/docs/air-quality-api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-300 underline-offset-2 hover:text-primary-200 hover:underline"
        >
          Open-Meteo Air Quality
        </a>
        . Modelled forecast data, not station observations.
      </p>
    </div>
  )
}
