// Parser für OSM-artige Öffnungszeiten aus stores.json, z. B. "Mo-Fr 07:15-19:15; Sa 07:15-18:00"
const D = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], DE: Record<string, string> = { Di: 'Tu', Mi: 'We', Do: 'Th', So: 'Su' }
const di = (s: string) => D.indexOf(DE[s] ?? s)
/** Öffnungszeiten der Linzer Filialen sind Ortszeit Linz: Wochentag/Uhrzeit immer in Europe/Vienna auswerten,
 *  nicht in der Zeitzone des Geräts (sonst z. B. dm „offen“ um 18:45 Wiener Zeit auf einem UTC-Rechner). */
const TZ = 'Europe/Vienna'
let fmtTz: Intl.DateTimeFormat | null = null
export function viennaDayMin(now: Date): { day: number; min: number } {
  try {
    fmtTz ??= new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const p = Object.fromEntries(fmtTz.formatToParts(now).map(x => [x.type, x.value]))
    const day = D.indexOf(String(p.weekday).slice(0, 2)), h = +p.hour % 24, m = +p.minute
    if (day >= 0 && Number.isFinite(h) && Number.isFinite(m)) return { day, min: h * 60 + m }
  } catch { /* Intl ohne Zeitzonendaten → Gerätezeit */ }
  return { day: (now.getDay() + 6) % 7, min: now.getHours() * 60 + now.getMinutes() }
}
export function openNow(hours: string | undefined, now = new Date()): boolean | null {
  if (!hours) return null
  if (/24\/7/.test(hours)) return true
  const { day, min } = viennaDayMin(now); let known = false
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
