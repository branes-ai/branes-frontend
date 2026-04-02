# Branes Frontend — Architecture Document

## 1. System Context

The branes frontend is the visual layer of the Branes Embodied AI Architect
platform. It provides interactive visualizations for hardware/software
co-design exploration, enabling architects to understand trade-offs, identify
bottlenecks, and steer optimization across multi-objective design spaces.

### System Boundary

```
                    ┌──────────────────────────────────┐
                    │         Human Architect           │
                    └──────────────┬───────────────────┘
                                   │ browser
                    ┌──────────────▼───────────────────┐
                    │      branes-frontend (this)      │
                    │      React + TypeScript           │
                    │      Port 3000                    │
                    └──────────────┬───────────────────┘
                                   │ REST / SSE
                    ┌──────────────▼───────────────────┐
                    │      branes API server            │
                    │      FastAPI, Port 8000           │
                    │      (in embodied-ai-architect)   │
                    └──────────────┬───────────────────┘
                                   │ reads JSON
                    ┌──────────────▼───────────────────┐
                    │      Session Store                │
                    │      ~/.embodied-ai/sessions/     │
                    │      (auto-saved by LangGraph)    │
                    └──────────────────────────────────┘
```

The frontend is a **read-only** consumer of design session data. It does
not modify sessions or trigger computations. All design execution happens
through the CLI (`branes design`, `branes chat`) or programmatic API
(`SoCDesignRunner`).

### Design Principles

1. **Decoupled** — Frontend and backend are separate repos with independent
   release cycles. The REST API is the only contract.
2. **Read-only visualization** — The frontend renders data; it does not
   mutate state. Steering happens through CLI or chat.
3. **Progressive detail** — Start with system-level overview, drill down
   to subsystem, operator, kernel levels on demand.
4. **Multi-metric awareness** — Every view shows multiple metrics
   simultaneously. The architect needs to see trade-offs, not isolated
   numbers.
5. **Real-time capable** — SSE streaming enables live updates during
   active optimization runs.

## 2. Data Flow

### Session Lifecycle

```
1. Architect runs:  branes design qualify "drone SoC"
                    branes design plan "qualified goal" --power 5 --latency 33

2. SoCDesignRunner executes the LangGraph pipeline:
   qualify → plan → review → dispatch → evaluate → optimize → report

3. After every step, runner auto-saves to:
   ~/.embodied-ai/sessions/soc_<id>.json

4. branes API server reads these JSON files and serves them:
   GET /api/sessions/{id} → full SoCDesignState
   GET /api/sessions/{id}/pareto → extracted Pareto points

5. Frontend fetches from API and renders visualizations
```

### Data Model

The `SoCDesignState` JSON contains all data the frontend needs:

```
SoCDesignState
├── goal, use_case, platform          → Header/context
├── constraints                       → Budget reference lines
├── ppa_metrics                       → Current metrics + verdicts
│   ├── power_watts, latency_ms, ...  → Metric cards
│   ├── verdicts                      → Pass/fail badges
│   └── cost_breakdown                → Waterfall chart
├── optimization_review_snapshot      → Constraint slackness
│   ├── constraint_slackness[]        → Slackness bars
│   ├── trajectory                    → Trajectory chart
│   ├── strategies[]                  → Strategy analysis panel
│   └── pareto_points[]               → Pareto scatter
├── workload_profile                  → Operator breakdown
│   ├── workloads[]                   → Per-operator metrics
│   └── total_estimated_gflops        → System-level compute
├── task_graph                        → Task graph DAG
│   └── nodes{}                       → Cytoscape rendering
├── selected_architecture             → Architecture summary
├── ip_blocks[]                       → Hardware block details
├── design_rationale[]                → Decision timeline
├── optimization_history[]            → Iteration-by-iteration PPA
└── iteration, status                 → Progress indicators
```

## 3. API Contract

### Endpoints

All endpoints are GET (read-only). The backend is a thin layer over
`SessionStore.load()` with field extraction.

```
GET  /api/sessions
Response: [
  {
    "session_id": "soc_abc123",
    "goal": "Drone perception SoC...",
    "status": "complete",
    "iteration": 3,
    "max_iterations": 20,
    "platform": "drone",
    "created_at": "2026-04-02T...",
    "saved_at": "2026-04-02T..."
  }
]

GET  /api/sessions/{id}
Response: Full SoCDesignState JSON

GET  /api/sessions/{id}/pareto
Response: {
  "points": [
    {"power": 4.2, "latency": 28, "cost": 35, "hardware": "KPU", "dominated": false},
    ...
  ],
  "knee_point_index": 2,
  "objectives": ["power_watts", "latency_ms", "cost_usd"]
}

GET  /api/sessions/{id}/slackness
Response: [
  {"name": "power", "target": 5.0, "actual": 4.2, "unit": "W",
   "margin_pct": 16.0, "verdict": "PASS", "trend": "improving", "binding": false},
  ...
]

GET  /api/sessions/{id}/trajectory
Response: [
  {"iteration": 0, "ppa": {"power": 8.0, "latency": 35}, "verdicts": {"power": "FAIL"},
   "strategy_applied": null},
  {"iteration": 1, "ppa": {"power": 6.5, "latency": 30}, "verdicts": {"power": "FAIL"},
   "strategy_applied": "quantize_int8"},
  ...
]

GET  /api/sessions/{id}/taskgraph
Response: {
  "nodes": [
    {"id": "t1", "name": "Analyze workload", "agent": "workload_analyzer",
     "status": "completed", "dependencies": []},
    ...
  ],
  "execution_order": ["t1", "t2", "t3", "t4", "t5", "t6"],
  "parallel_groups": [["t1"], ["t2", "t3"], ["t4"], ...]
}

GET  /api/sessions/{id}/workload
Response: {
  "operators": [
    {"name": "yolo_detector", "gflops": 8.4, "memory_mb": 12,
     "latency_ms": 15, "mapped_to": "kpu", "bound": "compute"},
    ...
  ],
  "total_gflops": 12.4,
  "total_memory_mb": 24
}

SSE  /api/sessions/{id}/stream
Event: {"type": "state_update", "data": <partial SoCDesignState>}
```

### Error Handling

- `404`: Session not found
- `400`: Invalid session ID format
- `503`: Backend not ready (session store not initialized)

## 4. Component Architecture

### Page Hierarchy

```
App
├── SessionListPage
│   └── SessionTable
│       └── SessionRow (click → navigate)
│
└── SessionDetailPage
    ├── SessionHeader (goal, platform, status, iteration)
    ├── MetricCards (power, latency, area, cost — with verdicts)
    ├── TabPanel
    │   ├── Tab: Overview
    │   │   ├── ParetoScatter (Plotly 3D)
    │   │   └── SlacknessBars (horizontal budget bars)
    │   │
    │   ├── Tab: Optimization
    │   │   ├── TrajectoryChart (Recharts line)
    │   │   └── StrategyTable (available/tried/inapplicable)
    │   │
    │   ├── Tab: Architecture
    │   │   ├── TaskGraph (Cytoscape DAG)
    │   │   └── WorkloadTable (per-operator breakdown)
    │   │
    │   ├── Tab: SWaP-C
    │   │   ├── SwapRadar (ECharts radar)
    │   │   └── CostWaterfall (stacked bar)
    │   │
    │   └── Tab: Decisions
    │       └── DecisionTimeline (design rationale trail)
    │
    └── DrillPanel (slide-out, activated by clicking any metric)
        └── DrillTree (hierarchical metric composition)
```

### Data Fetching Strategy

TanStack Query with these defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000, // 5s before refetch
      refetchInterval: 10_000, // 10s polling for active sessions
      retry: 2,
    },
  },
})
```

Each visualization component uses a dedicated query hook:

```typescript
// hooks/useSession.ts
export function useSessionList() {
  return useQuery({ queryKey: ['sessions'], queryFn: fetchSessions })
}

export function usePareto(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'pareto'],
    queryFn: () => fetchPareto(sessionId),
  })
}

export function useSlackness(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'slackness'],
    queryFn: () => fetchSlackness(sessionId),
  })
}
```

## 5. Visualization Library Selection

| Visualization           | Library          | Rationale                                                                    |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Pareto 3D scatter       | **Plotly.js**    | Best interactive 3D scatter; hover, rotate, zoom; constraint boundary planes |
| Constraint slackness    | **Recharts**     | Simple horizontal bars with color coding; React-native                       |
| Task graph DAG          | **Cytoscape.js** | Purpose-built for graph/network visualization; dagre layout                  |
| Optimization trajectory | **Recharts**     | Line charts with dual Y-axis; annotation markers                             |
| SWaP-C radar            | **ECharts**      | Best radar chart implementation; overlay multiple series                     |
| Cost waterfall          | **Recharts**     | Stacked bars with positive/negative support                                  |
| Drill-down tree         | **ECharts**      | Treemap or sunburst; good hierarchical navigation                            |
| Decision timeline       | **Recharts**     | Horizontal timeline with custom shapes                                       |
| Metric cards            | **Custom**       | Simple React components with Tailwind                                        |

## 6. Deployment

### Development

```bash
# Terminal 1: Backend
cd embodied-ai-architect
.venv/bin/branes api serve --port 8000

# Terminal 2: Frontend
cd branes-frontend
npm run dev  # Vite dev server on :3000, proxies /api to :8000
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ../embodied-ai-architect
    command: .venv/bin/branes api serve --host 0.0.0.0 --port 8000
    ports: ['8000:8000']
    volumes:
      - ~/.embodied-ai:/root/.embodied-ai:ro

  frontend:
    build: .
    ports: ['3000:3000']
    environment:
      VITE_API_URL: http://backend:8000
    depends_on: [backend]
```

### Production

- Frontend: Static build (`npm run build`) served by nginx or CDN
- Backend: FastAPI behind reverse proxy (nginx, Caddy)
- Session data: mounted volume or NFS share

## 7. Security Considerations

- **CORS**: Backend allows only configured origins
- **Read-only**: Frontend cannot modify sessions (no POST/PUT/DELETE on data)
- **No authentication in v1**: Designed for local/team use; add OAuth for cloud deployment
- **Session data**: Contains design parameters, not credentials; safe to expose on internal network

## 8. Future Extensions

- **Session comparison**: Side-by-side overlay of two designs
- **Export**: PNG/SVG/PDF/PowerPoint from any visualization
- **Annotations**: Architect can annotate charts with notes (stored in session)
- **Claude integration**: "Visualize" button sends data to Claude for custom artifacts
- **Embedded mode**: iframe into Jupyter notebooks or other tools
- **Mobile**: Responsive session list for phone/tablet review
