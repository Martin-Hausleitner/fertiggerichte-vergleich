// Sensecheck 92 P3: Es gibt kein Einheitenfeld; size ist g oder ml. Flüssige Gerichte (Suppen/Eintöpfe im Glas, z. B.
// #2722/#2724 410 ml, #3209 440 ml, #3219–#3223 6×375/330 ml) wurden als „€/100 g“ / „… g“ beschriftet. Rechnerisch ist
// der Wert €/100 ml; nur die Beschriftung folgt jetzt der Einheit. ml nur, wenn der Name eine ml/l-Angabe trägt, die
// (× Packungsanzahl „6er“) genau die Packungsgröße ergibt – Behälter-Volumen (Tupperware) und Non-Food zählen nicht.
type R = { name?: string | null; size?: number | null; nonfood?: boolean }
const VOL = /(\d+(?:[.,]\d+)?)\s*(ml|l)\b/gi
export function sizeUnit(r: R): 'g' | 'ml' {
  if (!r || r.nonfood || !r.name || typeof r.size !== 'number' || !(r.size > 0)) return 'g'
  const mult = +(r.name.match(/(\d+)\s*er\b/i)?.[1] ?? r.name.match(/(\d+)\s*[x×]\s*\d/i)?.[1] ?? 1)
  for (const m of r.name.matchAll(VOL)) {
    const v = parseFloat(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'l' ? 1000 : 1)
    if (Math.abs(v - r.size) < 0.5 || Math.abs(v * mult - r.size) < 0.5) return 'ml'
  }
  return 'g'
}
/** „€/100 g“ oder „€/100 ml“ passend zur Packungseinheit. */
export const per100Label = (r: R) => `€/100 ${sizeUnit(r)}`
/** Sensecheck 99 P3-1: Grundpreis „€/kg“ oder „€/l“ passend zur Packungseinheit (Wert ppk ist €/1000 g bzw. €/1000 ml). */
export const perKgLabel = (r: R) => (sizeUnit(r) === 'ml' ? '€/l' : '€/kg')
