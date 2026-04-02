import { useQuery } from '@tanstack/react-query'
import {
  fetchSessions,
  fetchSession,
  fetchPareto,
  fetchSlackness,
  fetchTrajectory,
  fetchTaskGraph,
  fetchWorkload,
} from '../api/client.ts'

export function useSessionList() {
  return useQuery({ queryKey: ['sessions'], queryFn: fetchSessions })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => fetchSession(id),
  })
}

export function usePareto(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'pareto'],
    queryFn: () => fetchPareto(id),
  })
}

export function useSlackness(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'slackness'],
    queryFn: () => fetchSlackness(id),
  })
}

export function useTrajectory(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'trajectory'],
    queryFn: () => fetchTrajectory(id),
  })
}

export function useTaskGraph(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'taskgraph'],
    queryFn: () => fetchTaskGraph(id),
  })
}

export function useWorkload(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'workload'],
    queryFn: () => fetchWorkload(id),
  })
}
