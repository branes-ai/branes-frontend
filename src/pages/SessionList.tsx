import { Link } from 'react-router-dom'
import { useSessionList } from '../hooks/useSession.ts'
import type { SessionSummary } from '../api/types.ts'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-green-100 text-green-800',
    optimizing: 'bg-yellow-100 text-yellow-800',
    running: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    error: 'bg-red-100 text-red-800',
  }
  const cls = colors[status.toLowerCase()] ?? 'bg-gray-100 text-gray-800'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  )
}

function SessionRow({ session }: { session: SessionSummary }) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm">{session.session_id}</td>
      <td className="px-4 py-3">
        <Link
          to={`/sessions/${session.session_id}`}
          className="text-blue-600 hover:underline"
        >
          {session.goal}
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={session.status} />
      </td>
      <td className="px-4 py-3 text-center">
        {session.iteration}/{session.max_iterations}
      </td>
      <td className="px-4 py-3">{session.platform}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(session.saved_at)}</td>
    </tr>
  )
}

export default function SessionList() {
  const { data: sessions, isLoading, error } = useSessionList()

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Design Sessions</h1>

      {error && (
        <p className="mb-4 text-red-600">Error loading sessions: {String(error)}</p>
      )}

      {!isLoading && !error && sessions?.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No sessions found</p>
          <p className="mt-2 text-sm text-gray-400">
            Run{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
              branes design plan
            </code>{' '}
            to create one
          </p>
        </div>
      )}

      {(isLoading || (sessions && sessions.length > 0)) && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Session ID</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Iteration</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Saved At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : sessions?.map((s) => <SessionRow key={s.session_id} session={s} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
