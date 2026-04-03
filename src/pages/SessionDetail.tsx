import { useState } from 'react'
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
        {activeTab === 'Architecture' && <ArchitectureTab />}
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

function ArchitectureTab() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">System Architecture</h2>
      <div
        className="rounded-lg border bg-white p-6"
        role="img"
        aria-label="Branes platform system architecture block diagram"
      >
        <svg
          viewBox="0 0 800 500"
          className="mx-auto w-full max-w-3xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Human Architect */}
          <rect
            x="300"
            y="10"
            width="200"
            height="50"
            rx="8"
            fill="#dbeafe"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <text
            x="400"
            y="40"
            textAnchor="middle"
            fontSize="14"
            fill="#1e40af"
            fontWeight="600"
          >
            Human Architect
          </text>

          {/* Arrow down */}
          <line
            x1="400"
            y1="60"
            x2="400"
            y2="90"
            stroke="#9ca3af"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          {/* Frontend */}
          <rect
            x="250"
            y="90"
            width="300"
            height="60"
            rx="8"
            fill="#eff6ff"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <text
            x="400"
            y="118"
            textAnchor="middle"
            fontSize="13"
            fill="#1e40af"
            fontWeight="600"
          >
            Branes Frontend (React)
          </text>
          <text x="400" y="136" textAnchor="middle" fontSize="11" fill="#6b7280">
            Port 3000 — Visualization Dashboard
          </text>

          {/* Arrow down */}
          <line
            x1="400"
            y1="150"
            x2="400"
            y2="180"
            stroke="#9ca3af"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <text x="415" y="172" fontSize="10" fill="#9ca3af">
            REST / SSE
          </text>

          {/* Backend */}
          <rect
            x="250"
            y="180"
            width="300"
            height="60"
            rx="8"
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text
            x="400"
            y="208"
            textAnchor="middle"
            fontSize="13"
            fill="#92400e"
            fontWeight="600"
          >
            Branes API Server (FastAPI)
          </text>
          <text x="400" y="226" textAnchor="middle" fontSize="11" fill="#6b7280">
            Port 8000 — Read-only Data Access
          </text>

          {/* Arrow down */}
          <line
            x1="400"
            y1="240"
            x2="400"
            y2="270"
            stroke="#9ca3af"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <text x="415" y="262" fontSize="10" fill="#9ca3af">
            reads JSON
          </text>

          {/* Session Store */}
          <rect
            x="275"
            y="270"
            width="250"
            height="50"
            rx="8"
            fill="#f3f4f6"
            stroke="#6b7280"
            strokeWidth="2"
          />
          <text
            x="400"
            y="298"
            textAnchor="middle"
            fontSize="13"
            fill="#374151"
            fontWeight="600"
          >
            Session Store
          </text>
          <text x="400" y="312" textAnchor="middle" fontSize="10" fill="#9ca3af">
            ~/.embodied-ai/sessions/
          </text>

          {/* CLI / LangGraph on the left */}
          <rect
            x="30"
            y="180"
            width="180"
            height="60"
            rx="8"
            fill="#dcfce7"
            stroke="#22c55e"
            strokeWidth="2"
          />
          <text
            x="120"
            y="208"
            textAnchor="middle"
            fontSize="13"
            fill="#166534"
            fontWeight="600"
          >
            CLI / LangGraph
          </text>
          <text x="120" y="226" textAnchor="middle" fontSize="11" fill="#6b7280">
            Design Pipeline
          </text>

          {/* Arrow from CLI to Session Store */}
          <line x1="120" y1="240" x2="120" y2="295" stroke="#9ca3af" strokeWidth="2" />
          <line
            x1="120"
            y1="295"
            x2="275"
            y2="295"
            stroke="#9ca3af"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
          <text x="180" y="288" fontSize="10" fill="#9ca3af">
            auto-saves
          </text>

          {/* Visualization libraries on the right */}
          <rect
            x="600"
            y="90"
            width="170"
            height="150"
            rx="8"
            fill="#faf5ff"
            stroke="#8b5cf6"
            strokeWidth="1.5"
          />
          <text
            x="685"
            y="112"
            textAnchor="middle"
            fontSize="12"
            fill="#6d28d9"
            fontWeight="600"
          >
            Viz Libraries
          </text>
          <text x="685" y="132" textAnchor="middle" fontSize="11" fill="#6b7280">
            Plotly.js (3D)
          </text>
          <text x="685" y="150" textAnchor="middle" fontSize="11" fill="#6b7280">
            ECharts (radar)
          </text>
          <text x="685" y="168" textAnchor="middle" fontSize="11" fill="#6b7280">
            Cytoscape (DAG)
          </text>
          <text x="685" y="186" textAnchor="middle" fontSize="11" fill="#6b7280">
            Recharts (lines)
          </text>

          {/* Arrow from frontend to viz */}
          <line
            x1="550"
            y1="120"
            x2="600"
            y2="120"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            markerEnd="url(#arrow-purple)"
          />

          {/* Agent blocks at bottom */}
          <rect
            x="80"
            y="370"
            width="140"
            height="45"
            rx="6"
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x="150"
            y="395"
            textAnchor="middle"
            fontSize="11"
            fill="#0369a1"
            fontWeight="500"
          >
            Workload Analyzer
          </text>

          <rect
            x="240"
            y="370"
            width="140"
            height="45"
            rx="6"
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x="310"
            y="395"
            textAnchor="middle"
            fontSize="11"
            fill="#0369a1"
            fontWeight="500"
          >
            PPA Evaluator
          </text>

          <rect
            x="400"
            y="370"
            width="140"
            height="45"
            rx="6"
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x="470"
            y="395"
            textAnchor="middle"
            fontSize="11"
            fill="#0369a1"
            fontWeight="500"
          >
            Optimizer
          </text>

          <rect
            x="560"
            y="370"
            width="140"
            height="45"
            rx="6"
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          <text
            x="630"
            y="395"
            textAnchor="middle"
            fontSize="11"
            fill="#0369a1"
            fontWeight="500"
          >
            Report Generator
          </text>

          {/* Arrow from CLI down to agents */}
          <line
            x1="120"
            y1="240"
            x2="120"
            y2="350"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <line
            x1="120"
            y1="350"
            x2="630"
            y2="350"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <line
            x1="150"
            y1="350"
            x2="150"
            y2="370"
            stroke="#22c55e"
            strokeWidth="1.5"
            markerEnd="url(#arrow-green)"
          />
          <line
            x1="310"
            y1="350"
            x2="310"
            y2="370"
            stroke="#22c55e"
            strokeWidth="1.5"
            markerEnd="url(#arrow-green)"
          />
          <line
            x1="470"
            y1="350"
            x2="470"
            y2="370"
            stroke="#22c55e"
            strokeWidth="1.5"
            markerEnd="url(#arrow-green)"
          />
          <line
            x1="630"
            y1="350"
            x2="630"
            y2="370"
            stroke="#22c55e"
            strokeWidth="1.5"
            markerEnd="url(#arrow-green)"
          />

          {/* Labels */}
          <text x="400" y="460" textAnchor="middle" fontSize="12" fill="#6b7280">
            LangGraph Specialist Agents
          </text>

          {/* Arrow markers */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
            </marker>
            <marker
              id="arrow-purple"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
            </marker>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
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
