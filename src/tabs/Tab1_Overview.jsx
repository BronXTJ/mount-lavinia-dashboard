import { useState } from 'react'
import {
  Building2,
  ChartNoAxesColumn,
  Hash,
  Home,
  House,
  LandPlot,
  MapPinned,
  Users,
} from 'lucide-react'
import KPICard from '../components/KPICard.jsx'
import LiveDataPanel from '../components/LiveDataPanel.jsx'
import PopulationTrendChart from '../components/PopulationTrendChart.jsx'
import AgeStructurePyramid from '../components/AgeStructurePyramid.jsx'
import AgeDependencyBeams from '../components/AgeDependencyBeams.jsx'
import DonutChart from '../components/DonutChart.jsx'
import RoadPropertyPanel from '../components/RoadPropertyPanel.jsx'
import FocusAreaMap from '../components/FocusAreaMap.jsx'
import MetricInfoButton from '../components/focusArea/MetricInfoButton.jsx'
import { DEFAULT_ACTIVE_LAYERS, LAND_USE_COLORS } from '../constants/mapLayers.js'

import kpiData from '../data/kpi.json'
import populationTrendData from '../data/populationTrend.json'
import gnDivisionStatsData from '../data/gnDivisionStats.json'
import gnPopulationStructure2024 from '../data/gnPopulationStructure2024.json'
import landUseSummaryData from '../data/landUseSummary.json'
import roadPropertyData from '../data/roadProperty.json'

const iconClass = 'h-4 w-4'

const KPI_CARDS = [
  {
    label: 'GN Divisions',
    value: kpiData.gnDivisions,
    icon: <MapPinned className={iconClass} />,
  },
  {
    label: 'Total Land Area',
    value: kpiData.totalLandAreaKm2.toFixed(2),
    unit: 'km²',
    icon: <LandPlot className={iconClass} />,
  },
  {
    label: 'Total Population',
    value: kpiData.totalPopulation.toLocaleString(),
    icon: <Users className={iconClass} />,
  },
  {
    label: 'Population Density',
    value: kpiData.populationDensityPerKm2.toLocaleString(),
    unit: 'per km²',
    icon: <ChartNoAxesColumn className={iconClass} />,
  },
  {
    label: 'Built-up Area',
    value: Math.round(kpiData.builtUpAreaKm2 * 100),
    unit: '%',
    icon: <Building2 className={iconClass} />,
  },
  {
    label: 'Total Housing Units',
    value: kpiData.totalHousingUnits.toLocaleString(),
    icon: <Home className={iconClass} />,
  },
  {
    label: 'Housing Density',
    value: kpiData.housingDensityPerM2.toLocaleString(),
    unit: 'per m²',
    icon: <House className={iconClass} />,
  },
]

function buildGnCards(stats) {
  return [
    {
      label: 'GN Division Name',
      value: stats.name,
      icon: <MapPinned className={iconClass} />,
    },
    {
      label: 'GN Division Code',
      value: stats.gnCode,
      icon: <Hash className={iconClass} />,
    },
    {
      label: 'Total Land Area',
      value: stats.areaKm2.toFixed(2),
      unit: 'km²',
      icon: <LandPlot className={iconClass} />,
    },
    {
      label: 'Total Population',
      value: stats.population2024.toLocaleString(),
      icon: <Users className={iconClass} />,
    },
    {
      label: 'Population Density',
      value: stats.populationDensityPerKm2.toLocaleString(),
      unit: 'per km²',
      icon: <ChartNoAxesColumn className={iconClass} />,
    },
    {
      label: 'Total Housing Units',
      value: stats.housingUnits.toLocaleString(),
      icon: <Home className={iconClass} />,
    },
    {
      label: 'Housing Density',
      value: stats.housingDensityPerKm2.toLocaleString(),
      unit: 'per km²',
      icon: <House className={iconClass} />,
    },
  ]
}

const POPULATION_TREND_INFO = {
  title: 'Population Trend',
  ariaLabel: 'What does the Population Trend chart show?',
  points: [
    'Each line shows one GN division’s population across census years.',
    'Values come from official census counts for the Primary Study Area divisions.',
    'Rising lines indicate growth; falling lines indicate decline between census years.',
    'Compare divisions to see which parts of the corridor grew fastest.',
  ],
}

const LAND_USE_INFO = {
  title: 'Land Use Distribution',
  ariaLabel: 'What does the Land Use Distribution chart show?',
  points: [
    'The donut shows the share of land area by land-use category (Main_C) in the study area.',
    'Percentages sum to 100% of classified land parcels in the Primary Study Area.',
    'Residential typically dominates; commercial and institutional mark corridor activity.',
    'Use the legend colours to match slices with categories on the map when Land Use is on.',
  ],
}

const POPULATION_STRUCTURE_INFO = {
  title: 'Population Structure',
  ariaLabel: 'What does Population Structure show?',
  points: [
    'Census 2024 provisional GN-level population by age group for the five Primary Study Area divisions.',
    'The mirrored pyramid compares a selected GN (left) with the study-area average (right). Age bands: 0–14, 15–59, 60–64, 65+.',
    'Dependency balance shows child dependency (0–14 / 15–59) and elderly dependency (60+ / 15–59) for the map-selected GN only. Dashed ticks mark the study-area average.',
    'Click a GN on the map to compare age structure and load dependency bars; Back to overview clears the selection.',
  ],
}

function SectionCard({ title, subtitle, info, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-surface-700 bg-surface-800 p-5 shadow-card ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-surface-50">{title}</h2>
          {info && (
            <MetricInfoButton
              title={info.title}
              points={info.points}
              ariaLabel={info.ariaLabel}
            />
          )}
        </div>
      )}
      {subtitle && <p className="mt-0.5 text-xs text-surface-200">{subtitle}</p>}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

/** First 4 cards = row of 4; last 3 = full-width row of 3 (no empty slot). */
function kpiSpanClass(index) {
  return index < 4 ? 'col-span-6 lg:col-span-3' : 'col-span-6 lg:col-span-4'
}

export default function Tab1_Overview() {
  const [clickedCoords, setClickedCoords] = useState(null)
  const [activeLayers, setActiveLayers] = useState(DEFAULT_ACTIVE_LAYERS)
  const [selectedRoadName, setSelectedRoadName] = useState(null)
  const [selectedGnName, setSelectedGnName] = useState(null)

  const selectedRoad = roadPropertyData.roads.find((r) => r.name === selectedRoadName)
  const highlightedRoadCoords =
    selectedRoad?.lat != null ? { lat: selectedRoad.lat, lng: selectedRoad.lng } : null

  const selectedGnStats = selectedGnName
    ? gnDivisionStatsData.find((d) => d.name === selectedGnName)
    : null
  const kpiCards = selectedGnStats ? buildGnCards(selectedGnStats) : KPI_CARDS

  const handleToggleLayer = (layerId, checked) => {
    setActiveLayers((prev) => (checked ? [...prev, layerId] : prev.filter((id) => id !== layerId)))
  }

  const handleGnSelect = ({ name, lat, lng, forceSelect = false }) => {
    if (forceSelect) {
      setSelectedGnName(name)
    } else {
      setSelectedGnName((prev) => (prev === name ? null : name))
    }
    if (lat != null && lng != null) {
      setClickedCoords({ lat, lng })
    }
  }

  const handleMapClick = (coords) => {
    setClickedCoords(coords)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex flex-col gap-6 lg:w-[67%]">
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="font-sans uppercase"
                style={{
                  fontSize: 12,
                  color: '#00b4d8',
                  letterSpacing: '0.1em',
                }}
              >
                PRIMARY STUDY AREA
              </span>
            </div>
            <h1
              className="font-display font-bold text-white"
              style={{
                fontSize: 28,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Mount Lavinia
              <span style={{ color: '#00b4d8' }}>.</span>
            </h1>
            <p
              className="font-sans"
              style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}
            >
              Galle Road Corridor • Five GN Divisions
            </p>
          </div>

          {selectedGnStats && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-500/40 bg-primary-500/10 px-4 py-2 text-sm text-surface-100">
              <span>
                Showing division data for{' '}
                <strong className="font-semibold text-primary-300">{selectedGnStats.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedGnName(null)}
                className="rounded-md border border-primary-400/50 px-2.5 py-1 text-xs font-medium text-primary-300 transition hover:bg-primary-500/20"
              >
                ← Back to overview
              </button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-3">
            {kpiCards.map((card, index) => (
              <div key={card.label} className={kpiSpanClass(index)}>
                <KPICard {...card} />
              </div>
            ))}
          </div>

          <LiveDataPanel coords={clickedCoords} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Population Trend (Census Years)" info={POPULATION_TREND_INFO}>
            <PopulationTrendChart
              divisions={populationTrendData.divisions}
              trend={populationTrendData.trend}
            />
          </SectionCard>

          <SectionCard title="Land Use Distribution" info={LAND_USE_INFO}>
            <DonutChart
              data={landUseSummaryData}
              colors={Object.values(LAND_USE_COLORS)}
              height={280}
            />
          </SectionCard>
        </div>

        <SectionCard
          title="Population Structure"
          subtitle="Age pyramid with study-area average · dependency for the selected GN"
          info={POPULATION_STRUCTURE_INFO}
        >
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-700/80 bg-surface-900/40">
              <div className="border-b border-surface-700/80 px-3 py-2">
                <h3 className="font-display text-sm font-semibold tracking-wide text-surface-50">
                  Age Structure Pyramid
                </h3>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <AgeStructurePyramid
                  data={gnPopulationStructure2024}
                  selectedGnName={selectedGnName}
                />
              </div>
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-700/80 bg-surface-900/40">
              <div className="border-b border-surface-700/80 px-3 py-2">
                <h3 className="font-display text-sm font-semibold tracking-wide text-surface-50">
                  Age Dependency Balance
                </h3>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <AgeDependencyBeams
                  data={gnPopulationStructure2024}
                  selectedGnName={selectedGnName}
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-surface-400">
            Source:{' '}
            <span className="text-primary-300">Census of Population and Housing 2024</span>
            {' — '}
            GN Division Level Population by Sex and Age Group (Provisional).{' '}
            <span className="text-primary-300">
              {gnPopulationStructure2024.dsDivision} DS Division
            </span>
            .
          </p>
        </SectionCard>

        <RoadPropertyPanel
          data={roadPropertyData}
          selectedRoadName={selectedRoadName}
          onSelectRoad={setSelectedRoadName}
        />
      </div>

      <div className="w-full lg:sticky lg:top-6 lg:w-[33%]">
        <div className="h-[70vh] lg:h-[calc(100vh-3rem)]">
          <FocusAreaMap
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onMapClick={handleMapClick}
            highlightedRoadName={selectedRoadName}
            highlightedRoadCoords={highlightedRoadCoords}
            clickedPosition={clickedCoords ? [clickedCoords.lat, clickedCoords.lng] : null}
            selectedGnName={selectedGnName}
            onGnSelect={handleGnSelect}
          />
        </div>
      </div>
    </div>
  )
}
