import { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import type { SlacknessEntry } from '../api/types.ts'
import ExportButton from './ExportButton.tsx'

interface Props {
  data: SlacknessEntry[]
  onBarClick?: (name: string) => void
}

function barColor(marginPct: number): string {
  if (marginPct < 5) return 'bg-red-500'
  if (marginPct < 20) return 'bg-yellow-500'
  return 'bg-green-500'
}

function trendIndicator(trend: string) {
  switch (trend.toLowerCase()) {
    case 'improving':
      return <span className="text-green-600">&#9650;</span>
    case 'worsening':
      return <span className="text-red-600">&#9660;</span>
    default:
      return <span className="text-gray-400">&#8212;</span>
  }
}

export default function SlacknessBars({ data, onBarClick }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  // Find max target to normalize bar widths
  const maxTarget = Math.max(...data.map((d) => d.target), 1)

  const exportPng = useCallback(async () => {
    if (!chartRef.current) return 'data:,'
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#fff' })
    return canvas.toDataURL('image/png')
  }, [])

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButton onExportPng={exportPng} filename="slackness-bars" />
      </div>
      <div ref={chartRef} className="space-y-4">
        {data.map((entry) => {
          const actualPct = Math.min((entry.actual / maxTarget) * 100, 100)
          const targetPct = (entry.target / maxTarget) * 100

          return (
            <button
              key={entry.name}
              onClick={() => onBarClick?.(entry.name)}
              className="block w-full text-left"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium capitalize">
                  {entry.name}
                  {entry.binding && (
                    <span className="ml-1 text-red-600" title="Binding constraint">
                      !
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-gray-500">
                  <span>
                    {entry.actual.toFixed(1)} / {entry.target.toFixed(1)} {entry.unit}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.verdict === 'PASS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {entry.margin_pct >= 0 ? '+' : ''}
                    {entry.margin_pct.toFixed(1)}%
                  </span>
                  {trendIndicator(entry.trend)}
                </span>
              </div>
              <div className="relative h-4 w-full rounded-full bg-gray-100">
                {/* Actual value bar */}
                <div
                  className={`h-4 rounded-full ${barColor(entry.margin_pct)} transition-all`}
                  style={{ width: `${actualPct}%` }}
                />
                {/* Target marker */}
                <div
                  className="absolute top-0 h-4 w-0.5 bg-gray-800"
                  style={{ left: `${targetPct}%` }}
                  title={`Target: ${entry.target} ${entry.unit}`}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
