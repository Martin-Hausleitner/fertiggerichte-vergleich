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
console.log(`[rowref] OK: ${n} rows, unique uids, uidMap/uidTop/dupOfUid consistent, refs stable across inserted row`)
