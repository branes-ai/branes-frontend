import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
// @ts-expect-error — cytoscape-dagre has no type declarations
import dagre from 'cytoscape-dagre'
import type { TaskGraphResponse } from '../api/types.ts'

cytoscape.use(dagre)

interface Props {
  data: TaskGraphResponse
  onNodeClick?: (nodeId: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  running: '#3b82f6',
  pending: '#9ca3af',
  failed: '#ef4444',
  ready: '#eab308',
}

export default function TaskGraph({ data, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return

    const elements: cytoscape.ElementDefinition[] = []

    // Add nodes
    for (const node of data.nodes) {
      elements.push({
        data: {
          id: node.id,
          label: `${node.name}\n(${node.agent})`,
          status: node.status,
          bgColor: STATUS_COLORS[node.status] ?? STATUS_COLORS.pending,
        },
      })
    }

    // Add edges from dependencies
    for (const node of data.nodes) {
      for (const dep of node.dependencies) {
        elements.push({
          data: {
            id: `${dep}->${node.id}`,
            source: dep,
            target: node.id,
          },
        })
      }
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'background-color': 'data(bgColor)',
            color: '#fff',
            'text-outline-color': 'data(bgColor)',
            'text-outline-width': 2,
            width: 160,
            height: 50,
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#d1d5db',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 40,
        rankSep: 60,
        padding: 20,
      } as cytoscape.LayoutOptions,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    })

    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id()
      onNodeClick?.(nodeId)
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [data, onNodeClick])

  if (data.nodes.length === 0) {
    return <p className="text-gray-400">No task graph available.</p>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{status}</span>
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="rounded-lg border bg-white"
        style={{ height: 450 }}
      />
    </div>
  )
}
