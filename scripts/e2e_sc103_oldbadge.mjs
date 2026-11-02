// Sensecheck 103 P3-1: „Preis veraltet (Stand …)“ auf den w-36-Produktkarten (Läden & Werke → Gleicher Hersteller, z. B. #701 PRIMANA Chili)
// bleibt innerhalb der Karte, überlappt den Preis der Nachbarkarte nicht, Datum vollständig sichtbar – bei 390 px und 1366 px.
// Run after `npm run build`: node scripts/e2e_sc103_oldbadge.mjs   (SHOT_DIR=/pfad → Screenshot bei 390 px)
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import assert from 'node:assert/strict'
const ROOT = process.env.PW_DIST || new URL('../dist', import.meta.url).pathname
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p === '/') p = '/index.html'
  const fp = join(ROOT, p); if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(readFileSync(fp))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] }); const errs = []; let n701 = 0
for (const [w, h] of [[390, 844], [1366, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } }); page.on('pageerror', e => errs.push(e.message))
  await page.route(u => !u.href.startsWith(base), r => r.abort())
  await page.goto(base + '#tab=hersteller'); await page.waitForSelector('[data-testid=werk-grid] button', { timeout: 30000 })
  const res = await page.evaluate(() => {
    const out = []; const R = (e) => e.getBoundingClientRect()
    const ov = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
    for (const row of document.querySelectorAll('[data-testid=werk-grid] .overflow-x-auto')) {
      const cards = [...row.querySelectorAll(':scope > button')]
      cards.forEach((c, i) => { const b = c.querySelector('[data-testid=old-price]'); if (!b) return
        const cr = R(c), br = R(b), name = c.querySelector('.font-medium')?.textContent || ''
        const nb = [cards[i - 1], cards[i + 1]].filter(Boolean).flatMap(n => [...n.querySelectorAll('[data-testid=price-inner] > span:first-child')].map(R))
        out.push({ name, txt: b.innerText.trim(), inCard: br.left >= cr.left - 0.5 && br.right <= cr.right + 0.5 && br.top >= cr.top - 0.5 && br.bottom <= cr.bottom + 0.5,
          overlapNb: nb.some(r => ov(r, br)), clipped: b.scrollWidth > b.clientWidth + 1, card: [cr.left, cr.right], badge: [br.left, br.right] }) }) }
    return out })
  assert.ok(res.length > 0, `${w}px: kein Preis-veraltet-Badge in den Werkskarten gefunden`)
  for (const r of res) {
    assert.ok(r.inCard, `${w}px ${r.name}: Badge ${JSON.stringify(r.badge)} außerhalb der Karte ${JSON.stringify(r.card)}`)
    assert.ok(!r.overlapNb, `${w}px ${r.name}: Badge überlappt den Preis der Nachbarkarte`)
    assert.ok(!r.clipped, `${w}px ${r.name}: Badge-Text abgeschnitten`)
    assert.match(r.txt.replace(/\s+/g, ' '), /^Preis veraltet( \(Stand \d{1,2}\.\d{1,2}\.\d{4}\))?$/, `${w}px ${r.name}: Text/Datum: ${r.txt}`)
  }
  n701 += res.filter(r => /PRIMANA Chili/i.test(r.name)).length
  console.log(`[sc103-p31] ${w}px: ${res.length} Badges in Werkskarten innerhalb der Karte, kein Nachbar-Überlapp`)
  if (w === 390 && process.env.SHOT_DIR) { const t = page.locator('[data-testid=werk-grid] button:has([data-testid=old-price])').first(); await t.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(process.env.SHOT_DIR, 'sc103_p31_after_390.png') }) }
  await page.close()
}
await browser.close(); server.close()
assert.equal(n701 > 0, true, '#701 PRIMANA Chili nicht unter den geprüften Karten')
assert.deepEqual(errs, [], 'pageerrors: ' + errs.join(' | '))
console.log('[sc103-p31] OK (390 + 1366 px, inkl. #701)')
