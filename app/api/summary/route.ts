import { NextRequest } from 'next/server'
import { fetchSummary } from '../../../lib/espn'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const league = searchParams.get('league') || ''
  const eventId = searchParams.get('eventId') || ''
  if (!league || !eventId) return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: { 'content-type': 'application/json' } })
  const r = await fetchSummary(league, eventId)
  if (!r.ok) return new Response(JSON.stringify({ error: 'upstream_error', status: r.status }), { status: 502, headers: { 'content-type': 'application/json' } })
  return new Response(JSON.stringify(r.data), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' } })
}
