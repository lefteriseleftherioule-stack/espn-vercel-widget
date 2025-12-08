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
  return new Response(JSON.stringify({ leagues: final }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
}
