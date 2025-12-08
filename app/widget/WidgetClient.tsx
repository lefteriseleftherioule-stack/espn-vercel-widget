"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

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

function rangeDays(centerISO: string, count = 7) {
  const base = new Date(centerISO)
  const out: string[] = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${da}`)
  }
  return out
}

function toEspnDate(d: string) {
  return d.replace(/-/g, '')
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

export default function WidgetClient({ initialLeague, initialDate, initialSport = 'soccer' }: { initialLeague: string; initialDate: string; initialSport?: string }) {
  const [leagueSel, setLeagueSel] = useState<string>(initialLeague || 'eng.1')
  const [customLeague, setCustomLeague] = useState<string>('')
  const [date, setDate] = useState<string>(initialDate)
  const [sport, setSport] = useState<string>(() => {
    const s = (initialSport || 'soccer').trim().replace(/['"]/g, '')
    return s || 'soccer'
  })
  const [data, setData] = useState<Scoreboard | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<{ code: string; name: string }[] | null>(null)
  const [stats, setStats] = useState<Record<string, any>>({})
  const activeDayRef = useRef<HTMLDivElement | null>(null)
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [calendarCursor, setCalendarCursor] = useState<string>(initialDate)

  const league = useMemo(() => (leagueSel === '__custom__' ? (customLeague || 'eng.1') : leagueSel), [leagueSel, customLeague])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/scoreboard?sport=${encodeURIComponent(sport)}&league=${encodeURIComponent(league)}&date=${encodeURIComponent(toEspnDate(date))}`
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
  }, [league, date, sport])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch(`/api/leagues?sport=${encodeURIComponent(sport)}`)
        if (!res.ok) {
          if (!cancelled) setLeagues(popularLeagues)
          return
        }
        const json = await res.json()
        const serverLeagues = Array.isArray(json?.leagues) ? json.leagues : []
        const finalLeagues = (serverLeagues.length > 0) ? serverLeagues : popularLeagues
        if (!cancelled) {
          setLeagues(finalLeagues)
          if (finalLeagues.length > 0) {
            setLeagueSel((prev) => {
              const exists = finalLeagues.some((l: any) => l.code === prev) || prev === '__custom__'
              return exists ? prev : finalLeagues[0].code
            })
          }
        }
      } catch {
        if (!cancelled) setLeagues(popularLeagues)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sport])

  const events = Array.isArray((data as any)?.events) ? (data as any).events : []
  const days = rangeDays(date)
  useEffect(() => {
    activeDayRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' })
  }, [date])

  function monthMatrix(cursorISO: string) {
    const base = new Date(cursorISO)
    const y = base.getFullYear()
    const m = base.getMonth()
    const first = new Date(y, m, 1)
    const startDow = first.getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push(iso)
    }
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks: (string | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return { y, m, weeks }
  }

  async function loadStats(eventId: string) {
    const key = `${league}:${eventId}`
    if (stats[key]) return
    try {
      const res = await fetch(`/api/summary?league=${encodeURIComponent(league)}&eventId=${encodeURIComponent(eventId)}`)
      if (!res.ok) return
      const json = await res.json()
      setStats((s) => ({ ...s, [key]: json }))
    } catch {}
  }

  function statValue(summary: any, label: string): string {
    if (!summary) return ''
    const teams = summary?.boxscore?.teams
    if (Array.isArray(teams) && teams.length >= 2) {
      const a = teams[0]?.statistics
      const b = teams[1]?.statistics
      const get = (arr: any[]) => {
        const item = Array.isArray(arr) ? arr.find((x) => (x?.name ?? x?.displayName ?? '').toLowerCase().includes(label.toLowerCase())) : null
        return item?.displayValue ?? item?.value ?? ''
      }
      return `${get(a)} - ${get(b)}`
    }
    const comp = Array.isArray(summary?.competitions) ? summary.competitions[0] : null
    const competitors = Array.isArray(comp?.competitors) ? comp.competitors : []
    const get2 = (c: any) => {
      const arr = c?.statistics
      const item = Array.isArray(arr) ? arr.find((x) => (x?.name ?? x?.displayName ?? '').toLowerCase().includes(label.toLowerCase())) : null
      return item?.displayValue ?? item?.value ?? ''
    }
    if (competitors.length >= 2) return `${get2(competitors[0])} - ${get2(competitors[1])}`
    return ''
  }

  return (
    <div className="container">
      <div className="daysbar">
        {days.map((d) => (
          <div
            key={d}
            ref={d === date ? activeDayRef : undefined}
            className={`daypill ${d === date ? 'daypill-active' : ''}`}
            onClick={() => setDate(d)}
          >
            <div>{new Date(d).toLocaleDateString(undefined, { weekday: 'long' })}</div>
            <div className="muted">{new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="selector">
          <label>
            League
            <select value={leagueSel} onChange={(e) => setLeagueSel(e.target.value)} style={{ marginLeft: 8 }}>
              {((leagues && leagues.length > 0) ? leagues : popularLeagues).map((l) => (
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
          <label style={{ marginLeft: 'auto', position: 'relative' }}>
            Date
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setCalendarCursor(e.target.value) }} style={{ marginLeft: 8 }} />
            <button onClick={() => setShowCalendar((v) => !v)} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, background: '#374151', color: '#fff' }}>Monthly</button>
            {showCalendar && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 10, background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 12, width: 320 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <button onClick={() => { const d = new Date(calendarCursor); d.setMonth(d.getMonth() - 1); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())).padStart(2, '0')}`; setCalendarCursor(iso) }} style={{ padding: '4px 8px', borderRadius: 6, background: '#374151', color: '#fff' }}>Prev</button>
                  <span style={{ marginLeft: 8, marginRight: 'auto' }}>{new Date(calendarCursor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => { const d = new Date(calendarCursor); d.setMonth(d.getMonth() + 1); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())).padStart(2, '0')}`; setCalendarCursor(iso) }} style={{ padding: '4px 8px', borderRadius: 6, background: '#374151', color: '#fff' }}>Next</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((wd) => (
                    <div key={wd} className="muted" style={{ textAlign: 'center' }}>{wd}</div>
                  ))}
                </div>
                {monthMatrix(calendarCursor).weeks.map((w, wi) => (
                  <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                    {w.map((cell, ci) => (
                      <div key={ci} style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cell ? '#111827' : 'transparent', border: cell ? '1px solid #374151' : 'none', borderRadius: 6, cursor: cell ? 'pointer' : 'default' }}
                        onClick={() => { if (!cell) return; setDate(cell); setCalendarCursor(cell); setShowCalendar(false) }}>
                        <span className={cell === date ? 'badge' : ''}>
                          {cell ? new Date(cell).getDate() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </label>
        </div>
      </div>

      {loading && <div className="card">Loading…</div>}
      {error && <div className="card">{error}</div>}
      {!loading && !error && events.length === 0 && <div className="card">No events</div>}

      {events.map((e: any) => {
        const [a, b] = extractCompetitors(e)
        const reportUrl = sport === 'soccer' ? `https://www.espn.com/soccer/match?gameId=${e.id}` : ''
        const key = `${league}:${e.id}`
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
            <div className="row" style={{ marginTop: 8 }}>
              {sport === 'soccer' && (
                <button onClick={() => loadStats(e.id)} style={{ padding: '6px 10px', borderRadius: 6, background: '#374151', color: '#fff' }}>Stats</button>
              )}
              {sport === 'soccer' && (
                <a href={reportUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#93c5fd' }}>Match report</a>
              )}
            </div>
            {stats[key] && (
              <div className="grid" style={{ marginTop: 8 }}>
                <div className="muted">Yellow Cards: {statValue(stats[key], 'yellow')}</div>
                <div className="muted">Offsides: {statValue(stats[key], 'offside')}</div>
                <div className="muted">Saves: {statValue(stats[key], 'save')}</div>
                <div className="muted">Shots: {statValue(stats[key], 'shots')}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
