interface Props {
  label: string
  value: number | null | undefined
  unit: string
  budget: number | null | undefined
  verdict?: string
}

export default function MetricCard({ label, value, unit, budget, verdict }: Props) {
  const pct =
    value != null && budget != null && budget > 0
      ? Math.min((value / budget) * 100, 100)
      : null

  const isPass = verdict?.toUpperCase() === 'PASS'
  const isFail = verdict?.toUpperCase() === 'FAIL'

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-gray-400">{unit}</span>
        {verdict && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
              isPass
                ? 'bg-green-100 text-green-800'
                : isFail
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {verdict}
          </span>
        )}
      </div>
      {pct != null && budget != null && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>
              {budget} {unit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${isPass ? 'bg-green-500' : isFail ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
