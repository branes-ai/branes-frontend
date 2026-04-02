# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Branes Frontend is a React 18 + TypeScript visualization dashboard for the Branes Embodied AI Architect platform. It is a **read-only consumer** of design session data from a FastAPI backend — it never modifies sessions. The backend must be running (`branes api serve` on port 8000) for the frontend to function.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on :3000 (proxies /api to backend :8000)
npm run build        # Production build
npm run lint         # ESLint + Prettier
npm run typecheck    # TypeScript compiler check
```

CI runs on Node 20 and 22: `npm ci && npm run lint && npm run typecheck && npm run build`.

## Architecture

### Data Flow

Sessions are stored at `~/.embodied-ai/sessions/` and served by the FastAPI backend via REST. The frontend fetches and visualizes this data. All endpoints are GET-only (plus one SSE stream for live updates).

### Key API Endpoints

- `GET /api/sessions` — list sessions
- `GET /api/sessions/{id}` — full SoCDesignState
- `GET /api/sessions/{id}/pareto` — Pareto frontier
- `GET /api/sessions/{id}/trajectory` — optimization trajectory
- `GET /api/sessions/{id}/taskgraph` — task DAG
- `SSE /api/sessions/{id}/stream` — live updates during optimization

### Page Hierarchy

- **SessionListPage** — lists all design sessions
- **SessionDetailPage** — dashboard with SessionHeader, MetricCards (power/latency/area/cost with verdicts), TabPanel (Overview, Optimization, Architecture, SWaP-C, Decisions), and a slide-out DrillPanel for metric drill-down

### Visualization Libraries

Each chart type uses a dedicated best-of-breed library:
- **Plotly.js** — 3D Pareto frontier
- **ECharts** — radar charts
- **Cytoscape.js** — DAG visualization
- **Recharts** — line/timeline charts

### Data Fetching

TanStack Query with `staleTime: 5_000`, `refetchInterval: 10_000` (polling for active sessions), `retry: 2`. Each visualization component has its own dedicated query hook.

## Design Principles

- **Read-only**: Frontend never mutates session data
- **Progressive detail**: system → subsystem → operator → kernel drill-down
- **Multi-metric awareness**: always show trade-offs, not single metrics
- **Decoupled**: separate repo, independent release cycle from backend
- **Real-time capable**: SSE streaming for live optimization updates

## Related Repositories

- `embodied-ai-architect` — backend + design engine
- `embodied-schemas` — shared data models
- `graphs` — roofline analysis, hardware simulation
