// Parser für OSM-artige Öffnungszeiten aus stores.json, z. B. "Mo-Fr 07:15-19:15; Sa 07:15-18:00"
const D = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], DE: Record<string, string> = { Di: 'Tu', Mi: 'We', Do: 'Th', So: 'Su' }
const di = (s: string) => D.indexOf(DE[s] ?? s)
export function openNow(hours: string | undefined, now = new Date()): boolean | null {
  if (!hours) return null
  if (/24\/7/.test(hours)) return true
  const day = (now.getDay() + 6) % 7, min = now.getHours() * 60 + now.getMinutes(); let known = false
  for (const part of hours.split(';').map(x => x.trim()).filter(Boolean)) {
    const m = part.match(/^([A-Za-z,\- ]+?)\s+(.+)$/); if (!m) continue
    const days = new Set<number>()
    m[1].split(',').forEach(seg => { const [a, b] = seg.trim().split('-'); const x = di(a), y = b ? di(b) : x; if (x < 0 || y < 0) return; for (let i = x; ; i = (i + 1) % 7) { days.add(i); if (i === y) break } })
    if (!days.size) continue; known = true
    if (!days.has(day)) continue
    if (/off|closed/i.test(m[2])) return false
    for (const t of m[2].split(',')) { const r = t.trim().match(/(\d\d):(\d\d)-(\d\d):(\d\d)/); if (r && min >= +r[1] * 60 + +r[2] && min < +r[3] * 60 + +r[4]) return true }
    return false
  }
  return known ? false : null
}
