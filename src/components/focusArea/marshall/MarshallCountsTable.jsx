import { marshallTableRows } from '../../../utils/marshallMorphologyFormat.js'

export default function MarshallCountsTable({ metrics }) {
  const rows = marshallTableRows(metrics)
  if (!rows) {
    return <p className="text-xs text-surface-400">Marshall counts are not available.</p>
  }

  return (
    <table className="w-full border-collapse text-left text-xs" data-testid="marshall-counts-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-surface-700/80">
            <th scope="row" className="py-1.5 pr-3 font-medium text-surface-300">
              {row.label}
            </th>
            <td className="py-1.5 text-right font-display text-sm tabular-nums text-surface-50">
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
