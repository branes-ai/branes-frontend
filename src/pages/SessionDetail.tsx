import { useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useSession,
  usePareto,
  useSlackness,
  useTaskGraph,
  useTrajectory,
  useWorkload,
} from '../hooks/useSession.ts'
import SessionHeader from '../components/SessionHeader.tsx'
import MetricCard from '../components/MetricCard.tsx'
import ParetoScatter from '../components/ParetoScatter.tsx'
import SlacknessBars from '../components/SlacknessBars.tsx'
import TaskGraph from '../components/TaskGraph.tsx'
import TrajectoryChart from '../components/TrajectoryChart.tsx'
import SwapRadar from '../components/SwapRadar.tsx'
import DrillTree from '../components/DrillTree.tsx'
import DecisionTimeline from '../components/DecisionTimeline.tsx'
import CostWaterfall from '../components/CostWaterfall.tsx'
import PipelineView from '../components/PipelineView.tsx'
import ExportButton from '../components/ExportButton.tsx'
import { domToPng } from 'modern-screenshot'
import type { DecisionEntry } from '../components/DecisionTimeline.tsx'

const TABS = [
  'Overview',
  'Workload',
  'Architecture',
  'Task Graph',
  'Optimization',
  'SWaP-C',
  'Decisions',
] as const
type Tab = (typeof TABS)[number]

const METRIC_DEFS = [
  { key: 'power_watts', label: 'Power', unit: 'W' },
  { key: 'latency_ms', label: 'Latency', unit: 'ms' },
  { key: 'cost_usd', label: 'Cost', unit: 'USD' },
  { key: 'area_mm2', label: 'Area', unit: 'mm²' },
] as const

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSession(id!)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  if (isLoading) return <p className="p-8 text-gray-500">Loading session...</p>
  if (error) return <p className="p-8 text-red-600">Error: {String(error)}</p>
  if (!session) return null

  const ppa = (session.ppa_metrics ?? {}) as Record<string, unknown>
  const verdicts = (ppa.verdicts ?? {}) as Record<string, string>
  const constraints = (session.constraints ?? {}) as Record<string, number>

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/" className="text-blue-600 hover:underline">
          Sessions
        </Link>
        <span className="mx-2">/</span>
        <span>{session.session_id}</span>
      </nav>

      <SessionHeader
        goal={session.goal}
        platform={String(session.platform ?? '')}
        status={session.status}
        iteration={session.iteration}
        maxIterations={Number(session.max_iterations ?? 20)}
      />

      {/* Metric Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRIC_DEFS.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={ppa[m.key] as number | undefined}
            unit={m.unit}
            budget={constraints[m.key]}
            verdict={verdicts[m.key]}
          />
        ))}
      </div>

      {/* Tab Panel */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'Overview' && (
          <OverviewTab sessionId={id!} constraints={constraints} />
        )}
        {activeTab === 'Workload' && <WorkloadTab sessionId={id!} />}
        {activeTab === 'Architecture' && <ArchitectureTab session={session} />}
        {activeTab === 'Task Graph' && <TaskGraphTab sessionId={id!} />}
        {activeTab === 'Optimization' && (
          <OptimizationTab sessionId={id!} constraints={constraints} />
        )}
        {activeTab === 'SWaP-C' && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-semibold">SWaP-C Radar</h2>
              <SwapRadar
                metrics={ppa as Record<string, number>}
                constraints={constraints}
              />
            </div>
            {(ppa.cost_breakdown as Record<string, number> | undefined) && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Cost Breakdown</h2>
                <CostWaterfall
                  breakdown={
                    ppa.cost_breakdown as {
                      die_cost: number
                      package_cost: number
                      test_cost: number
                      nre_per_unit: number
                      total: number
                      production_volume?: number
                      nre_total?: number
                    }
                  }
                  budgetUsd={constraints.cost_usd}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'Decisions' && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Design Decisions</h2>
            {(() => {
              const rationale = (session.design_rationale ?? []) as DecisionEntry[]
              return rationale.length > 0 ? (
                <DecisionTimeline decisions={rationale} />
              ) : (
                <p className="text-gray-400">No design decisions recorded.</p>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

function OverviewTab({
  sessionId,
  constraints,
}: {
  sessionId: string
  constraints: Record<string, number>
}) {
  const { data: pareto, isLoading: paretoLoading } = usePareto(sessionId)
  const { data: slackness, isLoading: slacknessLoading } = useSlackness(sessionId)

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Pareto Frontier</h2>
        {paretoLoading && <p className="text-gray-500">Loading Pareto data...</p>}
        {pareto && pareto.points.length > 0 ? (
          <ParetoScatter data={pareto} constraints={constraints} />
        ) : (
          !paretoLoading && <p className="text-gray-400">No Pareto data available.</p>
        )}
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold">Constraint Slackness</h2>
        {slacknessLoading && <p className="text-gray-500">Loading slackness data...</p>}
        {slackness && slackness.length > 0 ? (
          <SlacknessBars data={slackness} />
        ) : (
          !slacknessLoading && (
            <p className="text-gray-400">No slackness data available.</p>
          )
        )}
      </div>
    </div>
  )
}

function OptimizationTab({
  sessionId,
  constraints,
}: {
  sessionId: string
  constraints: Record<string, number>
}) {
  const { data: trajectory, isLoading, error } = useTrajectory(sessionId)

  if (isLoading) return <p className="text-gray-500">Loading trajectory...</p>
  if (error) return <p className="text-red-600">Error loading trajectory</p>

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Optimization Trajectory</h2>
      {trajectory && trajectory.length > 0 ? (
        <TrajectoryChart data={trajectory} constraints={constraints} />
      ) : (
        <p className="text-gray-400">No optimization history available.</p>
      )}
    </div>
  )
}

function WorkloadTab({ sessionId }: { sessionId: string }) {
  const { data: workload, isLoading, error } = useWorkload(sessionId)

  if (isLoading) return <p className="text-gray-500">Loading workload data...</p>
  if (error) return <p className="text-red-600">Error loading workload data.</p>

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Workload Breakdown</h2>
      {workload && workload.operators.length > 0 ? (
        <DrillTree data={workload} />
      ) : (
        <p className="text-gray-400">No workload data available.</p>
      )}
    </div>
  )
}

function ArchitectureTab({
  session,
}: {
  session: import('../api/types.ts').SoCDesignState
}) {
  const archRef = useRef<HTMLDivElement>(null)

  const exportPng = useCallback(async () => {
    if (!archRef.current) return 'data:,'
    // Temporarily expand all scrollable children to full width for capture
    const el = archRef.current
    const scrollables = el.querySelectorAll<HTMLElement>('.overflow-x-auto')
    const saved: { el: HTMLElement; overflow: string; width: string }[] = []
    scrollables.forEach((s) => {
      saved.push({ el: s, overflow: s.style.overflow, width: s.style.width })
      s.style.overflow = 'visible'
      s.style.width = `${s.scrollWidth}px`
    })
    const result =
      (await domToPng(el, {
        backgroundColor: '#fff',
        scale: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
      })) ?? 'data:,'
    // Restore original styles
    saved.forEach(({ el: s, overflow, width }) => {
      s.style.overflow = overflow
      s.style.width = width
    })
    return result
  }, [])

  const arch = session.selected_architecture as
    | { name: string; components: { name: string; type: string; description: string }[] }
    | undefined
  const ipBlocks = (session.ip_blocks ?? []) as {
    name: string
    mapped_operators: string[]
    power_watts?: number
    area_mm2?: number
  }[]

  const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    accelerator: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800' },
    processor: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800' },
    memory: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800' },
    interconnect: {
      bg: 'bg-purple-50',
      border: 'border-purple-400',
      text: 'text-purple-800',
    },
  }
  const DEFAULT_COLORS = {
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-800',
  }

  const pipeline = session.pipeline

  if (!arch && ipBlocks.length === 0 && !pipeline) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold">System Architecture</h2>
        <p className="text-gray-400">No architecture data available for this session.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{arch?.name ?? 'System Architecture'}</h2>
        <ExportButton onExportPng={exportPng} filename="architecture" />
      </div>

      <div ref={archRef}>
        {/* Sensor → Operator → Actuator pipeline */}
        {pipeline && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-medium text-gray-500">
              Transformational Pipeline
            </h3>
            <PipelineView data={pipeline} />
          </div>
        )}

        {/* Component block diagram */}
        {arch && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-medium text-gray-500">System Components</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {arch.components.map((comp) => {
                const c = TYPE_COLORS[comp.type] ?? DEFAULT_COLORS
                return (
                  <div
                    key={comp.name}
                    className={`rounded-lg border-2 p-3 ${c.bg} ${c.border}`}
                  >
                    <div className={`text-sm font-semibold ${c.text}`}>{comp.name}</div>
                    <div className="mt-0.5 text-xs capitalize text-gray-500">
                      {comp.type}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{comp.description}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400">
              {Object.entries(TYPE_COLORS).map(([type, c]) => (
                <span key={type} className="flex items-center gap-1">
                  <span
                    className={`inline-block h-3 w-3 rounded border ${c.bg} ${c.border}`}
                  />
                  <span className="capitalize">{type}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* IP Block → Operator mapping table */}
        {ipBlocks.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500">
              IP Block — Operator Mapping
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">IP Block</th>
                    <th className="px-4 py-2">Mapped Operators</th>
                    <th className="px-4 py-2 text-right">Power (W)</th>
                    <th className="px-4 py-2 text-right">Area (mm²)</th>
                  </tr>
                </thead>
                <tbody>
                  {ipBlocks.map((block) => (
                    <tr key={block.name} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{block.name}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {block.mapped_operators.length > 0
                          ? block.mapped_operators.join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {block.power_watts?.toFixed(1) ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {block.area_mm2?.toFixed(0) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskGraphTab({ sessionId }: { sessionId: string }) {
  const { data: taskGraph, isLoading, error } = useTaskGraph(sessionId)

  if (isLoading) return <p className="text-gray-500">Loading task graph...</p>
  if (error) return <p className="text-red-600">Error loading task graph.</p>

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Task Graph</h2>
      {taskGraph && taskGraph.nodes.length > 0 ? (
        <TaskGraph data={taskGraph} />
      ) : (
        <p className="text-gray-400">No task graph available.</p>
      )}
    </div>
  )
}
