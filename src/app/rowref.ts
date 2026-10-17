/** Sensecheck 27: stable row references. In memory the app keeps the numeric list index (`id`, = legacy_id) because
 * top lists, same/producers/combos and dupOf are index-based within one data.json. Everything that outlives one
 * data.json – favourites (localStorage), compare (`#cmp=`), product links (`#p=`) – is written as the stable `uid`
 * (base36 hash of store | EAN or canonical URL | size, see fertig/uid.py) and mapped back on read.
 * Numeric tokens mean two different things:
 *  - in-session (GenUI/MCP actions, window.goodChoice ids): the CURRENT list index → rewritten to the uid right away;
 *  - legacy (fg-favs, #p=/#cmp= present at page load, written by a pre-uid deploy): an index into SOME older data.json.
 *    Sensecheck 28 (1): those are resolved only via data.json `legacyUid` (n → uid, set where every earlier export agreed,
 *    fertig/legacy_uid_map.py); anything else is dropped instead of mapped to whatever row now sits at index n. */
export type RefRow = { id: number; uid?: string | null }
export type RefData = { rows: RefRow[]; uidMap?: Record<string, number> | null; legacyUid?: Record<string, string> | null }

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

/** true when this export has stable uids (then a numeric token can't be trusted as a current index outside the session). */
export const hasUids = (rows: RefRow[]) => rows.length > 0 && !!rows[0]?.uid

/** Legacy token (from storage or a link opened at page load) → current id. Numbers go through legacyUid only;
 * exports without uids (pre-sensecheck-27) keep the old index semantics. Unknown → null (dropped). */
export function legacyRefToId(tok: string, D: RefData, idx: Map<string, number>): number | null {
  const t = tok.trim(); if (!t) return null
  const u = idx.get(t); if (u != null) return u
  if (!/^\d+$/.test(t)) return null
  if (!hasUids(D.rows)) { const n = Number(t); return n < D.rows.length ? n : null }
  const lu = D.legacyUid?.[String(Number(t))]; const i = lu != null ? idx.get(lu) : undefined
  return i ?? null
}
export const parseLegacyRefs = (s: string | null | undefined, D: RefData, idx: Map<string, number>, sep = '.'): number[] => {
  const out: number[] = []
  for (const t of (s ?? '').split(sep)) { const i = legacyRefToId(t, D, idx); if (i != null && !out.includes(i)) out.push(i) }
  return out
}
/** fg-favs (numeric, pre-uid) → { ids resolved via legacyUid, unresolved numbers kept for a later, better mapping }. */
export function migrateLegacyFavs(old: unknown, D: RefData, idx: Map<string, number>): { ids: number[]; unresolved: number[] } {
  const ids: number[] = [], unresolved: number[] = []
  for (const x of Array.isArray(old) ? old : []) {
    const n = Number(x); if (!Number.isInteger(n) || n < 0) continue
    const i = legacyRefToId(String(n), D, idx)
    if (i == null) unresolved.push(n); else if (!ids.includes(i)) ids.push(i)
  }
  return { ids, unresolved }
}
