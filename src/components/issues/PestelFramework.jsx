import { Coins, Cpu, Landmark, Scale, Users, Waves } from 'lucide-react'
import MetricInfoButton from '../focusArea/MetricInfoButton.jsx'
import { hexToRgba } from './colorUtils.js'
import { ISSUES_INFO } from './issuesInfoContent.js'
import { pestelData } from './issuesData.js'

const META = {
  Political: { letter: 'P', Icon: Landmark, info: ISSUES_INFO.pestelPolitical },
  Economic: { letter: 'E', Icon: Coins, info: ISSUES_INFO.pestelEconomic },
  Social: { letter: 'S', Icon: Users, info: ISSUES_INFO.pestelSocial },
  Technological: { letter: 'T', Icon: Cpu, info: ISSUES_INFO.pestelTechnological },
  Environmental: { letter: 'E', Icon: Waves, info: ISSUES_INFO.pestelEnvironmental },
  Legal: { letter: 'L', Icon: Scale, info: ISSUES_INFO.pestelLegal },
}

/** Six PESTEL framework panels — facts unchanged. */
export default function PestelFramework() {
  const entries = Object.entries(pestelData)

  return (
    <div className="grid min-h-[calc(100vh-12rem)] flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:grid-rows-2 xl:items-stretch">
      {entries.map(([name, data], i) => {
        const { letter, Icon, info } = META[name]
        return (
          <div
            key={name}
            className="relative flex min-h-[260px] flex-col overflow-hidden rounded-xl p-4 transition-[box-shadow,border-color] duration-200 backdrop-blur-[8px] hover:shadow-[0_0_24px_var(--glow)]"
            style={{
              background: hexToRgba(data.color, 0.08),
              border: `2px solid ${hexToRgba(data.color, 0.45)}`,
              borderLeftWidth: 4,
              borderLeftColor: data.color,
              '--glow': hexToRgba(data.color, 0.22),
              animation: `issuesFadeUp 0.45s ease both`,
              animationDelay: `${i * 70}ms`,
            }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold text-white"
                style={{ backgroundColor: data.color }}
              >
                {letter}
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: hexToRgba(data.color, 0.2), color: data.color }}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="min-w-0 flex-1 font-display text-base font-semibold text-surface-50">
                {name}
              </h3>
              <MetricInfoButton
                title={info.title}
                points={info.points}
                ariaLabel={info.ariaLabel}
              />
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {data.points.map((point) => (
                <li
                  key={point}
                  className="rounded-lg px-2.5 py-2 text-sm leading-relaxed text-surface-100"
                  style={{
                    background: hexToRgba(data.color, 0.1),
                    borderLeft: `2px solid ${hexToRgba(data.color, 0.55)}`,
                  }}
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
