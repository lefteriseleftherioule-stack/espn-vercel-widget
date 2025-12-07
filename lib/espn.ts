export function buildScoreboardUrl(sport: string, league: string, date?: string) {
  const s = sport || 'football'
  const l = league || 'nfl'
  const base = `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(s)}/${encodeURIComponent(l)}/scoreboard`
  if (date) {
    const d = date.replace(/-/g, '')
    return `${base}?dates=${encodeURIComponent(d)}`
  }
  return base
}

export async function fetchScoreboard(sport: string, league: string, date?: string) {
  const url = buildScoreboardUrl(sport, league, date)
  const res = await fetch(url, { next: { revalidate: 30 } })
  if (!res.ok) {
    return { ok: false, status: res.status, data: null }
  }
  const data = await res.json()
  return { ok: true, status: 200, data }
}

export function buildSummaryUrl(league: string, eventId: string) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${encodeURIComponent(eventId)}`
}

export async function fetchSummary(league: string, eventId: string) {
  const url = buildSummaryUrl(league, eventId)
  const res = await fetch(url, { next: { revalidate: 120 } })
  if (!res.ok) return { ok: false, status: res.status, data: null }
  const data = await res.json()
  return { ok: true, status: 200, data }
}
