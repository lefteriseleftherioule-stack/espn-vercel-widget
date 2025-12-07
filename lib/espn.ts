export function buildScoreboardUrl(sport: string, league: string) {
  const s = sport || 'football'
  const l = league || 'nfl'
  return `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(s)}/${encodeURIComponent(l)}/scoreboard`
}

export async function fetchScoreboard(sport: string, league: string) {
  const url = buildScoreboardUrl(sport, league)
  const res = await fetch(url, { next: { revalidate: 30 } })
  if (!res.ok) {
    return { ok: false, status: res.status, data: null }
  }
  const data = await res.json()
  return { ok: true, status: 200, data }
}
