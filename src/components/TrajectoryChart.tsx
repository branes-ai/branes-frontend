import { useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { TrajectoryEntry } from '../api/types.ts'
import ExportButton from './ExportButton.tsx'

interface Props {
  data: TrajectoryEntry[]
  constraints?: Record<string, number>
}

const METRICS = [
  { key: 'power', label: 'Power (W)', color: '#3b82f6', yAxisId: 'left' },
  { key: 'latency', label: 'Latency (ms)', color: '#8b5cf6', yAxisId: 'left' },
  { key: 'cost', label: 'Cost (USD)', color: '#f59e0b', yAxisId: 'right' },
] as const

const CONSTRAINT_MAP: Record<string, string> = {
  power: 'power_watts',
  latency: 'latency_ms',
  cost: 'cost_usd',
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string; payload?: TrajectoryEntry }[]
  label?: number
}) {
  if (!active || !payload?.length) return null

  const entry = payload[0]?.payload as TrajectoryEntry | undefined
  const verdicts = entry?.verdicts ?? {}
  const passCount = Object.values(verdicts).filter((v) => v === 'PASS').length
  const totalCount = Object.values(verdicts).length

  return (
    <div className="rounded border bg-white p-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold">Iteration {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(1)}
        </p>
      ))}
      {entry?.strategy_applied && (
        <p className="mt-1 text-gray-500">
          Strategy: <span className="font-medium">{entry.strategy_applied}</span>
        </p>
      )}
      <p className="mt-1 text-gray-500">
        Verdicts: {passCount}/{totalCount} passing
      </p>
    </div>
  )
}

export default function TrajectoryChart({ data, constraints }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  // Build chart data with flattened ppa values
  const chartData = data.map((entry) => ({
    ...entry,
    power: entry.ppa.power ?? entry.ppa.power_watts,
    latency: entry.ppa.latency ?? entry.ppa.latency_ms,
    cost: entry.ppa.cost ?? entry.ppa.cost_usd,
  }))

  // Iterations where strategies were applied
  const strategyIterations = data.filter((d) => d.strategy_applied != null)

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButton targetRef={chartRef} filename="trajectory" />
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="iteration"
              label={{ value: 'Iteration', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              yAxisId="left"
              label={{
                value: 'Power (W) / Latency (ms)',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Cost (USD)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Constraint budget reference lines */}
            {METRICS.map((m) => {
              const cKey = CONSTRAINT_MAP[m.key]
              const cVal = cKey && constraints ? constraints[cKey] : undefined
              if (cVal == null) return null
              return (
                <ReferenceLine
                  key={`budget-${m.key}`}
                  yAxisId={m.yAxisId}
                  y={cVal}
                  stroke={m.color}
                  strokeDasharray="6 4"
                  strokeOpacity={0.5}
                  label={{ value: `${m.key} budget`, fill: m.color, fontSize: 11 }}
                />
              )
            })}

            {/* Strategy application markers */}
            {strategyIterations.map((s) => (
              <ReferenceLine
                key={`strategy-${s.iteration}`}
                x={s.iteration}
                stroke="#9ca3af"
                strokeDasharray="4 4"
                label={{
                  value: s.strategy_applied ?? '',
                  position: 'top',
                  fill: '#6b7280',
                  fontSize: 10,
                }}
              />
            ))}

            {/* Metric lines */}
            {METRICS.map((m) => (
              <Line
                key={m.key}
                yAxisId={m.yAxisId}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Verdict summary row */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-gray-500">Iteration</th>
                {data.map((d) => (
                  <th key={d.iteration} className="px-2 py-1">
                    {d.iteration}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['power', 'latency', 'cost'].map((metric) => (
                <tr key={metric}>
                  <td className="px-2 py-1 text-left capitalize text-gray-500">
                    {metric}
                  </td>
                  {data.map((d) => {
                    const v = d.verdicts[metric]
                    return (
                      <td key={d.iteration} className="px-2 py-1">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${
                            v === 'PASS' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={v}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
