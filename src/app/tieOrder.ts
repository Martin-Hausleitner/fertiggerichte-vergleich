// Sensecheck 91 P3-7: the export's _collapse sorts the top lists on the 1-decimal ppe/pli, so equal rounded values keep
// row-id order instead of the higher real value (topPE 8.8 #1499 8.798 before #2236 8.818, 7.8 #2417 before #2829,
// 7.4 #204 before #1162; topPLI 49.5 #2797 49.47 before #2834 49.51). This app-side pass only reorders runs of
// ADJACENT entries with the same rounded key by the unrounded key (PE: protPor ÷ pPor; PLI: 0.5·score +
// 0.5·min(protPor ÷ pPorEff ÷ 20, 1)·100 with pPorEff falling back to pPor), ties by row id. List membership, the
// provider cap and the cut-off are untouched; topHealth/topLight have no unrounded key and stay as exported.
type R = { id: number; ppe?: number | null; pli?: number | null; score?: number | null; protPor?: number | null; pPor?: number | null; pPorEff?: number | null }
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export const ppeRaw = (r: R): number | null => (num(r.protPor) && num(r.pPor) && r.pPor > 0 ? r.protPor / r.pPor : null)
export const pliRaw = (r: R): number | null => {
  const p = num(r.pPorEff) && r.pPorEff > 0 ? r.pPorEff : r.pPor
  return num(r.score) && num(r.protPor) && num(p) && p > 0 ? 0.5 * r.score + 0.5 * Math.min(r.protPor / p / 20, 1) * 100 : null
}

/** Reorders runs of adjacent ids whose rounded key is equal by the unrounded key (desc), then id (asc). */
export function orderTies(ids: number[], by: Map<number, R>, rounded: (r: R) => number | null | undefined, rawKey: (r: R) => number | null): number[] {
  const out = ids.slice(); let i = 0
  while (i < out.length) {
    const k = by.get(out[i]); const v = k ? rounded(k) : null; let j = i + 1
    while (j < out.length && v != null && (by.get(out[j]) ? rounded(by.get(out[j])!) : null) === v) j++
    if (j - i > 1) {
      const run = out.slice(i, j); const raws = run.map(id => rawKey(by.get(id)!))
      if (raws.every(num)) {
        const s = run.map((id, n) => ({ id, x: raws[n] as number })).sort((a, b) => b.x - a.x || a.id - b.id)
        for (let n = 0; n < s.length; n++) out[i + n] = s[n].id
      }
    }
    i = j
  }
  return out
}

type D = { rows: R[]; topPE?: number[]; topPEUncapped?: number[]; topPLI?: number[]; topPLIUncapped?: number[] }
/** Returns data with topPE/topPLI (+Uncapped) tie runs in real-value order; other fields keep their identity. */
export function orderTopTies<T extends D>(d: T): T {
  const by = new Map(d.rows.map(r => [r.id, r] as [number, R])); const o: Partial<D> = {}
  for (const k of ['topPE', 'topPEUncapped'] as const) if (d[k]) o[k] = orderTies(d[k]!, by, r => r.ppe, ppeRaw)
  for (const k of ['topPLI', 'topPLIUncapped'] as const) if (d[k]) o[k] = orderTies(d[k]!, by, r => r.pli, pliRaw)
  return { ...d, ...o }
}
