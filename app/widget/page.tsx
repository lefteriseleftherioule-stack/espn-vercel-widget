import { Suspense } from 'react'
import WidgetClient from './WidgetClient'
export const dynamic = 'force-dynamic'
type SearchParams = { [key: string]: string | string[] | undefined }

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

export default function Widget({ searchParams }: { searchParams: SearchParams }) {
  const league = typeof searchParams.league === 'string' ? searchParams.league : 'eng.1'
  const date = typeof searchParams.date === 'string' ? searchParams.date : todayISO()
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading…</div></div>}>
      <WidgetClient initialLeague={league} initialDate={date} />
    </Suspense>
  )
}
