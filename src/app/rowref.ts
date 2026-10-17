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

/* Sensecheck 29 (1): per-version legacy maps (public/legacy_uid_maps.json, fertig legacy_uid_map.py --versions). The unanimity map
 * legacyUid keeps only 22 of 3975 indices; with the map of the version a number was stored under, almost every old favourite is
 * recoverable. Old clients stored no version, so a number is resolved per version only when the version is KNOWN (favourites meta
 * written from now on) or the user confirms it in the restore dialog (they see the products each version would give). Never guessed. */
export type LegacyVersion = { v: string; src: string; commit: string; commits?: string[]; date: string; live: [string, string | null][]; rows: number; r: number[] }
export type LegacyMaps = { version: number; uids: (string | null)[]; versions: LegacyVersion[] }

/** run-length coded index → uid list of one version (null = product gone or not provably the same → dropped). */
export function decodeVersion(V: LegacyVersion, uids: (string | null)[]): (string | null)[] {
  const o: (string | null)[] = []
  for (let k = 0; k + 1 < V.r.length; k += 2) { const d = V.r[k], n = V.r[k + 1]; for (let j = 0; j < n; j++) o.push(d < 0 ? null : uids[d + j] ?? null) }
  return o
}
/** numbers stored under version V → current ids (null = dropped). */
export function resolveInVersion(nums: number[], V: LegacyVersion, M: LegacyMaps, idx: Map<string, number>): (number | null)[] {
  const us = decodeVersion(V, M.uids)
  return nums.map(n => { const u = Number.isInteger(n) && n >= 0 && n < us.length ? us[n] : null; const i = u ? idx.get(u) : undefined; return i ?? null })
}
/** version(s) a stored commit / data blob prefix refers to (exact match only). */
export const findVersion = (M: LegacyMaps, ref: string | null | undefined) =>
  !ref ? null : M.versions.find(V => V.v === ref || V.commit === ref || (V.commits ?? []).includes(ref)) ?? null
export type LegacyOption = { key: string; versions: LegacyVersion[]; ids: (number | null)[]; complete: boolean; lastLive: string | null; liveFrom: string | null }
const maxStr = (xs: string[]) => xs.length ? xs.reduce((a, b) => (b > a ? b : a)) : null
const lastLiveOf = (V: LegacyVersion) => maxStr(V.live.map(w => w[1] ?? '9999'))
/** restore-dialog options: versions grouped by identical outcome for these numbers. Ordered: all numbers exist in the version
 * (n < rows) first, then most recently live, then newest. The user picks one; nothing is applied automatically. */
export function legacyOptions(nums: number[], M: LegacyMaps, idx: Map<string, number>): LegacyOption[] {
  const by = new Map<string, LegacyOption>()
  for (const V of M.versions) {
    const ids = resolveInVersion(nums, V, M, idx); if (ids.every(i => i == null)) continue
    const key = ids.map(i => i ?? '-').join('.'), o = by.get(key)
    if (o) o.versions.push(V); else by.set(key, { key, versions: [V], ids, complete: nums.every(n => n < V.rows) && ids.every(i => i != null), lastLive: null, liveFrom: null })
  }
  const out = [...by.values()]
  for (const o of out) {
    o.versions.sort((a, b) => b.date.localeCompare(a.date)); o.lastLive = maxStr(o.versions.map(lastLiveOf).filter((x): x is string => !!x))
    o.liveFrom = maxStr(o.versions.flatMap(V => V.live.map(w => w[0])))   // start of the most recent live window (shown as „Stand“)
  }
  return out.sort((a, b) => Number(b.complete) - Number(a.complete) || (b.lastLive ?? '').localeCompare(a.lastLive ?? '') || b.versions[0].date.localeCompare(a.versions[0].date))
}
/** favourites meta written next to fg-favs-uid from now on (sensecheck 29 (1)): data version + row count + time of the last change. */
export type FavMeta = { dataVersion: string | null; rows: number; at: string }
export const favMeta = (D: { rows: unknown[]; dataVersion?: string | null }, now = new Date()): FavMeta => ({ dataVersion: D.dataVersion ?? null, rows: D.rows.length, at: now.toISOString() })
/** parked numbers (fg-favs-legacy) → those the unanimity map resolves now (e.g. after a map update) + still-parked rest. */
export const retryParked = (parked: unknown, D: RefData, idx: Map<string, number>) => migrateLegacyFavs(parked, D, idx)
