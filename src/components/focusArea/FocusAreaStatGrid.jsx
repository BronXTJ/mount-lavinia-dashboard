import KPICard from '../KPICard.jsx'

/** 2×2 stat grid used in centrality side panels. */
export default function FocusAreaStatGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <KPICard key={item.label} {...item} />
      ))}
    </div>
  )
}
