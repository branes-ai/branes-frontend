import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSession, usePareto, useSlackness, useTaskGraph } from '../hooks/useSession.ts'
import SessionHeader from '../components/SessionHeader.tsx'
import MetricCard from '../components/MetricCard.tsx'
import ParetoScatter from '../components/ParetoScatter.tsx'
import SlacknessBars from '../components/SlacknessBars.tsx'
import TaskGraph from '../components/TaskGraph.tsx'

const TABS = ['Overview', 'Optimization', 'Architecture', 'SWaP-C', 'Decisions'] as const
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
        {activeTab === 'Architecture' && <ArchitectureTab sessionId={id!} />}
        {activeTab !== 'Overview' && activeTab !== 'Architecture' && (
          <div className="py-8 text-center text-gray-400">
            {activeTab} tab — visualizations coming soon
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

function ArchitectureTab({ sessionId }: { sessionId: string }) {
  const { data: taskGraph, isLoading, error } = useTaskGraph(sessionId)

  if (isLoading) return <p className="text-gray-500">Loading task graph...</p>
  if (error) return <p className="text-red-600">Error loading task graph</p>

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Task Graph</h2>
      {taskGraph ? (
        <TaskGraph data={taskGraph} />
      ) : (
        <p className="text-gray-400">No task graph available.</p>
      )}
    </div>
  )
}
