import { useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import ExportButton from './ExportButton.tsx'

interface Props {
  metrics: Record<string, number>
  constraints: Record<string, number>
}

const AXES = [
  { key: 'power_watts', label: 'Power' },
  { key: 'latency_ms', label: 'Latency' },
  { key: 'area_mm2', label: 'Area' },
  { key: 'cost_usd', label: 'Cost' },
] as const

export default function SwapRadar({ metrics, constraints }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [showPercent, setShowPercent] = useState(true)

  const indicators = AXES.map((a) => {
    const budget = constraints[a.key]
    return {
      name: a.label,
      max: showPercent ? 120 : (budget ?? 100) * 1.5,
    }
  })

  const budgetValues = AXES.map((a) => {
    const budget = constraints[a.key]
    if (!budget) return 0
    return showPercent ? 100 : budget
  })

  const actualValues = AXES.map((a) => {
    const actual = metrics[a.key]
    const budget = constraints[a.key]
    if (actual == null) return 0
    return showPercent && budget ? (actual / budget) * 100 : actual
  })

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: () => {
        const lines = AXES.map((a) => {
          const actual = metrics[a.key]
          const budget = constraints[a.key]
          const pct =
            actual != null && budget ? ((actual / budget) * 100).toFixed(0) : '—'
          return `${a.label}: ${actual?.toFixed(1) ?? '—'} / ${budget?.toFixed(1) ?? '—'} (${pct}%)`
        })
        return lines.join('<br/>')
      },
    },
    legend: {
      data: ['Budget envelope', 'Current design'],
      bottom: 0,
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            name: 'Budget envelope',
            value: budgetValues,
            symbol: 'none',
            lineStyle: { color: '#9ca3af', type: 'dashed', width: 2 },
            areaStyle: { color: 'rgba(156, 163, 175, 0.1)' },
          },
          {
            name: 'Current design',
            value: actualValues,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#3b82f6', width: 2 },
            areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowPercent(true)}
            className={`rounded px-3 py-1 text-sm ${
              showPercent
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            % of Budget
          </button>
          <button
            onClick={() => setShowPercent(false)}
            className={`rounded px-3 py-1 text-sm ${
              !showPercent
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Absolute
          </button>
        </div>
        <ExportButton targetRef={chartRef} filename="swap-radar" />
      </div>
      <div ref={chartRef}>
        <ReactECharts option={option} style={{ height: 450 }} />
      </div>
    </div>
  )
}
