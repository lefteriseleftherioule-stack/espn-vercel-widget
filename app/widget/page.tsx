import { fetchScoreboard } from '../../lib/espn'
type SearchParams = { [key: string]: string | string[] | undefined }

function scoreLine(event: any) {
  const comp = Array.isArray(event?.competitions) ? event.competitions[0] : null
  const teams = Array.isArray(comp?.competitors) ? comp.competitors : []
  const a = teams[0]
  const b = teams[1]
  const aLine = a ? `${a.team?.shortDisplayName ?? a.team?.displayName ?? ''} ${a.score ?? ''}` : ''
  const bLine = b ? `${b.team?.shortDisplayName ?? b.team?.displayName ?? ''} ${b.score ?? ''}` : ''
  return `${aLine} vs ${bLine}`
}

export default async function Widget({ searchParams }: { searchParams: SearchParams }) {
  const sport = typeof searchParams.sport === 'string' ? searchParams.sport : 'football'
  const league = typeof searchParams.league === 'string' ? searchParams.league : 'nfl'
  const r = await fetchScoreboard(sport, league)
  const data = r.ok ? r.data : null
  const events = Array.isArray(data?.events) ? data.events : []
  return (
    <div className="container">
      <div className="title">Scoreboard</div>
      <div className="subtitle">{sport}/{league}</div>
      {!r.ok && (
        <div className="card">Upstream error loading scoreboard</div>
      )}
      {r.ok && events.length === 0 && (
        <div className="card">No events</div>
      )}
      {events.map((e: any) => (
        <div className="card" key={e.id}>
          <div className="row">
            <span>{e.shortName ?? e.name ?? ''}</span>
            <span className="badge">{e.status?.type?.shortDetail ?? e.status?.type?.detail ?? ''}</span>
          </div>
          <div className="grid">
            <div className="muted">{scoreLine(e)}</div>
          </div>
        </div>
      ))}
      <div className="footer">Powered by ESPN hidden API</div>
    </div>
  )
}
