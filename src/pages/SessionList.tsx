import { Link } from 'react-router-dom'
import { useSessionList } from '../hooks/useSession.ts'

export default function SessionList() {
  const { data: sessions, isLoading, error } = useSessionList()

  if (isLoading) return <p className="p-8 text-gray-500">Loading sessions...</p>
  if (error)
    return <p className="p-8 text-red-600">Error loading sessions: {String(error)}</p>

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Design Sessions</h1>
      {sessions && sessions.length === 0 && (
        <p className="text-gray-500">No sessions found.</p>
      )}
      <div className="space-y-2">
        {sessions?.map((s) => (
          <Link
            key={s.session_id}
            to={`/sessions/${s.session_id}`}
            className="block rounded border p-4 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.goal}</span>
              <span className="text-sm text-gray-500">{s.status}</span>
            </div>
            <div className="mt-1 text-sm text-gray-400">
              {s.platform} &middot; iteration {s.iteration}/{s.max_iterations}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
