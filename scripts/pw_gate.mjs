import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname, resolve } from 'path'

// dist to test: CLI arg > PW_DIST env > default (shared checkout). prepush_gate.sh passes its own worktree dist.
const ROOT = resolve(process.argv[2] || process.env.PW_DIST || '/workspace/fertig-app/dist')
if (!existsSync(join(ROOT, 'index.html'))) { console.error(`[pw_gate] FAIL: no index.html in ${ROOT}`); process.exit(1) }
console.log(`[pw_gate] dist ${ROOT} bundle ${(readFileSync(join(ROOT, 'index.html'), 'utf8').match(/index-[A-Za-z0-9_-]+\.js/) || ['?'])[0]}`)
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.bin':'application/octet-stream', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon' }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0])
  if (p === '/') p = '/index.html'
  const fp = join(ROOT, p)
  if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' })
  res.end(readFileSync(fp))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const base = `http://127.0.0.1:${port}/`

const TABS = ['alle','feed','galerie','board','gerichte','top','kategorien','markenprofil','ladenprofil','marken','familien','dashboard','gesundheit','analyse','scatter','pack','matrix','hersteller-seiten','wer','firmen','qualitaet','logos','netz','hersteller','filialen','online','planer','kombi','ftg','multipot','methodik','abdeckung']
const VIEWPORTS = [{ w: 1920, h: 1080, name: 'desktop' }, { w: 390, h: 844, name: 'mobile' }]

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const summary = { ok: true, errors: [], blank: [], overflow: [], brokenImg: 0, totalImg: 0, tabs: {} }

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  const cons = []
  page.on('console', m => { if (['error'].includes(m.type())) cons.push(`[${m.type()}] ${m.text()}`) })
  page.on('pageerror', e => cons.push(`[pageerror] ${e.message}`))
  for (const tab of TABS) {
    const key = `${vp.name}:${tab}`
    try {
      await page.goto(`${base}#tab=${tab}`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(600)
      const bodyText = (await page.locator('body').innerText()).trim()
      const blank = bodyText.length < 40
      if (blank) { summary.blank.push(key); summary.ok = false }
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth > doc.clientWidth + 2
      })
      if (vp.name === 'mobile' && overflow) { summary.overflow.push(key); summary.ok = false }
      const imgs = await page.evaluate(() => {
        const list = [...document.images]
        return { total: list.length, broken: list.filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).length }
      })
      summary.totalImg += imgs.total
      summary.brokenImg += imgs.broken
      const tabErrs = cons.splice(0)
      // filter noisy known benign
      const real = tabErrs.filter(e => !/favicon|Download the React DevTools|net::ERR_FAILED.*embeddings/i.test(e))
      if (real.length) { summary.errors.push(...real.map(e => `${key} ${e}`)); summary.ok = false }
      summary.tabs[key] = { blank, overflow, imgs, errs: real.length }
    } catch (e) {
      summary.ok = false
      summary.errors.push(`${key} NAV ${e.message}`)
    }
  }
  await page.close()
}
await browser.close()
server.close()
const brate = summary.totalImg ? summary.brokenImg / summary.totalImg : 0
if (brate >= 0.02) { summary.ok = false; summary.errors.push(`broken image rate ${(brate*100).toFixed(2)}% >= 2%`) }
summary.brokenRate = brate
console.log(JSON.stringify(summary, null, 2))
process.exit(summary.ok ? 0 : 1)
