// Sensecheck 88 P3-3: displayed score_parts must add up to the score (|score − clamp(Σ parts, 0, 100)| ≤ 0.05).
// Root cause (data pipeline, fertig/score_v2.py): every part is rounded to 0.1 on its own, the score is
// round(clamp(Σ unrounded parts), 1) – with up to 7 non-integer parts the rounded parts drift ±0.1…0.3 from the score
// (e.g. #1941 31.2 vs 31.4, #2069 31.4 vs 31.2, #2669 30.2 vs 30.4, #2995 32.3 vs 32.5). The export fix (largest
// remainder from the exact values) lives in the data branch; this app-side pass closes the gap for any export that
// still carries it. The score is authoritative and never changes (so ranking/threshold 30/pli are untouched); only the
// displayed parts move by 0.1 steps, one step per part, on the largest non-integer parts (integer parts like base 30,
// nova, caps and the sugar part – used by scoreOf's sugar weight – never move). Gaps that are not rounding gaps
// (more steps than non-integer parts) are left as they are and reported by scripts/test_score_parts.mjs.
type SP = Record<string, number>
type R = { score?: number | null; score_parts?: SP | null }

const clamp = (v: number) => Math.max(0, Math.min(100, v))
const isFrac = (k: string, v: unknown) => k !== 'sugar' && k !== 'base' && typeof v === 'number' && Math.abs(v - Math.round(v)) > 1e-6

/** score − clamp(Σ parts); 0 when the row has no score or no parts. */
export function partsGap(r: R): number {
  const sp = r.score_parts, s = r.score
  if (s == null || !sp) return 0
  const sum = Object.values(sp).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0)
  return Math.round((s - clamp(sum)) * 1e6) / 1e6
}

/** Parts adjusted to add up to the score, or null if nothing to do / not a pure rounding gap. */
export function fixParts(r: R): SP | null {
  const gap = partsGap(r)
  if (Math.abs(gap) <= 0.05) return null
  const sp = r.score_parts as SP
  const steps = Math.round(gap * 10)
  const cand = Object.keys(sp).filter(k => isFrac(k, sp[k])).sort((a, b) => Math.abs(sp[b]) - Math.abs(sp[a]))
  if (steps === 0 || Math.abs(steps) > cand.length || Math.abs(gap - steps / 10) > 0.05) return null
  const out: SP = { ...sp }
  for (const k of cand.slice(0, Math.abs(steps))) out[k] = Math.round((sp[k] + Math.sign(steps) * 0.1) * 10) / 10
  return Math.abs(partsGap({ score: r.score, score_parts: out })) <= 0.05 ? out : null
}

/** Rows with consistent score_parts (new objects only where parts changed; score unchanged). */
export function consistentParts<T extends R>(rows: T[]): T[] {
  return rows.map(r => { const p = fixParts(r); return p ? { ...r, score_parts: p } : r })
}
