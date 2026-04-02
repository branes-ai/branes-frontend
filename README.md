# Branes Frontend

Visual design exploration dashboard for the [Branes Embodied AI Architect](https://github.com/branes-ai/embodied-ai-architect) platform.

## Overview

This is the web-based visualization frontend for the branes platform. It reads design session data from the branes backend REST API and renders interactive visualizations for:

- **Pareto frontier** — 3D scatter plots of power x latency x cost trade-offs
- **Constraint analysis** — Slackness dashboards showing margin, headroom, and trends
- **Task graph** — DAG visualization of the design exploration workflow
- **Optimization trajectory** — Line charts showing how metrics evolve across iterations
- **SWaP-C radar** — Multi-axis comparison of Size, Weight, Power, and Cost
- **Drill-down trees** — Hierarchical metric composition (system -> subsystem -> operator -> kernel)
- **Design timeline** — Decision trail with agent attribution

## Architecture

```
Frontend (this repo)          Backend (embodied-ai-architect)
React + TypeScript     HTTP   FastAPI REST API
Port 3000             ------> Port 8000

Plotly.js (3D)         GET    /api/sessions
ECharts (radar)        GET    /api/sessions/{id}/pareto
Cytoscape.js (DAG)     GET    /api/sessions/{id}/slackness
Recharts (lines)       SSE    /api/sessions/{id}/stream
```

The backend reads from the session store (`~/.embodied-ai/sessions/`), which is auto-populated by the branes design pipeline. No additional computation — just a data access layer.

See [docs/architecture/](docs/architecture/) for the full architecture document.

## Prerequisites

- Node.js 20+
- Backend running: `cd ../embodied-ai-architect && .venv/bin/branes api serve`

## Development

```bash
npm install
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint + Prettier check
npm run typecheck    # TypeScript type checking
```

## Tech Stack

| Library        | Purpose                            |
| -------------- | ---------------------------------- |
| React 18       | Component framework                |
| TypeScript     | Type safety                        |
| Vite           | Build tool + dev server            |
| Plotly.js      | Pareto frontier 3D scatter plots   |
| ECharts        | Radar charts, gauges, heatmaps     |
| Cytoscape.js   | Task graph DAG rendering           |
| Recharts       | Line charts, timelines, bar charts |
| TanStack Query | Data fetching, caching, refetching |
| Tailwind CSS   | Styling                            |

## Project Structure

```
src/
├── api/
│   ├── client.ts          # REST client, base URL config
│   └── types.ts           # TypeScript types (from OpenAPI)
├── components/
│   ├── ParetoScatter.tsx   # 3D Pareto frontier
│   ├── SlacknessBars.tsx   # Constraint budget utilization
│   ├── TaskGraph.tsx       # Cytoscape DAG
│   ├── TrajectoryChart.tsx # Optimization line chart
│   ├── SwapRadar.tsx       # SWaP-C radar chart
│   ├── DrillTree.tsx       # Hierarchical metric tree
│   └── MetricCard.tsx      # Summary cards
├── hooks/
│   ├── useSession.ts       # Session data hooks
│   └── useStream.ts        # SSE consumer
├── pages/
│   ├── SessionList.tsx     # All sessions
│   └── SessionDetail.tsx   # Single session dashboard
├── App.tsx
└── main.tsx
```

## Related Repositories

- [embodied-ai-architect](https://github.com/branes-ai/embodied-ai-architect) — Backend + design engine
- [embodied-schemas](https://github.com/branes-ai/embodied-schemas) — Shared data models
- [graphs](https://github.com/branes-ai/graphs) — Roofline analysis, hardware simulation

## License

MIT
