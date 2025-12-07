import dynamic from 'next/dynamic'
const WidgetClient = dynamic(() => import('./WidgetClient.tsx'), { ssr: false })
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
  return <WidgetClient initialLeague={league} initialDate={date} />
}
