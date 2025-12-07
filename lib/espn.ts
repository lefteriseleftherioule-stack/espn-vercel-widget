export function buildScoreboardUrl(sport: string, league: string, date?: string) {
  const s = sport || 'football'
  const l = league || 'nfl'
  const base = `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(s)}/${encodeURIComponent(l)}/scoreboard`
  if (date) {
    const d = date.replaceAll('-', '')
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
