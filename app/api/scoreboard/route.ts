import { NextRequest } from 'next/server'
import { fetchScoreboard } from '../../../lib/espn'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawSport = searchParams.get('sport') || 'soccer'
  const sport = (() => {
    const s = (rawSport || '').trim().replace(/['"]/g, '')
    return s || 'soccer'
  })()
  const rawLeague = searchParams.get('league')
  const defaultLeague = sport === 'soccer' ? 'eng.1' : 'nfl'
  const league = (() => {
    const l = (rawLeague ?? defaultLeague)
    const cleaned = (l || '').trim().replace(/['"]/g, '')
    return cleaned || defaultLeague
  })()
  const rawDate = searchParams.get('date') || undefined
  const isoDate = (() => {
    if (!rawDate) return undefined
    const clean = String(rawDate).trim()
    const digits = clean.replace(/-/g, '')
    if (/^\d{8}$/.test(digits)) {
      const y = digits.slice(0, 4)
      const m = digits.slice(4, 6)
      const d = digits.slice(6, 8)
      return `${y}-${m}-${d}`
    }
    return clean
  })()

  const primary = await fetchScoreboard(sport, league, isoDate ? isoDate.replace(/-/g, '') : undefined)
  if (!primary.ok) {
    return new Response(JSON.stringify({ error: 'upstream_error', status: primary.status }), { status: 502, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  }
  const data = primary.data as any
  const events = Array.isArray(data?.events) ? data.events : []
  if (events.length > 0 || !isoDate) {
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } })
  }

  const base = new Date(isoDate)
  const datesWanted: string[] = []
  for (let i = -3; i <= 0; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    datesWanted.push(`${y}-${m}-${da}`)
  }
  const forward: string[] = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    forward.push(`${y}-${m}-${da}`)
  }
  const all = datesWanted.concat(forward)
  const results = await Promise.all(all.map(async (iso) => {
    try {
      const r = await fetchScoreboard(sport, league, iso.replace(/-/g, ''))
      if (!r.ok) return []
      const j = r.data as any
      const ev = Array.isArray(j?.events) ? j.events : []
      return ev
    } catch {
      return []
    }
  }))
  const combined = results.flat()
  return new Response(JSON.stringify({ events: combined }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' } })
}
