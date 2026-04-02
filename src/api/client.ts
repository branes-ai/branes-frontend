const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function fetchSessions() {
  return fetchJson<import('./types.ts').SessionSummary[]>('/api/sessions')
}

export function fetchSession(id: string) {
  return fetchJson<import('./types.ts').SoCDesignState>(`/api/sessions/${id}`)
}

export function fetchPareto(id: string) {
  return fetchJson<import('./types.ts').ParetoResponse>(`/api/sessions/${id}/pareto`)
}

export function fetchSlackness(id: string) {
  return fetchJson<import('./types.ts').SlacknessEntry[]>(`/api/sessions/${id}/slackness`)
}

export function fetchTrajectory(id: string) {
  return fetchJson<import('./types.ts').TrajectoryEntry[]>(
    `/api/sessions/${id}/trajectory`,
  )
}

export function fetchTaskGraph(id: string) {
  return fetchJson<import('./types.ts').TaskGraphResponse>(
    `/api/sessions/${id}/taskgraph`,
  )
}

export function fetchWorkload(id: string) {
  return fetchJson<import('./types.ts').WorkloadResponse>(`/api/sessions/${id}/workload`)
}
