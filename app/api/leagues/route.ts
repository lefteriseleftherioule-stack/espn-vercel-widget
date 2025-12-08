import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('sport') || 'soccer'
  const sport = (() => {
    const s = (raw || '').trim().replace(/['"]/g, '')
    return s || 'soccer'
  })()
  const url = `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(sport)}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return new Response(JSON.stringify({ error: 'upstream_error', status: res.status }), { status: 502, headers: { 'content-type': 'application/json' } })
  const json = await res.json()
  let leagues: any[] = []
  if (Array.isArray(json?.leagues)) leagues = json.leagues
  else if (Array.isArray(json?.sports)) leagues = json.sports[0]?.leagues ?? []
  const mapped = leagues.map((l: any) => ({ code: l?.id ?? l?.slug ?? l?.abbr ?? l?.uid ?? '', name: l?.name ?? l?.shortName ?? l?.displayName ?? '' })).filter((x: any) => x.code && x.name)
  return new Response(JSON.stringify({ leagues: mapped }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
}
