// Regression (Vorschlag für Pre-Push-Gate): Top 50 nach Preis-Leistung dürfen nur meal/stew und keine Trockenware/Nicht-Mahlzeit enthalten.
import { readFileSync } from 'fs'
const D = JSON.parse(readFileSync(process.argv[2] || 'public/data.json', 'utf8'))
const NONMEAL = /^\S+ lasagne$|lasagne (hartweizen)?$|lasagneblätter|lasagne ?teig|suppe-(abc|gerstl|sternderl|hörnchen)|suppennudeln|suppeneinlage|backerbsen|suppenpulver|pesto|\bsugo\b|topfencreme|mousse|pudding|cheesecake|strudel|dessert|götterspeise/i
const dry = r => r.dry || (r.kcal >= 300 && (r.fat == null || r.fat < 10) && !/tiefk|\bTK\b/i.test(r.pack || ''))
const top = D.rows.filter(r => r.pli != null).sort((a, b) => b.pli - a.pli).slice(0, 50)
const bad = top.filter(r => !['meal', 'stew'].includes(r.stage) || dry(r) || r.gang === 'dessert' || NONMEAL.test(r.name))
console.log(`[regress] top50 by pli: ${bad.length} Verstöße`); bad.forEach(r => console.log(`  #${r.id} ${r.stage} dry=${dry(r)} ${r.name}`))
process.exit(bad.length ? 1 : 0)
