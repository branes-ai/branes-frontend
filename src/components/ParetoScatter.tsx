import { useState, useMemo } from 'react'
import Plot from 'react-plotly.js'
import type { Data, Layout, ScatterData } from 'plotly.js'
import type { ParetoResponse } from '../api/types.ts'

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

export default function ParetoScatter({ data, constraints, onPointClick }: Props) {
  const [projection, setProjection] = useState<Projection>('3D')

  const { dominated, nonDominated, kneePoint } = useMemo(() => {
    const dom = data.points.filter((p) => p.dominated)
    const nonDom = data.points.filter((p) => !p.dominated)
    const knee = data.knee_point_index != null ? data.points[data.knee_point_index] : null
    return { dominated: dom, nonDominated: nonDom, kneePoint: knee }
  }, [data])

  const is3D = projection === '3D'

  function getAxes(proj: Projection) {
    switch (proj) {
      case 'power-latency':
        return { x: 'power', y: 'latency' }
      case 'power-cost':
        return { x: 'power', y: 'cost' }
      case 'latency-cost':
        return { x: 'latency', y: 'cost' }
      default:
        return { x: 'power', y: 'latency', z: 'cost' }
    }
  }

  function val(point: (typeof data.points)[0], axis: string): number {
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

  const axes = getAxes(projection)
  const traces: Data[] = []

  // Non-dominated points
  if (nonDominated.length > 0) {
    const trace: Data = {
      name: 'Pareto front',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      x: nonDominated.map((p) => val(p, axes.x)),
      y: nonDominated.map((p) => val(p, axes.y)),
      text: nonDominated.map(hoverText),
      hoverinfo: 'text',
      marker: {
        size: 10,
        color: nonDominated.map((_, i) => i),
        colorscale: 'Viridis',
        opacity: 0.9,
      },
    }
    if (is3D && 'z' in axes) {
      ;(trace as Data & { z: number[] }).z = nonDominated.map((p) => val(p, axes.z!))
    }
    traces.push(trace)
  }

  // Dominated points
  if (dominated.length > 0) {
    const trace: Data = {
      name: 'Dominated',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'markers',
      x: dominated.map((p) => val(p, axes.x)),
      y: dominated.map((p) => val(p, axes.y)),
      text: dominated.map(hoverText),
      hoverinfo: 'text',
      marker: { size: 5, color: '#9ca3af', opacity: 0.4 },
    }
    if (is3D && 'z' in axes) {
      ;(trace as Data & { z: number[] }).z = dominated.map((p) => val(p, axes.z!))
    }
    traces.push(trace)
  }

  // Knee point
  if (kneePoint) {
    const trace: Data = {
      name: 'Knee point',
      type: is3D ? 'scatter3d' : 'scatter',
      mode: 'text+markers' as ScatterData['mode'],
      x: [val(kneePoint, axes.x)],
      y: [val(kneePoint, axes.y)],
      text: ['Knee'],
      textposition: 'top center',
      hovertext: [hoverText(kneePoint)],
      hoverinfo: 'text',
      marker: {
        size: 16,
        color: '#f59e0b',
        symbol: is3D ? 'diamond' : 'diamond',
        line: { width: 2, color: '#000' },
      },
    }
    if (is3D && 'z' in axes) {
      ;(trace as Data & { z: number[] }).z = [val(kneePoint, axes.z!)]
    }
    traces.push(trace)
  }

  // Constraint boundary planes (3D) or lines (2D)
  if (constraints) {
    const axisKeys = is3D ? [axes.x, axes.y, (axes as { z: string }).z] : [axes.x, axes.y]
    const allPoints = data.points

    for (const axisKey of axisKeys) {
      // Map axis name to constraint key
      const cMap: Record<string, string> = {
        power: 'power_watts',
        latency: 'latency_ms',
        cost: 'cost_usd',
      }
      const cKey = cMap[axisKey]
      const cVal = cKey ? constraints[cKey] : undefined
      if (cVal == null) continue

      if (is3D) {
        // Add a surface plane at the constraint value
        const others = axisKeys.filter((a) => a !== axisKey)
        const range0 = allPoints.map((p) => val(p, others[0]))
        const range1 = allPoints.map((p) => val(p, others[1]))
        const min0 = Math.min(...range0) * 0.8
        const max0 = Math.max(...range0) * 1.2
        const min1 = Math.min(...range1) * 0.8
        const max1 = Math.max(...range1) * 1.2

        const surfaceData: Record<string, unknown> = {
          name: `${axisKey} budget`,
          type: 'surface',
          showscale: false,
          opacity: 0.15,
          colorscale: [
            [0, '#ef4444'],
            [1, '#ef4444'],
          ],
          hoverinfo: 'name',
        }

        // Build 2x2 grid for the plane
        if (axisKey === axes.x) {
          surfaceData.x = [
            [cVal, cVal],
            [cVal, cVal],
          ]
          surfaceData.y = [
            [min0, max0],
            [min0, max0],
          ]
          surfaceData.z = [
            [min1, min1],
            [max1, max1],
          ]
        } else if (axisKey === axes.y) {
          surfaceData.x = [
            [min0, max0],
            [min0, max0],
          ]
          surfaceData.y = [
            [cVal, cVal],
            [cVal, cVal],
          ]
          surfaceData.z = [
            [min1, min1],
            [max1, max1],
          ]
        } else {
          surfaceData.x = [
            [min0, max0],
            [min0, max0],
          ]
          surfaceData.y = [
            [min1, min1],
            [max1, max1],
          ]
          surfaceData.z = [
            [cVal, cVal],
            [cVal, cVal],
          ]
        }

        traces.push(surfaceData as Data)
      } else {
        // 2D: vertical or horizontal line
        const isX = axisKey === axes.x
        const lineTrace: Data = {
          name: `${axisKey} budget`,
          type: 'scatter',
          mode: 'lines',
          x: isX
            ? [cVal, cVal]
            : [
                Math.min(...allPoints.map((p) => val(p, axes.x))) * 0.8,
                Math.max(...allPoints.map((p) => val(p, axes.x))) * 1.2,
              ],
          y: isX
            ? [
                Math.min(...allPoints.map((p) => val(p, axes.y))) * 0.8,
                Math.max(...allPoints.map((p) => val(p, axes.y))) * 1.2,
              ]
            : [cVal, cVal],
          line: { color: '#ef4444', width: 2, dash: 'dash' },
          hoverinfo: 'name',
        }
        traces.push(lineTrace)
      }
    }
  }

  const axisLabels: Record<string, string> = {
    power: 'Power (W)',
    latency: 'Latency (ms)',
    cost: 'Cost (USD)',
  }

  const layout: Partial<Layout> = {
    autosize: true,
    height: 500,
    margin: { l: 50, r: 30, t: 30, b: 50 },
    legend: { x: 0, y: 1 },
    hovermode: 'closest',
  }

  if (is3D) {
    ;(layout as Layout & { scene: unknown }).scene = {
      xaxis: { title: { text: axisLabels[axes.x] } },
      yaxis: { title: { text: axisLabels[axes.y] } },
      zaxis: { title: { text: axisLabels[(axes as { z: string }).z] } },
    }
  } else {
    layout.xaxis = { title: { text: axisLabels[axes.x] } }
    layout.yaxis = { title: { text: axisLabels[axes.y] } }
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
        onClick={(event) => {
          const pointIndex = event.points[0]?.pointIndex
          if (pointIndex != null) onPointClick?.(pointIndex)
        }}
      />
    </div>
  )
}
