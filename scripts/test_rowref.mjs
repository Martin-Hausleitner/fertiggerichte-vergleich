// Sensecheck 27: stable row refs (src/app/rowref.ts) – favourites/#cmp=/#p= survive inserted rows.
// Run: node scripts/test_rowref.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const out = await build({ entryPoints: [new URL('../src/app/rowref.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' })
const R = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const D = JSON.parse(readFileSync(process.argv[2] || new URL('../public/data.json', import.meta.url), 'utf8'))
const rows = D.rows, n = rows.length
// 1) data.json: every row has a unique uid, uidMap consistent, id == index
assert.ok(rows.every((r, i) => r.id === i), 'id must equal list index')
assert.ok(rows.every(r => typeof r.uid === 'string' && /^[0-9a-z]{10}$/.test(r.uid)), 'every row needs a 10-char uid')
assert.equal(new Set(rows.map(r => r.uid)).size, n, 'uids unique')
const idx = R.uidIndex(D)
assert.ok(rows.every(r => idx.get(r.uid) === r.id), 'uidMap uid -> id')
for (const r of rows) if (r.dupOf != null) assert.equal(r.dupOfUid, rows[r.dupOf].uid, 'dupOfUid matches dupOf')
for (const [k, v] of Object.entries(D.uidTop || {})) assert.deepEqual(v, D[k].map(i => rows[i].uid), `uidTop.${k}`)
// 2) round trip: ids -> refs -> ids
const pick = [0, 7, Math.floor(n / 2), n - 1]
const s = R.formatRefs(pick, rows); assert.equal(s, pick.map(i => rows[i].uid).join('.'), 'refs are uids')
assert.deepEqual(R.parseRefs(s, idx, n), pick)
// 3) inserted row mid-list (next export): stored refs still resolve to the SAME products, numeric ids would not
const ins = { id: -1, uid: 'zzzzzzzzzz', name: 'NEU' }
const rows2 = [...rows.slice(0, 5), ins, ...rows.slice(5)].map((r, i) => ({ ...r, id: i }))
const D2 = { rows: rows2 }, idx2 = R.uidIndex(D2)
const back = R.parseRefs(s, idx2, rows2.length)
assert.deepEqual(back.map(i => rows2[i].uid), pick.map(i => rows[i].uid), 'uid refs follow the product after insertion')
assert.notDeepEqual(pick.map(i => rows2[i]?.uid), pick.map(i => rows[i].uid), 'numeric refs would have shifted (sanity)')
// 4) legacy numeric tokens still accepted, unknown tokens dropped, duplicates removed
assert.deepEqual(R.parseRefs('3.foo.3.' + n, idx, n), [3])
assert.equal(R.refToId(String(rows[12].uid), idx, n), 12)
assert.ok(R.hasLegacyRefs('3.' + rows[4].uid, rows)); assert.ok(!R.hasLegacyRefs(rows[4].uid, rows))
// 5) sensecheck 28 (1): legacy numeric refs (fg-favs, links opened at load) resolve ONLY via legacyUid, never as current index
const L = D.legacyUid || {}
for (const [k, u] of Object.entries(L)) assert.ok(idx.has(u), `legacyUid[${k}] -> existing uid`)
assert.ok(D.legacyUidInfo && D.legacyUidInfo.shipped === Object.keys(L).length, 'legacyUidInfo.shipped')
const notMapped = [...Array(n).keys()].find(i => !(String(i) in L))
if (notMapped != null) {
  assert.equal(R.legacyRefToId(String(notMapped), D, idx), null, 'unmapped legacy number is dropped, not read as current index')
  assert.deepEqual(R.parseLegacyRefs(`${notMapped}.${rows[3].uid}`, D, idx), [3], 'mixed legacy link keeps uid, drops unknown number')
  const m = R.migrateLegacyFavs([notMapped, 'x', -1], D, idx); assert.deepEqual(m, { ids: [], unresolved: [notMapped] })
}
for (const [k, u] of Object.entries(L).slice(0, 50)) assert.equal(R.legacyRefToId(k, D, idx), idx.get(u), 'mapped legacy number -> its uid row')
const Dold = { rows: rows.map(r => ({ id: r.id })) }   // pre-uid export: numbers stay indices
assert.equal(R.legacyRefToId('5', Dold, R.uidIndex(Dold)), 5)
// in-session numeric refs (GenUI/MCP) keep current-index semantics
assert.equal(R.refToId('7', idx, n), 7)
// sensecheck 28 (4): every uid collision group is explained (duplicate via dupOf, or distinct products under a generic URL)
const CK = (D.uidCollisions || []).filter(c => c.kind !== undefined)
if (CK.length) {
  const unexplained = CK.filter(c => c.kind !== 'duplicate' && c.kind !== 'generic_url')
  assert.equal(unexplained.length, 0, `unexplained uid collision groups: ${unexplained.map(c => c.kind + ' ' + c.key).join(', ')}`)
  for (const c of CK.filter(c => c.kind === 'duplicate')) assert.equal(c.rows.filter(x => rows[x.legacy_id].dupOf == null).length, 1, `duplicate group ${c.key} has exactly one visible row`)
  console.log(`[rowref] collisions: ${JSON.stringify(D.uidInfo.collision_kinds)}, 0 unexplained`)
}
console.log(`[rowref] legacy: ${Object.keys(L).length} mapped numeric refs, unmapped dropped`)
console.log(`[rowref] OK: ${n} rows, unique uids, uidMap/uidTop/dupOfUid consistent, refs stable across inserted row`)
