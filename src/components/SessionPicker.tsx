import { useSessionList } from '../hooks/useSession.ts'

interface Props {
  label: string
  value: string | null
  onChange: (sessionId: string) => void
  exclude?: string | null
}

export default function SessionPicker({ label, value, onChange, exclude }: Props) {
  const { data: sessions, isLoading } = useSessionList()

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
        disabled={isLoading}
      >
        <option value="">Select a session...</option>
        {sessions
          ?.filter((s) => s.session_id !== exclude)
          .map((s) => (
            <option key={s.session_id} value={s.session_id}>
              {s.session_id} — {s.goal}
            </option>
          ))}
      </select>
    </div>
  )
}
