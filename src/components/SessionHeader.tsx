interface Props {
  goal: string
  platform: string
  status: string
  iteration: number
  maxIterations?: number
}

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

export default function SessionHeader({
  goal,
  platform,
  status,
  iteration,
  maxIterations = 20,
}: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{goal}</h1>
      <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
        <StatusBadge status={status} />
        <span>{platform}</span>
        <span>&middot;</span>
        <span>
          iteration {iteration}/{maxIterations}
        </span>
      </div>
    </div>
  )
}
