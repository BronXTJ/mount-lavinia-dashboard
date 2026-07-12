/** Shared card shell for Tab 2 side panels. */
export default function FocusAreaPanelCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-surface-700 bg-surface-800 p-4 shadow-card ${className}`}
    >
      {children}
    </div>
  )
}
