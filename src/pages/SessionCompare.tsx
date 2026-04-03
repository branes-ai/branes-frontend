import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession, useSlackness } from '../hooks/useSession.ts'
import SessionPicker from '../components/SessionPicker.tsx'
import MetricDiff from '../components/MetricDiff.tsx'
import SwapRadar from '../components/SwapRadar.tsx'
import type { SlacknessEntry } from '../api/types.ts'

const METRIC_DEFS = [
  { key: 'power_watts', label: 'Power', unit: 'W' },
  { key: 'latency_ms', label: 'Latency', unit: 'ms' },
  { key: 'cost_usd', label: 'Cost', unit: 'USD' },
  { key: 'area_mm2', label: 'Area', unit: 'mm²' },
] as const

export default function SessionCompare() {
  const [idA, setIdA] = useState<string | null>(null)
  const [idB, setIdB] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-6xl p-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/" className="text-blue-600 hover:underline">
          Sessions
        </Link>
        <span className="mx-2">/</span>
        <span>Compare</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold">Compare Sessions</h1>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <SessionPicker label="Session A" value={idA} onChange={setIdA} exclude={idB} />
        <SessionPicker label="Session B" value={idB} onChange={setIdB} exclude={idA} />
      </div>

      {idA && idB ? (
        <ComparisonView idA={idA} idB={idB} />
      ) : (
        <p className="text-center text-gray-400">Select two sessions above to compare.</p>
      )}
    </div>
  )
}

function ComparisonView({ idA, idB }: { idA: string; idB: string }) {
  const { data: sessionA, isLoading: loadingA } = useSession(idA)
  const { data: sessionB, isLoading: loadingB } = useSession(idB)
  const { data: slacknessA } = useSlackness(idA)
  const { data: slacknessB } = useSlackness(idB)

  if (loadingA || loadingB) {
    return <p className="text-gray-500">Loading sessions...</p>
  }
  if (!sessionA || !sessionB) {
    return <p className="text-red-600">Failed to load one or both sessions.</p>
  }

  const ppaA = (sessionA.ppa_metrics ?? {}) as Record<string, number>
  const ppaB = (sessionB.ppa_metrics ?? {}) as Record<string, number>
  const constraintsA = (sessionA.constraints ?? {}) as Record<string, number>

  const diffMetrics = METRIC_DEFS.map((m) => ({
    label: m.label,
    unit: m.unit,
    valueA: ppaA[m.key],
    valueB: ppaB[m.key],
    budget: constraintsA[m.key],
  }))

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded border p-3">
          <p className="font-medium">{sessionA.goal}</p>
          <p className="text-gray-500">
            {sessionA.status} · iter {sessionA.iteration}
          </p>
        </div>
        <div className="rounded border p-3">
          <p className="font-medium">{sessionB.goal}</p>
          <p className="text-gray-500">
            {sessionB.status} · iter {sessionB.iteration}
          </p>
        </div>
      </div>

      {/* Metric diff table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Metric Comparison</h2>
        <MetricDiff metrics={diffMetrics} labelA={idA} labelB={idB} />
      </div>

      {/* Overlay radar */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">SWaP-C Overlay</h2>
        <OverlayRadar
          metricsA={ppaA}
          metricsB={ppaB}
          constraints={constraintsA}
          labelA={idA}
          labelB={idB}
        />
      </div>

      {/* Slackness diff */}
      {slacknessA && slacknessB && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Constraint Slackness Diff</h2>
          <SlacknessDiff
            slacknessA={slacknessA}
            slacknessB={slacknessB}
            labelA={idA}
            labelB={idB}
          />
        </div>
      )}
    </div>
  )
}

function OverlayRadar({
  metricsA,
  metricsB,
  constraints,
  labelA,
  labelB,
}: {
  metricsA: Record<string, number>
  metricsB: Record<string, number>
  constraints: Record<string, number>
  labelA: string
  labelB: string
}) {
  // Reuse SwapRadar for session A, and render a note about overlay
  // For a proper overlay we'd need to extend SwapRadar, but for now
  // show them side by side
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-center text-sm font-medium text-gray-500">{labelA}</p>
        <SwapRadar metrics={metricsA} constraints={constraints} />
      </div>
      <div>
        <p className="mb-2 text-center text-sm font-medium text-gray-500">{labelB}</p>
        <SwapRadar metrics={metricsB} constraints={constraints} />
      </div>
    </div>
  )
}

function SlacknessDiff({
  slacknessA,
  slacknessB,
  labelA,
  labelB,
}: {
  slacknessA: SlacknessEntry[]
  slacknessB: SlacknessEntry[]
  labelA: string
  labelB: string
}) {
  const bMap = new Map(slacknessB.map((s) => [s.name, s]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Constraint</th>
            <th className="px-3 py-2 text-right">{labelA} margin</th>
            <th className="px-3 py-2 text-right">{labelB} margin</th>
            <th className="px-3 py-2 text-right">Change</th>
            <th className="px-3 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {slacknessA.map((a) => {
            const b = bMap.get(a.name)
            const marginA = a.margin_pct
            const marginB = b?.margin_pct ?? 0
            const diff = marginB - marginA
            const improved = diff > 0
            const regressed = diff < 0

            return (
              <tr key={a.name} className="border-b">
                <td className="px-3 py-2 font-medium capitalize">{a.name}</td>
                <td className="px-3 py-2 text-right">{marginA.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{marginB.toFixed(1)}%</td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    improved
                      ? 'text-green-600'
                      : regressed
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}
                >
                  {diff > 0 ? '+' : ''}
                  {diff.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  {improved ? '↑ Better' : regressed ? '↓ Worse' : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
