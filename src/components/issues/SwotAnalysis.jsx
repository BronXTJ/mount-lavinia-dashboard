import { AlertTriangle, Flame, Target, Zap } from 'lucide-react'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { hexToRgba } from './colorUtils.js'
import { ISSUES_INFO } from './issuesInfoContent.js'
import { swotData } from './issuesData.js'

const QUADRANTS = [
  {
    key: 'strengths',
    data: swotData.strengths,
    letter: 'S',
    Icon: Zap,
    info: ISSUES_INFO.swotStrengths,
    titleColor: '#4ade80',
  },
  {
    key: 'weaknesses',
    data: swotData.weaknesses,
    letter: 'W',
    Icon: AlertTriangle,
    info: ISSUES_INFO.swotWeaknesses,
    titleColor: '#f87171',
  },
  {
    key: 'opportunities',
    data: swotData.opportunities,
    letter: 'O',
    Icon: Target,
    info: ISSUES_INFO.swotOpportunities,
    titleColor: '#60a5fa',
  },
  {
    key: 'threats',
    data: swotData.threats,
    letter: 'T',
    Icon: Flame,
    info: ISSUES_INFO.swotThreats,
    titleColor: '#fbbf24',
  },
]

/** 2×2 SWOT grid — fills remaining page height; high-contrast titles. */
export default function SwotAnalysis() {
  return (
    <div className="grid h-full min-h-[calc(100vh-12rem)] flex-1 gap-3 md:grid-cols-2 md:grid-rows-2 md:items-stretch">
      {QUADRANTS.map(({ key, data, letter, Icon, info, titleColor }, qi) => (
        <div
          key={key}
          className="relative flex min-h-0 flex-col overflow-hidden rounded-xl p-4 backdrop-blur-[8px]"
          style={{
            background: hexToRgba(data.color, 0.12),
            border: `3px solid ${hexToRgba(data.color, 0.75)}`,
            animation: `issuesFadeUp 0.45s ease both`,
            animationDelay: `${qi * 80}ms`,
          }}
        >
          <span
            className="pointer-events-none absolute -right-1 -top-3 select-none font-display text-[80px] font-bold leading-none opacity-[0.08]"
            style={{ color: titleColor }}
            aria-hidden
          >
            {letter}
          </span>

          <h3
            className="relative mb-3 flex shrink-0 items-center gap-2.5 border-b-2 pb-2 font-display text-lg font-bold tracking-tight"
            style={{ color: titleColor, borderColor: hexToRgba(titleColor, 0.45) }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: hexToRgba(titleColor, 0.25) }}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 drop-shadow-sm">{data.title}</span>
            <MetricInfoButton
              title={info.title}
              points={info.points}
              ariaLabel={info.ariaLabel}
            />
          </h3>

          <ul className="relative flex flex-1 flex-wrap content-start gap-2">
            {data.items.map((item, i) => (
              <li
                key={item}
                className="rounded-full px-3 py-2 text-sm leading-snug text-surface-50 transition hover:brightness-125"
                style={{
                  background: hexToRgba(data.color, 0.15),
                  border: `1px solid ${hexToRgba(data.color, 0.45)}`,
                  animation: `issuesFadeUp 0.4s ease both`,
                  animationDelay: `${qi * 80 + i * 35}ms`,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
