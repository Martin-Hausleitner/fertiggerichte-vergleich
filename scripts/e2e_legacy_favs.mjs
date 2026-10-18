// Sensecheck 29 (1) e2e on dist/: parked old numeric favourites → restore dialog → user picks the version → exactly those products
// become favourites (uids), parked list cleared, fg-favs-meta written. Run after `npm run build`: node scripts/e2e_legacy_favs.mjs
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { execFileSync } from 'child_process'
import assert from 'node:assert/strict'
const ROOT = new URL('../dist', import.meta.url).pathname
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p === '/') p = '/index.html'
  const fp = join(ROOT, p); if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(readFileSync(fp))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const D = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8'))
const old = JSON.parse(execFileSync('git', ['show', '94e0cd2:public/data.json'], { maxBuffer: 1 << 28, encoding: 'utf8' })).rows
const nums = [463, 1200, 2000, 3000], want = nums.map(n => D.rows.find(r => r.name === old[n].name && r.store === old[n].store).uid)
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }); const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.goto(base); await page.evaluate(n => { localStorage.clear(); localStorage.setItem('fg-favs-legacy', JSON.stringify(n)) }, nums)
await page.goto(base + '#tab=alle'); await page.reload(); await page.waitForSelector('[data-testid=legacy-favs]', { timeout: 30000 })
await page.click('[data-testid=legacy-favs]'); await page.waitForSelector('[data-testid=legacy-favs-sheet] input[type=radio]', { timeout: 30000 })
// the option whose product list is the 94e0cd2 list
const labels = page.locator('[data-testid=legacy-favs-sheet] label'); const n = await labels.count(); let hit = -1
for (let i = 0; i < n; i++) { const t = await labels.nth(i).innerText(); if (nums.every((_, k) => t.includes(old[nums[k]].name))) { hit = i; break } }
assert.ok(hit >= 0, '94e0cd2 option shown'); await labels.nth(hit).locator('input[type=radio]').check()
await page.click('[data-testid=legacy-favs-apply]'); await page.waitForTimeout(300)
const ls = await page.evaluate(() => ({ favs: JSON.parse(localStorage.getItem('fg-favs-uid') || '[]'), parked: JSON.parse(localStorage.getItem('fg-favs-legacy') || '[]'), meta: JSON.parse(localStorage.getItem('fg-favs-meta') || 'null') }))
assert.deepEqual([...ls.favs].sort(), [...want].sort(), 'restored favourites = 94e0cd2 products'); assert.deepEqual(ls.parked, [])
assert.equal(ls.meta?.dataVersion, D.dataVersion); assert.equal(ls.meta?.rows, D.rows.length)
assert.equal(await page.locator('[data-testid=legacy-favs]').count(), 0, 'button gone after restore')
// old fg-favs (never migrated) → unresolvable numbers parked, not mapped to the current row at that index
await page.evaluate(n => { localStorage.clear(); localStorage.setItem('fg-favs', JSON.stringify(n)) }, nums); await page.reload(); await page.waitForSelector('[data-testid=legacy-favs]', { timeout: 30000 })
const ls2 = await page.evaluate(() => ({ favs: JSON.parse(localStorage.getItem('fg-favs-uid') || '[]'), parked: JSON.parse(localStorage.getItem('fg-favs-legacy') || '[]'), old: localStorage.getItem('fg-favs') }))
assert.deepEqual(ls2.favs, []); assert.deepEqual(ls2.parked, nums); assert.equal(ls2.old, null)
// sensecheck 35 (1): favourites / #p= links on hidden duplicates. #79 SPAR Iglo Lasagne 700 g (hidden, same size as #1114) →
// stored favourite migrated to #1114, link redirected with a notice; #57 Felix 800 g (hidden other size of #58) stays, notice + link.
const U = u => D.rows.find(r => r.uid === u), H79 = 'so5g4idn53', M1114 = '854mk0dprs', H57 = 'vlnchbkdg6', M58 = 'rwh1a3xg0n'
assert.ok(U(H79)?.dupOfUid === M1114 && U(H57)?.dupOfUid === M58, 'test rows still hidden twins')
await page.evaluate(f => { localStorage.clear(); localStorage.setItem('fg-favs-uid', JSON.stringify(f)) }, [H79, H57, M1114])
await page.goto(base + '#tab=alle'); await page.reload()
await page.waitForFunction(() => (localStorage.getItem('fg-favs-dupmoved') || '').includes('so5g4idn53'), null, { timeout: 30000 })
const ls3 = await page.evaluate(() => ({ favs: JSON.parse(localStorage.getItem('fg-favs-uid') || '[]'), moved: JSON.parse(localStorage.getItem('fg-favs-dupmoved') || 'null') }))
assert.deepEqual(ls3.favs, [M1114, H57], 'fav on hidden #79 → #1114 (deduplicated), other size #57 kept')
assert.deepEqual(ls3.moved.moved, [{ from: H79, to: M1114 }]); assert.equal(ls3.moved.dataVersion, D.dataVersion)
await page.goto(base + '#tab=alle&p=' + H79); await page.reload()
await page.waitForSelector('[data-testid=dup-redirect-note]', { timeout: 30000 })
await page.waitForFunction(m => location.hash.includes('p=' + m), M1114, { timeout: 10000 })
const note = await page.locator('[data-testid=dup-redirect-note]').innerText()
assert.ok(note.includes('#' + U(H79).id) && /doppelte Zeile/.test(note), 'redirect notice names the old row: ' + note)
await page.goto(base + '#tab=alle&p=' + H57); await page.reload()
await page.waitForSelector('[data-testid=dup-other-note]', { timeout: 30000 })
assert.ok((await page.evaluate(() => location.hash)).includes('p=' + H57), 'other pack size stays open')
await page.click('[data-testid=dup-other-open]')
await page.waitForFunction(m => location.hash.includes('p=' + m), M58, { timeout: 10000 })
assert.equal(await page.locator('[data-testid=dup-other-note]').count(), 0, 'notice gone on the main row')
console.log(`[e2e dup links] OK: fav #${U(H79).id} → #${U(M1114).id}, #p=#${U(H79).id} redirected with notice, #p=#${U(H57).id} notice → #${U(M58).id}`)
// sensecheck 36 (2): #216 SPAR Natur*pur Bio-Rinds-Gulasch ca. 300 g, SPAR id 6067168 = '1 KG' (weight-priced) → notice at the shop link + evidence + size hint
const P216 = '5ruglnj5no'; assert.equal(U(P216)?.linkPack?.kind, 'weight')
await page.goto(base + '#tab=alle&p=' + P216); await page.reload()
await page.waitForSelector('[data-testid=linkpack-note]', { timeout: 30000 })
assert.equal((await page.locator('[data-testid=linkpack-note]').first().innerText()).trim(), 'Shopseite zeigt Kilopreis (Gewichtsware)')
assert.ok((await page.locator('[data-testid=linkpack-detail]').first().innerText()).includes('Kilopreis'), 'evidence line names the kilo price')
assert.ok((await page.locator('[data-testid=linkpack-size]').first().innerText()).includes('Kilopreis'), 'Inhalt row shows the shop kilo price')
console.log(`[e2e linkpack] OK: #p=#${U(P216).id} shows 'Shopseite zeigt Kilopreis (Gewichtsware)' + evidence`)
// sensecheck 37 (1): #420 Efko Gefüllte Paprika = 670 g net (drained 375 g), no pack-size notice any more
const P420 = '7g0n0evi73'; assert.equal(U(P420)?.size, 670); assert.equal(U(P420)?.drainedWeight, 375)
await page.goto(base + '#tab=alle&p=' + P420); await page.reload()
await page.waitForSelector('[data-testid=drained-weight]', { timeout: 30000 })
assert.ok((await page.locator('[data-testid=drained-weight]').first().innerText()).includes('Abtropfgewicht 375 g'), 'Inhalt row shows the drained weight')
assert.ok((await page.locator('[data-testid=drained-ppk]').first().innerText()).includes('10,64'), '€/kg row shows the shop drained-weight base price')
assert.equal(await page.locator('[data-testid=linkpack-note]').count(), 0, 'no pack-size notice on #420')
console.log(`[e2e drained] OK: #p=#${U(P420).id} 670 g (Abtropfgewicht 375 g), no pack-size notice`)
// sensecheck 37 (3): PrepMyMeal product shows the sourced shipping (5,99 € / 6 Gerichte) with the assumption in the tooltip
const PMM = D.rows.find(r => r.store === 'PrepMyMeal' && r.shipPor != null && r.dupOf == null)
await page.goto(base + '#tab=alle&p=' + PMM.uid); await page.reload()
await page.waitForSelector('[data-testid=ship-info]', { timeout: 30000 })
const si = page.locator('[data-testid=ship-info]').first()
assert.ok((await si.innerText()).includes('5,99') && (await si.innerText()).includes('6 Gerichte'), 'shipping text')
assert.ok(/Annahme/.test(await si.getAttribute('title') || ''), 'shipping tooltip states the assumption')
console.log(`[e2e shipping] OK: #p=#${PMM.id} ${PMM.name}: '${(await si.innerText()).trim()}' + assumption tooltip`)
// sensecheck 38 (2): Hüttenbrot (not a ready meal) shows the visible 'Kein Fertiggericht' notice; (1) Clever Basis Fix shows the size note
const HB = 'dpls94th1i'; assert.equal(U(HB)?.nonMeal?.kind, 'snack')
await page.goto(base + '#tab=alle&p=' + HB); await page.reload()
await page.waitForSelector('[data-testid=nonmeal-note]', { timeout: 30000 })
const nmn = page.locator('[data-testid=nonmeal-note]').first(), nmnText = (await nmn.innerText()).trim()
assert.ok((await nmn.innerText()).includes('Kein Fertiggericht') && (await nmn.innerText()).includes('Snack'), 'nonmeal notice text')
assert.ok(/Hüttenbrot/.test(await nmn.getAttribute('title') || ''), 'nonmeal tooltip = reason')
const BF = 'hcocmto4fg'; assert.equal(U(BF)?.size, null)
await page.goto(base + '#tab=alle&p=' + BF); await page.reload()
await page.waitForSelector('[data-testid=size-note]', { timeout: 30000 })
assert.ok((await page.locator('[data-testid=size-note]').first().innerText()).includes('Bruttogewicht 74 g'), 'size note in Inhalt')
assert.ok((await page.locator('[data-testid=nonmeal-note]').first().innerText()).includes('Würzmischung'), 'seasoning notice')
console.log(`[e2e nonmeal] OK: #p=#${U(HB).id} '${nmnText}', #p=#${U(BF).id} size note + seasoning notice`)
// sensecheck 38 (3): Rana Ravioli Ricotta&Spinat (no sauce) = 'Kein Fertiggericht · Zutat/Beilage', #621 Omis Kärntner Kasnudeln = 'ohne Sauce'
const RR = 'mcfk1y9jpp'; assert.equal(U(RR)?.nonMeal?.kind, 'pasta')
await page.goto(base + '#tab=alle&p=' + RR); await page.reload()
await page.waitForSelector('[data-testid=nonmeal-note]', { timeout: 30000 })
const rrText = (await page.locator('[data-testid=nonmeal-note]').first().innerText()).trim(); assert.ok(rrText.includes('braucht Sauce'), 'pasta notice')
const KN = 'eqptxeqobz'; assert.ok(U(KN)?.noSauce)
await page.goto(base + '#tab=alle&p=' + KN); await page.reload()
await page.waitForSelector('[data-testid=nosauce-note]', { timeout: 30000 })
assert.equal(await page.locator('[data-testid=nonmeal-note]').count(), 0, 'Kasnudeln are not marked as non-meal')
console.log(`[e2e pasta] OK: #p=#${U(RR).id} '${rrText}', #p=#${U(KN).id} 'ohne Sauce'`)
// sensecheck 38 (4): Billa weight article #662 Roastbeef Sous Vide (1000 g placeholder = €/kg) shows the weight notice + Billa evidence
const RB = 'm73tjsoff1'; assert.equal(U(RB)?.linkPack?.kind, 'weight')
await page.goto(base + '#tab=alle&p=' + RB); await page.reload()
await page.waitForSelector('[data-testid=linkpack-note]', { timeout: 30000 })
assert.equal((await page.locator('[data-testid=linkpack-note]').first().innerText()).trim(), 'Shopseite zeigt Kilopreis (Gewichtsware)')
assert.ok((await page.locator('[data-testid=linkpack-detail]').first().innerText()).includes('Billa-Produkt'), 'Billa evidence line')
console.log(`[e2e billa weight] OK: #p=#${U(RB).id} '${U(RB).name}' shows the Kilopreis notice + Billa evidence`)
// sensecheck 39 (3): #1182 Primana Tortelloni Käse-Sahne (TK, Käse-Sahne-Sauce) shows 'Sauce im Pack' + evidence, #69 Hilcona Tortellini Bolognese = 'Kein Fertiggericht'
const TS = '9rucxso66t'; assert.ok(U(TS)?.sauceInPack)
await page.goto(base + '#tab=alle&p=' + TS); await page.reload()
await page.waitForSelector('[data-testid=sauce-note]', { timeout: 30000 })
const sn = page.locator('[data-testid=sauce-note]').first(); assert.equal((await sn.innerText()).trim(), 'Sauce im Pack')
assert.ok(/Käse-Sahne-Sauce/.test(await sn.getAttribute('title') || ''), 'sauce tooltip = evidence'); assert.equal(await page.locator('[data-testid=nonmeal-note]').count(), 0, '#1182 not marked non-meal')
const HB69 = 'sq4f0g6yhw'; assert.equal(U(HB69)?.nonMeal?.kind, 'pasta')
await page.goto(base + '#tab=alle&p=' + HB69); await page.reload()
await page.waitForSelector('[data-testid=nonmeal-note]', { timeout: 30000 })
assert.ok((await page.locator('[data-testid=nonmeal-note]').first().innerText()).includes('braucht Sauce'), '#69 pasta notice')
console.log(`[e2e sauce] OK: #p=#${U(TS).id} 'Sauce im Pack' + evidence, #p=#${U(HB69).id} 'Kein Fertiggericht · Zutat/Beilage'`)
// sensecheck 39 (5): #334 S-BUDGET Hühner-Geschnetzeltes (price 2026-09-17 > 30 days, pstat 'live 2026') → badge 'Preis unbestätigt', no '✓ aktuell', Preisstatus 'Preis unbestätigt (Stand …)'
const UC = 'jkxnf2gpyt'; assert.equal(U(UC)?.price_status, 'unbestätigt')
await page.goto(base + '#tab=alle&p=' + UC); await page.reload()
await page.waitForSelector('[data-testid=price-status]', { timeout: 30000 })
const pst = (await page.locator('[data-testid=price-status]').first().innerText()).trim(); assert.ok(pst.startsWith('Preis unbestätigt'), 'Preisstatus: ' + pst)
assert.ok(await page.locator('[role=dialog] [data-testid=price-unconfirmed]').count() > 0, 'unconfirmed badge in the detail'); assert.equal(await page.locator('[role=dialog] [data-testid=price-current]').count(), 0, "no '✓ aktuell' in the detail")
console.log(`[e2e unconfirmed] OK: #p=#${U(UC).id} '${pst}' + badge 'Preis unbestätigt'`)
// sensecheck 40 (6): #tab=alle&q=Triangoli has 0 visible ready meals but 3 hidden Beilage/„nur Preis“ rows → hint + 'anzeigen' reveals them
await page.goto(base + '#tab=alle&q=Triangoli'); await page.reload()
await page.waitForSelector('[data-testid=hidden-hits]', { timeout: 30000 })
const hht = (await page.locator('[data-testid=hidden-hits-text]').innerText()).trim(); assert.ok(/^\d+ Treffer in ausgeblendeten Beilagen/.test(hht), 'hidden hits hint: ' + hht)
const hhn = +hht.match(/^(\d+)/)[1]; assert.ok(await page.getByText('0 Treffer', { exact: true }).count() > 0, "list shows '0 Treffer'")
await page.click('[data-testid=hidden-hits-show]'); await page.waitForSelector('[data-testid=hidden-hits]', { state: 'detached', timeout: 30000 })
await page.getByText(`${hhn} Treffer`, { exact: true }).first().waitFor({ timeout: 30000 })
assert.ok(/fs=[^&]*side/.test(decodeURIComponent(page.url())), 'stage Beilage added to #fs: ' + page.url())
console.log(`[e2e hidden hits] OK: #tab=alle&q=Triangoli '${hht} anzeigen' → ${hhn} Treffer`)
assert.deepEqual(errs, [], 'no page errors')
console.log(`[e2e legacy favs] OK: ${nums} (94e0cd2) → ${want.length} uids via restore dialog (${n} options), meta ${ls.meta.dataVersion}, fg-favs → parked ${ls2.parked.length}, 0 page errors`)
await browser.close(); server.close()
