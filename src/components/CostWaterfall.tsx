import { useState, useMemo, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import ExportButton from './ExportButton.tsx'

interface CostBreakdown {
  die_cost: number
  package_cost: number
  test_cost: number
  nre_per_unit: number
  total: number
  production_volume?: number
  nre_total?: number
}

interface Props {
  breakdown: CostBreakdown
  budgetUsd?: number
}

const SEGMENTS = [
  { key: 'die_cost', label: 'Die', color: '#3b82f6' },
  { key: 'package_cost', label: 'Package', color: '#8b5cf6' },
  { key: 'test_cost', label: 'Test', color: '#06b6d4' },
  { key: 'nre_per_unit', label: 'NRE/unit', color: '#f59e0b' },
] as const

export default function CostWaterfall({ breakdown, budgetUsd }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const defaultVolume = breakdown.production_volume ?? 100000
  const nreTotal = breakdown.nre_total ?? breakdown.nre_per_unit * defaultVolume
  const [volume, setVolume] = useState(defaultVolume)

  const adjustedNrePerUnit = nreTotal / volume

  const data = useMemo(() => {
    const result = SEGMENTS.reduce<{
      segments: { name: string; value: number; base: number; color: string }[]
      cumulative: number
    }>(
      (acc, seg) => {
        const value = seg.key === 'nre_per_unit' ? adjustedNrePerUnit : breakdown[seg.key]
        acc.segments.push({
          name: seg.label,
          value: Number(value.toFixed(2)),
          base: Number(acc.cumulative.toFixed(2)),
          color: seg.color,
        })
        return { segments: acc.segments, cumulative: acc.cumulative + value }
      },
      { segments: [], cumulative: 0 },
    )

    result.segments.push({
      name: 'Total',
      value: Number(result.cumulative.toFixed(2)),
      base: 0,
      color: '#10b981',
    })

    return result.segments
  }, [breakdown, adjustedNrePerUnit])

  const maxCost = Math.max(data[data.length - 1].value, budgetUsd ?? 0) * 1.15

  // Find the largest cost segment (excluding total)
  const largestSegment = data
    .slice(0, -1)
    .reduce((max, seg) => (seg.value > max.value ? seg : max), data[0])

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButton targetRef={chartRef} filename="cost-waterfall" />
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis
              domain={[0, maxCost]}
              label={{ value: 'USD', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'base') return [null, null]
                const v = Number(value)
                const total = data[data.length - 1].value
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0'
                return [`$${v.toFixed(2)} (${pct}%)`, 'Cost']
              }}
            />
            {budgetUsd != null && (
              <ReferenceLine
                y={budgetUsd}
                stroke="#ef4444"
                strokeDasharray="6 4"
                label={{ value: `Budget $${budgetUsd}`, fill: '#ef4444', fontSize: 12 }}
              />
            )}
            {/* Invisible base bar for waterfall effect */}
            <Bar dataKey="base" stackId="stack" fill="transparent" />
            <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  stroke={entry.name === largestSegment.name ? '#000' : undefined}
                  strokeWidth={entry.name === largestSegment.name ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Volume slider */}
        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <label className="font-medium text-gray-700">Production Volume</label>
            <span className="text-gray-500">
              {volume.toLocaleString()} units &middot; NRE/unit: $
              {adjustedNrePerUnit.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={1000000}
            step={1000}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1K</span>
            <span>500K</span>
            <span>1M</span>
          </div>
        </div>

        {/* Cost summary */}
        <div className="mt-3 text-sm text-gray-500">
          Largest cost driver:{' '}
          <span className="font-medium" style={{ color: largestSegment.color }}>
            {largestSegment.name} (${largestSegment.value.toFixed(2)})
          </span>
        </div>
      </div>
    </div>
  )
}
