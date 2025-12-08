import { NextRequest } from 'next/server'

const cache: Record<string, { ts: number; leagues: any[] }> = {}
const popularBySport: Record<string, { code: string; name: string }[]> = {
  soccer: [
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
  ],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('sport') || 'soccer'
  const sport = (() => {
    const s = (raw || '').trim().replace(/['"]/g, '')
    return s || 'soccer'
  })()
  const url = `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(sport)}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    const cached = cache[sport]?.leagues
    const fallback = popularBySport[sport] || []
    const leaguesOut = (cached && cached.length > 0) ? cached : fallback
    return new Response(JSON.stringify({ leagues: leaguesOut }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } })
  }
  const json = await res.json()
  let leagues: any[] = []
  if (Array.isArray((json as any)?.leagues)) {
    leagues = (json as any).leagues
  } else if (Array.isArray((json as any)?.sports)) {
    leagues = ((json as any).sports as any[]).flatMap((s: any) => Array.isArray(s?.leagues) ? s.leagues : [])
  }
  const mappedRaw = leagues.map((l: any) => ({
    code: l?.slug ?? l?.abbr ?? l?.uid ?? (l?.id != null ? String(l.id) : ''),
    name: l?.displayName ?? l?.name ?? l?.shortName ?? ''
  })).filter((x: any) => x.code && x.name)
  const dedup = new Map<string, any>()
  for (const item of mappedRaw) {
    if (!dedup.has(item.code)) dedup.set(item.code, item)
  }
  const final = Array.from(dedup.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
  cache[sport] = { ts: Date.now(), leagues: final }
  return new Response(JSON.stringify({ leagues: final }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
}
