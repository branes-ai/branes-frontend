/**
 * Placeholder types derived from the API contract in
 * docs/architecture/frontend-architecture.md.
 *
 * These will be replaced by types generated from the OpenAPI spec once
 * the backend publishes one.
 */

export interface SessionSummary {
  session_id: string
  goal: string
  status: string
  iteration: number
  max_iterations: number
  platform: string
  created_at: string
  saved_at: string
}

/** Full session state — exact shape TBD from OpenAPI generation. */
export interface SoCDesignState {
  session_id: string
  goal: string
  status: string
  iteration: number
  max_iterations?: number
  platform?: string
  use_case?: string
  constraints?: Record<string, number>
  ppa_metrics?: Record<string, unknown>
  design_rationale?: unknown[]
  [key: string]: unknown
}

export interface ParetoPoint {
  power: number
  latency: number
  cost: number
  hardware: string
  dominated: boolean
}

export interface ParetoResponse {
  points: ParetoPoint[]
  knee_point_index: number
  objectives: string[]
}

export interface SlacknessEntry {
  name: string
  target: number
  actual: number
  unit: string
  margin_pct: number
  verdict: string
  trend: string
  binding: boolean
}

export interface TrajectoryEntry {
  iteration: number
  ppa: Record<string, number>
  verdicts: Record<string, string>
  strategy_applied: string | null
}

export interface TaskGraphNode {
  id: string
  name: string
  agent: string
  status: string
  dependencies: string[]
}

export interface TaskGraphResponse {
  nodes: TaskGraphNode[]
  execution_order: string[]
  parallel_groups: string[][]
}

export interface WorkloadOperator {
  name: string
  model_class: string
  gflops: number
  memory_mb: number
  latency_ms?: number
  mapped_to?: string
  bound?: string
  scheduling?: string
}

export interface WorkloadResponse {
  operators: WorkloadOperator[]
  total_gflops: number
  total_memory_mb: number
  dominant_op?: string
  source?: string
}
