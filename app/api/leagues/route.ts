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
  const coreUrl = `https://sports.core.api.espn.com/v2/sports/${encodeURIComponent(sport)}/leagues?limit=500`
  try {
    const coreRes = await fetch(coreUrl, { next: { revalidate: 3600 } })
    if (coreRes.ok) {
      const coreJson = await coreRes.json()
      const items: any[] = Array.isArray(coreJson?.items) ? coreJson.items : []
      const refs: string[] = items.map((it: any) => typeof it === 'string' ? it : (it?.$ref ?? it?.ref ?? it?.href ?? '')).filter((x: string) => !!x)
      const limited = refs.slice(0, 300)
      const details = await Promise.all(limited.map(async (href: string) => {
        try {
          const r = await fetch(href, { next: { revalidate: 3600 } })
          if (!r.ok) return null
          const j = await r.json()
          const code = j?.slug ?? j?.abbr ?? j?.uid ?? (j?.id != null ? String(j.id) : '')
          let name = j?.displayName ?? j?.name ?? j?.shortName ?? ''
          if (typeof name === 'string') name = name.replace(/^\s*2\.\s*/, '')
          const pfx = (code || '').split('.')[0].toLowerCase()
          const region = (() => {
            const europe = ['uefa','eng','esp','ita','ger','fra','ned','por','sco','tur','gre','bel','aut','sui','rus','ukr','nor','den','swe','pol','rou','cze','svk','hun','bul','isl','irl','wal','cyp']
            const africa = ['caf','alg','egy','mor','tun','nga','gha','civ','sen','rsa','cam']
            const asia = ['afc','jpn','kor','chn','tha','vnm','ind','irn','irq','sau','uae','qat','jor']
            const na = ['concacaf','usa','mex','can','crc','pan','jam','hon']
            const sa = ['conmebol','bra','arg','chi','col','per','uru','par','ecu','bol','ven']
            const oc = ['ofc','aus','nzl']
            if (europe.includes(pfx)) return 'Europe'
            if (na.includes(pfx)) return 'North America'
            if (sa.includes(pfx)) return 'South America'
            if (asia.includes(pfx)) return 'Asia'
            if (africa.includes(pfx)) return 'Africa'
            if (oc.includes(pfx)) return 'Oceania'
            return 'Other'
          })()
          if (code && name) return { code: String(code), name: String(name), region }
          return null
        } catch { return null }
      }))
      const mappedCore = details.filter(Boolean) as any[]
      if (mappedCore.length > 0) {
        const dedup = new Map<string, any>()
        for (const item of mappedCore) {
          if (!dedup.has(item.code)) dedup.set(item.code, item)
        }
        const finalCore = Array.from(dedup.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
        cache[sport] = { ts: Date.now(), leagues: finalCore }
        return new Response(JSON.stringify({ leagues: finalCore }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
      }
    }
  } catch {}
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
  const mappedRaw = leagues.map((l: any) => {
    const code = l?.slug ?? l?.abbr ?? l?.uid ?? (l?.id != null ? String(l.id) : '')
    let name = l?.displayName ?? l?.name ?? l?.shortName ?? ''
    if (typeof name === 'string') name = name.replace(/^\s*2\.\s*/, '')
    const pfx = (code || '').split('.')[0].toLowerCase()
    const region = (() => {
      const europe = ['uefa','eng','esp','ita','ger','fra','ned','por','sco','tur','gre','bel','aut','sui','rus','ukr','nor','den','swe','pol','rou','cze','svk','hun','bul','isl','irl','wal','cyp']
      const africa = ['caf','alg','egy','mor','tun','nga','gha','civ','sen','rsa','cam']
      const asia = ['afc','jpn','kor','chn','tha','vnm','ind','irn','irq','sau','uae','qat','jor']
      const na = ['concacaf','usa','mex','can','crc','pan','jam','hon']
      const sa = ['conmebol','bra','arg','chi','col','per','uru','par','ecu','bol','ven']
      const oc = ['ofc','aus','nzl']
      if (europe.includes(pfx)) return 'Europe'
      if (na.includes(pfx)) return 'North America'
      if (sa.includes(pfx)) return 'South America'
      if (asia.includes(pfx)) return 'Asia'
      if (africa.includes(pfx)) return 'Africa'
      if (oc.includes(pfx)) return 'Oceania'
      return 'Other'
    })()
    return { code, name, region }
  }).filter((x: any) => x.code && x.name)
  const dedup = new Map<string, any>()
  for (const item of mappedRaw) {
    if (!dedup.has(item.code)) dedup.set(item.code, item)
  }
  const final = Array.from(dedup.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
  cache[sport] = { ts: Date.now(), leagues: final }
  return new Response(JSON.stringify({ leagues: final }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
}
