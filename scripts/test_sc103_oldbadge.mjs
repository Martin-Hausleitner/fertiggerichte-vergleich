// Sensecheck 103 P3-1 (Quelltext-Check, ohne Build): Das Badge „Preis veraltet (Stand …)“ darf auf den schmalen
// w-36-Produktkarten (Gleicher Hersteller, #701 PRIMANA Chili) nicht über den Kartenrand auf den Nachbarpreis ragen.
// Price/PriceInner umbrechbar (flex-wrap, min-w-0, max-w-full, kein whitespace-nowrap am Container), OldPriceBadge wrap-Variante
// mit Umbruch zwischen Wörtern, Datumsteil „(Stand …)“ ungeteilt. Geometrie bei 390/1366 px: scripts/e2e_sc103_oldbadge.mjs (nach Build).
import fs from 'node:fs'
const rd = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')
const prod = rd('components/product.tsx'), age = rd('components/PriceAge.tsx')
const fail = m => { console.error('[sc103-p31] FAIL: ' + m); process.exit(1) }
const cls = s => s.split(/\s+/)
const price = prod.match(/export const Price=\(\{r\}:\{r:Row\}\)=><span className="([^"]*)">/)
if (!price) fail('Price-Wrapper nicht gefunden')
for (const c of ['flex-wrap', 'min-w-0', 'max-w-full']) if (!cls(price[1]).includes(c)) fail(`Price-Wrapper ohne ${c}: ${price[1]}`)
const inner = prod.match(/<span data-testid="price-inner" className="([^"]*)">/)
if (!inner) fail('PriceInner-Container (data-testid=price-inner) fehlt')
for (const c of ['flex-wrap', 'min-w-0', 'max-w-full']) if (!cls(inner[1]).includes(c)) fail(`PriceInner ohne ${c}: ${inner[1]}`)
if (cls(inner[1]).includes('whitespace-nowrap')) fail('PriceInner-Container noch whitespace-nowrap (Badge kann nicht umbrechen)')
if (!/<OldPriceBadge r=\{r\} wrap\/>/.test(prod)) fail('PriceInner nutzt OldPriceBadge ohne wrap')
const w = age.match(/if \(wrap\) \{[\s\S]*?className=\{cn\('([^']*)'/)
if (!w) fail('OldPriceBadge ohne wrap-Variante')
for (const c of ['min-w-0', 'max-w-full', 'whitespace-normal']) if (!cls(w[1]).includes(c)) fail(`OldPriceBadge wrap ohne ${c}: ${w[1]}`)
if (cls(w[1]).includes('whitespace-nowrap')) fail('OldPriceBadge wrap-Variante whitespace-nowrap')
if (!/<span className="whitespace-nowrap">\{m\[2\]\}<\/span>/.test(age)) fail('Datumsteil (Stand …) nicht als ungeteiltes Stück')
// Text unverändert: Aufteilung "<Kopf> <(Stand …)>" ergibt wieder genau das Label
const re = /^(.*?) (\(.*\))$/
for (const l of ['Preis veraltet (Stand 31.12.2023)', 'Preis veraltet (Stand 7.11.2025)']) { const m = l.match(re); if (!m || `${m[1]} ${m[2]}` !== l || m[2] !== l.slice(15)) fail('Split ändert Text: ' + l) }
if ('Preis veraltet'.match(re)) fail('Label ohne Datum darf nicht gesplittet werden')
console.log('[sc103-p31] ok: Price/PriceInner umbrechbar, OldPriceBadge wrap (min-w-0, max-w-full, whitespace-normal), Datum ungeteilt')
