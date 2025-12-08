import { NextRequest } from 'next/server'
import { fetchScoreboard } from '../../../lib/espn'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawSport = searchParams.get('sport') || 'soccer'
  const sport = (() => {
    const s = (rawSport || '').trim().replace(/['"]/g, '')
    return s || 'soccer'
  })()
  const league = searchParams.get('league') || 'nfl'
  const date = searchParams.get('date') || undefined
  const r = await fetchScoreboard(sport, league, date)
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'upstream_error', status: r.status }), { status: 502, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  }
  return new Response(JSON.stringify(r.data), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } })
}
