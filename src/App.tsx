import { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Beef, Flame, Droplets, Candy, Wheat, Leaf, Sprout, MapPin, UtensilsCrossed, LayoutGrid, Table2, ExternalLink, Factory, AlertTriangle } from 'lucide-react'
import raw from './data.json'
import { Card, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Select, Input } from './components/ui'
import { fmt, scoreColor } from './lib'

type Row = { id:number; img:string|null; name:string; brand:string; store:string; pack:string; price:number|null; pstat:string|null; ppk:number|null; size:number|null; protpack:number|null; p100:number|null; p100k:number|null; kcal:number|null; kcalpack:number|null; salt:number|null; sat:number|null; fib:number|null; sugar:number|null; fat:number|null; score:number|null; ppe:number|null; pid:string|null; herst:string; ort:string; ooe:boolean; mp:string; url:string|null; bio:boolean; vegan:boolean }
const D = raw as unknown as { rows:Row[]; topHealth:number[]; topPE:number[]; stats:Record<string,Record<string,any>>; same:{code:string;herst:string;ort:string;ooe:boolean;ids:number[]}[]; ftg:any[]; combos:any[] }
const R = D.rows
const STORES = [...new Set(R.map(r=>r.store))].sort()
const PACKS = [...new Set(R.map(r=>r.pack))].sort()

function Img({src,className='h-12 w-12'}:{src:string|null;className?:string}){
  const [err,setErr]=useState(false)
  if(!src||err) return <div className={`${className} flex items-center justify-center rounded bg-slate-100 text-slate-400`}><UtensilsCrossed size={20}/></div>
  return <img src={src} loading="lazy" referrerPolicy="no-referrer" onError={()=>setErr(true)} className={`${className} rounded object-contain bg-white`} alt=""/>
}
function ScoreBar({s}:{s:number|null}){
  return <div className="flex items-center gap-2 w-full"><div className="h-2.5 flex-1 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{width:`${s??0}%`,background:scoreColor(s)}}/></div><span className="w-8 text-right text-xs font-semibold tabular-nums">{s==null?'–':Math.round(s)}</span></div>
}
function Chips({r}:{r:Row}){
  const c='bg-slate-100 text-slate-700'
  return <div className="flex flex-wrap gap-1 py-1">
    {r.protpack!=null&&<Badge className="bg-emerald-100 text-emerald-800"><Beef size={11}/>{fmt(r.protpack,0)} g</Badge>}
    {r.kcal!=null&&<Badge className={c}><Flame size={11}/>{fmt(r.kcal,0)} kcal</Badge>}
    {r.salt!=null&&<Badge className={r.salt>1.5?'bg-red-100 text-red-700':c}><Droplets size={11}/>{fmt(r.salt,2)} Salz</Badge>}
    {r.sat!=null&&<Badge className={r.sat>4?'bg-orange-100 text-orange-700':c}>🧈 {fmt(r.sat)} ges.F</Badge>}
    {r.sugar!=null&&<Badge className={r.sugar>5?'bg-pink-100 text-pink-700':c}><Candy size={11}/>{fmt(r.sugar)}</Badge>}
    {r.fib!=null&&<Badge className="bg-amber-100 text-amber-800"><Wheat size={11}/>{fmt(r.fib)}</Badge>}
    {r.bio&&<Badge className="bg-lime-200 text-lime-900"><Sprout size={11}/>Bio</Badge>}
    {r.vegan&&<Badge className="bg-green-200 text-green-900"><Leaf size={11}/>vegan</Badge>}
    {r.ooe&&<Badge className="bg-red-600 text-white"><MapPin size={11}/>OÖ</Badge>}
  </div>
}
const Price=({r}:{r:Row})=> r.price==null?<span className="text-slate-400">–</span>:<span className={r.pstat==='live 2026'?'':'text-slate-400'}>{fmt(r.price,2)} €{r.pstat!=='live 2026'&&<Badge className="ml-1 bg-slate-200 text-slate-500">{r.pstat}</Badge>}</span>

function Grid({rows,height=640}:{rows:Row[];height?:number}){
  const cols=useMemo<ColDef<Row>[]>(()=>[
    {headerName:'Foto',field:'img',width:76,sortable:false,filter:false,cellRenderer:(p:any)=><Img src={p.value}/>},
    {headerName:'Produkt',field:'name',minWidth:220,flex:2,filter:'agTextColumnFilter',wrapText:true,autoHeight:true,cellRenderer:(p:any)=><div className="leading-tight py-1"><div className="font-medium">{p.value}</div><div className="text-xs text-slate-500">{p.data.brand}</div><Chips r={p.data}/></div>},
    {headerName:'Laden',field:'store',width:105,filter:'agSetColumnFilter' as any},
    {headerName:'Verpackung',field:'pack',width:150,filter:'agTextColumnFilter',wrapText:true},
    {headerName:'Preis',field:'price',width:115,filter:'agNumberColumnFilter',cellRenderer:(p:any)=><Price r={p.data}/>},
    {headerName:'€/kg',field:'ppk',width:85,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,2)},
    {headerName:'Protein/Pkg',field:'protpack',width:105,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,1)},
    {headerName:'Prot./100kcal',field:'p100k',width:110,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,1)},
    {headerName:'kcal/100g',field:'kcal',width:95,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,0)},
    {headerName:'Salz',field:'salt',width:80,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,2)},
    {headerName:'ges. Fett',field:'sat',width:85,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,1)},
    {headerName:'Health-Score',field:'score',width:150,filter:'agNumberColumnFilter',sort:'desc',cellRenderer:(p:any)=><div className="h-full flex items-center"><ScoreBar s={p.value}/></div>},
    {headerName:'Protein/€',field:'ppe',width:95,filter:'agNumberColumnFilter',valueFormatter:p=>fmt(p.value,1)},
    {headerName:'Hersteller',field:'herst',minWidth:180,flex:1,filter:'agTextColumnFilter',wrapText:true,cellRenderer:(p:any)=><div className="text-xs leading-tight py-1">{p.value}{p.data.ort&&<div className="text-slate-500">{p.data.ort}</div>}</div>},
    {headerName:'Multipot-Pro (Richtwert)',field:'mp',minWidth:220,flex:1,filter:'agTextColumnFilter',wrapText:true,cellRenderer:(p:any)=><div className="text-xs leading-tight py-1">{p.value}</div>},
    {headerName:'Link',field:'url',width:60,sortable:false,filter:false,cellRenderer:(p:any)=>p.value?<a href={p.value} target="_blank" className="text-brand"><ExternalLink size={16}/></a>:null},
  ],[])
  return <div className="ag-theme-quartz w-full" style={{height}}><AgGridReact rowData={rows} columnDefs={cols} defaultColDef={{sortable:true,resizable:true,filter:true,floatingFilter:false}} rowHeight={80} pagination paginationPageSize={50} enableCellTextSelection/></div>
}
function Gallery({rows}:{rows:Row[]}){
  const [n,setN]=useState(60)
  return <div><div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.slice(0,n).map(r=><Card key={r.id} className="p-3 flex flex-col gap-2">
    <div className="flex gap-3"><Img src={r.img} className="h-24 w-24 shrink-0"/><div className="min-w-0"><div className="font-semibold leading-tight">{r.name}</div><div className="text-xs text-slate-500">{r.brand} · {r.store}</div><div className="text-xs text-slate-500">{r.pack}</div><div className="mt-1 text-sm"><Price r={r}/></div></div></div>
    <Chips r={r}/><ScoreBar s={r.score}/><div className="text-xs text-slate-500">Protein/€: <b>{fmt(r.ppe)}</b> · Prot./100 kcal: <b>{fmt(r.p100k)}</b></div>
    {r.url&&<a href={r.url} target="_blank" className="text-xs text-brand inline-flex items-center gap-1">Zum Produkt <ExternalLink size={12}/></a>}</Card>)}</div>
    {n<rows.length&&<div className="text-center mt-4"><Button onClick={()=>setN(n+60)}>Mehr laden ({rows.length-n} weitere)</Button></div>}</div>
}
function Explorer(){
  const [q,setQ]=useState(''),[st,setSt]=useState(''),[pk,setPk]=useState(''),[mp,setMp]=useState(0),[view,setView]=useState<'grid'|'cards'>('grid')
  const rows=useMemo(()=>R.filter(r=>(!st||r.store===st)&&(!pk||r.pack===pk)&&((r.protpack??0)>=mp)&&(!q||(r.name+' '+r.brand+' '+r.herst).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>(b.score??-1)-(a.score??-1)),[q,st,pk,mp])
  return <div className="space-y-3">
    <Card className="p-3 flex flex-wrap items-center gap-2">
      <Input placeholder="Suche: Name, Marke, Hersteller…" value={q} onChange={e=>setQ(e.target.value)} className="flex-1 min-w-[200px]"/>
      <Select value={st} onChange={e=>setSt(e.target.value)}><option value="">Alle Läden</option>{STORES.map(s=><option key={s}>{s}</option>)}</Select>
      <Select value={pk} onChange={e=>setPk(e.target.value)}><option value="">Alle Verpackungen</option>{PACKS.map(s=><option key={s}>{s}</option>)}</Select>
      <label className="text-sm flex items-center gap-1">min. Protein/Pkg <Input type="number" className="w-20" value={mp} onChange={e=>setMp(+e.target.value)}/> g</label>
      <div className="flex gap-1 ml-auto"><Button active={view==='grid'} onClick={()=>setView('grid')}><Table2 size={16}/></Button><Button active={view==='cards'} onClick={()=>setView('cards')}><LayoutGrid size={16}/></Button></div>
      <span className="text-sm text-slate-500 w-full sm:w-auto">{rows.length} Treffer</span>
    </Card>
    {view==='grid'?<Grid rows={rows}/>:<Gallery rows={rows}/>}
  </div>
}
function PackCompare(){
  const data=Object.entries(D.stats).map(([k,s])=>({name:k.replace(/ \(.*\)/,''),n:s.n,score:s.health_score[0],p100k:s.protein_per_100kcal[0],salt:s.salt_100[0],eur10:s.price_per_10g_protein[0],ppk:s.price_per_kg[0],prot:s.protein_100[0]})).filter(d=>d.n>=20).sort((a,b)=>(b.score??0)-(a.score??0))
  const C=({k,t,c}:{k:string;t:string;c:string})=><Card className="p-3"><h4 className="font-semibold mb-2 text-sm">{t}</h4><ResponsiveContainer width="100%" height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}} interval={0} angle={-20} textAnchor="end" height={60}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey={k} fill={c} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2">
    <C k="score" t="Health-Score (Median)" c="#1b6e3a"/><C k="p100k" t="Protein pro 100 kcal (g)" c="#059669"/><C k="salt" t="Salz g/100 g (niedriger = besser)" c="#dc2626"/><C k="eur10" t="€ pro 10 g Protein" c="#6366f1"/></div>
    <Card className="p-3 overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left border-b">{['Verpackung','n','Protein g/100g','Prot./100kcal','Salz','ges. Fett','Zucker','€/kg','€/10 g Protein','Score'].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead><tbody>
      {Object.entries(D.stats).map(([k,s])=><tr key={k} className="border-b"><td className="p-1.5">{k}</td><td>{s.n}</td>{['protein_100','protein_per_100kcal','salt_100','satfat_100','sugar_100','price_per_kg','price_per_10g_protein','health_score'].map(f=><td key={f} className="tabular-nums">{fmt(s[f][0],2)}</td>)}</tr>)}</tbody></table>
    <p className="text-xs text-slate-500 mt-2">Mediane. Trocken/Instant: Nährwerte meist pro 100 g Pulver, deshalb zählt Protein/100 kcal. Kategorien mit n &lt; 20 (Glas, Sous-vide) fehlen in den Diagrammen, stehen aber in der Tabelle. Sous-vide (n = 9) hat den höchsten Score.</p></Card>
  </div>
}
function Same(){
  return <div className="grid gap-3 md:grid-cols-2">{D.same.map(g=><Card key={g.code} className="p-3"><div className="flex items-center gap-2 font-semibold"><Factory size={16}/>{g.code}{g.ooe&&<Badge className="bg-red-600 text-white">OÖ</Badge>}</div><div className="text-xs text-slate-500 mb-2">{g.herst} {g.ort}</div>
    {g.ids.map(i=>R[i]).map(r=><div key={r.id} className="flex items-center gap-2 py-1 border-t"><Img src={r.img} className="h-10 w-10"/><div className="flex-1 text-sm"><div>{r.name}</div><div className="text-xs text-slate-500">{r.brand} · {r.store}</div></div><div className="text-sm text-right"><Price r={r}/><div className="text-xs text-slate-500">{fmt(r.ppk,2)} €/kg</div></div></div>)}</Card>)}
    <p className="text-xs text-slate-500 md:col-span-2">Grundlage ist das Identitätskennzeichen (Oval) auf der Packung. Die Firmen sind über die Zulassungslisten der Statistik Austria (vis.statistik.at) aufgelöst.</p></div>
}
function Ftg(){
  const ftg=R.filter(r=>r.store==='Fit to Go')
  return <div className="space-y-3"><Card className="p-3"><ResponsiveContainer width="100%" height={260}><BarChart data={D.ftg}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis/><Tooltip/><Legend/><Bar dataKey="price" name="Preis € (Median)" fill="#6366f1"/><Bar dataKey="prot" name="Protein/Pkg g" fill="#059669"/><Bar dataKey="ppe" name="Protein/€" fill="#1b6e3a"/></BarChart></ResponsiveContainer>
    <p className="text-xs text-slate-500">Fit to Go: Preise aus dem Online-Shop (bei Boxen ggf. günstiger). Die verglichenen Supermarkt-Gerichte haben mind. 300 g und einen aktuellen Preis von 2026.</p></Card><Gallery rows={ftg}/></div>
}
const GUIDE=[['Kühl-Menüschale (Good Choice, Omis, Clever)','Steam High','250 ml unter Trivet','5–8 Min.','Quick Release'],['TK-Fertiggericht','Steam High','250 ml','12–15 Min.','Quick Release, umrühren'],['Ripperl / Spareribs','Pressure Cook High','250 ml','25 Min.','10 Min. Natural Release, dann 5 Min. grillen'],['Hühnerspieße','Steam High','250 ml','8–10 Min.','Quick Release, kurz anbraten (Sauté)'],['TK-Fisch / Schlemmerfilet','Steam High','250 ml','8–10 Min.','Quick Release'],['Sous-vide-Fleisch','Sous Vide 60–70 °C','Wasserbad','20–30 Min.','–'],['Dosengericht','Sauté Low / Steam im Einsatz','– / 250 ml','5–7 Min.','–'],['Knödel (kühl / TK)','Steam High','250 ml','6 / 10 Min.','Quick Release']]
function Multipot(){
  return <div className="space-y-3"><Card className="p-3 border-amber-300 bg-amber-50 flex gap-2 text-sm"><AlertTriangle className="text-amber-600 shrink-0"/>Das sind Richtwerte, keine Herstellerangaben. Instant Pot Pro mindestens 250 ml Flüssigkeit, Fleisch auf ≥ 75 °C Kerntemperatur. Fertiggerichte aus der Kunststoffschale in einen Edelstahl-Einsatz umfüllen.</Card>
    <Card className="p-3 overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left border-b">{['Produktgruppe','Modus','Wasser','Zeit','Druckablass'].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead><tbody>{GUIDE.map(g=><tr key={g[0]} className="border-b">{g.map((c,i)=><td key={i} className="p-1.5">{c}</td>)}</tr>)}</tbody></table></Card>
    <Card className="p-3"><h4 className="font-semibold mb-2">Kombi-Ideen (berechnet, Richtwert)</h4><div className="overflow-x-auto"><table className="text-sm w-full"><thead><tr className="text-left border-b">{['Hauptgericht','+ Gemüse (½)','+ Beilage (½)','kcal','Protein','Preis'].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead><tbody>{D.combos.map((c,i)=><tr key={i} className="border-b"><td className="p-1.5">{c.main} <span className="text-xs text-slate-500">({c.mstore})</span></td><td>{c.veg}</td><td>{c.side}</td><td>{c.kcal}</td><td>{c.prot} g</td><td>{fmt(c.price,2)} €</td></tr>)}</tbody></table></div></Card></div>
}
function Methodik(){
  return <Card className="p-4 prose-sm space-y-3 text-sm leading-relaxed">
    <h3 className="font-semibold text-base">Health-Score (0–100)</h3>
    <ul className="list-disc pl-5"><li>Basis 30 Punkte</li><li>+ Proteindichte bis 40: min(Protein g/100 kcal ÷ 10, 1) × 40</li><li>− Salz bis 20: ab 0,6 g/100 g, volle Strafe ab 2,0 g</li><li>− gesättigte Fettsäuren bis 15: ab 1,5 g, volle Strafe ab 6 g</li><li>+ Ballaststoffe bis 15 (bei 6 g/100 g) + 5 bei Gemüse/Hülsenfrüchten</li><li>− Verarbeitungsgrad bis 10 (NOVA-Schätzung je Verpackungstyp: Dose/Instant 4, Kühl/TK 3,5, Sous-vide/rohe Fleischstücke 3)</li><li>Fehlende Werte geben weder Bonus noch Malus. Ohne kcal oder Protein gibt es keinen Score.</li></ul>
    <h3 className="font-semibold text-base">Daten</h3><p>Stand 12.10.2026. Quellen: shop.billa.at, interspar.at (live geprüft), hofer.at, lidl.at, dm.at, fittogo.at, Open Food Facts und heisse-preise.io für historische Preise. Grau markierte Preise mit „Preis 2025“ sind veraltet. Good-Choice-Artikel, die nur in der Schweiz erhältlich sind, sind ausgeschlossen. Die Multipot-Angaben sind Richtwerte.</p>
    <h3 className="font-semibold text-base">Quellen Gesundheit</h3><ul className="list-disc pl-5">
      <li>Rickman, Barrett &amp; Bruhn (2007): Nährstoffverluste bei frischen, tiefgekühlten und Dosen-Produkten – <a className="text-brand underline" href="https://onlinelibrary.wiley.com/doi/10.1002/jsfa.2825">doi:10.1002/jsfa.2825</a></li>
      <li>EFSA (2023): Neubewertung von Bisphenol A – <a className="text-brand underline" href="https://doi.org/10.2903/j.efsa.2023.6857">doi:10.2903/j.efsa.2023.6857</a></li>
      <li>VO (EU) 2024/3190: BPA-Verbot in Lebensmittelkontaktmaterialien – <a className="text-brand underline" href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=OJ%3AL_202403190">EUR-Lex</a></li>
      <li>Monteiro et al. (2019): NOVA-Klassifikation – <a className="text-brand underline" href="https://doi.org/10.1017/S1368980018003762">doi</a></li>
      <li>Lane et al. (2024): Ultra-processed food und Gesundheit, BMJ – <a className="text-brand underline" href="https://doi.org/10.1136/bmj-2023-077310">doi</a></li></ul>
    <p className="text-xs text-slate-500">Keine Ernährungsberatung. Alle Angaben ohne Gewähr; maßgeblich sind die Angaben auf der Packung.</p></Card>
}
export default function App(){
  const live=R.filter(r=>r.pstat==='live 2026').length
  return <div className="mx-auto max-w-[1600px] p-3 sm:p-5 space-y-4">
    <header className="space-y-2"><h1 className="text-2xl sm:text-3xl font-bold text-brand">Fertiggerichte-Vergleich Linz &amp; OÖ</h1>
      <p className="text-slate-600 text-sm">Billa, Spar, Hofer, Lidl, Penny, dm und Fit to Go: Nährwerte, Preise, Hersteller, Health-Score und Multipot-Pro-Tipps</p>
      <div className="flex flex-wrap gap-2">{[[R.length,'Gerichte'],[R.filter(r=>r.score!=null).length,'mit Health-Score'],[live,'Preise 2026'],[D.same.length,'Werke mit mehreren Marken'],[R.filter(r=>r.ooe).length,'aus OÖ']].map(([v,l])=><Card key={l as string} className="px-3 py-2"><b className="text-lg">{v}</b> <span className="text-sm text-slate-500">{l}</span></Card>)}</div></header>
    <Tabs defaultValue="alle" className="space-y-3">
      <TabsList>{[['alle','Alle Gerichte'],['gesund','Top Gesund'],['pe','Top Protein/€'],['pack','Verpackungsvergleich'],['same','Gleicher Hersteller'],['ftg','Fit to Go vs Supermarkt'],['mp','Multipot-Pro Garzeiten'],['meth','Methodik & Quellen']].map(([v,l])=><TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList>
      <TabsContent value="alle"><Explorer/></TabsContent>
      <TabsContent value="gesund"><Gallery rows={D.topHealth.map(i=>R[i])}/></TabsContent>
      <TabsContent value="pe"><p className="text-sm text-slate-500 mb-2">Gramm Protein pro Euro, nur aktuelle Preise 2026, ohne Trocken- und Instantprodukte.</p><Gallery rows={D.topPE.map(i=>R[i])}/></TabsContent>
      <TabsContent value="pack"><PackCompare/></TabsContent>
      <TabsContent value="same"><Same/></TabsContent>
      <TabsContent value="ftg"><Ftg/></TabsContent>
      <TabsContent value="mp"><Multipot/></TabsContent>
      <TabsContent value="meth"><Methodik/></TabsContent>
    </Tabs>
    <footer className="text-xs text-slate-400 py-4">Stand 12.10.2026 · Daten aus öffentlichen Shop-Seiten &amp; Open Food Facts · ohne Gewähr</footer>
  </div>
}
