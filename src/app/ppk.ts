// Sensecheck 100 P3-1: €/kg (ppk, €/l for ml packs) rounded exact half cents down – 3,19 € / 400 g = 7,975 shown as 7,97
// (float 7,97499…), commercial rounding gives 7,98 (333 rows). Same fix as SC92 P3 for p100g: this app-side pass rounds
// price ÷ size × 1000 half-up after toPrecision(12). It only touches rows whose stored ppk is a pure rounding variant
// (|ppk − exact| ≤ 0,005), so a real data deviation is never masked. Ranking (pli/ppe/topX) is per portion, nothing else moves.
type R = { price?: number | null; size?: number | null; ppk?: number | null }

/** €/kg (or €/l) from pack price and net size, rounded half-up to 0.01; null when price or size is missing/invalid. */
export const ppkOf = (r: R): number | null =>
  typeof r.price === 'number' && r.price > 0 && typeof r.size === 'number' && r.size > 0 ? Math.round(Number(((r.price * 100000) / r.size).toPrecision(12))) / 100 : null

/** Returns rows with ppk rounded half-up where the stored value only differs by rounding; unchanged rows keep their identity. */
export function consistentPpk<T extends R>(rows: T[]): T[] {
  return rows.map(r => {
    const v = ppkOf(r)
    if (v == null || typeof r.ppk !== 'number' || r.ppk === v) return r
    const exact = (r.price as number) / (r.size as number) * 1000
    return Math.abs(r.ppk - exact) <= 0.005 + 1e-9 ? { ...r, ppk: v } : r
  })
}
