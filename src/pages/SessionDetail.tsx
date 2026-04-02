import { useParams, Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession.ts'

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSession(id!)

  if (isLoading) return <p className="p-8 text-gray-500">Loading session...</p>
  if (error) return <p className="p-8 text-red-600">Error: {String(error)}</p>

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link to="/" className="text-blue-600 hover:underline">
        &larr; Back to sessions
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{session?.goal}</h1>
      <p className="mt-1 text-gray-500">
        {session?.status} &middot; iteration {session?.iteration}
      </p>
    </div>
  )
}
