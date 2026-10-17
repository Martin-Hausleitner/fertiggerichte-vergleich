/** Sensecheck 27: stable row references. In memory the app keeps the numeric list index (`id`, = legacy_id) because
 * top lists, same/producers/combos and dupOf are index-based within one data.json. Everything that outlives one
 * data.json – favourites (localStorage), compare (`#cmp=`), product links (`#p=`) – is written as the stable `uid`
 * (base36 hash of store | EAN or canonical URL | size, see fertig/uid.py) and mapped back on read.
 * Legacy numeric tokens are still accepted (old links/favourites) and get rewritten to uids. */
export type RefRow = { id: number; uid?: string | null }
export type RefData = { rows: RefRow[]; uidMap?: Record<string, number> | null }

const UID_RE = /^[0-9a-z]{6,16}(?:-[0-9a-z]+)?$/

/** uid → current numeric id; builds from rows if the export has no uidMap. */
export function uidIndex(D: RefData): Map<string, number> {
  const m = new Map<string, number>()
  if (D.uidMap) for (const [u, i] of Object.entries(D.uidMap)) m.set(u, i)
  else for (const r of D.rows) if (r.uid) m.set(r.uid, r.id)
  return m
}

/** One stored token (uid or legacy number) → current id, or null if unknown. */
export function refToId(tok: string, idx: Map<string, number>, nRows: number): number | null {
  const t = tok.trim(); if (!t) return null
  const u = idx.get(t); if (u != null) return u
  if (/^\d+$/.test(t)) { const n = Number(t); return n < nRows ? n : null }   // legacy numeric (pre-uid link)
  return null
}

/** Current id → token to persist: uid when the row has one, else the number (old exports). */
export function idToRef(id: number, rows: RefRow[]): string {
  const u = rows[id]?.uid; return u && UID_RE.test(u) ? u : String(id)
}

export const parseRefs = (s: string | null | undefined, idx: Map<string, number>, nRows: number, sep = '.'): number[] => {
  const out: number[] = []
  for (const t of (s ?? '').split(sep)) { const i = refToId(t, idx, nRows); if (i != null && !out.includes(i)) out.push(i) }
  return out
}
export const formatRefs = (ids: number[], rows: RefRow[], sep = '.') => ids.map(i => idToRef(i, rows)).join(sep)

/** true when a stored token list contains legacy numbers that should be rewritten to uids. */
export const hasLegacyRefs = (s: string | null | undefined, rows: RefRow[]) =>
  !!s && rows.some(r => r.uid) && s.split('.').some(t => /^\d+$/.test(t.trim()))
