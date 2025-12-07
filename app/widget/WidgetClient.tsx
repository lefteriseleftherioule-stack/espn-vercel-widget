"use client"
import { useEffect, useMemo, useState } from 'react'

type Scoreboard = any

const popularLeagues = [
  { code: 'eng.1', name: 'English Premier League' },
  { code: 'esp.1', name: 'La Liga' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'fra.1', name: 'Ligue 1' },
  { code: 'ned.1', name: 'Eredivisie' },
  { code: 'por.1', name: 'Primeira Liga' },
  { code: 'mex.1', name: 'Liga MX' },
  { code: 'usa.1', name: 'Major League Soccer' },
  { code: 'uefa.champions', name: 'UEFA Champions League' },
]

function toEspnDate(d: string) {
  return d.replaceAll('-', '')
}

function formatDay(d: string) {
  const dt = new Date(d)
  const dayName = dt.toLocaleDateString(undefined, { weekday: 'long' })
  const dayNum = dt.getDate()
  const monthName = dt.toLocaleDateString(undefined, { month: 'long' })
  return `${dayName} ${dayNum} ${monthName}`
}

function teamLogoHref(team: any): string {
  const logos = team?.logos
  if (Array.isArray(logos) && logos.length > 0 && logos[0]?.href) return logos[0].href
  const logo = team?.logo
  if (typeof logo === 'string') return logo
  if (logo?.href) return logo.href
  return ''
}

function teamName(team: any): string {
  return team?.shortDisplayName ?? team?.displayName ?? team?.name ?? ''
}

function extractCompetitors(event: any) {
  const comp = Array.isArray(event?.competitions) ? event.competitions[0] : null
  const teams = Array.isArray(comp?.competitors) ? comp.competitors : []
  const a = teams[0]?.team ?? teams[0]
  const b = teams[1]?.team ?? teams[1]
  return [a, b]
}

export default function WidgetClient({ initialLeague, initialDate }: { initialLeague: string; initialDate: string }) {
  const [leagueSel, setLeagueSel] = useState<string>(initialLeague || 'eng.1')
  const [customLeague, setCustomLeague] = useState<string>('')
  const [date, setDate] = useState<string>(initialDate)
  const [data, setData] = useState<Scoreboard | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const league = useMemo(() => (leagueSel === '__custom__' ? (customLeague || 'eng.1') : leagueSel), [leagueSel, customLeague])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/scoreboard?sport=soccer&league=${encodeURIComponent(league)}&date=${encodeURIComponent(toEspnDate(date))}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError('Failed to load scores')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [league, date])

  const events = Array.isArray((data as any)?.events) ? (data as any).events : []

  return (
    <div className="container">
      <div className="title">Football Scores</div>
      <div className="subtitle">{formatDay(date)}</div>

      <div className="card">
        <div className="row" style={{ gap: 8 }}>
          <label>
            League
            <select value={leagueSel} onChange={(e) => setLeagueSel(e.target.value)} style={{ marginLeft: 8 }}>
              {popularLeagues.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
              <option value="__custom__">Custom code…</option>
            </select>
          </label>
          {leagueSel === '__custom__' && (
            <input
              value={customLeague}
              placeholder="e.g. eng.1"
              onChange={(e) => setCustomLeague(e.target.value)}
              style={{ flex: 1 }}
            />
          )}
          <label style={{ marginLeft: 'auto' }}>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 8 }} />
          </label>
        </div>
      </div>

      {loading && <div className="card">Loading…</div>}
      {error && <div className="card">{error}</div>}
      {!loading && !error && events.length === 0 && <div className="card">No events</div>}

      {events.map((e: any) => {
        const [a, b] = extractCompetitors(e)
        return (
          <div className="card" key={e.id}>
            <div className="row" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {a && teamLogoHref(a) && <img src={teamLogoHref(a)} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />}
                <span>{teamName(a)}</span>
              </div>
              <span className="muted">v</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {b && teamLogoHref(b) && <img src={teamLogoHref(b)} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />}
                <span>{teamName(b)}</span>
              </div>
              <span className="badge" style={{ marginLeft: 'auto' }}>{e.status?.type?.shortDetail ?? e.status?.type?.detail ?? ''}</span>
            </div>
          </div>
        )
      })}
      <div className="footer">Powered by ESPN hidden API</div>
    </div>
  )
}
