import { ChartContainer } from '../components/ui/chart'
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Factory, AlertTriangle } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { Img, Price, Gallery } from '../components/product'
import { fmt, useApp } from '../lib'
import { StoreCompare } from './Charts'
export function Producers(){
  const {R,D,open}=useApp()
  return <div className="space-y-4"><StoreCompare/>
    <h3 className="font-semibold text-lg">Gleicher Hersteller, verschiedene Marken</h3>
    <div className="grid gap-3 md:grid-cols-2">{D.same.map(g=>{const rs=g.ids.map(i=>R[i]);const ppk=rs.map(r=>r.ppk).filter(Boolean) as number[];const spread=ppk.length>1?Math.max(...ppk)/Math.min(...ppk):null
      return <Card key={g.code} className="p-3"><div className="flex items-center gap-2 font-semibold"><Factory size={16}/>{g.code}{g.ooe&&<Badge className="bg-red-600 text-white">OÖ</Badge>}{spread&&<Badge className="ml-auto bg-indigo-100 text-indigo-700">€/kg-Spanne ×{fmt(spread,1)}</Badge>}</div><div className="text-xs text-slate-500 mb-2">{g.herst} {g.ort}</div>
      <div className="flex gap-2 overflow-x-auto scroll-x pb-1">{rs.sort((a,b)=>(a.ppk??99)-(b.ppk??99)).map(r=><button key={r.id} onClick={()=>open(r.id)} className="w-36 shrink-0 rounded-xl border p-2 text-left text-xs hover:shadow dark:border-slate-700"><Img src={r.img} className="h-16 w-full"/><div className="font-medium line-clamp-2 mt-1">{r.name}</div><div className="text-slate-500">{r.brand} · {r.store}</div><div className="mt-1"><Price r={r}/></div><div className="font-semibold">{fmt(r.ppk,2)} €/kg</div><div className="text-slate-500">Score {fmt(r.score,0)}</div></button>)}</div></Card>})}</div>
    <p className="text-xs text-slate-500">Grundlage ist das Identitätskennzeichen (Oval) auf der Packung. Die Firmen sind über die Zulassungslisten der Statistik Austria (vis.statistik.at) aufgelöst. Gleiches Werk heißt nicht automatisch gleiche Rezeptur.</p></div>
}
export function Ftg(){
  const {R,D}=useApp(); const ftg=useMemo(()=>R.filter(r=>r.store==='Fit to Go').sort((a,b)=>(b.ppe??0)-(a.ppe??0)),[R])
  return <div className="space-y-3"><Card className="p-3"><ChartContainer config={{}} className="aspect-auto w-full" style={{height:260}}><BarChart data={D.ftg} margin={{left:-20}}><CartesianGrid strokeDasharray="3 3" opacity={.3}/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis/><Tooltip/><Legend/><Bar dataKey="price" name="Preis € (Median)" fill="#6366f1" radius={[6,6,0,0]}/><Bar dataKey="prot" name="Protein/Pkg g" fill="#059669" radius={[6,6,0,0]}/><Bar dataKey="ppe" name="Protein/€" fill="#1b6e3a" radius={[6,6,0,0]}/></BarChart></ChartContainer>
    <p className="text-xs text-slate-500">Fit to Go: Einzelpreise aus dem Online-Shop (Boxen ggf. günstiger). Salz und gesättigte Fette fehlen dort, daher sind die Scores „unvollständig“. Verglichen wird mit Supermarkt-Gerichten ab 300 g mit aktuellem Preis 2026.</p></Card><Gallery rows={ftg}/></div>
}
const GUIDE=[['Kühl-Menüschale (Good Choice, Omis, Clever)','Steam High','250 ml unter Trivet','5–8 Min.','Quick Release'],['TK-Fertiggericht','Steam High','250 ml','12–15 Min.','Quick Release, umrühren'],['Ripperl / Spareribs','Pressure Cook High','250 ml','25 Min.','10 Min. Natural Release, dann 5 Min. grillen'],['Hühnerspieße','Steam High','250 ml','8–10 Min.','Quick Release, kurz anbraten (Sauté)'],['TK-Fisch / Schlemmerfilet','Steam High','250 ml','8–10 Min.','Quick Release'],['TK-Gemüse','Steam High','250 ml','0–2 Min.','Quick Release sofort'],['Basmati-Reis (75 g roh/Portion)','Pressure Cook High','1 : 1,25 Wasser','4–6 Min.','10 Min. Natural Release'],['Sous-vide-Fleisch','Sous Vide 60–70 °C','Wasserbad','20–30 Min.','–'],['Dosengericht','Sauté Low / Steam im Einsatz','– / 250 ml','5–7 Min.','–'],['Knödel (kühl / TK)','Steam High','250 ml','6 / 10 Min.','Quick Release']]
export function Multipot(){
  return <div className="space-y-3"><Card className="p-3 border-amber-300 bg-amber-50 dark:bg-amber-900/20 flex gap-2 text-sm"><AlertTriangle className="text-amber-600 shrink-0"/><div><b>Richtwerte, keine Herstellerangaben.</b> Der Instant Pot Pro braucht mindestens 250 ml Flüssigkeit; Fleisch auf ≥ 75 °C Kerntemperatur garen. Fertiggerichte aus der Kunststoffschale in einen Edelstahl-Einsatz umfüllen, weil sonst bei Hitze mehr Stoffe aus dem Kunststoff übergehen können.</div></Card>
    <Card className="p-3 overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left border-b dark:border-slate-700">{['Produktgruppe','Modus','Wasser','Zeit','Druckablass'].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead><tbody>{GUIDE.map(g=><tr key={g[0]} className="border-b dark:border-slate-800">{g.map((c,i)=><td key={i} className="p-1.5">{c}</td>)}</tr>)}</tbody></table></Card>
    <Card className="p-3 text-sm"><h4 className="font-semibold mb-1">Kombi-Garen in einem Durchgang</h4><p>Unten Reis mit Wasser (Pressure Cook), darüber auf dem hohen Trivet die Menüschale oder den Fisch in einer Edelstahlschale, das TK-Gemüse obenauf. Garzeit nach dem längsten Teil (Reis 5 Min.), danach 10 Min. Natural Release. Das ist ein Richtwert; am besten zuerst mit einer Portion testen.</p></Card></div>
}
function DataQuality(){
  const {R,D}=useApp(); const qa=D.qaStats
  const k=[[R.length,'Produkte gesamt'],[R.filter(r=>r.rankable).length,'vollständig bewertet (in Rankings)'],[R.filter(r=>r.incomplete&&!r.dry).length,'Score unvollständig'],[R.filter(r=>r.dry).length,'Trockenprodukte (ausgeschlossen)'],[R.filter(r=>r.priceOnly).length,'nur Preis, keine Nährwerte'],[R.filter(r=>r.pstat==='live 2026').length,'Preise 2026'],[R.filter(r=>r.pstat==='Preis 2025').length,'Altpreise 2025'],[R.filter(r=>r.flags?.some(f=>f.startsWith('Packgröße'))).length,'Packgrößen korrigiert'],[qa?.applied??0,'QA-Korrekturen angewendet']]
  return <section><h3 className="font-semibold text-base mb-2">Datenqualität</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{k.map(([v,l])=><div key={l as string} className="rounded-lg border p-2 dark:border-slate-700"><div className="text-lg font-bold text-brand">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>)}</div>
    {qa&&qa.files>0&&<div className="mt-2 text-xs text-slate-600 dark:text-slate-400"><div>QA-Dateien: {Object.entries(qa.by_file).map(([f,v]:any)=>`${f}: ${v.applied}/${v.fixes}`).join(' · ')}</div><div>Korrigierte Felder: {Object.entries(qa.by_field).map(([f,v])=>`${f} (${v})`).join(', ')}</div></div>}</section>
}
export function Methodik(){
  return <div className="space-y-3 max-w-3xl"><Card className="p-4"><DataQuality/></Card><Card className="p-4 space-y-3 text-sm leading-relaxed">
    <h3 className="font-semibold text-base">Health-Score (0–100)</h3>
    <ul className="list-disc pl-5"><li>Basis 30 Punkte</li><li>+ Proteindichte bis 40: min(Protein g/100 kcal ÷ 10, 1) × 40</li><li>− Salz bis 20: ab 0,6 g/100 g, volle Strafe ab 2,0 g</li><li>− gesättigte Fettsäuren bis 15: ab 1,5 g, volle Strafe ab 6 g</li><li>+ Ballaststoffe bis 15 (bei 6 g/100 g) + 5 bei Gemüse/Hülsenfrüchten</li><li>− Verarbeitungsgrad bis 10 (NOVA-Schätzung: Dose/Instant 4, Kühl/TK 3,5, Sous-vide/rohe Fleischstücke 3)</li></ul>
    <h3 className="font-semibold text-base">Datenqualität &amp; Ausschlüsse</h3>
    <ul className="list-disc pl-5"><li><b>Trockenprodukte</b> (Instant, Pulver, Soja-Schnetzel): Nährwerte gelten pro 100 g trocken; diese Produkte sind markiert und aus allen Rankings ausgeschlossen.</li><li><b>„unvollständig“</b>: Salz oder gesättigte Fette fehlen, daher ist der Score zu optimistisch; diese Produkte fehlen in den Top-Listen.</li><li><b>Packgrößen</b> wurden gegen den Grundpreis (€/kg) geprüft und bei mehr als 25 % Abweichung korrigiert (z. B. Vegavita Crispy Burger 800 → 160 g).</li><li><b>Großpackungen</b> mit mehr als 100 g Protein pro Packung (z. B. Clever Seelachs 950 g) sind markiert und fehlen in den Protein/€-Rankings.</li><li>Grau markierte Preise mit „Preis 2025“ sind veraltet. Good-Choice-Artikel, die nur in der Schweiz erhältlich sind, sind ausgeschlossen.</li></ul>
    <h3 className="font-semibold text-base">Quellen</h3><ul className="list-disc pl-5">
      <li>Produktdaten: shop.billa.at, interspar.at, hofer.at, lidl.at, dm.at, fittogo.at, Open Food Facts, heisse-preise.io (historische Preise); Stand 12.10.2026</li>
      <li>Rickman, Barrett &amp; Bruhn (2007), Nährstoffverluste frisch/TK/Dose – <a className="text-brand underline" href="https://onlinelibrary.wiley.com/doi/10.1002/jsfa.2825">doi:10.1002/jsfa.2825</a></li>
      <li>EFSA (2023), Bisphenol A – <a className="text-brand underline" href="https://doi.org/10.2903/j.efsa.2023.6857">doi:10.2903/j.efsa.2023.6857</a></li>
      <li>VO (EU) 2024/3190, BPA-Verbot – <a className="text-brand underline" href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=OJ%3AL_202403190">EUR-Lex</a></li>
      <li>Monteiro et al. (2019), NOVA – <a className="text-brand underline" href="https://doi.org/10.1017/S1368980018003762">doi</a> · Lane et al. (2024), BMJ – <a className="text-brand underline" href="https://doi.org/10.1136/bmj-2023-077310">doi</a></li>
      <li>Identitätskennzeichen: Statistik Austria – <a className="text-brand underline" href="https://vis.statistik.at/fileadmin/ovis/pdf/index.html">vis.statistik.at</a></li></ul>
    <p className="text-xs text-slate-500">Keine Ernährungsberatung. Alle Angaben ohne Gewähr; maßgeblich ist die Packung.</p></Card></div>
}
