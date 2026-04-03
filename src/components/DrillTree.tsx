import { useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { WorkloadResponse } from '../api/types.ts'
import ExportButton from './ExportButton.tsx'

interface Props {
  data: WorkloadResponse
  onNodeClick?: (operatorName: string) => void
}

type Metric = 'gflops' | 'memory_mb'

const METRIC_OPTIONS: { value: Metric; label: string; unit: string }[] = [
  { value: 'gflops', label: 'Compute', unit: 'GFLOPS' },
  { value: 'memory_mb', label: 'Memory', unit: 'MB' },
]

export default function DrillTree({ data, onNodeClick }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [metric, setMetric] = useState<Metric>('gflops')

  const currentMetric = METRIC_OPTIONS.find((m) => m.value === metric)!

  const treemapData = data.operators.map((op) => ({
    name: op.name,
    value: op[metric] ?? 0,
    itemStyle: {
      borderColor: '#fff',
      borderWidth: 2,
    },
  }))

  const total = metric === 'gflops' ? data.total_gflops : data.total_memory_mb

  const option: EChartsOption = {
    tooltip: {
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }
        const op = data.operators.find((o) => o.name === p.name)
        if (!op) return ''
        const pct = total ? ((p.value / total) * 100).toFixed(1) : '—'
        return [
          `<b>${op.name}</b>`,
          `${currentMetric.label}: ${p.value.toFixed(1)} ${currentMetric.unit} (${pct}%)`,
          `Class: ${op.model_class}`,
          op.scheduling ? `Scheduling: ${op.scheduling}` : '',
        ]
          .filter(Boolean)
          .join('<br/>')
      },
    },
    series: [
      {
        type: 'treemap',
        data: treemapData,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number }
            const pct = total ? ((p.value / total) * 100).toFixed(0) : '—'
            return `${p.name}\n${p.value.toFixed(1)} ${currentMetric.unit}\n(${pct}%)`
          },
          fontSize: 12,
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 3,
              gapWidth: 3,
            },
            colorSaturation: [0.3, 0.7],
          },
        ],
      },
    ],
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <div className="flex gap-2">
          {METRIC_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={`rounded px-3 py-1 text-sm ${
                metric === m.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {total != null && (
          <span className="text-sm text-gray-500">
            Total: {total.toFixed(1)} {currentMetric.unit}
          </span>
        )}
        <ExportButton targetRef={chartRef} filename="workload-breakdown" />
      </div>
      <div ref={chartRef}>
        <ReactECharts
          option={option}
          style={{ height: 400 }}
          onEvents={{
            click: (params: { name?: string }) => {
              if (params.name) onNodeClick?.(params.name)
            },
          }}
        />

        {/* Operator detail table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2 text-right">GFLOPS</th>
                <th className="px-3 py-2 text-right">Memory (MB)</th>
                <th className="px-3 py-2">Scheduling</th>
              </tr>
            </thead>
            <tbody>
              {data.operators.map((op) => (
                <tr key={op.name} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{op.name}</td>
                  <td className="px-3 py-2 text-gray-500">{op.model_class}</td>
                  <td className="px-3 py-2 text-right">{op.gflops?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {op.memory_mb?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{op.scheduling}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
