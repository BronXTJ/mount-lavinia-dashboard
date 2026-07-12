import { LabelList } from 'recharts'

const DEFAULT_STYLE = {
  fill: '#e2e8f0',
  fontSize: 11,
  fontWeight: 600,
}

/**
 * Recharts LabelList that stays mounted during bar entrance animation.
 * Uses transparent fill until showLabels — layout stays stable, then fades in.
 */
export default function DeferredLabelList({
  showLabels,
  dataKey,
  position = 'right',
  formatter,
  style,
  className = 'chart-value-label',
  ...rest
}) {
  const visibleFill = style?.fill ?? DEFAULT_STYLE.fill

  return (
    <LabelList
      dataKey={dataKey}
      position={position}
      className={className}
      formatter={(v, ...args) => {
        if (typeof formatter === 'function') return formatter(v, ...args)
        return v
      }}
      style={{
        ...DEFAULT_STYLE,
        ...style,
        fill: showLabels ? visibleFill : 'transparent',
        transition: 'fill 0.3s ease',
        pointerEvents: 'none',
      }}
      {...rest}
    />
  )
}
