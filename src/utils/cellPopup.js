import L from 'leaflet'

/** Shared Leaflet options for hex/square cell info popups (Maturation card style). */
export const CELL_POPUP_OPTS = {
  maxWidth: 320,
  offset: [0, -12],
  autoPanPadding: [48, 48],
  className: 'cell-info-popup',
}

/** North edge of feature — keeps popup above the cell so fill stays visible. */
export function getFeaturePopupAnchor(feature) {
  try {
    const layer = L.geoJSON(feature)
    const bounds = layer.getBounds()
    return [bounds.getNorth(), bounds.getCenter().lng]
  } catch {
    return null
  }
}

export function getFeatureCenter(feature) {
  try {
    const layer = L.geoJSON(feature)
    const center = layer.getBounds().getCenter()
    return [center.lat, center.lng]
  } catch {
    return null
  }
}

/** Mini progress bar; `value` is 0–1 (clamped). */
export function miniBar(value, color = '#94a3b8') {
  const pct = Math.max(0, Math.min(100, (Number(value) || 0) * 100))
  return `<div style="margin-top:4px;height:6px;border-radius:3px;background:#2a3a4a;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color}"></div></div>`
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Maturation-style cell info card HTML.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.primaryLabel]
 * @param {string} [opts.primaryValue]
 * @param {{ label: string, color: string, textColor?: string } | null} [opts.badge]
 * @param {{ label: string, value: string, bar?: number | null }[]} [opts.metrics]
 * @param {{ label: string, color: string, textColor?: string } | null} [opts.footer]
 */
export function buildCellInfoPopupHtml({
  title,
  primaryLabel,
  primaryValue,
  badge = null,
  metrics = [],
  footer = null,
}) {
  const badgeHtml =
    badge != null
      ? `<span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:${badge.color};color:${badge.textColor ?? '#ffffff'}">${escapeHtml(badge.label)}</span>`
      : ''

  const primaryRow =
    primaryLabel != null || primaryValue != null || badge
      ? `<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        ${primaryLabel != null ? `<span style="font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:0.02em">${escapeHtml(primaryLabel)}</span>` : ''}
        ${primaryValue != null ? `<span style="font-weight:700;font-size:13px;color:#f8fafc">${escapeHtml(primaryValue)}</span>` : ''}
        ${badgeHtml}
      </div>`
      : ''

  const cols = Math.min(3, Math.max(1, metrics.length || 1))
  const metricsHtml =
    metrics.length > 0
      ? `<div style="margin-top:10px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;font-size:11px">
        ${metrics
          .map(
            (m) => `<div>
          <div style="color:#94a3b8">${escapeHtml(m.label)}</div>
          <div style="font-weight:600;margin-top:2px">${escapeHtml(m.value)}</div>
          ${m.bar != null && Number.isFinite(Number(m.bar)) ? miniBar(m.bar, m.barColor) : ''}
        </div>`,
          )
          .join('')}
      </div>`
      : ''

  const footerHtml =
    footer != null
      ? `<div style="margin-top:12px;padding:8px 10px;border-radius:8px;text-align:center;font-size:13px;font-weight:800;letter-spacing:0.02em;background:${footer.color};color:${footer.textColor ?? '#ffffff'};box-shadow:0 0 0 1px rgba(255,255,255,0.25),0 4px 12px rgba(0,0,0,0.35)">${escapeHtml(footer.label)}</div>`
      : ''

  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif;color:#e2e8f0">
      <strong style="font-size:13px;color:#f8fafc">${escapeHtml(title)}</strong>
      ${primaryRow}
      ${metricsHtml}
      ${footerHtml}
    </div>
  `
}

/** Minimal title-only popup (hex grid outline mode). */
export function buildCellIdOnlyPopupHtml(title) {
  return `<strong style="font-size:13px;font-family:system-ui,sans-serif">${escapeHtml(title)}</strong>`
}
