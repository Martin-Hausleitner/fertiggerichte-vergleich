// Sensecheck 27: stable row refs (src/app/rowref.ts) – favourites/#cmp=/#p= survive inserted rows.
// Run: node scripts/test_rowref.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
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
// 6) sensecheck 29 (1): per-version legacy maps (public/legacy_uid_maps.json) – synthetic contract first
{
  const M0 = { version: 1, uids: [rows[0].uid, rows[1].uid, rows[2].uid, null], versions: [
    { v: 'aaaa', src: 'main a', commit: 'aaaaaaa', date: '2026-10-16T10:00:00Z', live: [['2026-10-16T10:05:00Z', '2026-10-16T12:00:00Z']], rows: 3, r: [2, 1, 0, 2] },   // 0→uid2, 1→uid0, 2→uid1
    { v: 'bbbb', src: 'main b', commit: 'bbbbbbb', commits: ['bbbbbbb', 'ccccccc'], date: '2026-10-17T10:00:00Z', live: [], rows: 4, r: [0, 3, -1, 1] },   // 0→uid0 … 3 dropped
    { v: 'dddd', src: 'main d', commit: 'ddddddd', date: '2026-10-15T10:00:00Z', live: [], rows: 2, r: [3, 1, 1, 1] } ] }   // 0→null(gone uid), 1→uid1
  assert.deepEqual(R.decodeVersion(M0.versions[0], M0.uids), [rows[2].uid, rows[0].uid, rows[1].uid])
  assert.deepEqual(R.resolveInVersion([0, 1, 3, 9, -1], M0.versions[1], M0, idx), [0, 1, null, null, null], 'out of range / dropped -> null')
  assert.equal(R.findVersion(M0, 'ccccccc').v, 'bbbb'); assert.equal(R.findVersion(M0, 'zzz'), null)
  const o = R.legacyOptions([0, 1], M0, idx)
  assert.deepEqual(o.map(x => x.ids), [[2, 0], [0, 1], [null, 1]], 'complete+live first, then newest, partial last')
  assert.ok(o[0].complete && o[0].lastLive === '2026-10-16T12:00:00Z' && o[0].liveFrom === '2026-10-16T10:05:00Z' && o[1].liveFrom === null && !o[2].complete)
  assert.deepEqual(R.legacyOptions([3], M0, idx), [], 'nothing resolvable -> no option')
  const fm = R.favMeta({ rows: [1, 2], dataVersion: 'abc' }, new Date('2026-10-17T00:00:00Z'))
  assert.deepEqual(fm, { dataVersion: 'abc', rows: 2, at: '2026-10-17T00:00:00.000Z' })
}
const LM = existsSync(new URL('../public/legacy_uid_maps.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('../public/legacy_uid_maps.json', import.meta.url), 'utf8')) : null
if (D.legacyVersions) {
  assert.ok(LM, 'data.json legacyVersions set but public/legacy_uid_maps.json missing')
  assert.equal(LM.versions.length, D.legacyVersions.versions, 'legacyVersions.versions')
  for (const u of LM.uids) if (u != null) assert.ok(idx.has(u), `legacy map uid ${u} exists`)
  assert.ok(typeof D.dataVersion === 'string' && D.dataVersion.length >= 8, 'dataVersion')
  const dec = new Map(LM.versions.map(V => [V.v, R.decodeVersion(V, LM.uids)]))
  for (const V of LM.versions) assert.equal(dec.get(V.v).length, V.rows, `version ${V.src} decodes to ${V.rows} indices`)
  // unanimity map is a subset: wherever legacyUid maps n, every version that has n agrees
  for (const [k, u] of Object.entries(L)) for (const V of LM.versions) if (+k < V.rows) { const x = dec.get(V.v)[+k]; assert.ok(x == null || x === u, `legacyUid[${k}] vs ${V.src}`) }
  // the three live versions named in sensecheck 29: every index is either the SAME product (store + name/prefix, EAN or product URL) or dropped
  const norm = s => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const ean = r => { const e = String(r.ean ?? '').replace(/\D/g, ''); return e.length >= 8 ? e.replace(/^0+/, '') : '' }
  const same = (o, c) => norm(o.store) === norm(c.store) && ((norm(o.name) && (norm(o.name).startsWith(norm(c.name)) || norm(c.name).startsWith(norm(o.name)))) || (ean(o) && ean(o) === ean(c)) || (o.url && o.url === c.url))
  for (const c of ['f10b741', '94e0cd2', 'a905340']) {
    let old; try { old = JSON.parse(execFileSync('git', ['show', `${c}:public/data.json`], { maxBuffer: 1 << 28, encoding: 'utf8' })).rows } catch { console.log(`[rowref] skip ${c} (not in this clone)`); continue }
    const V = R.findVersion(LM, execFileSync('git', ['rev-parse', `${c}:public/data.json`], { encoding: 'utf8' }).trim().slice(0, 12)); assert.ok(V, `version for ${c}`); assert.equal(V.rows, old.length, `${c} rows`)
    const ids = R.resolveInVersion(old.map((_, n) => n), V, LM, idx); let ok = 0
    ids.forEach((i, n) => { if (i == null) return; assert.ok(same(old[n], rows[i]), `${c} #${n} ${old[n].name} -> ${rows[i].name}: not the same product`); ok++ })
    assert.ok(ok / old.length > 0.99, `${c}: only ${ok}/${old.length} recoverable`)
    console.log(`[rowref] legacy version ${c}: ${ok}/${old.length} indices -> same product, ${old.length - ok} dropped, 0 wrong (unanimity map alone: ${old.filter((_, n) => String(n) in L).length})`)
  }
  // restore dialog: a favourites set saved under a905340 is offered (with exactly those products) among the options
  const Va = R.findVersion(LM, 'a905340')   // a905340 changed data.json itself → listed under its commit
  if (Va) {
    const nums = [463, 1200, 3960].filter(n => n < Va.rows), want = R.resolveInVersion(nums, Va, LM, idx)
    const op = R.legacyOptions(nums, LM, idx); assert.ok(op.length >= 1 && op.some(x => x.versions.some(v => v.v === Va.v) && JSON.stringify(x.ids) === JSON.stringify(want)), 'a905340 option offered')
    assert.equal(R.legacyRefToId('463', D, idx) ?? null, L['463'] ? idx.get(L['463']) : null, 'without a version, 463 still only via legacyUid')
    console.log(`[rowref] restore options for [${nums}]: ${op.length} (first: ${op[0].versions[0].src}, complete ${op[0].complete})`)
  }
}
// parked numbers retried on load: resolvable via legacyUid -> ids, rest stays parked
{ const k = Object.keys(L)[0]; if (k != null && notMapped != null) assert.deepEqual(R.retryParked([+k, notMapped], D, idx), { ids: [idx.get(L[k])], unresolved: [notMapped] }) }
console.log(`[rowref] legacy: ${Object.keys(L).length} mapped numeric refs, unmapped dropped`)
// sensecheck 35 (1): hidden duplicates → main row. Same pack size = redirect (links + stored favourites), other size = notice only
{
  let red = 0, oth = 0
  for (const r of rows) {
    if (r.dupOf == null) { assert.equal(R.dupTarget(r.id, rows, idx), null, 'visible row has no dup target'); continue }
    const t = R.dupTarget(r.id, rows, idx); assert.ok(t, `hidden #${r.id} resolves to a main row`)
    assert.equal(rows[t.to].dupOf ?? null, null, `main row of #${r.id} is visible`)
    if (t.kind === 'redirect') red++; else oth++
  }
  const byU = u => rows.find(r => r.uid === u)
  const r79 = byU('so5g4idn53'), r1114 = byU('854mk0dprs'), r57 = byU('vlnchbkdg6'), r58 = byU('rwh1a3xg0n')
  if (r79 && r1114) assert.deepEqual(R.dupTarget(r79.id, rows, idx), { from: r79.id, to: r1114.id, kind: 'redirect' }, '#79 700 g → #1114 700 g')
  if (r57 && r58) assert.deepEqual(R.dupTarget(r57.id, rows, idx), { from: r57.id, to: r58.id, kind: 'otherSize' }, '#57 800 g stays, notice → #58')
  if (r79 && r1114 && r57) {
    const c = R.canonIds([r79.id, r1114.id, r57.id, 0], rows, idx)
    assert.deepEqual(c.ids, [r1114.id, r57.id, 0], 'fav on #79 merges into #1114, other size kept'); assert.equal(c.moved.length, 1)
  }
  // broken / cyclic chains never loop
  assert.equal(R.dupMain(0, [{ id: 0, dupOf: 1 }, { id: 1, dupOf: 0 }]), null)
  // sensecheck 55 P2.3: dup row without size → redirect to main row (PrepMyMeal #1534–#1536 legacy rows)
  const syn = [{ id: 0, uid: 'aaaaaaaaaa', size: 450 }, { id: 1, uid: 'bbbbbbbbbb', size: null, dupOf: 0 }, { id: 2, uid: 'cccccccccc', size: 800, dupOf: 0 }]
  assert.equal(R.dupTarget(1, syn)?.kind, 'redirect', 'size-less duplicate redirects')
  assert.equal(R.dupTarget(2, syn)?.kind, 'otherSize', '800 g vs 450 g stays other size')
  for (const u of ['4o2zv99k36', '3oh2e02p0a', '8af78b1pbb']) { const i = idx.get(u); if (i != null && rows[i].dupOf != null && !rows[i].size) assert.equal(R.dupTarget(i, rows, idx)?.kind, 'redirect', `#${i} (${u}) redirects`) }
  console.log(`[rowref] dup targets: ${red} redirect (same size), ${oth} other size (notice), 0 broken`)
}
console.log(`[rowref] OK: ${n} rows, unique uids, uidMap/uidTop/dupOfUid consistent, refs stable across inserted row`)
