import { EXPORT_MAPS_ACCENT } from '../../constants/exportMaps.js'

export default function ExportMapDownloadLink({ href, download, children, primary }) {
  return (
    <a
      href={href}
      download={download}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        primary
          ? 'text-surface-950 hover:brightness-110'
          : 'border border-surface-600 bg-surface-900 text-surface-100 hover:border-surface-400'
      }`}
      style={primary ? { background: EXPORT_MAPS_ACCENT } : undefined}
    >
      {children}
    </a>
  )
}
