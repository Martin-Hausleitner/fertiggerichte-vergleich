// Sensecheck 91 P3-4: €/100 g must follow the current pack price. The export recomputed ppk (€/kg) after Billa price
// updates but kept p100g from the old price (27 Billa rows, e.g. #547 3,99 € / 900 g = 0,44 €/100 g but 0.42 from
// 3,79 €; #576/#577 3,64 € / 710 g = 0,51 but 0.52; #28 0.70 vs 1,06; #1303 0.82 vs 0,62). p100g is shown/sorted in
// product card, FacetSidebar, Tabelle, Grid, VergleichTabelle, MeineShops and WerDahinter, so this app-side pass derives
// it from price and size (net content, like ppk) for every row that has both. Rows without price or size keep their
// value. Ranking (pli/ppe/topX) is precomputed per portion and does not use p100g, so nothing else moves.
type R = { price?: number | null; size?: number | null; p100g?: number | null }

// SC92 P3: exact half cents round up (0,99 € / 200 g = 0,495 → 0,50, not 0,49 from float 49.49999…); toPrecision(12)
// strips the binary float error before Math.round. 13 rows were 0,01 too low (#1170, #2951/#3018/#3019, #3060, #3265, …).
/** €/100 g from pack price and net size, rounded half-up to 0.01; null when price or size is missing/invalid. */
export const p100gOf = (r: R): number | null =>
  typeof r.price === 'number' && r.price > 0 && typeof r.size === 'number' && r.size > 0 ? Math.round(Number(((r.price * 10000) / r.size).toPrecision(12))) / 100 : null

/** Returns rows with p100g = price ÷ size × 100 (rounded to 0.01) where derivable; unchanged rows keep their identity. */
export function consistentP100g<T extends R>(rows: T[]): T[] {
  return rows.map(r => {
    const v = p100gOf(r)
    return v == null || r.p100g === v ? r : { ...r, p100g: v }
  })
}
