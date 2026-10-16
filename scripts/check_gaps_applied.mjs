// Sensecheck 15 point 5: fail if public/data.json was exported without `gaps_overlay.py --apply`
// (6c11fb6 lost 15 heisse-preise prices, 383 price_unknown reasons, 99 shop_status and 7 OFF stores).
// Same thresholds as fertig tests/test_sensecheck14.py::test_gaps_overlay_applied. Usage: node scripts/check_gaps_applied.mjs [data.json]
import { readFileSync } from 'node:fs'
const p = process.argv[2] || new URL('../public/data.json', import.meta.url).pathname
const R = JSON.parse(readFileSync(p, 'utf8')).rows
const unknown = R.filter(r => r.price_status === 'unknown').length
const filled = R.filter(r => r.price_status === 'filled').length
const shop = R.filter(r => r.shop_status).length
const offStore = R.filter(r => r.name === 'Thai Red Chicken Curry' && String(r.url || '').includes('openfoodfacts.org/product/9009865009129')).map(r => r.store)
const lost = R.filter(r => ['Buchstabensuppe', 'Rigatoni caprese', 'Thunfischsalat Toskana Art'].includes(r.name) && String(r.store).startsWith('unbekannt')).length
const bad = []
if (unknown < 300) bad.push(`price_status=unknown ${unknown} < 300`)
if (filled < 10) bad.push(`price_status=filled ${filled} < 10`)
if (shop < 50) bad.push(`shop_status ${shop} < 50`)
if (offStore.length && !offStore.every(s => s === 'Billa')) bad.push(`OFF Thai Red Chicken Curry store ${offStore}`)
if (lost) bad.push(`${lost} rows lost their heisse-preise store`)
if (bad.length) { console.error('[gate] FAIL gaps_overlay --apply not applied:', bad.join('; ')); process.exit(1) }
console.log(`[gate] gaps_overlay applied (unknown ${unknown}, filled ${filled}, shop_status ${shop})`)
