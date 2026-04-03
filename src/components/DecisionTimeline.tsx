import { useState } from 'react'

export interface DecisionEntry {
  agent: string
  action: string
  rationale?: string
  alternatives?: string[]
  timestamp?: string
  iteration?: number
}

interface Props {
  decisions: DecisionEntry[]
}

const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  planner: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  optimizer: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  human: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  critic: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
}

const DEFAULT_COLORS = { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' }

function agentColors(agent: string) {
  return AGENT_COLORS[agent.toLowerCase()] ?? DEFAULT_COLORS
}

function formatTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function DecisionTimeline({ decisions }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [agentFilter, setAgentFilter] = useState<string | null>(null)

  const agents = [...new Set(decisions.map((d) => d.agent))]
  const filtered = agentFilter
    ? decisions.filter((d) => d.agent === agentFilter)
    : decisions

  return (
    <div>
      {/* Agent filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setAgentFilter(null)}
          className={`rounded px-3 py-1 text-sm ${
            agentFilter === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {agents.map((agent) => {
          const c = agentColors(agent)
          return (
            <button
              key={agent}
              onClick={() => setAgentFilter(agentFilter === agent ? null : agent)}
              className={`rounded px-3 py-1 text-sm capitalize ${
                agentFilter === agent
                  ? `${c.bg} ${c.text} font-medium`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {agent}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="relative ml-4 border-l-2 border-gray-200 pl-6">
        {filtered.map((entry, idx) => {
          const c = agentColors(entry.agent)
          const isExpanded = expandedIdx === idx

          return (
            <div key={idx} className="relative mb-6 last:mb-0">
              {/* Dot on timeline */}
              <div
                className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white ${c.dot}`}
              />

              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${c.bg} ${c.text}`}
                  >
                    {entry.agent}
                  </span>
                  {entry.iteration != null && (
                    <span className="text-xs text-gray-400">iter {entry.iteration}</span>
                  )}
                  {entry.timestamp && (
                    <span className="text-xs text-gray-400">
                      {formatTime(entry.timestamp)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium">{entry.action}</p>
              </button>

              {isExpanded && (
                <div className="mt-2 rounded-lg border bg-gray-50 p-3 text-sm">
                  {entry.rationale && <p className="text-gray-600">{entry.rationale}</p>}
                  {entry.alternatives && entry.alternatives.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500">
                        Alternatives considered:
                      </p>
                      <ul className="mt-1 list-inside list-disc text-gray-500">
                        {entry.alternatives.map((alt) => (
                          <li key={alt}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <p className="text-gray-400">No decisions recorded.</p>}
    </div>
  )
}
