import { useState, useMemo } from 'react'
// @ts-expect-error — plotly.js/dist/plotly.js has no type declarations
import _Plotly from 'plotly.js/dist/plotly.js'
import _createPlotlyComponent from 'react-plotly.js/factory.js'
import type { Data, Layout } from 'plotly.js'
import type { ParetoResponse } from '../api/types.ts'

// Handle CJS default export interop — Vite may or may not unwrap .default
const Plotly = (_Plotly as Record<string, unknown>)?.default ?? _Plotly
const factory =
  (_createPlotlyComponent as unknown as Record<string, unknown>)?.default ??
  _createPlotlyComponent
const Plot = (factory as typeof _createPlotlyComponent)(Plotly as object)

type Projection = '3D' | 'power-latency' | 'power-cost' | 'latency-cost'

interface Props {
  data: ParetoResponse
  constraints?: Record<string, number>
  onPointClick?: (index: number) => void
}

const PROJECTIONS: { value: Projection; label: string }[] = [
  { value: '3D', label: '3D' },
  { value: 'power-latency', label: 'Power vs Latency' },
  { value: 'power-cost', label: 'Power vs Cost' },
  { value: 'latency-cost', label: 'Latency vs Cost' },
]

const AXIS_LABELS: Record<string, string> = {
  power: 'Power (W)',
  latency: 'Latency (ms)',
  cost: 'Cost (USD)',
}

const CONSTRAINT_MAP: Record<string, string> = {
  power: 'power_watts',
  latency: 'latency_ms',
  cost: 'cost_usd',
}

export default function ParetoScatter({ data, constraints, onPointClick }: Props) {
  const [projection, setProjection] = useState<Projection>('3D')

  const { dominated, nonDominated, kneePoint } = useMemo(() => {
    const dom = data.points.filter((p) => p.dominated)
    const nonDom = data.points.filter((p) => !p.dominated)
    const knee = data.knee_point_index != null ? data.points[data.knee_point_index] : null
    return { dominated: dom, nonDominated: nonDom, kneePoint: knee }
  }, [data])

  const is3D = projection === '3D'
  const axes = is3D
    ? { x: 'power', y: 'latency', z: 'cost' }
    : projection === 'power-latency'
      ? { x: 'power', y: 'latency' }
      : projection === 'power-cost'
        ? { x: 'power', y: 'cost' }
        : { x: 'latency', y: 'cost' }

  function pv(point: (typeof data.points)[0], axis: string): number {
    return point[axis as keyof typeof point] as number
  }

  function hoverText(point: (typeof data.points)[0]) {
    return [
      `<b>${point.hardware}</b>`,
      `Power: ${point.power.toFixed(2)} W`,
      `Latency: ${point.latency.toFixed(1)} ms`,
      `Cost: $${point.cost.toFixed(2)}`,
    ].join('<br>')
  }

  const traces: Data[] = []

  // Non-dominated points
  if (nonDominated.length > 0) {
    traces.push({
      name: 'Pareto front',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      x: nonDominated.map((p) => pv(p, axes.x)),
      y: nonDominated.map((p) => pv(p, axes.y)),
      ...(is3D && 'z' in axes ? { z: nonDominated.map((p) => pv(p, axes.z!)) } : {}),
      text: nonDominated.map(hoverText),
      hoverinfo: 'text',
      marker: {
        size: is3D ? 8 : 10,
        color: nonDominated.map((_, i) => i),
        colorscale: 'Viridis',
        showscale: false,
        opacity: 0.9,
      },
    } as Data)
  }

  // Dominated points
  if (dominated.length > 0) {
    traces.push({
      name: 'Dominated',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      x: dominated.map((p) => pv(p, axes.x)),
      y: dominated.map((p) => pv(p, axes.y)),
      ...(is3D && 'z' in axes ? { z: dominated.map((p) => pv(p, axes.z!)) } : {}),
      text: dominated.map(hoverText),
      hoverinfo: 'text',
      marker: { size: is3D ? 4 : 5, color: '#9ca3af', opacity: 0.4 },
    } as Data)
  }

  // Knee point
  if (kneePoint) {
    traces.push({
      name: 'Knee point',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      x: [pv(kneePoint, axes.x)],
      y: [pv(kneePoint, axes.y)],
      ...(is3D && 'z' in axes ? { z: [pv(kneePoint, axes.z!)] } : {}),
      text: [hoverText(kneePoint)],
      hoverinfo: 'text',
      marker: {
        size: is3D ? 12 : 16,
        color: '#f59e0b',
        symbol: is3D ? 'circle' : 'diamond',
        line: { width: 2, color: '#000' },
      },
    } as Data)
  }

  // Constraint budget lines (2D only — surfaces in 3D cause compatibility issues)
  if (constraints && !is3D) {
    const allPoints = data.points
    for (const axisKey of [axes.x, axes.y]) {
      const cKey = CONSTRAINT_MAP[axisKey]
      const cVal = cKey ? constraints[cKey] : undefined
      if (cVal == null) continue

      const isX = axisKey === axes.x
      const rangeAxis = isX ? axes.y : axes.x
      const rangeMin = Math.min(...allPoints.map((p) => pv(p, rangeAxis))) * 0.8
      const rangeMax = Math.max(...allPoints.map((p) => pv(p, rangeAxis))) * 1.2

      traces.push({
        name: `${axisKey} budget (${cVal})`,
        type: 'scatter',
        mode: 'lines',
        x: isX ? [cVal, cVal] : [rangeMin, rangeMax],
        y: isX ? [rangeMin, rangeMax] : [cVal, cVal],
        line: { color: '#ef4444', width: 2, dash: 'dash' },
        hoverinfo: 'name',
      } as Data)
    }
  }

  const layout: Partial<Layout> = {
    autosize: true,
    height: 500,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    legend: { x: 0, y: 1 },
    hovermode: 'closest',
  }

  if (is3D) {
    Object.assign(layout, {
      scene: {
        xaxis: { title: AXIS_LABELS[axes.x] },
        yaxis: { title: AXIS_LABELS[axes.y] },
        zaxis: { title: AXIS_LABELS[(axes as { z: string }).z] },
      },
    })
  } else {
    layout.xaxis = { title: { text: AXIS_LABELS[axes.x] } }
    layout.yaxis = { title: { text: AXIS_LABELS[axes.y] } }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {PROJECTIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => setProjection(p.value)}
            className={`rounded px-3 py-1 text-sm ${
              projection === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Plot
        data={traces}
        layout={layout}
        useResizeHandler
        style={{ width: '100%' }}
        config={{ responsive: true }}
        onClick={(event: { points: { pointIndex: number }[] }) => {
          const idx = event.points[0]?.pointIndex
          if (idx != null) onPointClick?.(idx)
        }}
      />
    </div>
  )
}
