/** Sensecheck 91 P3-8: how many entries the per-provider cap pushes out of a top list.
 * hidden = ids that would be in the top N without the cap (N = capped length) but are missing from the capped list. */
type R = { id: number; store?: string | null }
export type CapHidden = { n: number; byStore: [string, number][] }
export function capHidden(capped: number[] | undefined, uncapped: number[] | undefined, rows: Map<number, R>, keep: (r: R) => boolean = () => true): CapHidden {
  if (!capped || !uncapped) return { n: 0, byStore: [] }
  const s = new Set(capped), m = new Map<string, number>(); let n = 0
  for (const id of uncapped.slice(0, capped.length)) {
    if (s.has(id)) continue
    const r = rows.get(id); if (!r || !keep(r)) continue
    n++; const k = r.store || '?'; m.set(k, (m.get(k) || 0) + 1)
  }
  return { n, byStore: [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) }
}
/** German hint text, '' when nothing is hidden. */
export function capHiddenText(h: CapHidden): string {
  if (!h.n) return ''
  return ` Ohne Limit kämen ${h.n} höher bewertete ${h.n === 1 ? 'Gericht' : 'Gerichte'} in die Liste (${h.byStore.map(([s, c]) => `${s} ${c}`).join(', ')}); „ohne Limit“ zeigt sie.`
}
