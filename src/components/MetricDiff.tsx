interface MetricRow {
  label: string
  unit: string
  valueA: number | undefined
  valueB: number | undefined
  budget?: number
}

interface Props {
  metrics: MetricRow[]
  labelA: string
  labelB: string
}

function diffColor(a: number | undefined, b: number | undefined): string {
  if (a == null || b == null) return 'text-gray-400'
  // Lower is better for PPA metrics
  if (b < a) return 'text-green-600'
  if (b > a) return 'text-red-600'
  return 'text-gray-500'
}

function formatDiff(a: number | undefined, b: number | undefined): string {
  if (a == null || b == null) return '—'
  const diff = b - a
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}`
}

export default function MetricDiff({ metrics, labelA, labelB }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Metric</th>
            <th className="px-3 py-2 text-right">{labelA}</th>
            <th className="px-3 py-2 text-right">{labelB}</th>
            <th className="px-3 py-2 text-right">Diff</th>
            <th className="px-3 py-2 text-right">Budget</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label} className="border-b">
              <td className="px-3 py-2 font-medium">{m.label}</td>
              <td className="px-3 py-2 text-right">
                {m.valueA?.toFixed(1) ?? '—'} {m.unit}
              </td>
              <td className="px-3 py-2 text-right">
                {m.valueB?.toFixed(1) ?? '—'} {m.unit}
              </td>
              <td
                className={`px-3 py-2 text-right font-medium ${diffColor(m.valueA, m.valueB)}`}
              >
                {formatDiff(m.valueA, m.valueB)} {m.unit}
              </td>
              <td className="px-3 py-2 text-right text-gray-400">
                {m.budget?.toFixed(1) ?? '—'} {m.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
